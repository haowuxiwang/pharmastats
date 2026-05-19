import { useEffect, useMemo } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatCard } from './StatCard';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function OutlierPage() {
  const { currentFile, selectedColumn } = useDataStore();
  const { result, loading, error, executeForColumn } =
    useAnalysisForColumn('outlier');
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

  const scatterOption = useMemo(() => {
    if (!result || rawValues.length === 0) return null;
    const outlierSet = new Set(result.summary.outlier_indices);
    const normalData: [number, number][] = [];
    const outlierData: [number, number][] = [];
    rawValues.forEach((v, i) => {
      if (outlierSet.has(i)) outlierData.push([i, v]);
      else normalData.push([i, v]);
    });

    const iqr = result.methods.iqr;
    const markLines = iqr
      ? [
          { yAxis: iqr.upper_bound, lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1 }, label: { formatter: `上界 ${iqr.upper_bound.toFixed(2)}`, position: 'end' as const } },
          { yAxis: iqr.lower_bound, lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1 }, label: { formatter: `下界 ${iqr.lower_bound.toFixed(2)}`, position: 'end' as const } },
        ]
      : [];

    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'value' as const, name: '序号', ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '值', ...getAxisDefaults(isDark) },
      series: [
        { type: 'scatter' as const, data: normalData, symbolSize: 6, itemStyle: { color: '#6b7280' }, name: '正常值' },
        { type: 'scatter' as const, data: outlierData, symbolSize: 10, itemStyle: { color: '#ef4444' }, name: '异常值', markLine: { silent: true, symbol: 'none', data: markLines } },
      ],
    };
  }, [result, rawValues, isDark]);

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">异常值检测</h2>
      <ColumnSelector />

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="异常值总数" value={result.summary.total_outliers}
              status={result.summary.total_outliers > 0 ? 'danger' : 'good'} />
          </div>

          {scatterOption && (
            <Card>
              <CardHeader><CardTitle>散点图 (异常值红色标注)</CardTitle></CardHeader>
              <CardContent><ChartWrapper option={scatterOption} height={380} loading={loading} /></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>检测方法详情</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>方法</TableHead>
                    <TableHead>异常值数量</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.methods.iqr && (
                    <TableRow>
                      <TableCell>IQR 法</TableCell>
                      <TableCell>{result.methods.iqr.indices.length}</TableCell>
                      <TableCell className="text-muted-foreground">
                        范围: [{result.methods.iqr.lower_bound.toFixed(2)}, {result.methods.iqr.upper_bound.toFixed(2)}]
                      </TableCell>
                    </TableRow>
                  )}
                  {result.methods.grubbs && (
                    <TableRow>
                      <TableCell>Grubbs 检验</TableCell>
                      <TableCell>{result.methods.grubbs.is_outlier ? 1 : 0}</TableCell>
                      <TableCell className="text-muted-foreground">
                        G={result.methods.grubbs.g_statistic.toFixed(4)}, 临界值={result.methods.grubbs.critical_value.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  )}
                  {result.methods.dixon_q && (
                    <TableRow>
                      <TableCell>Dixon Q 检验</TableCell>
                      <TableCell>{result.methods.dixon_q.outliers.length}</TableCell>
                      <TableCell className="text-muted-foreground">
                        临界值={result.methods.dixon_q.critical_value.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {loading && !result && <div className="text-center py-10 text-muted-foreground">正在分析...</div>}
    </div>
  );
}
