import { useEffect, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatCard } from './StatCard';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function NormalityPage() {
  const { currentFile, selectedColumn } = useDataStore();
  const { result, loading, error, executeForColumn } =
    useAnalysisForColumn('normality');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    if (currentFile && selectedColumn) {
      executeForColumn();
    }
  }, [currentFile, selectedColumn, executeForColumn]);

  const histogramOption = useMemo(() => {
    if (!result) return null;
    const { histogram, normal_curve } = result;
    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'category' as const, data: histogram.x.map((v) => v.toFixed(2)), ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '频次', ...getAxisDefaults(isDark) },
      series: [
        { type: 'bar' as const, data: histogram.counts, itemStyle: { color: '#d97706', borderRadius: [2, 2, 0, 0] }, name: '频次' },
        { type: 'line' as const, data: normal_curve.y, smooth: true, lineStyle: { color: '#ef4444', width: 2 }, showSymbol: false, name: '正态曲线' },
      ],
    };
  }, [result, isDark]);

  const qqOption = useMemo(() => {
    if (!result) return null;
    const { qq_plot } = result;
    const allVals = [...qq_plot.theoretical, ...qq_plot.sample];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const scatterData = qq_plot.theoretical.map((t, i) => [t, qq_plot.sample[i]]);
    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'value' as const, name: '理论分位数', ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '样本分位数', ...getAxisDefaults(isDark) },
      series: [
        { type: 'scatter' as const, data: scatterData, symbolSize: 5, itemStyle: { color: '#d97706' } },
        { type: 'line' as const, data: [[min, min], [max, max]], lineStyle: { color: '#9ca3af', type: 'dashed' as const, width: 1 }, showSymbol: false, silent: true },
      ],
    };
  }, [result, isDark]);

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">正态性检验</h2>
      <ColumnSelector />

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Shapiro-Wilk 统计量" value={result.shapiro_wilk.statistic} decimals={4} />
            <StatCard label="Shapiro-Wilk p 值" value={result.shapiro_wilk.p_value} decimals={4} />
            <StatCard label="Anderson-Darling 统计量" value={result.anderson_darling.statistic} decimals={4} />
            <Card>
              <CardContent className="py-3">
                <span className="text-xs text-muted-foreground">正态性结论</span>
                <div className="mt-1">
                  <Badge variant={result.is_normal ? 'default' : 'destructive'}
                    className={result.is_normal ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
                    {result.is_normal ? '符合正态' : '不符合正态'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-3 text-sm">{result.interpretation}</CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {histogramOption && (
              <Card>
                <CardHeader><CardTitle>直方图 + 正态曲线</CardTitle></CardHeader>
                <CardContent><ChartWrapper option={histogramOption} height={320} loading={loading} /></CardContent>
              </Card>
            )}
            {qqOption && (
              <Card>
                <CardHeader><CardTitle>Q-Q 图</CardTitle></CardHeader>
                <CardContent><ChartWrapper option={qqOption} height={320} loading={loading} /></CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {loading && !result && <div className="text-center py-10 text-muted-foreground">正在分析...</div>}
    </div>
  );
}
