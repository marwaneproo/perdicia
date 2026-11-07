"""Rule-based insights use measured dataset facts and are not an external AI service."""
import numpy as np
import pandas as pd

from .analysis import _numeric_columns, monthly_revenue, quality


def _fmt(value):
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def build_insights(raw, df, mapping) -> list:
    insights = []

    def add(kind, title, text, severity="info"):
        insights.append({"type": kind, "title": title, "text": text, "severity": severity})

    profile = quality(raw)
    add("fact", "Dataset overview", f"The imported dataset contains {profile['rows']:,} rows and {profile['columns']:,} columns.")
    measures = _numeric_columns(df, mapping)
    if measures:
        column = mapping.get("revenue") if mapping.get("revenue") in measures else measures[0]
        series = df[column].replace([np.inf, -np.inf], np.nan).dropna()
        if len(series):
            add("fact", f"{column} summary", f"Across {len(series):,} valid values, the mean is {_fmt(series.mean())} and the median is {_fmt(series.median())} (range {_fmt(series.min())} to {_fmt(series.max())}).")
            if len(series) >= 10:
                q1, q3 = series.quantile([0.25, 0.75])
                iqr = q3 - q1
                n_outliers = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum()) if iqr else 0
                if n_outliers:
                    add("fact", "Potential outliers", f"{n_outliers:,} values in {column} fall outside the 1.5×IQR rule. This is a review signal, not proof of incorrect data.", "warning")
                    add("recommendation", "Review flagged values", f"Inspect the unusual {column} records against their source before excluding or changing them.")

    dimension = mapping.get("category") or mapping.get("product") or mapping.get("region")
    if dimension and measures:
        metric = mapping.get("revenue") if mapping.get("revenue") in measures else measures[0]
        additive = metric in (mapping.get("revenue"), mapping.get("quantity"), mapping.get("profit"), mapping.get("cost"))
        grouped = df.groupby(dimension, dropna=True)[metric].agg("sum" if additive else "mean").sort_values(ascending=False)
        if len(grouped) >= 2 and grouped.abs().sum() != 0:
            share = abs(grouped.iloc[0]) / abs(grouped).sum() * 100
            add("fact", f"Largest {dimension} group", f"'{grouped.index[0]}' has the highest {('total' if additive else 'average')} {metric} at {_fmt(grouped.iloc[0])}.", "positive")
            if share >= 60:
                add("recommendation", "Concentration to review", f"The leading {dimension} accounts for {share:.1f}% of absolute {metric} across groups. Consider whether that concentration is expected.", "warning")

    trend = monthly_revenue(df, mapping)
    if trend is not None and len(trend) >= 2:
        previous, current = float(trend["revenue"].iloc[-2]), float(trend["revenue"].iloc[-1])
        if previous:
            change = (current - previous) / abs(previous) * 100
            add("fact", "Latest monthly change", f"Detected revenue changed from {_fmt(previous)} in {trend['month'].iloc[-2]} to {_fmt(current)} in {trend['month'].iloc[-1]} ({change:+.1f}%).", "positive" if change >= 0 else "warning")
            if change <= -10:
                add("recommendation", "Investigate the decrease", "The latest month is at least 10% below the previous month. Check coverage, timing and the source before treating this as a real decline.", "warning")
        best = trend.loc[trend["revenue"].idxmax()]
        add("fact", "Highest observed month", f"{best['month']} has the highest detected monthly revenue ({_fmt(best['revenue'])}).")

    if profile["missing_values"]:
        add("fact", "Missing data", f"{profile['missing_values']:,} cells are missing ({profile['missing_pct']}% of all cells).", "warning")
        add("recommendation", "Inspect incomplete fields", "Review the per-column missing-value counts and decide whether each field needs correction, filtering, or a documented imputation.")
    if profile["duplicate_rows"]:
        add("fact", "Duplicate records", f"{profile['duplicate_rows']:,} exact duplicate rows were found. The source and analysis views preserve them; review before any optional cleaning.", "warning")
    if not profile["missing_values"] and not profile["duplicate_rows"]:
        add("fact", "Basic quality checks", "No missing cells or exact duplicate rows were detected.", "positive")
    if not measures:
        add("recommendation", "Add a numeric measure", "No varying numeric measure was detected, so numeric summaries and comparisons are limited.")

    return insights
