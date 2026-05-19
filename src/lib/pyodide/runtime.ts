/**
 * Pyodide WASM runtime — replaces the Python subprocess.
 * Loads CPython + scipy/numpy/pandas in WebAssembly inside the renderer process.
 */

import { loadPyodide, type PyodideInterface } from 'pyodide';
import { createLogger } from '../logger';

const log = createLogger('Pyodide');
const LOAD_TIMEOUT_MS = 30_000;

let pyodide: PyodideInterface | null = null;
let initPromise: Promise<PyodideInterface> | null = null;

/** Current loading state exposed to the UI. */
export interface PyodideStatus {
  ready: boolean;
  loading: boolean;
  error: string | null;
  step: string;
}

const listeners = new Set<(s: PyodideStatus) => void>();
let status: PyodideStatus = { ready: false, loading: false, error: null, step: '' };

function emit(next: Partial<PyodideStatus>) {
  status = { ...status, ...next };
  for (const fn of listeners) fn(status);
}

export function onPyodideStatus(fn: (s: PyodideStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => { listeners.delete(fn); };
}

export function getPyodideStatus(): PyodideStatus {
  return status;
}

/**
 * Initialise Pyodide (singleton). Safe to call multiple times.
 * Loads WASM runtime + installs scipy/numpy/pandas via built-in packages.
 */
export async function initPyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const timeout = setTimeout(() => {
      emit({ loading: false, error: 'Pyodide 加载超时（30秒），请检查网络或刷新重试', step: '' });
      initPromise = null;
    }, LOAD_TIMEOUT_MS);

    try {
      log.info('Initializing Pyodide WASM...');
      emit({ loading: true, error: null, step: 'Loading Pyodide WASM...' });

      const indexURL = new URL('./pyodide/', window.location.href).href;
      log.debug(`indexURL: ${indexURL}`);

      const py = await loadPyodide({
        indexURL,
        packageBaseUrl: indexURL,
      });
      log.debug('Pyodide core loaded');
      emit({ step: 'Installing numpy...' });

      await py.loadPackage(['numpy', 'scipy', 'pandas']);
      log.debug('Packages installed');
      emit({ step: 'Importing scipy...' });

      await py.runPythonAsync('import numpy, scipy, pandas');
      log.info('Pyodide ready');

      clearTimeout(timeout);
      pyodide = py;
      emit({ ready: true, loading: false, step: '' });
      return py;
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Pyodide init failed:', msg);
      emit({ loading: false, error: msg, step: '' });
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Execute Python code and return the result.
 * Auto-initialises Pyodide if needed.
 */
export async function runPython<T = unknown>(code: string): Promise<T> {
  const py = await initPyodide();
  return py.runPython(code) as T;
}

/**
 * Execute async Python code and return the result.
 */
export async function runPythonAsync<T = unknown>(code: string): Promise<T> {
  const py = await initPyodide();
  return py.runPythonAsync(code) as T;
}

/**
 * Write binary data into Pyodide's virtual filesystem.
 * Returns the virtual path for use in Python code.
 */
export async function writeFileToFS(path: string, data: Uint8Array): Promise<void> {
  const py = await initPyodide();
  py.FS.writeFile(path, data);
}

/**
 * Read text from Pyodide's virtual filesystem.
 */
export async function readFileFromFS(path: string): Promise<string> {
  const py = await initPyodide();
  return py.FS.readFile(path, { encoding: 'utf8' });
}
