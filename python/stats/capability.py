"""Process capability analysis module."""

import numpy as np
from scipy import stats
from typing import List, Dict, Any, Optional


def process_capability(
    values: List[float],
    usl: Optional[float] = None,
    lsl: Optional[float] = None,
    target: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Calculate process capability indices.

    Args:
        values: List of numerical values
        usl: Upper specification limit
        lsl: Lower specification limit
        target: Target value (optional, defaults to midpoint of USL and LSL)

    Returns:
        Dictionary containing capability analysis results
    """
    if not values:
        raise ValueError("Empty data array")

    if usl is None and lsl is None:
        raise ValueError("At least one specification limit (USL or LSL) is required")

    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)

    if n < 2:
        raise ValueError("Need at least 2 data points")

    mean = float(np.mean(arr))
    std_within = float(np.std(arr, ddof=1))
    std_overall = float(np.std(arr, ddof=0))

    # Use midpoint of specs as target if not specified
    if target is None:
        if usl is not None and lsl is not None:
            target = (usl + lsl) / 2
        elif usl is not None:
            target = mean
        else:
            target = mean

    result = {
        "mean": round(mean, 4),
        "std_within": round(std_within, 4),
        "std_overall": round(std_overall, 4),
        "usl": usl,
        "lsl": lsl,
        "target": target,
        "n": n,
    }

    # Calculate capability indices
    if usl is not None and lsl is not None:
        # Two-sided spec
        cp = (usl - lsl) / (6 * std_within) if std_within > 0 else float('inf')
        pp = (usl - lsl) / (6 * std_overall) if std_overall > 0 else float('inf')

        cpu = (usl - mean) / (3 * std_within) if std_within > 0 else float('inf')
        cpl = (mean - lsl) / (3 * std_within) if std_within > 0 else float('inf')
        cpk = min(cpu, cpl)

        ppu = (usl - mean) / (3 * std_overall) if std_overall > 0 else float('inf')
        ppl = (mean - lsl) / (3 * std_overall) if std_overall > 0 else float('inf')
        ppk = min(ppu, ppl)

        result.update({
            "cp": round(cp, 4),
            "cpk": round(cpk, 4),
            "cpu": round(cpu, 4),
            "cpl": round(cpl, 4),
            "pp": round(pp, 4),
            "ppk": round(ppk, 4),
            "ppu": round(ppu, 4),
            "ppl": round(ppl, 4),
        })
    elif usl is not None:
        # One-sided (upper)
        cpu = (usl - mean) / (3 * std_within) if std_within > 0 else float('inf')
        ppu = (usl - mean) / (3 * std_overall) if std_overall > 0 else float('inf')
        result.update({
            "cp": round(cpu, 4),
            "cpk": round(cpu, 4),
            "cpu": round(cpu, 4),
            "cpl": None,
            "pp": round(ppu, 4),
            "ppk": round(ppu, 4),
            "ppu": round(ppu, 4),
            "ppl": None,
        })
    else:
        # One-sided (lower)
        cpl = (mean - lsl) / (3 * std_within) if std_within > 0 else float('inf')
        ppl = (mean - lsl) / (3 * std_overall) if std_overall > 0 else float('inf')
        result.update({
            "cp": round(cpl, 4),
            "cpk": round(cpl, 4),
            "cpu": None,
            "cpl": round(cpl, 4),
            "pp": round(ppl, 4),
            "ppk": round(ppl, 4),
            "ppu": None,
            "ppl": round(ppl, 4),
        })

    # Capability rating
    cpk = result.get("cpk", 0) or 0
    if cpk >= 1.67:
        rating = "Excellent"
        rating_desc = "Process is highly capable"
    elif cpk >= 1.33:
        rating = "Good"
        rating_desc = "Process is capable"
    elif cpk >= 1.0:
        rating = "Marginal"
        rating_desc = "Process is marginally capable, improvement recommended"
    else:
        rating = "Poor"
        rating_desc = "Process is not capable, corrective action required"

    result["rating"] = rating
    result["rating_desc"] = rating_desc

    # Histogram data for capability plot
    hist_counts, hist_edges = np.histogram(arr, bins='auto')
    hist_x = (hist_edges[:-1] + hist_edges[1:]) / 2

    result["histogram"] = {
        "x": hist_x.tolist(),
        "counts": hist_counts.tolist(),
    }

    return result
