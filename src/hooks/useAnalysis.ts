import { useCallback, useRef } from 'react';
import { ipc } from '../lib/ipc';
import { useDataStore } from '../stores/dataStore';
import type {
  DescriptiveStats,
  NormalityResult,
  OutlierResult,
  CapabilityResult,
  ControlChartResult,
  TrendResult,
} from '../types';

type AnalysisResultMap = {
  descriptive: DescriptiveStats;
  normality: NormalityResult;
  outlier: OutlierResult;
  capability: CapabilityResult;
  control_chart: ControlChartResult;
  trend: TrendResult;
};

const SETTER_KEYS: Record<string, string> = {
  descriptive: 'setDescriptive',
  normality: 'setNormality',
  outlier: 'setOutliers',
  capability: 'setCapability',
  control_chart: 'setControlChart',
  trend: 'setTrend',
};

const RESULT_KEYS: Record<string, string> = {
  descriptive: 'descriptive',
  normality: 'normality',
  outlier: 'outliers',
  capability: 'capability',
  control_chart: 'controlChart',
  trend: 'trend',
};

export function useAnalysis<K extends keyof AnalysisResultMap>(
  command: K
) {
  const abortRef = useRef(0);

  const execute = useCallback(
    async (data: Record<string, unknown>): Promise<AnalysisResultMap[K] | null> => {
      const requestId = ++abortRef.current;
      const store = useDataStore.getState();
      store.setLoading(command, true);
      store.setError(command, null);

      try {
        const result = (await ipc.analyze(command, data)) as AnalysisResultMap[K];
        if (requestId !== abortRef.current) return null;

        const setter = store[SETTER_KEYS[command] as keyof typeof store] as
          | ((val: AnalysisResultMap[K]) => void)
          | undefined;
        setter?.(result);
        return result;
      } catch (err) {
        if (requestId !== abortRef.current) return null;
        const msg = err instanceof Error ? err.message : String(err);
        store.setError(command, msg);
        return null;
      } finally {
        if (requestId === abortRef.current) {
          store.setLoading(command, false);
        }
      }
    },
    [command]
  );

  const result = useDataStore(
    (s) => s[RESULT_KEYS[command] as keyof typeof s] as AnalysisResultMap[K] | null
  );
  const loading = useDataStore((s) => s.loading[command] ?? false);
  const error = useDataStore((s) => s.errors[command] ?? null);

  const reset = useCallback(() => {
    const store = useDataStore.getState();
    const setter = store[SETTER_KEYS[command] as keyof typeof store] as
      | ((val: null) => void)
      | undefined;
    setter?.(null);
    store.setError(command, null);
  }, [command]);

  return { execute, result, loading, error, reset };
}

/**
 * Convenience hook: auto-extracts values from the selected column.
 */
export function useAnalysisForColumn<K extends keyof AnalysisResultMap>(command: K) {
  const analysis = useAnalysis(command);

  const executeForColumn = useCallback(
    (extraParams?: Record<string, unknown>) => {
      const { currentFile, selectedColumn } = useDataStore.getState();
      if (!currentFile || !selectedColumn) return Promise.resolve(null);

      const rawValues = currentFile.data[selectedColumn] ?? [];
      const values = rawValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));

      return analysis.execute({ values, ...extraParams });
    },
    [analysis.execute]
  );

  return { ...analysis, executeForColumn };
}
