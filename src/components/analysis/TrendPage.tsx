import { useEffect, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatCard } from './StatCard';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TrendPage() {
  const { currentFile, selectedColumn } = useDataStore();
  const { result, loading, error, executeForColumn } = useAnalysisForColumn('trend');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (currentFile && selectedColumn) {
      executeForColumn();
    }
  }, [currentFile, selectedColumn, executeForColumn]);

  const trendOption = useMemo(() => {
    if (!result) return null;
    const { data, trend_line, confidence_band, prediction_band } = result;
    const scatterData = data.x.map((x, i) => [x, data.y[i]]);

    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'value' as const, name: '序号', ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '值', ...getAxisDefaults(isDark) },
      series: [
        // Prediction band
        { type: 'line' as const, data: prediction_band.x.map((x, i) => [x, prediction_band.lower[i]]), lineStyle: { opacity: 0 }, showSymbol: false, stack: 'prediction', areaStyle: { opacity: 0 } },
        { type: 'line' as const, data: prediction_band.x.map((x, i) => [x, prediction_band.upper[i] - prediction_band.lower[i]]), lineStyle: { opacity: 0 }, showSymbol: false, stack: 'prediction', areaStyle: { color: 'rgba(217,119,6,0.08)' } },
        // Confidence band
        { type: 'line' as const, data: confidence_band.x.map((x, i) => [x, confidence_band.lower[i]]), lineStyle: { opacity: 0 }, showSymbol: false, stack: 'confidence', areaStyle: { opacity: 0 } },
        { type: 'line' as const, data: confidence_band.x.map((x, i) => [x, confidence_band.upper[i] - confidence_band.lower[i]]), lineStyle: { opacity: 0 }, showSymbol: false, stack: 'confidence', areaStyle: { color: 'rgba(217,119,6,0.15)' } },
        // Trend line
        { type: 'line' as const, data: trend_line.x.map((x, i) => [x, trend_line.y[i]]), lineStyle: { color: '#d97706', width: 2 }, showSymbol: false, name: '趋势线' },
        // Data points
        { type: 'scatter' as const, data: scatterData, symbolSize: 6, itemStyle: { color: '#6b7280' }, name: '数据点' },
      ],
    };
  }, [result, isDark]);

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">趋势分析</h2>
      <ColumnSelector />

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="斜率" value={result.slope} decimals={6} />
            <StatCard label="截距" value={result.intercept} decimals={4} />
            <StatCard label="R²" value={result.r_squared} decimals={4} />
            <StatCard label="p 值" value={result.p_value} decimals={4} />
            <StatCard label="趋势方向" value={result.direction}
              status={result.is_significant ? (result.slope > 0 ? 'warning' : 'danger') : 'good'} />
            <StatCard label="显著性" value={result.is_significant ? '显著' : '不显著'}
              status={result.is_significant ? 'danger' : 'good'} />
          </div>

          {trendOption && (
            <Card>
              <CardHeader><CardTitle>趋势图 (含置信带和预测带)</CardTitle></CardHeader>
              <CardContent><ChartWrapper option={trendOption} height={400} loading={loading} /></CardContent>
            </Card>
          )}
        </>
      )}

      {loading && !result && <div className="text-center py-10 text-muted-foreground">正在分析...</div>}
    </div>
  );
}
