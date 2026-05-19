import { useEffect, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatCard } from './StatCard';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DescriptivePage() {
  const { currentFile, selectedColumn } = useDataStore();
  const { result, loading, error, executeForColumn } =
    useAnalysisForColumn('descriptive');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (currentFile && selectedColumn) {
      executeForColumn();
    }
  }, [currentFile, selectedColumn, executeForColumn]);

  const rawValues = useMemo(() => {
    if (!currentFile || !selectedColumn) return [];
    return (currentFile.data[selectedColumn] ?? []).filter(
      (v): v is number => typeof v === 'number' && !isNaN(v)
    );
  }, [currentFile, selectedColumn]);

  const histogramOption = useMemo(() => {
    if (rawValues.length === 0 || !result) return null;
    const min = result.min;
    const max = result.max;
    const binCount = Math.min(20, Math.ceil(Math.sqrt(rawValues.length)));
    const binWidth = (max - min) / binCount || 1;

    const bins: { label: string; count: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const count = rawValues.filter((v) => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
      bins.push({ label: lo.toFixed(1), count });
    }

    const meanIndex = bins.findIndex((b) => {
      const lo = parseFloat(b.label);
      return lo <= result.mean && lo + binWidth > result.mean;
    });

    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'category' as const, data: bins.map((b) => b.label), name: '值', ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '频次', ...getAxisDefaults(isDark) },
      series: [{
        type: 'bar' as const,
        data: bins.map((b) => b.count),
        itemStyle: { color: '#d97706', borderRadius: [2, 2, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{
            xAxis: meanIndex >= 0 ? meanIndex : 0,
            lineStyle: { color: '#ef4444', width: 2, type: 'solid' as const },
            label: { formatter: `均值 ${result.mean.toFixed(2)}`, position: 'end' as const, color: '#ef4444' },
          }],
        },
      }],
    };
  }, [rawValues, result, isDark]);

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">描述统计</h2>

      <ColumnSelector />

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard label="样本量" value={result.n} />
            <StatCard label="均值" value={result.mean} decimals={4} />
            <StatCard label="中位数" value={result.median} decimals={4} />
            <StatCard label="标准差" value={result.std} decimals={4} />
            <StatCard label="RSD" value={result.rsd_percent} unit="%" decimals={2}
              status={result.rsd_percent > 5 ? 'danger' : result.rsd_percent > 2 ? 'warning' : 'good'} />
            <StatCard label="最小值" value={result.min} decimals={4} />
            <StatCard label="最大值" value={result.max} decimals={4} />
            <StatCard label="极差" value={result.range} decimals={4} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Q1" value={result.q1} decimals={4} />
            <StatCard label="Q3" value={result.q3} decimals={4} />
            <StatCard label="IQR" value={result.iqr} decimals={4} />
            <StatCard label="95% CI 下限" value={result.ci_95_lower} decimals={4} />
            <StatCard label="95% CI 上限" value={result.ci_95_upper} decimals={4} />
            <StatCard label="偏度" value={result.skewness} decimals={4} />
            <StatCard label="峰度" value={result.kurtosis} decimals={4} />
          </div>

          {histogramOption && (
            <Card>
              <CardHeader>
                <CardTitle>频率分布直方图</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartWrapper option={histogramOption} height={350} loading={loading} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {loading && !result && (
        <div className="text-center py-10 text-muted-foreground">正在分析...</div>
      )}
    </div>
  );
}
