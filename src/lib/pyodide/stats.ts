/**
 * Statistical analysis bridge — calls Python scipy/numpy code via Pyodide WASM.
 * Embeds the original Python source from python/stats/ so the algorithms are identical.
 */

import { initPyodide } from './runtime';

// ── Embedded Python code (from python/stats/*.py) ──────────────────────────

const STATS_PYTHON = `
import numpy as np
from scipy import stats as sp_stats
import json

# ── descriptive.py ──
def descriptive_stats(values):
    if not values:
        raise ValueError("Empty data array")
    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    if len(arr) == 0:
        raise ValueError("No valid data points after removing NaN")
    n = len(arr)
    mean = float(np.mean(arr))
    median = float(np.median(arr))
    std = float(np.std(arr, ddof=1)) if n > 1 else 0.0
    rsd = (std / mean * 100) if mean != 0 else 0.0
    if n > 1:
        se = std / np.sqrt(n)
        ci_lower, ci_upper = sp_stats.t.interval(0.95, df=n-1, loc=mean, scale=se)
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
        "skewness": round(float(sp_stats.skew(arr)), 4),
        "kurtosis": round(float(sp_stats.kurtosis(arr)), 4),
    }

# ── normality.py ──
def normality_test(values):
    if not values:
        raise ValueError("Empty data array")
    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    if len(arr) < 3:
        raise ValueError("Need at least 3 data points for normality test")
    n = len(arr)
    if n <= 5000:
        sw_stat, sw_p = sp_stats.shapiro(arr)
    else:
        sw_stat, sw_p = sp_stats.normaltest(arr)
    ad_result = sp_stats.anderson(arr, dist='norm')
    is_normal = sw_p > 0.05
    hist_counts, hist_edges = np.histogram(arr, bins='auto')
    hist_x = (hist_edges[:-1] + hist_edges[1:]) / 2
    x_range = np.linspace(np.min(arr) - 3*np.std(arr), np.max(arr) + 3*np.std(arr), 100)
    normal_curve_y = sp_stats.norm.pdf(x_range, np.mean(arr), np.std(arr))
    theoretical_q = sp_stats.norm.ppf(np.linspace(0.01, 0.99, n))
    sorted_data = np.sort(arr)
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
        "histogram": {"x": hist_x.tolist(), "counts": hist_counts.tolist()},
        "normal_curve": {"x": x_range.tolist(), "y": normal_curve_y.tolist()},
        "qq_plot": {"theoretical": theoretical_q.tolist(), "sample": sorted_standardized.tolist()},
    }

# ── outlier.py ──
def outlier_detection(values):
    if not values:
        raise ValueError("Empty data array")
    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    if len(arr) < 3:
        raise ValueError("Need at least 3 data points for outlier detection")
    n = len(arr)
    outliers = {}
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
    if n >= 3:
        mean = np.mean(arr)
        std = np.std(arr, ddof=1)
        abs_diff = np.abs(arr - mean)
        max_idx = np.argmax(abs_diff)
        g_stat = abs_diff[max_idx] / std
        t_crit = sp_stats.t.ppf(1 - 0.05 / (2 * n), n - 2)
        g_crit = ((n - 1) / np.sqrt(n)) * np.sqrt(t_crit**2 / (n - 2 + t_crit**2))
        grubbs_outlier = int(max_idx) if g_stat > g_crit else None
        outliers["grubbs"] = {
            "outlier_index": grubbs_outlier,
            "outlier_value": round(float(arr[max_idx]), 4) if grubbs_outlier is not None else None,
            "g_statistic": round(float(g_stat), 4),
            "critical_value": round(float(g_crit), 4),
            "is_outlier": grubbs_outlier is not None,
        }
    if 3 <= n <= 25:
        sorted_arr = np.sort(arr)
        sorted_indices = np.argsort(arr)
        q_low = (sorted_arr[1] - sorted_arr[0]) / (sorted_arr[-1] - sorted_arr[0])
        q_high = (sorted_arr[-1] - sorted_arr[-2]) / (sorted_arr[-1] - sorted_arr[0])
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
            dixon_outliers.append({"index": int(sorted_indices[0]), "value": round(float(sorted_arr[0]), 4), "type": "low"})
        if q_high > q_crit:
            dixon_outliers.append({"index": int(sorted_indices[-1]), "value": round(float(sorted_arr[-1]), 4), "type": "high"})
        outliers["dixon_q"] = {
            "outliers": dixon_outliers,
            "q_low": round(float(q_low), 4),
            "q_high": round(float(q_high), 4),
            "critical_value": round(float(q_crit), 4),
        }
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

# ── capability.py ──
def process_capability(values, usl=None, lsl=None, target=None):
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
    if target is None:
        if usl is not None and lsl is not None:
            target = (usl + lsl) / 2
        elif usl is not None:
            target = mean
        else:
            target = mean
    result = {
        "mean": round(mean, 4), "std_within": round(std_within, 4), "std_overall": round(std_overall, 4),
        "usl": usl, "lsl": lsl, "target": target, "n": n,
    }
    if usl is not None and lsl is not None:
        cp = (usl - lsl) / (6 * std_within) if std_within > 0 else float('inf')
        pp = (usl - lsl) / (6 * std_overall) if std_overall > 0 else float('inf')
        cpu = (usl - mean) / (3 * std_within) if std_within > 0 else float('inf')
        cpl = (mean - lsl) / (3 * std_within) if std_within > 0 else float('inf')
        cpk = min(cpu, cpl)
        ppu = (usl - mean) / (3 * std_overall) if std_overall > 0 else float('inf')
        ppl = (mean - lsl) / (3 * std_overall) if std_overall > 0 else float('inf')
        ppk = min(ppu, ppl)
        result.update({"cp": round(cp, 4), "cpk": round(cpk, 4), "cpu": round(cpu, 4), "cpl": round(cpl, 4),
                        "pp": round(pp, 4), "ppk": round(ppk, 4), "ppu": round(ppu, 4), "ppl": round(ppl, 4)})
    elif usl is not None:
        cpu = (usl - mean) / (3 * std_within) if std_within > 0 else float('inf')
        ppu = (usl - mean) / (3 * std_overall) if std_overall > 0 else float('inf')
        result.update({"cp": round(cpu, 4), "cpk": round(cpu, 4), "cpu": round(cpu, 4), "cpl": None,
                        "pp": round(ppu, 4), "ppk": round(ppu, 4), "ppu": round(ppu, 4), "ppl": None})
    else:
        cpl = (mean - lsl) / (3 * std_within) if std_within > 0 else float('inf')
        ppl = (mean - lsl) / (3 * std_overall) if std_overall > 0 else float('inf')
        result.update({"cp": round(cpl, 4), "cpk": round(cpl, 4), "cpu": None, "cpl": round(cpl, 4),
                        "pp": round(ppl, 4), "ppk": round(ppl, 4), "ppu": None, "ppl": round(ppl, 4)})
    cpk_val = result.get("cpk", 0) or 0
    if cpk_val >= 1.67:
        rating, rating_desc = "Excellent", "Process is highly capable"
    elif cpk_val >= 1.33:
        rating, rating_desc = "Good", "Process is capable"
    elif cpk_val >= 1.0:
        rating, rating_desc = "Marginal", "Process is marginally capable, improvement recommended"
    else:
        rating, rating_desc = "Poor", "Process is not capable, corrective action required"
    result["rating"] = rating
    result["rating_desc"] = rating_desc
    hist_counts, hist_edges = np.histogram(arr, bins='auto')
    hist_x = (hist_edges[:-1] + hist_edges[1:]) / 2
    result["histogram"] = {"x": hist_x.tolist(), "counts": hist_counts.tolist()}
    return result

# ── control_chart.py ──
def control_chart_analysis(values, chart_type="xbar_r"):
    if not values:
        raise ValueError("Empty data array")
    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)
    if n < 2:
        raise ValueError("Need at least 2 data points")
    if chart_type == "individual":
        return _individual_chart(arr)
    subgroup_size = min(5, max(2, n // 5))
    return _xbar_r_chart(arr, subgroup_size)

def _xbar_r_chart(arr, subgroup_size):
    n = len(arr)
    n_subgroups = n // subgroup_size
    if n_subgroups < 2:
        return _individual_chart(arr)
    trimmed = arr[:n_subgroups * subgroup_size]
    subgroups = trimmed.reshape(n_subgroups, subgroup_size)
    means = np.mean(subgroups, axis=1)
    ranges = np.ptp(subgroups, axis=1)
    x_double_bar = np.mean(means)
    r_bar = np.mean(ranges)
    A2 = {2:1.880,3:1.023,4:0.729,5:0.577,6:0.483,7:0.419,8:0.373,9:0.337,10:0.308}
    D3 = {2:0,3:0,4:0,5:0,6:0,7:0.076,8:0.136,9:0.184,10:0.223}
    D4 = {2:3.267,3:2.574,4:2.282,5:2.114,6:2.004,7:1.924,8:1.864,9:1.816,10:1.777}
    a2 = A2.get(subgroup_size, 0.577)
    d3 = D3.get(subgroup_size, 0)
    d4 = D4.get(subgroup_size, 2.114)
    x_ucl = x_double_bar + a2 * r_bar
    x_lcl = x_double_bar - a2 * r_bar
    r_ucl = d4 * r_bar
    r_lcl = d3 * r_bar
    x_violations = _detect_violations(means, x_double_bar, x_ucl, x_lcl)
    r_violations = _detect_violations(ranges, r_bar, r_ucl, r_lcl)
    return {
        "chart_type": "xbar_r", "subgroup_size": subgroup_size, "n_subgroups": n_subgroups,
        "xbar_chart": {"values": means.tolist(), "center": round(float(x_double_bar), 4),
                        "ucl": round(float(x_ucl), 4), "lcl": round(float(x_lcl), 4), "violations": x_violations},
        "r_chart": {"values": ranges.tolist(), "center": round(float(r_bar), 4),
                     "ucl": round(float(r_ucl), 4), "lcl": round(float(r_lcl), 4), "violations": r_violations},
    }

def _individual_chart(arr):
    n = len(arr)
    mr = np.abs(np.diff(arr))
    mr_bar = np.mean(mr)
    mean = np.mean(arr)
    ucl = mean + 2.66 * mr_bar
    lcl = mean - 2.66 * mr_bar
    mr_ucl = 3.267 * mr_bar
    violations = _detect_violations(arr, mean, ucl, lcl)
    return {
        "chart_type": "individual",
        "i_chart": {"values": arr.tolist(), "center": round(float(mean), 4),
                     "ucl": round(float(ucl), 4), "lcl": round(float(lcl), 4), "violations": violations},
        "mr_chart": {"values": mr.tolist(), "center": round(float(mr_bar), 4),
                      "ucl": round(float(mr_ucl), 4), "lcl": 0, "violations": []},
    }

def _detect_violations(values, center, ucl, lcl):
    violations = []
    n = len(values)
    sigma = (ucl - center) / 3
    for i in range(n):
        if values[i] > ucl or values[i] < lcl:
            violations.append({"index": i, "value": round(float(values[i]), 4), "rule": 1, "description": "Point beyond 3-sigma control limit"})
    for i in range(n - 2):
        window = values[i:i+3]
        beyond_2sigma = np.sum((np.abs(window - center) > 2 * sigma))
        if beyond_2sigma >= 2:
            violations.append({"index": i + 1, "value": round(float(values[i+1]), 4), "rule": 2, "description": "2 of 3 consecutive points beyond 2-sigma"})
    for i in range(n - 4):
        window = values[i:i+5]
        beyond_1sigma = np.sum((np.abs(window - center) > sigma))
        if beyond_1sigma >= 4:
            violations.append({"index": i + 2, "value": round(float(values[i+2]), 4), "rule": 3, "description": "4 of 5 consecutive points beyond 1-sigma"})
    for i in range(n - 7):
        window = values[i:i+8]
        if np.all(window > center) or np.all(window < center):
            violations.append({"index": i + 3, "value": round(float(values[i+3]), 4), "rule": 4, "description": "8 consecutive points on one side of center"})
    return violations

# ── trend.py ──
def trend_analysis(values):
    if not values:
        raise ValueError("Empty data array")
    arr = np.array(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)
    if n < 3:
        raise ValueError("Need at least 3 data points for trend analysis")
    x = np.arange(n, dtype=float)
    slope, intercept, r_value, p_value, std_err = sp_stats.linregress(x, arr)
    predicted = slope * x + intercept
    residuals = arr - predicted
    x_mean = np.mean(x)
    ss_x = np.sum((x - x_mean) ** 2)
    mse = np.sum(residuals ** 2) / (n - 2)
    t_crit = sp_stats.t.ppf(0.975, n - 2)
    se_line = np.sqrt(mse * (1/n + (x - x_mean)**2 / ss_x))
    ci_upper = predicted + t_crit * se_line
    ci_lower = predicted - t_crit * se_line
    se_pred = np.sqrt(mse * (1 + 1/n + (x - x_mean)**2 / ss_x))
    pi_upper = predicted + t_crit * se_pred
    pi_lower = predicted - t_crit * se_pred
    is_significant = p_value < 0.05
    if slope > 0:
        direction = "increasing"
    elif slope < 0:
        direction = "decreasing"
    else:
        direction = "stable"
    return {
        "slope": round(float(slope), 6), "intercept": round(float(intercept), 4),
        "r_squared": round(float(r_value**2), 4), "r_value": round(float(r_value), 4),
        "p_value": round(float(p_value), 4), "std_err": round(float(std_err), 6),
        "is_significant": is_significant, "direction": direction,
        "data": {"x": x.tolist(), "y": arr.tolist()},
        "trend_line": {"x": x.tolist(), "y": predicted.tolist()},
        "confidence_band": {"x": x.tolist(), "upper": ci_upper.tolist(), "lower": ci_lower.tolist()},
        "prediction_band": {"x": x.tolist(), "upper": pi_upper.tolist(), "lower": pi_lower.tolist()},
        "residuals": residuals.tolist(),
    }
`;

