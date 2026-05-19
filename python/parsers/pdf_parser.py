"""PDF file parser with OCR support."""

import re
from typing import Dict, Any, List, Optional
import numpy as np


def parse_pdf(file_path: str) -> Dict[str, Any]:
    """
    Parse a PDF file and extract tabular data.

    Args:
        file_path: Path to the PDF file

    Returns:
        Dictionary containing parsed data and metadata
    """
    try:
        import pdfplumber

        tables = []
        all_text = []

        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                text = page.extract_text()
                if text:
                    all_text.append({
                        "page": page_num + 1,
                        "text": text
                    })

                # Extract tables
                page_tables = page.extract_tables()
                for table in page_tables:
                    if table and len(table) > 1:
                        # Clean table data
                        cleaned = []
                        for row in table:
                            cleaned_row = []
                            for cell in row:
                                if cell is None:
                                    cleaned_row.append("")
                                else:
                                    cleaned_row.append(str(cell).strip())
                            cleaned.append(cleaned_row)

                        tables.append({
                            "page": page_num + 1,
                            "data": cleaned,
                        })

        if not tables:
            # No tables found, try OCR
            return _try_ocr(file_path)

        # Convert best table to structured data
        best_table = max(tables, key=lambda t: len(t["data"]))
        headers = best_table["data"][0] if best_table["data"] else []
        rows = best_table["data"][1:] if len(best_table["data"]) > 1 else []

        # Try to convert numeric columns
        data = {}
        numeric_cols = []

        for col_idx, header in enumerate(headers):
            col_values = []
            is_numeric = True

            for row in rows:
                if col_idx < len(row):
                    val = row[col_idx]
                    try:
                        num_val = float(val.replace(',', '').replace('%', ''))
                        col_values.append(num_val)
                    except (ValueError, AttributeError):
                        col_values.append(val)
                        is_numeric = False
                else:
                    col_values.append(None)

            if is_numeric and col_values:
                numeric_cols.append(header)

            data[header] = col_values

        return {
            "success": True,
            "file_path": file_path,
            "n_rows": len(rows),
            "n_cols": len(headers),
            "columns": headers,
            "numeric_columns": numeric_cols,
            "data": data,
            "preview": [
                {headers[j]: rows[i][j] if j < len(rows[i]) else None
                 for j in range(len(headers))}
                for i in range(min(10, len(rows)))
            ],
            "source": "pdfplumber",
        }

    except ImportError:
        return {
            "success": False,
            "error": "pdfplumber not installed. Run: pip install pdfplumber"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


def _try_ocr(file_path: str) -> Dict[str, Any]:
    """Try OCR for scanned PDFs."""
    try:
        import fitz  # PyMuPDF
        from rapidocr_onnxruntime import RapidOCR

        ocr = RapidOCR()
        doc = fitz.open(file_path)

        all_text = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
            img_bytes = pix.tobytes("png")

            # Run OCR
            result, _ = ocr(img_bytes)
            if result:
                page_text = "\n".join([line[1] for line in result])
                all_text.append({
                    "page": page_num + 1,
                    "text": page_text
                })

        doc.close()

        # Try to parse numbers from OCR text
        all_numbers = []
        for page_data in all_text:
            numbers = re.findall(r'[\d]+\.?\d*', page_data["text"])
            all_numbers.extend([float(n) for n in numbers])

        return {
            "success": True,
            "file_path": file_path,
            "source": "ocr",
            "pages": all_text,
            "extracted_numbers": all_numbers[:100],  # Limit to first 100 numbers
            "n_rows": len(all_text),
            "n_cols": 0,
            "columns": [],
            "numeric_columns": [],
            "data": {},
            "preview": [],
            "message": "OCR extracted text. Numbers detected but table structure unclear. Manual column mapping may be needed.",
        }

    except ImportError:
        return {
            "success": False,
            "error": "OCR libraries not installed. Run: pip install PyMuPDF rapidocr-onnxruntime"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"OCR failed: {str(e)}"
        }
