"""Descriptive statistics module."""

import numpy as np
from scipy import stats
from typing import List, Dict, Any


def descriptive_stats(values: List[float]) -> Dict[str, Any]:
    """
    Calculate descriptive statistics for a dataset.

    Args:
        values: List of numerical values

    Returns:
        Dictionary containing descriptive statistics
    """
    if not values:
        raise ValueError("Empty data array")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]  # Remove NaN values

    if len(arr) == 0:
        raise ValueError("No valid data points after removing NaN")

    n = len(arr)
    mean = float(np.mean(arr))
    median = float(np.median(arr))
    std = float(np.std(arr, ddof=1)) if n > 1 else 0.0
    rsd = (std / mean * 100) if mean != 0 else 0.0

    # Confidence interval (95%)
    if n > 1:
        se = std / np.sqrt(n)
        ci_lower, ci_upper = stats.t.interval(0.95, df=n-1, loc=mean, scale=se)
    else:
        ci_lower, ci_upper = mean, mean

    return {
        "n": n,
        "mean": round(mean, 4),
        "median": round(median, 4),
        "std": round(std, 4),
        "rsd_percent": round(rsd, 2),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "range": round(float(np.ptp(arr)), 4),
        "q1": round(float(np.percentile(arr, 25)), 4),
        "q3": round(float(np.percentile(arr, 75)), 4),
        "iqr": round(float(np.percentile(arr, 75) - np.percentile(arr, 25)), 4),
        "ci_95_lower": round(float(ci_lower), 4),
        "ci_95_upper": round(float(ci_upper), 4),
        "skewness": round(float(stats.skew(arr)), 4),
        "kurtosis": round(float(stats.kurtosis(arr)), 4),
    }
