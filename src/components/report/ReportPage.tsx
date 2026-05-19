import { useState } from 'react';
import { useDataStore } from '../../stores/dataStore';
import { useChatStore } from '../../stores/chatStore';
import { generateReport } from '../../lib/report/generateReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '../analysis/StatCard';

export function ReportPage() {
  const { currentFile, descriptive, normality, outliers, capability, controlChart, trend } = useDataStore();
  const messages = useChatStore((s) => s.messages);
  const [generating, setGenerating] = useState(false);

  const aiSummary = messages
    .filter((m) => m.role === 'assistant' && m.content && !m.isStreaming)
    .map((m) => m.content)
    .join('\n\n');

  const results = {
    descriptive,
    normality,
    outlier: outliers,
    capability,
    control_chart: controlChart,
    trend,
  };

  const completedModules = Object.entries(results).filter(([, v]) => v != null);

  const handleGenerate = async () => {
    if (!currentFile) return;
    setGenerating(true);
    try {
      await generateReport({
        data: currentFile,
        results,
        aiSummary: aiSummary || undefined,
      });
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!currentFile) {
    return <div className="text-center py-16 text-muted-foreground">请先导入数据文件</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-xl font-semibold">生成报告</h2>

      <Card>
        <CardHeader>
          <CardTitle>数据概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="文件" value={currentFile.file_path.split(/[/\\]/).pop() || ''} />
            <StatCard label="行数" value={currentFile.n_rows} />
            <StatCard label="列数" value={currentFile.n_cols} />
            <StatCard label="数值列" value={currentFile.numeric_columns.length} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>已完成分析</CardTitle>
        </CardHeader>
        <CardContent>
          {completedModules.length === 0 ? (
            <p className="text-muted-foreground text-sm">尚未运行任何分析。请先在各分析页面运行分析。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {completedModules.map(([module]) => (
                <Badge key={module} variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {module === 'descriptive' ? '描述统计' :
                   module === 'normality' ? '正态检验' :
                   module === 'outlier' ? '异常检测' :
                   module === 'capability' ? '过程能力' :
                   module === 'control_chart' ? '控制图' :
                   module === 'trend' ? '趋势分析' : module}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle>AI 分析摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {aiSummary.length > 500 ? aiSummary.slice(0, 500) + '...' : aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button onClick={handleGenerate} disabled={generating || completedModules.length === 0} size="lg">
          {generating ? '正在生成...' : '生成 PDF 报告'}
        </Button>
      </div>
    </div>
  );
}
