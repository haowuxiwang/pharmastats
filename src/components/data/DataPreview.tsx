import { useDataStore } from '../../stores/dataStore';

export function DataPreview() {
  const { currentFile, selectedColumn, setSelectedColumn } = useDataStore();

  if (!currentFile) return null;

  const columns = currentFile.columns;
  const preview = currentFile.preview || [];

  return (
    <div
      style={{
        backgroundColor: 'var(--color-card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Column selector */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          分析列：
        </span>
        {columns.map((col) => {
          const isNumeric = currentFile.numeric_columns.includes(col);
          const isSelected = selectedColumn === col;

          return (
            <button
              key={col}
              onClick={() => isNumeric && setSelectedColumn(col)}
              disabled={!isNumeric}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected
                  ? 'var(--color-primary)'
                  : isNumeric
                  ? 'var(--color-bg)'
                  : 'var(--color-bg-tertiary)',
                color: isSelected ? 'white' : isNumeric ? 'var(--color-text)' : 'var(--color-text-secondary)',
                cursor: isNumeric ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: isSelected ? 600 : 400,
                opacity: isNumeric ? 1 : 0.6,
              }}
            >
              {col}
              {!isNumeric && ' (文本)'}
            </button>
          );
        })}
      </div>

      {/* Data table */}
      <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderBottom: '1px solid var(--color-border)',
                  position: 'sticky',
                  top: 0,
                  color: 'var(--color-text)',
                }}
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderBottom: '1px solid var(--color-border)',
                    position: 'sticky',
                    top: 0,
                    color: col === selectedColumn ? 'var(--color-primary)' : 'var(--color-text)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {i + 1}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: '6px 12px',
                      borderBottom: '1px solid var(--color-border)',
                      color: col === selectedColumn ? 'var(--color-primary)' : 'var(--color-text)',
                      fontWeight: col === selectedColumn ? 500 : 400,
                    }}
                  >
                    {row[col] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        显示前 {preview.length} 行，共 {currentFile.n_rows} 行
      </div>
    </div>
  );
}
