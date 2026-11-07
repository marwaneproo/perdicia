import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from . import database as db
from .analysis import (apply_filters, category_column, clean, compute_kpis, load_df, quality,
                       read_file, workbook_sheets as workbook_sheets_from_bytes)
from .export import csv_bytes, excel_bytes
from .forecasting import forecast
from .insights import build_insights
from .visualization import build_charts

log = logging.getLogger("intellibi")
router = APIRouter(prefix="/api")

MAX_BYTES = 10 * 1024 * 1024
ALLOWED = (".csv", ".xlsx", ".xlsm")


def _dataset_or_404(ds_id: int) -> dict:
    ds = db.get_dataset(ds_id)
    if not ds or not Path(ds["path"]).exists():
        raise HTTPException(404, "Dataset not found.")
    return ds


def _load(ds_id: int):
    ds = _dataset_or_404(ds_id)
    try:
        raw = load_df(ds["path"], ds.get("sheet_name"))
    except Exception:
        log.exception("read failed")
        raise HTTPException(422, "Could not read the stored file.")
    df, mapping, derived = clean(raw)
    return ds, raw, df, mapping, derived


def _register(raw: pd.DataFrame, filename: str, path: Path, is_demo=False, name=None, sheet_name=None) -> dict:
    ds_id = db.add_dataset(name or filename, filename, path, len(raw), raw.shape[1], is_demo, sheet_name)
    return db.get_dataset(ds_id)


@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@router.post("/workbook/sheets")
async def workbook_sheets(file: UploadFile = File(...)):
    fname = Path(file.filename or "upload").name
    if not fname.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(400, "Worksheet discovery is available for XLSX and XLSM workbooks.")
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 10 MB).")
    try:
        return {"sheets": workbook_sheets_from_bytes(content, fname)}
    except Exception:
        log.exception("workbook inspection failed")
        raise HTTPException(422, "Could not inspect workbook sheets. Check that the file is valid.")


@router.post("/upload")
async def upload(file: UploadFile = File(...), sheet_name: Optional[str] = Form(None)):
    fname = Path(file.filename or "upload").name
    if not fname.lower().endswith(ALLOWED):
        raise HTTPException(400, "Unsupported file type. Please upload a .csv, .xlsx or .xlsm file.")
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 10 MB).")
    if not content:
        raise HTTPException(400, "The file is empty.")
    try:
        if fname.lower().endswith((".xlsx", ".xlsm")) and sheet_name is None:
            sheets = workbook_sheets_from_bytes(content, fname)
            if sheets:
                sheet_name = sheets[0]
        raw = read_file(content, fname, sheet_name)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        log.exception("parse failed")
        raise HTTPException(422, "Could not parse the file. Check that it is a valid CSV or XLSX.")
    if raw.empty or raw.shape[1] == 0:
        raise HTTPException(422, "The file contains no data.")
    ext = Path(fname).suffix.lower()
    path = db.STORAGE_DIR / f"{uuid.uuid4().hex}{ext}"
    path.write_bytes(content)
    selected_sheet = sheet_name if fname.lower().endswith((".xlsx", ".xlsm")) else None
    return _register(raw, fname, path, sheet_name=selected_sheet)


def make_demo_df() -> pd.DataFrame:
    rng = np.random.default_rng(42)
    products = {
        "Wireless Mouse": ("Electronics", 180), "USB-C Hub": ("Electronics", 320),
        "Bluetooth Speaker": ("Electronics", 450), "Desk Lamp": ("Home", 220),
        "Office Chair": ("Home", 1200), "Notebook Pack": ("Stationery", 60),
        "Gel Pens (12)": ("Stationery", 45), "Backpack": ("Accessories", 380),
        "Water Bottle": ("Accessories", 90),
    }
    regions = ["Casablanca", "Rabat", "Marrakech", "Tangier"]
    dates = pd.date_range("2025-01-01", "2026-06-30", freq="D")
    rows = []
    order = 1000
    for _ in range(700):
        d = dates[rng.integers(len(dates))]
        # mild growth + seasonality via acceptance weighting
        w = 0.6 + (d - dates[0]).days / len(dates) * 0.8 + 0.2 * np.sin(d.month / 12 * 2 * np.pi)
        if rng.random() > w / 1.6:
            continue
        p = rng.choice(list(products))
        cat, price = products[p]
        qty = int(rng.integers(1, 6))
        order += 1
        rows.append({
            "order_id": f"ORD-{order}", "order_date": d.strftime("%Y-%m-%d"), "product": p,
            "category": cat, "quantity": qty, "unit_price": price,
            "revenue": qty * price, "region": rng.choice(regions),
        })
    return pd.DataFrame(rows).sort_values("order_date").reset_index(drop=True)


