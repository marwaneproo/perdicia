import io
import unittest

import numpy as np
import pandas as pd
from openpyxl import Workbook

from app.analysis import clean, compute_kpis, quality, read_file, workbook_sheets
from app.visualization import build_charts


class GenericDatasetAnalysisTests(unittest.TestCase):
    def test_ambiguous_amount_is_not_assumed_to_be_revenue(self):
        raw = pd.DataFrame({"amount": [12, 18, 25], "cohort": ["A", "B", "A"]})
        cleaned, roles, _ = clean(raw)
        self.assertNotIn("revenue", roles)
        self.assertTrue(all(kpi["format"] != "currency" for kpi in compute_kpis(cleaned, roles)))

    def test_generic_numeric_category_dataset_gets_justified_charts(self):
        raw = pd.DataFrame({
            "segment": ["east", "west", "east", "west", "north"] * 5,
            "temperature_c": np.arange(25, dtype=float),
            "sensor_reading": np.arange(25, dtype=float) * 1.5,
        })
        cleaned, roles, _ = clean(raw)
        charts = build_charts(cleaned, roles)["charts"]
        self.assertTrue(any(chart["type"] == "bar" and "segment" in chart["title"] for chart in charts))
        self.assertTrue(any(chart["type"] == "scatter" for chart in charts))
        self.assertTrue(all(chart["reason"] for chart in charts))

    def test_dates_detected_and_time_chart_uses_actual_columns(self):
        raw = pd.DataFrame({
            "observed_at": pd.date_range("2024-01-01", periods=100, freq="D").astype(str),
            "voltage": np.linspace(10, 20, 100),
        })
        cleaned, roles, _ = clean(raw)
        self.assertEqual(roles.get("date"), "observed_at")
        charts = build_charts(cleaned, roles)["charts"]
        self.assertTrue(any(chart["type"] == "line" and "voltage" in chart["title"] for chart in charts))

    def test_missing_duplicate_and_identifier_profile(self):
        raw = pd.DataFrame({"record_id": ["a", "b", "b"], "score": [1.0, np.nan, np.nan]})
        profile = quality(raw)
        self.assertEqual(profile["missing_values"], 2)
        self.assertEqual(profile["duplicate_rows"], 1)
        self.assertTrue(profile["column_info"][0]["potential_identifier"])

    def test_csv_dialect_and_non_utf8_are_read(self):
        data = "label;score\nalpha;4\nbeta;7\n".encode("cp1252")
        parsed = read_file(data, "sample.csv")
        self.assertEqual(list(parsed.columns), ["label", "score"])
        self.assertEqual(parsed["score"].tolist(), [4, 7])

    def test_workbook_sheets_are_listed_and_selected(self):
        workbook = Workbook()
        first = workbook.active
        first.title = "Summary"
        first.append(["metric", "value"])
        first.append(["visits", 3])
        second = workbook.create_sheet("Details")
        second.append(["region", "value"])
        second.append(["north", 9])
        output = io.BytesIO()
        workbook.save(output)
        content = output.getvalue()
        self.assertEqual(workbook_sheets(content, "multi.xlsx"), ["Summary", "Details"])
        parsed = read_file(content, "multi.xlsx", "Details")
        self.assertEqual(parsed.iloc[0]["region"], "north")
        with self.assertRaises(ValueError):
            read_file(content, "multi.xlsx", "missing")


if __name__ == "__main__":
    unittest.main()

