import { useDataStore } from '../../stores/dataStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { currentFile, selectedColumn } = useDataStore();
  const { settings } = useSettingsStore();

  return (
    <header
      style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Left: Current file info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentFile && (
          <>
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--color-text)',
              }}
            >
              {currentFile.file_path.split(/[/\\]/).pop()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {currentFile.n_rows} 行 × {currentFile.n_cols} 列
            </span>
            {selectedColumn && (
              <>
                <span style={{ color: 'var(--color-border)' }}>|</span>
                <span
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {selectedColumn}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* AI Status */}
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: settings.ai.enabled ? '#dcfce7' : '#f3f4f6',
            color: settings.ai.enabled ? '#166534' : '#6b7280',
          }}
        >
          AI {settings.ai.enabled ? 'ON' : 'OFF'}
        </span>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          style={{
            padding: '6px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          ⚙️ 设置
        </button>
      </div>
    </header>
  );
}
