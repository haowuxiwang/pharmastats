"""Excel file parser."""

import pandas as pd
from typing import Dict, Any, List


def parse_excel(file_path: str) -> Dict[str, Any]:
    """
    Parse an Excel file and extract data.

    Args:
        file_path: Path to the Excel file

    Returns:
        Dictionary containing parsed data and metadata
    """
    try:
        # Read Excel file
        df = pd.read_excel(file_path, engine='openpyxl')

        # Get basic info
        columns = df.columns.tolist()
        n_rows = len(df)
        n_cols = len(columns)

        # Identify numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()

        # Extract data by column
        data = {}
        for col in columns:
            col_data = df[col].tolist()
            # Convert to native Python types for JSON serialization
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
