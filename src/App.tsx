import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FileUpload } from './components/data/FileUpload';
import { DataPreview } from './components/data/DataPreview';
import { DescriptivePage } from './components/analysis/DescriptivePage';
import { NormalityPage } from './components/analysis/NormalityPage';
import { OutlierPage } from './components/analysis/OutlierPage';
import { CapabilityPage } from './components/analysis/CapabilityPage';
import { ControlChartPage } from './components/analysis/ControlChartPage';
import { TrendPage } from './components/analysis/TrendPage';
import { ReportPage } from './components/report/ReportPage';
import { ChatPanel } from './components/ai/ChatPanel';
import { PyodideLoader } from './components/PyodideLoader';
import { chatCompletion } from './lib/ai/client';
import { initPyodide } from './lib/pyodide/runtime';
import { useDataStore } from './stores/dataStore';
import { useSettingsStore } from './stores/settingsStore';

export default function App() {
  const [activeModule, setActiveModule] = useState('import');
  const [showSettings, setShowSettings] = useState(false);
  const { currentFile } = useDataStore();

  // Start loading Pyodide early (in background while user sees the loading screen)
  useEffect(() => {
    initPyodide().catch(() => {
      // Error is handled by PyodideLoader via onPyodideStatus
    });
  }, []);

  const handleFileLoaded = () => {
    setActiveModule('descriptive');
  };

  return (
    <PyodideLoader>
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header onOpenSettings={() => setShowSettings(true)} />

        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          {activeModule === 'import' && !currentFile && (
            <FileUpload onFileLoaded={handleFileLoaded} />
          )}

          {activeModule === 'import' && currentFile && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                数据预览
              </h2>
              <DataPreview />
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  onClick={() => setActiveModule('descriptive')}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  开始分析 →
                </button>
              </div>
            </div>
          )}

          {activeModule === 'descriptive' && <DescriptivePage />}

          {activeModule === 'normality' && <NormalityPage />}

          {activeModule === 'outlier' && <OutlierPage />}

          {activeModule === 'capability' && <CapabilityPage />}

          {activeModule === 'control-chart' && <ControlChartPage />}

          {activeModule === 'trend' && <TrendPage />}

          {activeModule === 'report' && <ReportPage />}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* AI Chat Panel */}
      <ChatPanel />
    </div>
    </PyodideLoader>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateAI, toggleAI } = useSettingsStore();
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = async () => {
    try {
      const result = await chatCompletion(settings.ai, {
        messages: [{ role: 'user', content: 'Say "API connection successful" in Chinese.' }],
      });
      if (result.error) {
        setTestResult(`错误: ${result.error}`);
      } else {
        setTestResult(`成功: ${result.content}`);
      }
    } catch (e) {
      setTestResult(`错误: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '500px',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-card-bg)',
          borderRadius: '16px',
          padding: '24px',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>设置</h2>

        {/* AI Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>AI 配置</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.ai.enabled}
                onChange={(e) => toggleAI(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>启用 AI 解读</span>
            </label>
          </div>

          {settings.ai.enabled && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.ai.apiKey}
                  onChange={(e) => updateAI({ apiKey: e.target.value })}
                  placeholder="输入你的 API Key"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={settings.ai.baseUrl}
                  onChange={(e) => updateAI({ baseUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                  模型
                </label>
                <input
                  type="text"
                  value={settings.ai.model}
                  onChange={(e) => updateAI({ model: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '14px' }}
                />
              </div>

              <button
                onClick={handleTest}
                style={{ padding: '8px 16px', backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                测试连接
              </button>

              {testResult && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: testResult.startsWith('成功') ? '#059669' : '#dc2626' }}>
                  {testResult}
                </p>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
