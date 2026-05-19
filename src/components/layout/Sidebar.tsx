import { useDataStore } from '../../stores/dataStore';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  { id: 'import', label: '数据导入', icon: '📁' },
  { id: 'descriptive', label: '描述统计', icon: '📊' },
  { id: 'normality', label: '正态检验', icon: '📈' },
  { id: 'outlier', label: '异常检测', icon: '⚠️' },
  { id: 'capability', label: '过程能力', icon: '🎯' },
  { id: 'control-chart', label: '控制图', icon: '📉' },
  { id: 'trend', label: '趋势分析', icon: '📈' },
  { id: 'report', label: '生成报告', icon: '📄' },
];

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const { currentFile } = useDataStore();

  return (
    <aside
      style={{
        width: '220px',
        minWidth: '220px',
        backgroundColor: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 20px 20px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '12px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text)',
            letterSpacing: '-0.5px',
          }}
        >
          PharmaStats
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          QC 数据智能分析
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {modules.map((mod) => {
          const isActive = activeModule === mod.id;
          const isDisabled = mod.id !== 'import' && !currentFile;

          return (
            <button
              key={mod.id}
              onClick={() => !isDisabled && onModuleChange(mod.id)}
              disabled={isDisabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : isDisabled ? 'var(--color-text-secondary)' : 'var(--color-text)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                opacity: isDisabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{mod.icon}</span>
              {mod.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
        }}
      >
        v1.0.0 · 开源免费
      </div>
    </aside>
  );
}
