"""Outlier detection module."""

import numpy as np
from scipy import stats
from typing import List, Dict, Any


def outlier_detection(values: List[float]) -> Dict[str, Any]:
    """
    Detect outliers using multiple methods.

    Args:
        values: List of numerical values

    Returns:
        Dictionary containing outlier detection results
    """
    if not values:
        raise ValueError("Empty data array")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)

    if n < 3:
        raise ValueError("Need at least 3 data points for outlier detection")

    outliers = {}

    # 1. IQR Method
    q1 = np.percentile(arr, 25)
    q3 = np.percentile(arr, 75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    iqr_outliers = np.where((arr < lower_bound) | (arr > upper_bound))[0]

    outliers["iqr"] = {
        "indices": iqr_outliers.tolist(),
        "values": arr[iqr_outliers].tolist(),
        "lower_bound": round(float(lower_bound), 4),
        "upper_bound": round(float(upper_bound), 4),
    }

    # 2. Grubbs Test (for single outlier)
    if n >= 3:
        mean = np.mean(arr)
        std = np.std(arr, ddof=1)

        # Find the value furthest from mean
        abs_diff = np.abs(arr - mean)
        max_idx = np.argmax(abs_diff)
        g_stat = abs_diff[max_idx] / std

        # Critical value for Grubbs test (two-sided, alpha=0.05)
        t_crit = stats.t.ppf(1 - 0.05 / (2 * n), n - 2)
        g_crit = ((n - 1) / np.sqrt(n)) * np.sqrt(t_crit**2 / (n - 2 + t_crit**2))

        grubbs_outlier = int(max_idx) if g_stat > g_crit else None

        outliers["grubbs"] = {
            "outlier_index": grubbs_outlier,
            "outlier_value": round(float(arr[max_idx]), 4) if grubbs_outlier is not None else None,
            "g_statistic": round(float(g_stat), 4),
            "critical_value": round(float(g_crit), 4),
            "is_outlier": grubbs_outlier is not None,
        }

    # 3. Dixon's Q Test (for small samples, n <= 25)
    if 3 <= n <= 25:
        sorted_arr = np.sort(arr)
        sorted_indices = np.argsort(arr)

        # Q-test for smallest value
        if n >= 3:
            q_low = (sorted_arr[1] - sorted_arr[0]) / (sorted_arr[-1] - sorted_arr[0])
            q_high = (sorted_arr[-1] - sorted_arr[-2]) / (sorted_arr[-1] - sorted_arr[0])

            # Critical values for Dixon's Q test (alpha=0.05, n=3-25)
            q_critical = {
                3: 0.941, 4: 0.765, 5: 0.642, 6: 0.560, 7: 0.507,
                8: 0.468, 9: 0.437, 10: 0.412, 11: 0.392, 12: 0.376,
                13: 0.361, 14: 0.349, 15: 0.338, 16: 0.329, 17: 0.320,
                18: 0.313, 19: 0.306, 20: 0.300, 21: 0.295, 22: 0.290,
                23: 0.285, 24: 0.281, 25: 0.277
            }

            q_crit = q_critical.get(n, 0.3)

            dixon_outliers = []
            if q_low > q_crit:
                dixon_outliers.append({
                    "index": int(sorted_indices[0]),
                    "value": round(float(sorted_arr[0]), 4),
                    "type": "low"
                })
            if q_high > q_crit:
                dixon_outliers.append({
                    "index": int(sorted_indices[-1]),
                    "value": round(float(sorted_arr[-1]), 4),
                    "type": "high"
                })

            outliers["dixon_q"] = {
                "outliers": dixon_outliers,
                "q_low": round(float(q_low), 4),
                "q_high": round(float(q_high), 4),
                "critical_value": round(float(q_crit), 4),
            }

    # Summary: all unique outlier indices
    all_outlier_indices = set()
    for method_results in outliers.values():
        if "indices" in method_results:
            all_outlier_indices.update(method_results["indices"])
        if "outlier_index" in method_results and method_results["outlier_index"] is not None:
            all_outlier_indices.add(method_results["outlier_index"])
        if "outliers" in method_results:
            for o in method_results["outliers"]:
                all_outlier_indices.add(o["index"])

    return {
        "methods": outliers,
        "summary": {
            "total_outliers": len(all_outlier_indices),
            "outlier_indices": sorted(list(all_outlier_indices)),
            "outlier_values": [round(float(arr[i]), 4) for i in sorted(list(all_outlier_indices))],
        },
    }
