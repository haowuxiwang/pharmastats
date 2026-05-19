import type { EChartsOption } from 'echarts';

export function getBaseTheme(isDark: boolean): EChartsOption {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: isDark ? '#d1d5db' : '#374151',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#374151' : '#ffffff',
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
      textStyle: { color: isDark ? '#f3f4f6' : '#111827', fontSize: 13 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  };
}

export function getAxisDefaults(isDark: boolean) {
  return {
    axisLine: { lineStyle: { color: isDark ? '#4b5563' : '#d1d5db' } },
    axisTick: { lineStyle: { color: isDark ? '#4b5563' : '#d1d5db' } },
    axisLabel: { color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 },
    splitLine: { lineStyle: { color: isDark ? '#374151' : '#f3f4f6' } },
  };
}
