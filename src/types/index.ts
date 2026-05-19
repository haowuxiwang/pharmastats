// Data types
export interface DataFile {
  name: string;
  path: string;
  type: 'excel' | 'csv' | 'pdf';
}

export interface ParsedData {
  success: boolean;
  file_path: string;
  n_rows: number;
  n_cols: number;
  columns: string[];
  numeric_columns: string[];
  data: Record<string, (number | string | null)[]>;
  preview: Record<string, any>[];
  source?: string;
  error?: string;
}

// Analysis types
export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  std: number;
  rsd_percent: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  ci_95_lower: number;
  ci_95_upper: number;
  skewness: number;
  kurtosis: number;
}

export interface NormalityResult {
  shapiro_wilk: {
    statistic: number;
    p_value: number;
    is_normal: boolean;
  };
  anderson_darling: {
    statistic: number;
    critical_values: Record<string, number>;
  };
  is_normal: boolean;
  interpretation: string;
  histogram: { x: number[]; counts: number[] };
  normal_curve: { x: number[]; y: number[] };
  qq_plot: { theoretical: number[]; sample: number[] };
}

export interface OutlierResult {
  methods: {
    iqr?: {
      indices: number[];
      values: number[];
      lower_bound: number;
      upper_bound: number;
    };
    grubbs?: {
      outlier_index: number | null;
      outlier_value: number | null;
      g_statistic: number;
      critical_value: number;
      is_outlier: boolean;
    };
    dixon_q?: {
      outliers: { index: number; value: number; type: string }[];
      q_low: number;
      q_high: number;
      critical_value: number;
    };
  };
  summary: {
    total_outliers: number;
    outlier_indices: number[];
    outlier_values: number[];
  };
}

export interface CapabilityResult {
  mean: number;
  std_within: number;
  std_overall: number;
  usl: number | null;
  lsl: number | null;
  target: number;
  n: number;
  cp: number;
  cpk: number;
  cpu: number | null;
  cpl: number | null;
  pp: number;
  ppk: number;
  ppu: number | null;
  ppl: number | null;
  rating: string;
  rating_desc: string;
  histogram: { x: number[]; counts: number[] };
}

export interface ControlChartResult {
  chart_type: string;
  subgroup_size?: number;
  n_subgroups?: number;
  xbar_chart?: {
    values: number[];
    center: number;
    ucl: number;
    lcl: number;
    violations: Violation[];
  };
  r_chart?: {
    values: number[];
    center: number;
    ucl: number;
    lcl: number;
    violations: Violation[];
  };
  i_chart?: {
    values: number[];
    center: number;
    ucl: number;
    lcl: number;
    violations: Violation[];
  };
  mr_chart?: {
    values: number[];
    center: number;
    ucl: number;
    lcl: number;
    violations: Violation[];
  };
}

export interface Violation {
  index: number;
  value: number;
  rule: number;
  description: string;
}

export interface TrendResult {
  slope: number;
  intercept: number;
  r_squared: number;
  r_value: number;
  p_value: number;
  std_err: number;
  is_significant: boolean;
  direction: string;
  data: { x: number[]; y: number[] };
  trend_line: { x: number[]; y: number[] };
  confidence_band: { x: number[]; upper: number[]; lower: number[] };
  prediction_band: { x: number[]; upper: number[]; lower: number[] };
  residuals: number[];
}

// AI types
export interface AIConfig {
  provider: 'deepseek' | 'qwen' | 'siliconflow' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export interface AIInsight {
  module: string;
  conclusion: string;
  recommendation: string;
  risk_level: 'low' | 'medium' | 'high';
}

// Settings
export interface AppSettings {
  ai: AIConfig;
  language: 'zh' | 'en';
  theme: 'light' | 'dark' | 'system';
}

// Electron API
export interface ElectronAPI {
  openFile: (options?: any) => Promise<string[]>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
