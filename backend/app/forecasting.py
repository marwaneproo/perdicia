"""Transparent monthly revenue baseline with a simple holdout evaluation."""
import pandas as pd
from .analysis import monthly_revenue

MIN_MONTHS = 6
HORIZON = 3


def _predict(history: list[float]) -> float:
    return float(sum(history[-3:]) / min(3, len(history)))


def forecast(df, mapping) -> dict:
    monthly = monthly_revenue(df, mapping)
    method = (
        
        "Three-month trailing moving-average baseline, iterated one period at a time. "
        "It uses monthly totals for a detected revenue field, has no seasonality or external-variable model, "
        "Months with no rows are filled as zero; that can mean missing coverage rather than zero activity. "
        "It must not be treated as a guaranteed outcome."
    )
    if monthly is None:
        return {"available": False, "reason": "Forecasting requires a detected date and revenue field.", "method": method}
    if len(monthly) < MIN_MONTHS:
        return {"available": False, "reason": f"Only {len(monthly)} calendar month(s) of coverage were found; at least {MIN_MONTHS} are required.", "method": method}

    values = [float(value) for value in monthly["revenue"]]
    # Hold out the final 20% (at least one period), forecast recursively, and report MAE/MAPE.
    validation_size = max(1, min(3, len(values) // 5))
    train = values[:-validation_size]
    actuals = values[-validation_size:]
    predictions = []
    rolling = list(train)
    for actual in actuals:
        predictions.append(_predict(rolling))
        rolling.append(actual)
    errors = [abs(actual - predicted) for actual, predicted in zip(actuals, predictions)]
    mae = sum(errors) / len(errors)
    nonzero = [(actual, predicted) for actual, predicted in zip(actuals, predictions) if actual != 0]
    mape = (sum(abs(actual - predicted) / abs(actual) for actual, predicted in nonzero) / len(nonzero) * 100) if nonzero else None

    future_values = list(values)
    last_period = monthly["period"].iloc[-1]
    hist = [{"month": row.month, "actual": round(float(row.revenue), 2), "forecast": None} for row in monthly.itertuples()]
    hist[-1]["forecast"] = hist[-1]["actual"]
    future = []
    for offset in range(1, HORIZON + 1):
        prediction = _predict(future_values)
        future_values.append(prediction)
        future.append({"month": (last_period + offset).strftime("%Y-%m"), "forecast": round(prediction, 2)})
        
    return {
        "available": True,
        "method": method,
        "history_months": len(monthly),
        "validation": {"periods": validation_size, "mae": round(mae, 2), "mape_pct": round(mape, 2) if mape is not None else None},
        "data": hist + [{"month": point["month"], "actual": None, "forecast": point["forecast"]} for point in future],
        "forecast": future,
    }
