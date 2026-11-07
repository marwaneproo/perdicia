"""Dataset loading, conservative semantic inference, profiling, cleaning and KPIs."""
import io
import re
import unicodedata

import numpy as np
import pandas as pd

# Deliberately avoid ambiguous labels such as "amount", "total" and "value".
# Names are suggestions; an inferred role should never be treated as ground truth.
ALIASES = {
    "date": ["date", "datetime", "timestamp", "order_date", "transaction_date", "orderdate", "invoice_date", "sale_date", "created_at", "time"],
    "product": ["product", "product_name", "item", "item_name", "produit"],
    "category": ["category", "product_category", "categorie"],
    "quantity": ["quantity", "qty", "units", "quantite"],
    "revenue": ["revenue", "sales", "sales_revenue", "total_sales", "net_sales", "chiffre_affaires"],
    "unit_price": ["unit_price", "unitprice", "price_per_unit", "prix_unitaire"],
    "cost": ["cost", "unit_cost", "cogs", "cout"],
    "profit": ["profit", "gross_profit", "net_profit", "benefit"],
    "region": ["region", "city", "ville", "store", "location"],
    "customer": ["customer", "customer_name", "client", "customer_id"],
    "order_id": ["order_id", "orderid", "order_number", "invoice_id", "transaction_id"],
}


def _norm(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value).strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def workbook_sheets(content: bytes, filename: str) -> list[str]:
    """List workbook sheets without assuming which sheet contains data."""
    if filename.lower().endswith((".xlsx", ".xlsm")):
        return pd.ExcelFile(io.BytesIO(content), engine="openpyxl").sheet_names
    return ["CSV"]


def read_file(content: bytes, filename: str, sheet_name: str | None = None) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith(".csv"):
        last_error = None
        for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
            try:
                return pd.read_csv(io.BytesIO(content), sep=None, engine="python", encoding=encoding)
            except UnicodeDecodeError as exc:
                last_error = exc
        raise ValueError("Could not decode the CSV file.") from last_error
    if name.endswith((".xlsx", ".xlsm")):
        workbook = pd.ExcelFile(io.BytesIO(content), engine="openpyxl")
        selected = sheet_name if sheet_name is not None else workbook.sheet_names[0]
        if selected not in workbook.sheet_names:
            raise ValueError("The selected worksheet does not exist in this workbook.")
        return pd.read_excel(workbook, sheet_name=selected)
    raise ValueError("Unsupported format. Use CSV, XLSX or XLSM.")


def load_df(path: str, sheet_name: str | None = None) -> pd.DataFrame:
    with open(path, "rb") as f:
        return read_file(f.read(), path, sheet_name)


def _parse_dates(series: pd.Series) -> pd.Series:
    try:
        return pd.to_datetime(series, errors="coerce", format="mixed")
    except (TypeError, ValueError):
        return pd.to_datetime(series, errors="coerce")


def _looks_like_date(series: pd.Series, name: str) -> bool:
    normalized = _norm(name)
    if any(token in normalized.split("_") for token in ("date", "datetime", "timestamp", "time")):
        return True
    sample = series.dropna().astype(str).head(100)
    if len(sample) < 3 or not sample.str.contains(r"[-/:T]", regex=True).mean() >= 0.7:
        return False
    parsed = _parse_dates(sample)
    return parsed.notna().mean() >= 0.8 and parsed.nunique() >= 3


def detect_columns(df: pd.DataFrame) -> dict:
    mapping: dict[str, str] = {}
    normed = {_norm(c): c for c in df.columns}
    for role, names in ALIASES.items():
        for name in names:
            if _norm(name) in normed:
                mapping[role] = normed[_norm(name)]
                break
    if "date" not in mapping:
        for column in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[column]) or _looks_like_date(df[column], str(column)):
                mapping["date"] = column
                break
    return mapping


def _unique_column_names(columns) -> list[str]:
    names, used = [], set()
    for original in columns:
        base = str(original).strip() or "unnamed"
        candidate, suffix = base, 2
        while candidate in used:
            candidate = f"{base}_{suffix}"
            suffix += 1
        used.add(candidate)
        names.append(candidate)
    return names


