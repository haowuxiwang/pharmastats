/**
 * Pyodide WASM backend — replaces the Python subprocess.
 *
 * Usage:
 *   import { initPyodide, onPyodideStatus } from '@/lib/pyodide';
 *   import { descriptiveStats, normalityTest, ... } from '@/lib/pyodide/stats';
 *   import { parseFile } from '@/lib/pyodide/parsers';
 */

export { initPyodide, runPython, runPythonAsync, onPyodideStatus, getPyodideStatus } from './runtime';
export type { PyodideStatus } from './runtime';
export { parseFile } from './parsers';
export {
  descriptiveStats,
  normalityTest,
  outlierDetection,
  processCapability,
  controlChartAnalysis,
  trendAnalysis,
} from './stats';
