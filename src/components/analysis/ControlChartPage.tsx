import { useEffect, useMemo, useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ControlChartPage() {
  const { currentFile, selectedColumn } = useDataStore();
  const { result, loading, error, executeForColumn } = useAnalysisForColumn('control_chart');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [chartType, setChartType] = useState<'xbar_r' | 'individual'>('xbar_r');

  useEffect(() => {
    if (currentFile && selectedColumn) {
      executeForColumn({ chart_type: chartType });
    }
  }, [currentFile, selectedColumn, chartType, executeForColumn]);

  function buildChartOption(values: number[], center: number, ucl: number, lcl: number, violations: { index: number; value: number; rule: number; description: string }[], title: string) {
    const violationSet = new Set(violations.map((v) => v.index));
    return {
      ...getBaseTheme(isDark),
      title: { text: title, textStyle: { fontSize: 14, color: isDark ? '#f3f4f6' : '#111827' } },
      xAxis: { type: 'category' as const, data: values.map((_, i) => i + 1), ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, min: Math.floor(lcl * 0.95 * 100) / 100, max: Math.ceil(ucl * 1.05 * 100) / 100, ...getAxisDefaults(isDark) },
      series: [
        {
          type: 'line' as const, data: values, smooth: false,
          lineStyle: { color: '#d97706', width: 1.5 },
          itemStyle: { color: (params: any) => violationSet.has(params.dataIndex) ? '#ef4444' : '#d97706' },
          symbol: (_val: number, params: any) => violationSet.has(params.dataIndex) ? 'circle' : 'none',
          symbolSize: 8,
        },
        { type: 'line' as const, data: Array(values.length).fill(center), lineStyle: { color: '#10b981', type: 'dashed' as const, width: 1 }, showSymbol: false, silent: true },
        { type: 'line' as const, data: Array(values.length).fill(ucl), lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1 }, showSymbol: false, silent: true },
        { type: 'line' as const, data: Array(values.length).fill(lcl), lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1 }, showSymbol: false, silent: true },
      ],
    };
  }

  const primaryChart = useMemo(() => {
    if (!result) return null;
    if (chartType === 'xbar_r' && result.xbar_chart) return buildChartOption(result.xbar_chart.values, result.xbar_chart.center, result.xbar_chart.ucl, result.xbar_chart.lcl, result.xbar_chart.violations, 'X-bar 控制图');
    if (chartType === 'individual' && result.i_chart) return buildChartOption(result.i_chart.values, result.i_chart.center, result.i_chart.ucl, result.i_chart.lcl, result.i_chart.violations, 'I 控制图 (个体值)');
    return null;
  }, [result, chartType, isDark]);

  const secondaryChart = useMemo(() => {
    if (!result) return null;
    if (chartType === 'xbar_r' && result.r_chart) return buildChartOption(result.r_chart.values, result.r_chart.center, result.r_chart.ucl, result.r_chart.lcl, result.r_chart.violations, 'R 控制图 (极差)');
    if (chartType === 'individual' && result.mr_chart) return buildChartOption(result.mr_chart.values, result.mr_chart.center, result.mr_chart.ucl, result.mr_chart.lcl, result.mr_chart.violations, 'MR 控制图 (移动极差)');
    return null;
  }, [result, chartType, isDark]);

  const allViolations = useMemo(() => {
    if (!result) return [];
    if (chartType === 'xbar_r') return [...(result.xbar_chart?.violations ?? []).map((v) => ({ ...v, chart: 'X-bar' })), ...(result.r_chart?.violations ?? []).map((v) => ({ ...v, chart: 'R' }))];
    return [...(result.i_chart?.violations ?? []).map((v) => ({ ...v, chart: 'I' })), ...(result.mr_chart?.violations ?? []).map((v) => ({ ...v, chart: 'MR' }))];
  }, [result, chartType]);

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">控制图</h2>
      <ColumnSelector />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">图表类型：</span>
        {(['xbar_r', 'individual'] as const).map((t) => (
          <Badge key={t} variant={chartType === t ? 'default' : 'outline'}
            className={`cursor-pointer ${chartType === t ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            onClick={() => setChartType(t)}>
            {t === 'xbar_r' ? 'X-bar / R' : 'I / MR'}
          </Badge>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {primaryChart && (
              <Card>
                <CardContent className="pt-4"><ChartWrapper option={primaryChart} height={300} loading={loading} /></CardContent>
              </Card>
            )}
            {secondaryChart && (
              <Card>
                <CardContent className="pt-4"><ChartWrapper option={secondaryChart} height={300} loading={loading} /></CardContent>
              </Card>
            )}
          </div>

          {allViolations.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-destructive">违规点 ({allViolations.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>图表</TableHead>
                      <TableHead>序号</TableHead>
                      <TableHead>值</TableHead>
                      <TableHead>规则</TableHead>
                      <TableHead>描述</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allViolations.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>{v.chart}</TableCell>
                        <TableCell>{v.index + 1}</TableCell>
                        <TableCell className="text-destructive font-medium">{v.value.toFixed(4)}</TableCell>
                        <TableCell>规则 {v.rule}</TableCell>
                        <TableCell className="text-muted-foreground">{v.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-center">
              过程受控，未发现违规点
            </div>
          )}
        </>
      )}

      {loading && !result && <div className="text-center py-10 text-muted-foreground">正在分析...</div>}
    </div>
  );
}