def clean(df: pd.DataFrame):
    """Return (analysis copy, role suggestions, derived notes); preserve source rows elsewhere."""
    df = df.copy()
    df.columns = _unique_column_names(df.columns)
    df = df.dropna(how="all")
    for column in df.select_dtypes(include=["object", "string"]).columns:
        values = df[column].astype("string").str.strip()
        df[column] = values.mask(values.eq(""), pd.NA)
    mapping = detect_columns(df)
    derived = []
    if "date" in mapping:
        df[mapping["date"]] = _parse_dates(df[mapping["date"]])

    # Parse columns with a strong numeric signal, not arbitrary mixed text.
    for column in df.columns:
        if (column == mapping.get("date") or pd.api.types.is_numeric_dtype(df[column])
                or _is_identifier(str(column), df[column])):
            continue
        parsed = pd.to_numeric(df[column].astype(str).str.replace(",", "", regex=False), errors="coerce")
        present = df[column].notna().sum()
        if present and parsed.notna().sum() / present >= 0.85:
            df[column] = parsed

    for role in ("quantity", "revenue", "unit_price", "cost", "profit"):
        if role in mapping:
            df[mapping[role]] = pd.to_numeric(df[mapping[role]], errors="coerce")
    if "revenue" not in mapping and "quantity" in mapping and "unit_price" in mapping:
        df["revenue"] = df[mapping["quantity"]] * df[mapping["unit_price"]]
        mapping["revenue"] = "revenue"
        derived.append("revenue = quantity × unit_price")
    # Preserve source rows in analysis and exports; report duplicates separately for user review.
    return df.reset_index(drop=True), mapping, derived


def _is_identifier(name: str, series: pd.Series) -> bool:
    tokens = set(_norm(name).split("_"))
    if tokens.intersection({"id", "uuid", "identifier", "key", "code"}):
        return True
    non_null = series.dropna()
    return bool(len(non_null) >= 20 and non_null.nunique() / len(non_null) >= 0.995 and not pd.api.types.is_numeric_dtype(series))


def quality(raw: pd.DataFrame) -> dict:
    raw = raw.copy()
    raw.columns = _unique_column_names(raw.columns)
    for column in raw.select_dtypes(include=["object", "string"]).columns:
        values = raw[column].astype("string").str.strip()
        raw[column] = values.mask(values.eq(""), pd.NA)
    total_cells = int(raw.shape[0] * raw.shape[1]) or 1
    missing = int(raw.isna().sum().sum())
    dup = int(raw.duplicated().sum())
    cols = []
    for column in raw.columns:
        series = raw[column]
        inferred_type = str(series.dtype)
        numeric = series if pd.api.types.is_numeric_dtype(series) else None
        if pd.api.types.is_datetime64_any_dtype(series):
            inferred_type = "datetime"
        elif _looks_like_date(series, str(column)):
            inferred_type = "datetime (inferred)"
        elif numeric is None:
            candidate = pd.to_numeric(series.astype(str).str.replace(",", "", regex=False), errors="coerce")
            present = int(series.notna().sum())
            if present and candidate.notna().sum() / present >= 0.85:
                numeric = candidate
                inferred_type = "numeric (inferred)"
        info = {
            "name": str(column), "dtype": inferred_type,
            "missing": int(series.isna().sum()), "unique": int(series.nunique(dropna=True)),
            "potential_identifier": _is_identifier(str(column), series),
        }
        if numeric is not None:
            values = numeric.replace([np.inf, -np.inf], np.nan).dropna()
            if len(values):
                info["numeric_summary"] = {
                    "min": float(values.min()), "max": float(values.max()),
                    "mean": float(values.mean()), "median": float(values.median()),
                }
                if len(values) >= 10:
                    q1, q3 = values.quantile([0.25, 0.75])
                    iqr = q3 - q1
                    info["outliers_iqr"] = int(((values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)).sum()) if iqr else 0
        cols.append(info)
    score = max(0, round(100 - missing / total_cells * 100 - dup / max(len(raw), 1) * 100, 1))
    return {
        "rows": int(raw.shape[0]), "columns": int(raw.shape[1]),
        "missing_values": missing, "missing_pct": round(missing / total_cells * 100, 2),
        "duplicate_rows": dup, "score": score, "column_info": cols,
    }


