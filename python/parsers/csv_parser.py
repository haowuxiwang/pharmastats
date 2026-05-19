"""CSV file parser."""

import pandas as pd
from typing import Dict, Any


def parse_csv(file_path: str) -> Dict[str, Any]:
    """
    Parse a CSV file and extract data.

    Args:
        file_path: Path to the CSV file

    Returns:
        Dictionary containing parsed data and metadata
    """
    try:
        # Try different encodings
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

        columns = df.columns.tolist()
        n_rows = len(df)
        n_cols = len(columns)

        # Identify numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

        # Extract data by column
        data = {}
        for col in columns:
            col_data = df[col].tolist()
            data[str(col)] = [
                None if pd.isna(v) else (float(v) if isinstance(v, (int, float)) else str(v))
                for v in col_data
            ]

        # Preview (first 10 rows)
        preview = []
        for i in range(min(10, n_rows)):
            row = {}
            for col in columns:
                val = df.iloc[i][col]
                row[str(col)] = None if pd.isna(val) else (float(val) if isinstance(val, (int, float)) else str(val))
            preview.append(row)

        return {
            "success": True,
            "file_path": file_path,
            "n_rows": n_rows,
            "n_cols": n_cols,
            "columns": [str(c) for c in columns],
            "numeric_columns": [str(c) for c in numeric_cols],
            "data": data,
            "preview": preview,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
