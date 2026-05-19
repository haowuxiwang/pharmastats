import { create } from 'zustand';
import type { AppSettings, AIConfig } from '../types';

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  enabled: false,
};

const DEFAULT_SETTINGS: AppSettings = {
  ai: DEFAULT_AI_CONFIG,
  language: 'zh',
  theme: 'system',
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('pharmastats-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem('pharmastats-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

interface SettingsState {
  settings: AppSettings;
  updateAI: (config: Partial<AIConfig>) => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleAI: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettings(),

  updateAI: (config) =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        ai: { ...state.settings.ai, ...config },
      };
      saveSettings(newSettings);
      return { settings: newSettings };
    }),

  setLanguage: (lang) =>
    set((state) => {
      const newSettings = { ...state.settings, language: lang };
      saveSettings(newSettings);
      return { settings: newSettings };
    }),

  setTheme: (theme) =>
    set((state) => {
      const newSettings = { ...state.settings, theme };
      saveSettings(newSettings);
      return { settings: newSettings };
    }),

  toggleAI: (enabled) =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        ai: { ...state.settings.ai, enabled },
      };
      saveSettings(newSettings);
      return { settings: newSettings };
    }),
}));
