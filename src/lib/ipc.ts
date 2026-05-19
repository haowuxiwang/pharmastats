/**
 * IPC Bridge — routes analysis calls through Pyodide WASM.
 * In Electron mode: uses electronAPI for file dialogs + file reading.
 * In browser mode: uses HTML file input.
 */

import type { ParsedData } from '../types';
import {
  descriptiveStats,
  normalityTest,
  outlierDetection,
  processCapability,
  controlChartAnalysis,
  trendAnalysis,
} from './pyodide/stats';
import { parseFile as pyodideParseFile } from './pyodide/parsers';
import { onPyodideStatus } from './pyodide/runtime';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Module-level buffer store (replaces fragile `this._pendingFile` pattern)
let pendingFile: { name: string; buffer: ArrayBuffer } | null = null;

/**
 * Open a file dialog and return the file name + content as ArrayBuffer.
 * In Electron: uses native dialog, then reads file via IPC.
 * In browser: uses hidden <input type="file">.
 */
async function openAndReadFile(): Promise<{ name: string; buffer: ArrayBuffer } | null> {
  if (isElectron) {
    const api = (window as any).electronAPI;
    const paths: string[] = await api.openFile();
    if (!paths || paths.length === 0) return null;
    const filePath = paths[0];
    const name = filePath.split(/[/\\]/).pop() || 'unknown';
    const buffer: ArrayBuffer = await api.readFile(filePath);
    return { name, buffer };
  }

  // Browser mode: use file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const buffer = await file.arrayBuffer();
      resolve({ name: file.name, buffer });
    };
    input.click();
  });
}

export const ipc = {
  /**
   * Open file dialog. Returns a pseudo-path for display purposes.
   * Actual file reading happens in parseFile.
   */
  async openFile(): Promise<string[]> {
    const result = await openAndReadFile();
    if (!result) return [];
    pendingFile = result;
    return [result.name];
  },

  /**
   * Parse a file. Uses the buffer from openFile() or a direct buffer.
   * Falls back to re-reading via Electron IPC if no pending buffer.
   */
  async parseFile(filePath: string): Promise<ParsedData> {
    const pending = pendingFile;
    pendingFile = null;

    if (pending) {
      return pyodideParseFile(pending.name, pending.buffer) as Promise<ParsedData>;
    }

    // Fallback: try Electron IPC to read file, then parse
    if (isElectron) {
      const api = (window as any).electronAPI;
      const buffer: ArrayBuffer = await api.readFile(filePath);
      const name = filePath.split(/[/\\]/).pop() || 'unknown';
      return pyodideParseFile(name, buffer) as Promise<ParsedData>;
    }

    throw new Error('No file data available. Please select a file first.');
  },

  /**
   * Parse a file from a buffer directly (used for drag-and-drop).
   */
  async parseBuffer(name: string, buffer: ArrayBuffer): Promise<ParsedData> {
    return pyodideParseFile(name, buffer) as Promise<ParsedData>;
  },

  /**
   * Run a statistical analysis command via Pyodide.
   */
  async analyze(command: string, data: Record<string, unknown>): Promise<unknown> {
    const values = (data.values as number[]) ?? [];

    switch (command) {
      case 'descriptive':
        return descriptiveStats(values);
      case 'normality':
        return normalityTest(values);
      case 'outlier':
        return outlierDetection(values);
      case 'capability':
        return processCapability(
          values,
          data.usl as number | undefined,
          data.lsl as number | undefined,
          data.target as number | undefined,
        );
      case 'control_chart':
        return controlChartAnalysis(values, (data.chart_type as string) || 'xbar_r');
      case 'trend':
        return trendAnalysis(values);
      default:
        throw new Error(`Unknown analysis command: ${command}`);
    }
  },

  /**
   * Get Pyodide runtime status (replaces getPythonStatus).
   */
  async getPythonStatus(): Promise<{ ready: boolean }> {
    return new Promise((resolve) => {
      const unsub = onPyodideStatus((s) => {
        if (s.ready || s.error) {
          unsub();
          resolve({ ready: s.ready });
        }
      });
    });
  },
};
