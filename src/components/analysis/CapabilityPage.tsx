import { useMemo, useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useAnalysisForColumn } from '../../hooks/useAnalysis';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatCard } from './StatCard';
import { ColumnSelector } from './ColumnSelector';
import { ChartWrapper } from '../charts/ChartWrapper';
import { getBaseTheme, getAxisDefaults } from '../charts/baseOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function CapabilityPage() {
  const { currentFile, usl, lsl, target, setSpecLimits } = useDataStore();
  const { result, loading, error, executeForColumn } = useAnalysisForColumn('capability');
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [localUsl, setLocalUsl] = useState(usl?.toString() ?? '');
  const [localLsl, setLocalLsl] = useState(lsl?.toString() ?? '');
  const [localTarget, setLocalTarget] = useState(target?.toString() ?? '');

  const handleAnalyze = () => {
    const u = parseFloat(localUsl);
    const l = parseFloat(localLsl);
    const t = parseFloat(localTarget);
    if (isNaN(u)) return;
    setSpecLimits(u, isNaN(l) ? null : l, isNaN(t) ? undefined : t);
    executeForColumn({ usl: u, lsl: isNaN(l) ? undefined : l, target: isNaN(t) ? undefined : t });
  };

  const histogramOption = useMemo(() => {
    if (!result) return null;
    const { histogram } = result;
    const markLines: any[] = [];
    if (result.usl != null) markLines.push({ xAxis: result.usl, lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 2 }, label: { formatter: `USL: ${result.usl}`, position: 'end' as const, color: '#ef4444' } });
    if (result.lsl != null) markLines.push({ xAxis: result.lsl, lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 2 }, label: { formatter: `LSL: ${result.lsl}`, position: 'end' as const, color: '#ef4444' } });
    if (result.target != null) markLines.push({ xAxis: result.target, lineStyle: { color: '#3b82f6', width: 2 }, label: { formatter: `Target: ${result.target}`, position: 'end' as const, color: '#3b82f6' } });
    markLines.push({ xAxis: result.mean, lineStyle: { color: '#10b981', type: 'solid' as const, width: 2 }, label: { formatter: `均值: ${result.mean.toFixed(2)}`, position: 'end' as const, color: '#10b981' } });

    return {
      ...getBaseTheme(isDark),
      xAxis: { type: 'category' as const, data: histogram.x.map((v) => v.toFixed(2)), ...getAxisDefaults(isDark) },
      yAxis: { type: 'value' as const, name: '频次', ...getAxisDefaults(isDark) },
      series: [{ type: 'bar' as const, data: histogram.counts, itemStyle: { color: '#d97706', borderRadius: [2, 2, 0, 0] }, markLine: { silent: true, symbol: 'none', data: markLines } }],
    };
  }, [result, isDark]);

  const ratingStatus = result
    ? result.rating === 'Excellent' || result.rating === 'Good' ? 'good' : result.rating === 'Marginal' ? 'warning' : 'danger'
    : undefined;

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">过程能力分析</h2>
      <ColumnSelector />

      <Card>
        <CardContent className="py-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">LSL (下限)</Label>
              <Input type="number" value={localLsl} onChange={(e) => setLocalLsl(e.target.value)} placeholder="下限" className="w-24" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target (目标)</Label>
              <Input type="number" value={localTarget} onChange={(e) => setLocalTarget(e.target.value)} placeholder="目标值" className="w-24" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">USL (上限)</Label>
              <Input type="number" value={localUsl} onChange={(e) => setLocalUsl(e.target.value)} placeholder="上限" className="w-24" />
            </div>
            <Button onClick={handleAnalyze} disabled={!localUsl || loading}>
              开始分析
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Cp" value={result.cp} decimals={4} status={result.cp >= 1.33 ? 'good' : result.cp >= 1.0 ? 'warning' : 'danger'} />
            <StatCard label="Cpk" value={result.cpk} decimals={4} status={result.cpk >= 1.33 ? 'good' : result.cpk >= 1.0 ? 'warning' : 'danger'} />
            <StatCard label="Pp" value={result.pp} decimals={4} />
            <StatCard label="Ppk" value={result.ppk} decimals={4} />
            <StatCard label="评级" value={result.rating} status={ratingStatus as any} />
            <StatCard label="均值" value={result.mean} decimals={4} />
          </div>

          <Card>
            <CardContent className="py-3 text-sm">{result.rating_desc}</CardContent>
          </Card>

          {histogramOption && (
            <Card>
              <CardHeader><CardTitle>分布直方图 (含规格限)</CardTitle></CardHeader>
              <CardContent><ChartWrapper option={histogramOption} height={380} loading={loading} /></CardContent>
            </Card>
          )}
        </>
      )}

      {loading && !result && <div className="text-center py-10 text-muted-foreground">正在分析...</div>}
    </div>
  );
}
