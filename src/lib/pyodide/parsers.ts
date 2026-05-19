/**
 * File parsing bridge — reads Excel/CSV/PDF via Pyodide WASM (pandas).
 * Files are written to Pyodide's in-memory virtual filesystem before parsing.
 */

import { initPyodide } from './runtime';

const PARSERS_PYTHON = `
import pandas as pd
import json
import io

def parse_csv_from_path(file_path):
    """Parse CSV with auto encoding detection."""
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    df = None
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    if df is None:
        return {"success": False, "error": "Could not decode file with any supported encoding"}
    return _df_to_result(df, file_path)

def parse_excel_from_path(file_path):
    """Parse Excel file."""
    try:
        df = pd.read_excel(file_path, engine='openpyxl')
        return _df_to_result(df, file_path)
    except Exception as e:
        return {"success": False, "error": str(e)}

def parse_csv_from_buffer(buffer_bytes):
    """Parse CSV from bytes with auto encoding detection."""
    encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
    df = None
    for encoding in encodings:
        try:
            df = pd.read_csv(io.BytesIO(buffer_bytes), encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    if df is None:
        return {"success": False, "error": "Could not decode file with any supported encoding"}
    return _df_to_result(df, "uploaded_file")

def parse_excel_from_buffer(buffer_bytes):
    """Parse Excel from bytes."""
    try:
        df = pd.read_excel(io.BytesIO(buffer_bytes), engine='openpyxl')
        return _df_to_result(df, "uploaded_file")
    except Exception as e:
        return {"success": False, "error": str(e)}

def _df_to_result(df, file_path):
    columns = df.columns.tolist()
    n_rows = len(df)
    n_cols = len(columns)
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    data = {}
    for col in columns:
        col_data = df[col].tolist()
        data[str(col)] = [
            None if pd.isna(v) else (float(v) if isinstance(v, (int, float)) else str(v))
            for v in col_data
        ]
    preview = []
    for i in range(min(10, n_rows)):
        row = {}
        for col in columns:
            val = df.iloc[i][col]
            row[str(col)] = None if pd.isna(val) else (float(val) if isinstance(val, (int, float)) else str(val))
        preview.append(row)
    return {
        "success": True, "file_path": str(file_path),
        "n_rows": n_rows, "n_cols": n_cols,
        "columns": [str(c) for c in columns],
        "numeric_columns": [str(c) for c in numeric_cols],
        "data": data, "preview": preview,
    }
`;

let parsersLoaded = false;

async function ensureParsersLoaded(): Promise<void> {
  if (parsersLoaded) return;
  const py = await initPyodide();
  await py.runPythonAsync(PARSERS_PYTHON);
  parsersLoaded = true;
}

/**
 * Detect file type from name/extension.
 */
function detectFileType(fileName: string): 'excel' | 'csv' | 'pdf' | 'unknown' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'unknown';
}

/**
 * Parse a file from its ArrayBuffer content.
 * Works in both browser (dev) and Electron (prod) modes.
 */
export async function parseFile(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<{
  success: boolean;
  file_path: string;
  n_rows: number;
  n_cols: number;
  columns: string[];
  numeric_columns: string[];
  data: Record<string, (number | string | null)[]>;
  preview: Record<string, number | string | null>[];
  error?: string;
}> {
  await ensureParsersLoaded();
  const py = await initPyodide();

  const fileType = detectFileType(fileName);
  const bytes = new Uint8Array(buffer);

  // Write file to Pyodide virtual filesystem
  // Use a fixed path to avoid injection via user-controlled fileName
  const virtualPath = '/tmp/_ps_upload';
  py.FS.writeFile(virtualPath, bytes);

  try {
    let resultJson: string;
    py.globals.set('_ps_file_path', virtualPath);
    py.globals.set('_ps_file_name', fileName);

    if (fileType === 'excel') {
      resultJson = py.runPython(
        'import json; json.dumps(parse_excel_from_path(_ps_file_path))',
      ) as string;
    } else if (fileType === 'csv') {
      resultJson = py.runPython(
        'import json; json.dumps(parse_csv_from_path(_ps_file_path))',
      ) as string;
    } else if (fileType === 'pdf') {
      // PDF parsing requires pdfplumber which may not work in WASM.
      // Return an error suggesting CSV/Excel instead.
      return {
        success: false,
        file_path: fileName,
        n_rows: 0,
        n_cols: 0,
        columns: [],
        numeric_columns: [],
        data: {},
        preview: [],
        error: 'PDF parsing is not supported in WASM mode. Please convert to CSV or Excel first.',
      };
    } else {
      return {
        success: false,
        file_path: fileName,
        n_rows: 0,
        n_cols: 0,
        columns: [],
        numeric_columns: [],
        data: {},
        preview: [],
        error: `Unsupported file type: ${fileName}`,
      };
    }

    return JSON.parse(resultJson);
  } finally {
    // Clean up virtual file
    try {
      py.FS.unlink(virtualPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