def category_column(df: pd.DataFrame, mapping: dict) -> str | None:
    for role in ("category", "product", "region"):
        column = mapping.get(role)
        if column in df and not pd.api.types.is_numeric_dtype(df[column]):
            return column
    for column in df.columns:
        if (column != mapping.get("date") and not pd.api.types.is_numeric_dtype(df[column])
                and 1 < df[column].nunique(dropna=True) <= 100
                and not _is_identifier(str(column), df[column])):
            return str(column)
    return None


def apply_filters(df, mapping, date_from=None, date_to=None, category=None):
    out = df
    if "date" in mapping:
        date_column = mapping["date"]
        if date_from:
            out = out[out[date_column] >= pd.to_datetime(date_from)]
        if date_to:
            out = out[out[date_column] < pd.to_datetime(date_to) + pd.Timedelta(days=1)]
    dimension = category_column(out, mapping)
    if category and dimension:
        out = out[out[dimension].astype(str) == category]
    return out


def _numeric_columns(df: pd.DataFrame, mapping: dict) -> list[str]:
    identifiers = {column for column in df.columns if _is_identifier(str(column), df[column])}
    identifiers.update(column for column in df.columns if any(
        token in {"id", "uuid", "identifier", "key", "code"} for token in _norm(str(column)).split("_")
    ))
    ordered = [mapping[role] for role in ("revenue", "profit", "quantity", "cost", "unit_price") if role in mapping and mapping[role] not in identifiers]
    ordered += [str(c) for c in df.select_dtypes(include="number").columns if c not in ordered and c not in identifiers]
    return [c for c in ordered if c in df and c not in identifiers and df[c].nunique(dropna=True) > 1]


def monthly_revenue(df, mapping) -> pd.DataFrame | None:
    if "date" not in mapping or "revenue" not in mapping:
        return None
    date_column, value_column = mapping["date"], mapping["revenue"]
    data = df.dropna(subset=[date_column, value_column])
    if data.empty:
        return None
    grouped = data.copy()
    grouped["period"] = grouped[date_column].dt.to_period("M")
    monthly = grouped.groupby("period")[value_column].sum()
    periods = pd.period_range(monthly.index.min(), monthly.index.max(), freq="M")
    grouped = monthly.reindex(periods, fill_value=0).rename("revenue").rename_axis("period").reset_index()
    grouped["month"] = grouped["period"].astype(str)
    return grouped


def compute_kpis(df, mapping) -> list:
    if df.empty:
        return []
    kpis = [{"key": "records", "label": "Records", "value": int(len(df)), "format": "number"}]
    revenue = mapping.get("revenue")
    if revenue and revenue in df and df[revenue].notna().any():
        kpis.insert(0, {"key": "revenue", "label": "Total Revenue", "value": float(df[revenue].sum()), "format": "number"})
        if "order_id" in mapping and mapping["order_id"] in df:
            orders = int(df[mapping["order_id"]].nunique())
            kpis.insert(1, {"key": "orders", "label": "Unique Orders", "value": orders, "format": "number"})
            if orders:
                kpis.insert(2, {"key": "aov", "label": "Average Revenue / Order", "value": float(df[revenue].sum() / orders), "format": "number"})
    if "quantity" in mapping and mapping["quantity"] in df and df[mapping["quantity"]].notna().any():
        kpis.append({"key": "quantity", "label": f"Total {mapping['quantity']}", "value": float(df[mapping['quantity']].sum()), "format": "number"})
    if not revenue or revenue not in df or not df[revenue].notna().any():
        for column in _numeric_columns(df, mapping)[:2]:
            kpis.append({"key": f"mean_{column}", "label": f"Average {column}", "value": float(df[column].mean()), "format": "number"})
    trend = monthly_revenue(df, mapping)
    if revenue and trend is not None and len(trend) >= 2 and trend["revenue"].iloc[-2] != 0:
        growth = (trend["revenue"].iloc[-1] - trend["revenue"].iloc[-2]) / abs(trend["revenue"].iloc[-2]) * 100
        kpis.append({"key": "growth", "label": f"Revenue change ({trend['month'].iloc[-1]})", "value": round(float(growth), 2), "format": "percent"})
    return kpis[:5]
