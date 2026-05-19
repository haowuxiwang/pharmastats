/**
 * Auto-analysis pipeline - runs on file upload when AI is enabled.
 */

import { ipc } from '../ipc';
import { chatCompletion } from './client';
import { AUTO_ANALYSIS_PROMPT } from './prompts';
import { createLogger } from '../logger';
import type { AIConfig, ParsedData } from '../../types';

const log = createLogger('AutoAnalysis');

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

  log.info(`Starting auto-analysis: ${data.n_rows} rows, ${data.numeric_columns.length} numeric columns`);

  // Run descriptive + normality + outlier + trend for each numeric column
  for (const col of data.numeric_columns) {
    const values = (data.data[col] ?? []).filter(
      (v): v is number => typeof v === 'number' && !isNaN(v),
    );
    if (values.length < 3) {
      log.debug(`Skipping ${col}: only ${values.length} valid values`);
      continue;
    }

    columnResults[col] = {};

    for (const module of ['descriptive', 'normality', 'outlier', 'trend'] as const) {
      onProgress?.(col, module, 'running');
      const start = Date.now();
      try {
        const result = await ipc.analyze(module, { values });
        columnResults[col][module] = result;
        log.debug(`${col}/${module} completed in ${Date.now() - start}ms`);
        onProgress?.(col, module, 'done');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log.error(`${col}/${module} failed: ${errorMsg}`);
        // Preserve error details for AI summary context
        columnResults[col][module] = { _error: errorMsg };
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
    const desc = results.descriptive as Record<string, unknown> | undefined;
    if (desc && !desc._error) {
      contextParts.push(`描述统计: n=${desc.n}, 均值=${(desc.mean as number).toFixed(4)}, 标准差=${(desc.std as number).toFixed(4)}, RSD=${(desc.rsd_percent as number).toFixed(2)}%`);
    } else if (desc?._error) {
      contextParts.push(`描述统计: 失败 - ${desc._error}`);
    }
    const norm = results.normality as Record<string, unknown> | undefined;
    if (norm && !norm._error) {
      const shapiro = norm.shapiro_wilk as Record<string, unknown>;
      contextParts.push(`正态性: ${norm.is_normal ? '符合正态分布' : '不符合正态分布'}, p=${(shapiro.p_value as number).toFixed(4)}`);
    } else if (norm?._error) {
      contextParts.push(`正态性: 失败 - ${norm._error}`);
    }
    const outlier = results.outlier as Record<string, unknown> | undefined;
    if (outlier && !outlier._error) {
      const summary = outlier.summary as Record<string, unknown>;
      contextParts.push(`异常值: 发现 ${summary.total_outliers} 个异常值`);
    } else if (outlier?._error) {
      contextParts.push(`异常值: 失败 - ${outlier._error}`);
    }
    const trend = results.trend as Record<string, unknown> | undefined;
    if (trend && !trend._error) {
      contextParts.push(`趋势: ${trend.direction}, R²=${(trend.r_squared as number).toFixed(4)}, 显著=${trend.is_significant}`);
    } else if (trend?._error) {
      contextParts.push(`趋势: 失败 - ${trend._error}`);
    }
    contextParts.push('');
  }

  // Get AI summary
  log.info('Requesting AI summary');
  const response = await chatCompletion(aiConfig, {
    messages: [
      { role: 'system', content: AUTO_ANALYSIS_PROMPT },
      { role: 'user', content: contextParts.join('\n') },
    ],
  });

  if (response.error) {
    log.error(`AI summary failed: ${response.error}`);
  } else {
    log.info('AI summary completed');
  }

  return {
    summary: response.error ? `AI 解读失败: ${response.error}` : response.content,
    columnResults,
  };
}
