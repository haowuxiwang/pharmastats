"""Control chart analysis module."""

import numpy as np
from typing import List, Dict, Any


def control_chart_analysis(
    values: List[float],
    chart_type: str = "xbar_r"
) -> Dict[str, Any]:
    """
    Generate control chart data and detect violations.

    Args:
        values: List of numerical values (individual measurements or subgroup means)
        chart_type: Type of control chart ('xbar_r', 'xbar_s', 'individual')

    Returns:
        Dictionary containing control chart data and violations
    """
    if not values:
        raise ValueError("Empty data array")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)

    if n < 2:
        raise ValueError("Need at least 2 data points")

    if chart_type == "individual":
        return _individual_chart(arr)
    else:
        # Default to X-bar R chart with subgroup size of 5 or n/5
        subgroup_size = min(5, max(2, n // 5))
        return _xbar_r_chart(arr, subgroup_size)


def _xbar_r_chart(arr: np.ndarray, subgroup_size: int) -> Dict[str, Any]:
    """X-bar and R chart analysis."""
    n = len(arr)

    # Split into subgroups
    n_subgroups = n // subgroup_size
    if n_subgroups < 2:
        # Fall back to individual chart
        return _individual_chart(arr)

    # Trim data to fit complete subgroups
    trimmed = arr[:n_subgroups * subgroup_size]
    subgroups = trimmed.reshape(n_subgroups, subgroup_size)

    # Calculate subgroup means and ranges
    means = np.mean(subgroups, axis=1)
    ranges = np.ptp(subgroups, axis=1)

    # Overall statistics
    x_double_bar = np.mean(means)
    r_bar = np.mean(ranges)

    # Control chart constants (for subgroup sizes 2-10)
    A2 = {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483,
          7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308}
    D3 = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223}
    D4 = {2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004,
          7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777}

    a2 = A2.get(subgroup_size, 0.577)
    d3 = D3.get(subgroup_size, 0)
    d4 = D4.get(subgroup_size, 2.114)

    # X-bar chart limits
    x_ucl = x_double_bar + a2 * r_bar
    x_lcl = x_double_bar - a2 * r_bar

    # R chart limits
    r_ucl = d4 * r_bar
    r_lcl = d3 * r_bar

    # Detect violations
    x_violations = _detect_violations(means, x_double_bar, x_ucl, x_lcl)
    r_violations = _detect_violations(ranges, r_bar, r_ucl, r_lcl)

    return {
        "chart_type": "xbar_r",
        "subgroup_size": subgroup_size,
        "n_subgroups": n_subgroups,
        "xbar_chart": {
            "values": means.tolist(),
            "center": round(float(x_double_bar), 4),
            "ucl": round(float(x_ucl), 4),
            "lcl": round(float(x_lcl), 4),
            "violations": x_violations,
        },
        "r_chart": {
            "values": ranges.tolist(),
            "center": round(float(r_bar), 4),
            "ucl": round(float(r_ucl), 4),
            "lcl": round(float(r_lcl), 4),
            "violations": r_violations,
        },
    }


def _individual_chart(arr: np.ndarray) -> Dict[str, Any]:
    """Individual (I-MR) chart analysis."""
    n = len(arr)

    # Moving ranges
    mr = np.abs(np.diff(arr))
    mr_bar = np.mean(mr)

    # Control limits
    mean = np.mean(arr)
    ucl = mean + 2.66 * mr_bar
    lcl = mean - 2.66 * mr_bar
    mr_ucl = 3.267 * mr_bar

    # Detect violations
    violations = _detect_violations(arr, mean, ucl, lcl)

    return {
        "chart_type": "individual",
        "i_chart": {
            "values": arr.tolist(),
            "center": round(float(mean), 4),
            "ucl": round(float(ucl), 4),
            "lcl": round(float(lcl), 4),
            "violations": violations,
        },
        "mr_chart": {
            "values": mr.tolist(),
            "center": round(float(mr_bar), 4),
            "ucl": round(float(mr_ucl), 4),
            "lcl": 0,
            "violations": [],
        },
    }


def _detect_violations(
    values: np.ndarray,
    center: float,
    ucl: float,
    lcl: float
) -> List[Dict[str, Any]]:
    """
    Detect Western Electric rules violations.

    Rules:
    1. Point beyond 3 sigma
    2. 2 of 3 consecutive points beyond 2 sigma
    3. 4 of 5 consecutive points beyond 1 sigma
    4. 8 consecutive points on one side of center
    """
    violations = []
    n = len(values)
    sigma = (ucl - center) / 3

    for i in range(n):
        # Rule 1: Point beyond 3 sigma
        if values[i] > ucl or values[i] < lcl:
            violations.append({
                "index": i,
                "value": round(float(values[i]), 4),
                "rule": 1,
                "description": "Point beyond 3-sigma control limit",
            })

    # Rule 2: 2 of 3 consecutive points beyond 2 sigma
    for i in range(n - 2):
        window = values[i:i+3]
        beyond_2sigma = np.sum((np.abs(window - center) > 2 * sigma))
        if beyond_2sigma >= 2:
            violations.append({
                "index": i + 1,
                "value": round(float(values[i+1]), 4),
                "rule": 2,
                "description": "2 of 3 consecutive points beyond 2-sigma",
            })

    # Rule 3: 4 of 5 consecutive points beyond 1 sigma
    for i in range(n - 4):
        window = values[i:i+5]
        beyond_1sigma = np.sum((np.abs(window - center) > sigma))
        if beyond_1sigma >= 4:
            violations.append({
                "index": i + 2,
                "value": round(float(values[i+2]), 4),
                "rule": 3,
                "description": "4 of 5 consecutive points beyond 1-sigma",
            })

    # Rule 4: 8 consecutive points on one side of center
    for i in range(n - 7):
        window = values[i:i+8]
        if np.all(window > center) or np.all(window < center):
            violations.append({
                "index": i + 3,
                "value": round(float(values[i+3]), 4),
                "rule": 4,
                "description": "8 consecutive points on one side of center",
            })

    return violations
