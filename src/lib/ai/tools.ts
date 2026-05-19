/**
 * Tool definitions for the AI agent - maps to Python backend commands.
 */

import type { ToolDefinition } from './client';
import { ipc } from '../ipc';
import type { ParsedData } from '../../types';

export interface ToolExecutor {
  name: string;
  execute: (args: Record<string, unknown>, data: ParsedData) => Promise<unknown>;
}

/** Build tool definitions with dynamic column enum from current data */
export function getToolDefinitions(data: ParsedData): ToolDefinition[] {
  const numericCols = data.numeric_columns;

  return [
    {
      type: 'function',
      function: {
        name: 'get_data_info',
        description: '获取当前数据集的基本信息：列名、行数、数据类型、基本统计量。在开始分析前先调用此工具了解数据。',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'descriptive_stats',
        description: '对指定列执行描述统计分析：均值、中位数、标准差、RSD、极差、四分位数、95%置信区间、偏度、峰度。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
          },
          required: ['column'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'normality_test',
        description: '对指定列执行正态性检验（Shapiro-Wilk + Anderson-Darling），返回是否符合正态分布、Q-Q图数据、直方图数据。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
          },
          required: ['column'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'detect_outliers',
        description: '对指定列执行异常值检测（IQR法、Grubbs检验、Dixon Q检验），返回异常值索引和各方法的检测结果。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
          },
          required: ['column'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'process_capability',
        description: '对指定列执行过程能力分析，计算Cp、Cpk、Pp、Ppk等指标。需要提供规格限。制药行业标准：Cpk≥1.33为合格。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
            usl: { type: 'number', description: '规格上限 (Upper Specification Limit)' },
            lsl: { type: 'number', description: '规格下限 (Lower Specification Limit)' },
            target: { type: 'number', description: '目标值（可选）' },
          },
          required: ['column', 'usl'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'control_chart',
        description: '对指定列生成控制图（X-bar/R 或 I-MR），检测过程是否受控。使用 Western Electric 规则检测违规点。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
            chart_type: { type: 'string', enum: ['xbar_r', 'individual'], description: '图表类型：xbar_r（均值-极差图，需子组）或 individual（个体值图）' },
          },
          required: ['column'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'trend_analysis',
        description: '对指定列执行趋势分析（线性回归），返回斜率、截距、R²、p值、趋势方向、置信带和预测带数据。',
        parameters: {
          type: 'object',
          properties: {
            column: { type: 'string', enum: numericCols, description: '要分析的数值列名' },
          },
          required: ['column'],
        },
      },
    },
  ];
}

/** Get tool executors that call the Python backend via IPC */
export function getToolExecutors(): ToolExecutor[] {
  return [
    {
      name: 'get_data_info',
      execute: async (_args, data) => ({
        file: data.file_path,
        rows: data.n_rows,
        columns: data.columns,
        numeric_columns: data.numeric_columns,
        preview: data.preview.slice(0, 5),
      }),
    },
    {
      name: 'descriptive_stats',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        return ipc.analyze('descriptive', { values });
      },
    },
    {
      name: 'normality_test',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        return ipc.analyze('normality', { values });
      },
    },
    {
      name: 'detect_outliers',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        return ipc.analyze('outlier', { values });
      },
    },
    {
      name: 'process_capability',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        if (args.usl === undefined && args.lsl === undefined) {
          return { error: 'At least one specification limit (usl or lsl) is required' };
        }
        return ipc.analyze('capability', {
          values,
          usl: args.usl,
          lsl: args.lsl,
          target: args.target,
        });
      },
    },
    {
      name: 'control_chart',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        return ipc.analyze('control_chart', {
          values,
          chart_type: args.chart_type || 'xbar_r',
        });
      },
    },
    {
      name: 'trend_analysis',
      execute: async (args, data) => {
        const { values, error } = extractValues(data, args.column as string);
        if (error) return { error };
        return ipc.analyze('trend', { values });
      },
    },
  ];
}

function extractValues(data: ParsedData, column: string): { values: number[]; error?: string } {
  if (!column || typeof column !== 'string') {
    return { values: [], error: 'Missing or invalid column name' };
  }
  if (!(column in data.data)) {
    return {
      values: [],
      error: `Column "${column}" not found. Available columns: ${data.columns.join(', ')}`,
    };
  }
  const raw = data.data[column] ?? [];
  const values = raw.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) {
    return { values: [], error: `Column "${column}" has no numeric data` };
  }
  return { values };
}
