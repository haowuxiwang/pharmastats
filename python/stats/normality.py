"""Normality testing module."""

import numpy as np
from scipy import stats
from typing import List, Dict, Any


def normality_test(values: List[float]) -> Dict[str, Any]:
    """
    Perform normality tests on the data.

    Args:
        values: List of numerical values

    Returns:
        Dictionary containing normality test results
    """
    if not values:
        raise ValueError("Empty data array")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]

    if len(arr) < 3:
        raise ValueError("Need at least 3 data points for normality test")

    n = len(arr)

    # Shapiro-Wilk test (best for n < 5000)
    if n <= 5000:
        sw_stat, sw_p = stats.shapiro(arr)
    else:
        # For large samples, use D'Agostino-Pearson
        sw_stat, sw_p = stats.normaltest(arr)

    # Anderson-Darling test
    ad_result = stats.anderson(arr, dist='norm')

    # Determine normality
    is_normal = sw_p > 0.05

    # Generate histogram data for plotting
    hist_counts, hist_edges = np.histogram(arr, bins='auto')
    hist_x = (hist_edges[:-1] + hist_edges[1:]) / 2

    # Generate normal curve data
    x_range = np.linspace(np.min(arr) - 3*np.std(arr), np.max(arr) + 3*np.std(arr), 100)
    normal_curve_y = stats.norm.pdf(x_range, np.mean(arr), np.std(arr))

    # Q-Q plot data
    theoretical_q = stats.norm.ppf(np.linspace(0.01, 0.99, n))
    sorted_data = np.sort(arr)
    # Standardize
    sorted_standardized = (sorted_data - np.mean(arr)) / np.std(arr)

    return {
        "shapiro_wilk": {
            "statistic": round(float(sw_stat), 4),
            "p_value": round(float(sw_p), 4),
            "is_normal": is_normal,
        },
        "anderson_darling": {
            "statistic": round(float(ad_result.statistic), 4),
            "critical_values": {
                f"{sl}%": round(float(cv), 4)
                for sl, cv in zip(ad_result.significance_level, ad_result.critical_values)
            },
        },
        "is_normal": is_normal,
        "interpretation": "Data follows a normal distribution" if is_normal else "Data does not follow a normal distribution",
        "histogram": {
            "x": hist_x.tolist(),
            "counts": hist_counts.tolist(),
        },
        "normal_curve": {
            "x": x_range.tolist(),
            "y": normal_curve_y.tolist(),
        },
        "qq_plot": {
            "theoretical": theoretical_q.tolist(),
            "sample": sorted_standardized.tolist(),
        },
    }
