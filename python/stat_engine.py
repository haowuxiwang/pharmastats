"""
PharmaStats - Python Statistical Engine
Communicates with Electron via stdin/stdout JSON protocol.
"""

import json
import sys
import traceback
from typing import Any, Dict

from stats.descriptive import descriptive_stats
from stats.normality import normality_test
from stats.outlier import outlier_detection
from stats.capability import process_capability
from stats.control_chart import control_chart_analysis
from stats.trend import trend_analysis
from parsers.excel_parser import parse_excel
from parsers.csv_parser import parse_csv
from parsers.pdf_parser import parse_pdf


def process_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single analysis request."""
    command = request.get('command')
    data = request.get('data', {})
    request_id = request.get('id', '')

    try:
        result = None

        if command == 'parse_excel':
            result = parse_excel(data.get('file_path', ''))
        elif command == 'parse_csv':
            result = parse_csv(data.get('file_path', ''))
        elif command == 'parse_pdf':
            result = parse_pdf(data.get('file_path', ''))
        elif command == 'descriptive':
            result = descriptive_stats(data.get('values', []))
        elif command == 'normality':
            result = normality_test(data.get('values', []))
        elif command == 'outlier':
            result = outlier_detection(data.get('values', []))
        elif command == 'capability':
            result = process_capability(
                data.get('values', []),
                data.get('usl'),
                data.get('lsl'),
                data.get('target')
            )
        elif command == 'control_chart':
            result = control_chart_analysis(
                data.get('values', []),
                data.get('chart_type', 'xbar_r')
            )
        elif command == 'trend':
            result = trend_analysis(data.get('values', []))
        elif command == 'ping':
            result = {'status': 'ok', 'message': 'Python engine ready'}
        else:
            return {
                'id': request_id,
                'success': False,
                'error': f'Unknown command: {command}'
            }

        return {
            'id': request_id,
            'success': True,
            'result': result
        }

    except Exception as e:
        return {
            'id': request_id,
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }


def main():
    """Main loop: read JSON from stdin, write results to stdout."""
    # Send ready signal
    print(json.dumps({'type': 'ready'}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            response = process_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError as e:
            error_response = {
                'id': None,
                'success': False,
                'error': f'Invalid JSON: {str(e)}'
            }
            print(json.dumps(error_response), flush=True)


if __name__ == '__main__':
    main()
