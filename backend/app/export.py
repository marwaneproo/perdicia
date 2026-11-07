import io

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe_text(value):
    if isinstance(value, str) and value.lstrip().startswith(_FORMULA_PREFIXES):
        return "'" + value
    return value


def _spreadsheet_safe(df: pd.DataFrame) -> pd.DataFrame:
    """Prefix formula-like untrusted text so spreadsheet apps do not execute it."""
    safe = df.copy()
    safe.columns = [_safe_text(str(column)) for column in safe.columns]
    for column in safe.select_dtypes(include=["object", "string"]).columns:
        safe[column] = safe[column].map(_safe_text)
    return safe


def csv_bytes(df: pd.DataFrame) -> bytes:
    return _spreadsheet_safe(df).to_csv(index=False).encode("utf-8-sig")


def _style(ws):
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="4F46E5")
        cell.alignment = Alignment(vertical="center")
    for i, col in enumerate(ws.columns, 1):
        width = max((len(str(c.value)) if c.value is not None else 0) for c in list(col)[:200])
        ws.column_dimensions[get_column_letter(i)].width = min(max(width + 2, 10), 50)
    ws.freeze_panes = "A2"


def excel_bytes(df: pd.DataFrame, kpis: list, insights: list) -> bytes:
    summary_rows = [{"Metric": k["label"], "Value": k["value"]} for k in kpis]
    num = df.select_dtypes(include="number")
    stats = num.describe().T.reset_index().rename(columns={"index": "Column"}) if not num.empty else pd.DataFrame()
    ins = pd.DataFrame(insights or [], columns=["type", "title", "text", "severity"])
    ins.columns = ["Type", "Title", "Detail", "Severity"]

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        _spreadsheet_safe(df).to_excel(writer, sheet_name="Cleaned Data", index=False)
        _spreadsheet_safe(pd.DataFrame(summary_rows)).to_excel(writer, sheet_name="Summary Statistics", index=False)
        if not stats.empty:
            _spreadsheet_safe(stats).to_excel(writer, sheet_name="Summary Statistics", index=False, startrow=len(summary_rows) + 3)
        _spreadsheet_safe(ins).to_excel(writer, sheet_name="Business Insights", index=False)
        for ws in writer.book.worksheets:
            _style(ws)
    return buf.getvalue()
