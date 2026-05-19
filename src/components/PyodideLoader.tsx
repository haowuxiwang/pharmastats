import { useEffect, useState } from 'react';
import { onPyodideStatus, type PyodideStatus } from '@/lib/pyodide/runtime';

/**
 * Wraps children with a Pyodide loading screen.
 * Shows progress while WASM + packages load, then renders children.
 */
export function PyodideLoader({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PyodideStatus>({
    ready: false,
    loading: false,
    error: null,
    step: '',
  });

  useEffect(() => onPyodideStatus(setStatus), []);

  if (status.ready) return children;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg, #fafafa)',
        zIndex: 9999,
      }}
    >
      {status.error ? (
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--color-text, #111)' }}>
            统计引擎加载失败
          </h2>
          <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{status.error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              backgroundColor: 'var(--color-primary, #d97706)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid #e5e7eb',
              borderTopColor: '#d97706',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 20,
            }}
          />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--color-text, #111)' }}>
            正在加载统计引擎
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #666)' }}>
            {status.step || '初始化 Pyodide...'}
          </p>
        </div>
      )}
    </div>
  );
}
