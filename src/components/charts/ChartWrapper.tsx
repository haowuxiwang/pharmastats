import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface ChartWrapperProps {
  option: EChartsOption;
  height?: number;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function ChartWrapper({
  option,
  height = 400,
  loading = false,
  style,
}: ChartWrapperProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: '8px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge
        lazyUpdate
        autoResize
      />
    </div>
  );
}
