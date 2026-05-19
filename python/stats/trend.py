"""Trend analysis module."""

import numpy as np
from scipy import stats
from typing import List, Dict, Any


def trend_analysis(values: List[float]) -> Dict[str, Any]:
    """
    Analyze trends in the data using linear regression.

    Args:
        values: List of numerical values (time series)

    Returns:
        Dictionary containing trend analysis results
    """
    if not values:
        raise ValueError("Empty data array")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)

    if n < 3:
        raise ValueError("Need at least 3 data points for trend analysis")

    # Create time index
    x = np.arange(n, dtype=float)

    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, arr)

    # Predicted values
    predicted = slope * x + intercept

    # Residuals
    residuals = arr - predicted

    # Confidence interval for the regression line
    x_mean = np.mean(x)
    ss_x = np.sum((x - x_mean) ** 2)
    mse = np.sum(residuals ** 2) / (n - 2)

    # 95% confidence band
    t_crit = stats.t.ppf(0.975, n - 2)
    se_line = np.sqrt(mse * (1/n + (x - x_mean)**2 / ss_x))
    ci_upper = predicted + t_crit * se_line
    ci_lower = predicted - t_crit * se_line

    # Prediction interval (for individual values)
    se_pred = np.sqrt(mse * (1 + 1/n + (x - x_mean)**2 / ss_x))
    pi_upper = predicted + t_crit * se_pred
    pi_lower = predicted - t_crit * se_pred

    # Trend significance
    is_significant = p_value < 0.05

    # Trend direction
    if slope > 0:
        direction = "increasing"
    elif slope < 0:
        direction = "decreasing"
    else:
        direction = "stable"

    return {
        "slope": round(float(slope), 6),
        "intercept": round(float(intercept), 4),
        "r_squared": round(float(r_value**2), 4),
        "r_value": round(float(r_value), 4),
        "p_value": round(float(p_value), 4),
        "std_err": round(float(std_err), 6),
        "is_significant": is_significant,
        "direction": direction,
        "data": {
            "x": x.tolist(),
            "y": arr.tolist(),
        },
        "trend_line": {
            "x": x.tolist(),
            "y": predicted.tolist(),
        },
        "confidence_band": {
            "x": x.tolist(),
            "upper": ci_upper.tolist(),
            "lower": ci_lower.tolist(),
        },
        "prediction_band": {
            "x": x.tolist(),
            "upper": pi_upper.tolist(),
            "lower": pi_lower.tolist(),
        },
        "residuals": residuals.tolist(),
    }
