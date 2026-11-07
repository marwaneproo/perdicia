"""Dataset-driven chart recommendations with a short rationale for every chart."""
import numpy as np
import pandas as pd

from .analysis import _is_identifier, _numeric_columns

MAX_CHARTS = 6
MAX_CATEGORIES = 12


def _round(value):
    return round(float(value), 3)


def _chart(identifier, chart_type, title, reason, x_key, y_keys, data, x_label=None, y_label=None, layout=None):
    result = {
        "id": identifier, "type": chart_type, "title": title, "reason": reason,
        "xKey": x_key, "yKeys": y_keys, "data": data,
    }
    if x_label:
        result["xLabel"] = x_label
    if y_label:
        result["yLabel"] = y_label
    if layout:
        result["layout"] = layout
    return result


def _label(series: pd.Series) -> str:
    return str(series.name)


def _safe_records(frame: pd.DataFrame) -> list[dict]:
    frame = frame.replace([np.inf, -np.inf], np.nan).dropna(how="all")
    return frame.astype(object).where(pd.notna(frame), None).to_dict(orient="records")


def build_charts(df: pd.DataFrame, mapping: dict) -> dict:
    charts, notes = [], []
    if df.empty:
        return {"charts": [], "notes": ["No rows are available for visualization."]}

    measures = _numeric_columns(df, mapping)
    dimension_candidates = [
        c for c in df.columns
        if c != mapping.get("date") and not pd.api.types.is_numeric_dtype(df[c])
        and 1 < df[c].nunique(dropna=True) <= MAX_CATEGORIES
        and not _is_identifier(str(c), df[c])
    ]
    date_column = mapping.get("date")

    # A time series is recommended only for a parsed date and a numeric measure.
    if date_column and date_column in df and measures:
        measure = mapping.get("revenue") if mapping.get("revenue") in measures else measures[0]
        time_data = df[[date_column, measure]].dropna().sort_values(date_column)
        if len(time_data) >= 3 and time_data[date_column].nunique() >= 3:
            span = (time_data[date_column].max() - time_data[date_column].min()).days
            frequency = "D" if span <= 60 else "W" if span <= 730 else "M"
            grouped = time_data.set_index(date_column)[measure].resample(frequency)
            # Totals are appropriate for explicitly detected additive business metrics;
            # means provide a conservative default for arbitrary continuous measurements.
            series = grouped.sum() if measure == mapping.get("revenue") or measure == mapping.get("quantity") or measure == mapping.get("profit") else grouped.mean()
            series = series.dropna()
            if len(series) >= 3:
                label_format = "%Y-%m-%d" if frequency == "D" else ("%Y-W%V" if frequency == "W" else "%Y-%m")
                data = [{"period": key.strftime(label_format), measure: _round(value)} for key, value in series.items()]
                aggregation = "total" if measure in (mapping.get("revenue"), mapping.get("quantity"), mapping.get("profit")) else "average"
                charts.append(_chart(
                    "time_series", "line", f"{aggregation.title()} {measure} over time",
                    f"{measure} is numeric and {date_column} contains ordered dates; values are grouped into time periods.",
                    "period", [measure], data, "Time period", measure,
                ))
        else:
            notes.append("A date column was detected, but it has too few distinct dates for a time-series chart.")
    elif date_column:
        notes.append("A date column is available, but no varying numeric measure was found for a time-series chart.")

    # Compare the first meaningful low-cardinality dimensions against a detected metric.
    measure = mapping.get("revenue") if mapping.get("revenue") in measures else (measures[0] if measures else None)
    if measure:
        for dimension in dimension_candidates[:2]:
            additive = measure in (mapping.get("revenue"), mapping.get("quantity"), mapping.get("profit"), mapping.get("cost"))
            source_groups = df.groupby(dimension, dropna=True)[measure]
            grouped = source_groups.agg("sum" if additive else "mean").sort_values(ascending=False).head(MAX_CATEGORIES)
            totals = source_groups.sum().reindex(grouped.index)
            aggregation = "Total" if additive else "Average"
            if len(grouped) >= 2:
                data = [{"name": str(name), measure: _round(value)} for name, value in grouped.items()]
                if additive:
                    data = [{"name": str(name), measure: _round(value)} for name, value in totals.items()]
                charts.append(_chart(
                    f"compare_{_label(df[dimension])}", "bar", f"{aggregation} {measure} by {dimension}",
                    f"{dimension} has {df[dimension].nunique(dropna=True)} distinct groups; {measure} is shown as a {aggregation.lower()} within each group.",
                    "name", [measure], data, dimension, f"{aggregation} {measure}", "vertical",
                ))
                shares = totals if additive else grouped
                if 2 <= len(shares) <= 6 and (shares >= 0).all() and shares.sum() > 0:
                    pie_data = [{"name": str(name), measure: _round(value)} for name, value in shares.items()]
                    charts.append(_chart(
                        f"share_{_label(df[dimension])}", "pie", f"{measure} share by {dimension}",
                        f"A part-to-whole view is suitable because there are only {len(shares)} non-negative groups.",
                        "name", [measure], pie_data, dimension, measure,
                    ))
    else:
        # Without a valid measure, show category counts rather than inventing a KPI.
        for dimension in dimension_candidates[:2]:
            counts = df[dimension].value_counts().head(MAX_CATEGORIES)
            if len(counts) >= 2:
                data = [{"name": str(name), "count": int(value)} for name, value in counts.items()]
                charts.append(_chart(
                    f"count_{_label(df[dimension])}", "bar", f"Records by {dimension}",
                    f"No numeric measure was detected; this chart shows record counts across {dimension}.",
                    "name", ["count"], data, dimension, "Records", "vertical",
                ))

    # A histogram represents the shape of a real, varying numeric distribution.
    for numeric_column in measures[:2]:
        values = df[numeric_column].replace([np.inf, -np.inf], np.nan).dropna()
        if len(values) >= 10 and values.nunique() >= 5:
            bins = min(12, max(5, int(np.sqrt(len(values)))))
            counts, edges = np.histogram(values, bins=bins)
            data = [{
                "bin": f"{edges[index]:.3g}–{edges[index + 1]:.3g}", "count": int(counts[index]),
            } for index in range(len(counts))]
            charts.append(_chart(
                f"distribution_{numeric_column}", "bar", f"Distribution of {numeric_column}",
                f"A histogram is useful because {numeric_column} has {len(values)} observations and {values.nunique()} distinct values.",
                "bin", ["count"], data, numeric_column, "Records",
            ))

    # Relationships are only shown when two independent numeric measures vary.
    if len(measures) >= 2:
        x_column, y_column = measures[:2]
        paired = df[[x_column, y_column]].replace([np.inf, -np.inf], np.nan).dropna()
        if len(paired) >= 10 and paired[x_column].nunique() > 1 and paired[y_column].nunique() > 1:
            if len(paired) > 500:
                paired = paired.sample(500, random_state=17)
            data = [{"x": _round(x), "y": _round(y)} for x, y in paired.itertuples(index=False, name=None)]
            charts.append(_chart(
                "numeric_relationship", "scatter", f"{y_column} vs {x_column}",
                f"A scatter plot is appropriate because both {x_column} and {y_column} are varying numeric measures.",
                "x", ["y"], data, x_column, y_column,
            ))

    if not charts:
        notes.append("No suitable chart was identified. Add a varying numeric measure or a category with multiple values.")
    return {"charts": charts[:MAX_CHARTS], "notes": notes}
