import { create } from 'zustand';
import type {
  ParsedData,
  DescriptiveStats,
  NormalityResult,
  OutlierResult,
  CapabilityResult,
  ControlChartResult,
  TrendResult,
} from '../types';

interface DataState {
  // Current file
  currentFile: ParsedData | null;
  selectedColumn: string | null;

  // Analysis results
  descriptive: DescriptiveStats | null;
  normality: NormalityResult | null;
  outliers: OutlierResult | null;
  capability: CapabilityResult | null;
  controlChart: ControlChartResult | null;
  trend: TrendResult | null;

  // Spec limits
  usl: number | null;
  lsl: number | null;
  target: number | null;

  // Loading states
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Actions
  setCurrentFile: (file: ParsedData | null) => void;
  setSelectedColumn: (column: string | null) => void;
  setDescriptive: (result: DescriptiveStats | null) => void;
  setNormality: (result: NormalityResult | null) => void;
  setOutliers: (result: OutlierResult | null) => void;
  setCapability: (result: CapabilityResult | null) => void;
  setControlChart: (result: ControlChartResult | null) => void;
  setTrend: (result: TrendResult | null) => void;
  setSpecLimits: (usl: number | null, lsl: number | null, target?: number | null) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  reset: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  currentFile: null,
  selectedColumn: null,
  descriptive: null,
  normality: null,
  outliers: null,
  capability: null,
  controlChart: null,
  trend: null,
  usl: null,
  lsl: null,
  target: null,
  loading: {},
  errors: {},

  setCurrentFile: (file) => set({ currentFile: file }),
  setSelectedColumn: (column) => set({ selectedColumn: column }),
  setDescriptive: (result) => set({ descriptive: result }),
  setNormality: (result) => set({ normality: result }),
  setOutliers: (result) => set({ outliers: result }),
  setCapability: (result) => set({ capability: result }),
  setControlChart: (result) => set({ controlChart: result }),
  setTrend: (result) => set({ trend: result }),
  setSpecLimits: (usl, lsl, target) => set({ usl, lsl, target: target ?? null }),
  setLoading: (key, loading) =>
    set((state) => ({ loading: { ...state.loading, [key]: loading } })),
  setError: (key, error) =>
    set((state) => ({ errors: { ...state.errors, [key]: error } })),
  reset: () =>
    set({
      currentFile: null,
      selectedColumn: null,
      descriptive: null,
      normality: null,
      outliers: null,
      capability: null,
      controlChart: null,
      trend: null,
      usl: null,
      lsl: null,
      target: null,
      loading: {},
      errors: {},
    }),
}));