@router.post("/demo")
def load_demo():
    raw = make_demo_df()
    path = db.STORAGE_DIR / f"demo_{uuid.uuid4().hex[:8]}.csv"
    raw.to_csv(path, index=False)
    return _register(raw, "demo_retail_dataset.csv", path, is_demo=True, name="DEMO DATA – Retail (synthetic)")


@router.get("/datasets")
def datasets():
    return db.list_datasets()


@router.get("/datasets/{ds_id}/preview")
def preview(ds_id: int, limit: int = Query(50, ge=1, le=500)):
    ds, raw, df, mapping, derived = _load(ds_id)
    head = df.head(limit).copy()
    for c in head.columns:
        if pd.api.types.is_datetime64_any_dtype(head[c]):
            head[c] = head[c].dt.strftime("%Y-%m-%d")
    head = head.astype(object).where(head.notna(), None)
    return {
        "dataset": ds, "quality": quality(raw), "detected_columns": mapping, "derived": derived,
        "selected_sheet": ds.get("sheet_name"),
        "columns": [str(c) for c in df.columns], "rows": head.values.tolist(),
    }


@router.get("/datasets/{ds_id}/analysis")
def analysis(ds_id: int, date_from: Optional[str] = None, date_to: Optional[str] = None,
             category: Optional[str] = None):
    ds, raw, df, mapping, derived = _load(ds_id)
    options = {"categories": [], "date_min": None, "date_max": None}
    dimension = category_column(df, mapping)
    if dimension:
        options["category_label"] = dimension
        options["categories"] = sorted(df[dimension].dropna().astype(str).unique().tolist())[:200]
    if "date" in mapping and df[mapping["date"]].notna().any():
        options["date_min"] = df[mapping["date"]].min().strftime("%Y-%m-%d")
        options["date_max"] = df[mapping["date"]].max().strftime("%Y-%m-%d")
    try:
        fdf = apply_filters(df, mapping, date_from, date_to, category)
    except (TypeError, ValueError, pd.errors.OutOfBoundsDatetime):
        raise HTTPException(400, "Invalid filter values.")
    viz = build_charts(fdf, mapping) if len(fdf) else {"charts": [], "notes": ["No rows match the selected filters."]}
    return {
        "dataset": ds, "quality": quality(raw), "detected_columns": mapping, "derived": derived,
        "selected_sheet": ds.get("sheet_name"),
        "kpis": compute_kpis(fdf, mapping) if len(fdf) else [], "filters": options,
        "filtered_rows": int(len(fdf)), **viz,
    }


@router.get("/datasets/{ds_id}/insights")
def insights(ds_id: int):
    ds, raw, df, mapping, _ = _load(ds_id)
    return {"insights": build_insights(raw, df, mapping)}


@router.get("/datasets/{ds_id}/forecast")
def forecast_route(ds_id: int):
    ds, raw, df, mapping, _ = _load(ds_id)
    return forecast(df, mapping)


@router.get("/datasets/{ds_id}/export/csv")
def export_csv(ds_id: int):
    ds, raw, df, mapping, _ = _load(ds_id)
    return Response(csv_bytes(df), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="intellibi_cleaned_{ds_id}.csv"'})


@router.get("/datasets/{ds_id}/export/excel")
def export_excel(ds_id: int):
    ds, raw, df, mapping, _ = _load(ds_id)
    data = excel_bytes(df, compute_kpis(df, mapping), build_insights(raw, df, mapping))
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="intellibi_report_{ds_id}.xlsx"'})