class ForecastAndSemanticsTests(unittest.TestCase):
    def test_generic_measure_kpis_are_not_currency(self):
        raw = pd.DataFrame({"temperature_c": [10, 20, 30, 40]})
        cleaned, roles, _ = clean(raw)
        kpis = compute_kpis(cleaned, roles)
        self.assertTrue(any(kpi["label"] == "Average temperature_c" for kpi in kpis))
        self.assertTrue(all(kpi["format"] != "currency" for kpi in kpis))

    def test_forecast_needs_minimum_coverage_and_reports_holdout(self):
        from app.forecasting import forecast
        short = pd.DataFrame({"date": pd.date_range("2024-01-01", periods=3, freq="MS"), "sales_revenue": [10, 15, 20]})
        cleaned, roles, _ = clean(short)
        self.assertFalse(forecast(cleaned, roles)["available"])
        long = pd.DataFrame({"date": pd.date_range("2024-01-01", periods=12, freq="MS"), "sales_revenue": np.arange(1, 13) * 10})
        cleaned, roles, _ = clean(long)
        result = forecast(cleaned, roles)
        self.assertTrue(result["available"])
        self.assertIn("mae", result["validation"])
        self.assertEqual(len(result["forecast"]), 3)

    def test_month_gaps_are_explicit_zero_total_periods(self):
        from app.analysis import monthly_revenue
        raw = pd.DataFrame({"date": pd.to_datetime(["2024-01-02", "2024-03-05"]), "sales_revenue": [10, 30]})
        cleaned, roles, _ = clean(raw)
        monthly = monthly_revenue(cleaned, roles)
        self.assertEqual(monthly["revenue"].tolist(), [10, 0, 30])

    def test_share_pie_uses_sum_for_additive_measure(self):
        raw = pd.DataFrame({"sales_revenue": [100, 1, 1, 1], "region": ["A", "B", "B", "B"]})
        cleaned, roles, _ = clean(raw)
        charts = build_charts(cleaned, roles)["charts"]
        pie = next(chart for chart in charts if chart["type"] == "pie")
        data = {point["name"]: point["sales_revenue"] for point in pie["data"]}
        self.assertEqual(data, {"A": 100.0, "B": 3.0})

class RobustnessTests(unittest.TestCase):
    def test_numeric_looking_identifiers_remain_categorical(self):
        raw = pd.DataFrame({"sample_code": [str(100000 + i) for i in range(30)], "reading": np.arange(30)})
        cleaned, roles, _ = clean(raw)
        self.assertFalse(pd.api.types.is_numeric_dtype(cleaned["sample_code"]))
        self.assertTrue(quality(raw)["column_info"][0]["potential_identifier"])

    def test_blank_and_duplicate_column_labels_are_stable(self):
        raw = pd.DataFrame([[1, 2, 3], [4, 5, 6]], columns=[" score ", "score", ""])
        cleaned, _, _ = clean(raw)
        self.assertEqual(list(cleaned.columns), ["score", "score_2", "unnamed"])
        self.assertEqual(len(quality(raw)["column_info"]), 3)

    def test_blank_cells_are_counted_as_missing(self):
        raw = pd.DataFrame({"group": ["north", "  ", "south"], "reading": [1, 2, 3]})
        profile = quality(raw)
        self.assertEqual(profile["missing_values"], 1)
        self.assertEqual(profile["column_info"][0]["missing"], 1)

    def test_filter_uses_first_sensible_generic_dimension(self):
        from app.analysis import apply_filters
        raw = pd.DataFrame({"measure": [1, 2, 3, 4], "team": ["north", "south", "north", "south"]})
        cleaned, roles, _ = clean(raw)
        filtered = apply_filters(cleaned, roles, category="north")
        self.assertEqual(filtered["measure"].tolist(), [1, 3])

class ExportSafetyTests(unittest.TestCase):
    def test_spreadsheet_formulas_are_neutralized(self):
        from app.export import csv_bytes, excel_bytes
        from openpyxl import load_workbook
        raw = pd.DataFrame({"=FORMULA": ["=1+1", "  @SUM(A1:A2)", "ordinary", -3]})
        csv = csv_bytes(raw).decode("utf-8-sig")
        self.assertIn("'=FORMULA", csv)
        self.assertIn("'=1+1", csv)
        workbook = load_workbook(io.BytesIO(excel_bytes(raw, [], [])), data_only=False)
        sheet = workbook["Cleaned Data"]
        self.assertEqual(sheet["A1"].value, "'=FORMULA")
        self.assertEqual(sheet["A2"].value, "'=1+1")
        self.assertEqual(sheet["A5"].value, -3)
