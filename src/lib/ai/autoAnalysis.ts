/**
 * Auto-analysis pipeline - runs on file upload when AI is enabled.
 */

import { ipc } from '../ipc';
import { chatCompletion } from './client';
import { AUTO_ANALYSIS_PROMPT } from './prompts';
import type { AIConfig, ParsedData } from '../../types';

export interface AutoAnalysisResult {
  summary: string;
  columnResults: Record<string, Record<string, unknown>>;
}

export async function runAutoAnalysis(
  data: ParsedData,
  aiConfig: AIConfig,
  onProgress?: (column: string, module: string, status: 'running' | 'done' | 'error') => void,
): Promise<AutoAnalysisResult> {
  const columnResults: Record<string, Record<string, unknown>> = {};

  // Run descriptive + normality + outlier + trend for each numeric column
  for (const col of data.numeric_columns) {
    const values = (data.data[col] ?? []).filter(
      (v): v is number => typeof v === 'number' && !isNaN(v),
    );
    if (values.length < 3) continue;

    columnResults[col] = {};

    for (const module of ['descriptive', 'normality', 'outlier', 'trend'] as const) {
      onProgress?.(col, module, 'running');
      try {
        const result = await ipc.analyze(module, { values });
        columnResults[col][module] = result;
        onProgress?.(col, module, 'done');
      } catch {
        onProgress?.(col, module, 'error');
      }
    }
  }

  // Build context for AI summary
  const contextParts: string[] = [
    `数据概览：${data.n_rows} 行, ${data.n_cols} 列`,
    `数值列：${data.numeric_columns.join(', ')}`,
    '',
  ];

  for (const [col, results] of Object.entries(columnResults)) {
    contextParts.push(`--- ${col} ---`);
    const desc = results.descriptive as any;
    if (desc) {
      contextParts.push(`描述统计: n=${desc.n}, 均值=${desc.mean.toFixed(4)}, 标准差=${desc.std.toFixed(4)}, RSD=${desc.rsd_percent.toFixed(2)}%`);
    }
    const norm = results.normality as any;
    if (norm) {
      contextParts.push(`正态性: ${norm.is_normal ? '符合正态分布' : '不符合正态分布'}, p=${norm.shapiro_wilk.p_value.toFixed(4)}`);
    }
    const outlier = results.outlier as any;
    if (outlier) {
      contextParts.push(`异常值: 发现 ${outlier.summary.total_outliers} 个异常值`);
    }
    const trend = results.trend as any;
    if (trend) {
      contextParts.push(`趋势: ${trend.direction}, R²=${trend.r_squared.toFixed(4)}, 显著=${trend.is_significant}`);
    }
    contextParts.push('');
  }

  // Get AI summary
  const response = await chatCompletion(aiConfig, {
    messages: [
      { role: 'system', content: AUTO_ANALYSIS_PROMPT },
      { role: 'user', content: contextParts.join('\n') },
    ],
  });

  return {
    summary: response.error ? `AI 解读失败: ${response.error}` : response.content,
    columnResults,
  };
}