// ── State ──

let statsLoaded = false;

/**
 * Load all statistical Python code into the Pyodide runtime.
 * Must be called once before any analysis function.
 */
async function ensureStatsLoaded(): Promise<void> {
  if (statsLoaded) return;
  const py = await initPyodide();
  await py.runPythonAsync(STATS_PYTHON);
  statsLoaded = true;
}

// ── TypeScript wrapper functions ──

export async function descriptiveStats(values: number[]): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  try {
    const result = py.runPython('import json; json.dumps(descriptive_stats(_ps_values))');
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Descriptive stats failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

export async function normalityTest(values: number[]): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  try {
    const result = py.runPython('import json; json.dumps(normality_test(_ps_values))');
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Normality test failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

export async function outlierDetection(values: number[]): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  try {
    const result = py.runPython('import json; json.dumps(outlier_detection(_ps_values))');
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Outlier detection failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

export async function processCapability(
  values: number[],
  usl?: number,
  lsl?: number,
  target?: number,
): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  py.globals.set('_ps_usl', usl ?? null);
  py.globals.set('_ps_lsl', lsl ?? null);
  py.globals.set('_ps_target', target ?? null);
  try {
    const result = py.runPython(
      'import json; json.dumps(process_capability(_ps_values, usl=_ps_usl, lsl=_ps_lsl, target=_ps_target))',
    );
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Process capability analysis failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

export async function controlChartAnalysis(
  values: number[],
  chartType: string = 'xbar_r',
): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  py.globals.set('_ps_chart_type', chartType);
  try {
    const result = py.runPython(
      'import json; json.dumps(control_chart_analysis(_ps_values, chart_type=_ps_chart_type))',
    );
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Control chart analysis failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

export async function trendAnalysis(values: number[]): Promise<Record<string, unknown>> {
  await ensureStatsLoaded();
  const py = await initPyodide();
  py.globals.set('_ps_values', values);
  try {
    const result = py.runPython('import json; json.dumps(trend_analysis(_ps_values))');
    return JSON.parse(result as string);
  } catch (err) {
    throw new Error(`Trend analysis failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}
