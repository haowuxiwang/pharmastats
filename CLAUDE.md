# PharmaStats

Open-source QC data analysis tool for pharmaceutical industry.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + ECharts 6
- **Desktop**: Electron 42
- **Statistics**: Pyodide WASM (scipy/numpy/pandas running in browser via WebAssembly)
- **State**: Zustand 5
- **AI**: OpenAI-compatible API (DeepSeek/Qwen/SiliconFlow/OpenAI) with tool calling

## Architecture

```
React Frontend  ←─ direct call ─→  Pyodide WASM (renderer process)
     │                                  │
  Zustand stores                   scipy / numpy / pandas
  ECharts charts                   (WebAssembly)
  AI Chat Panel
```

Statistics run as WebAssembly in the renderer process — no Python subprocess, no system Python required.

## Commands

```bash
npm run dev              # Vite dev server (Pyodide in browser)
npm run build            # TypeScript check + Vite build
npm run build:electron   # Compile Electron main process
npm run electron:dev     # Electron + Pyodide
npm run electron:build   # Production build (portable .exe)
npm run lint             # ESLint
npm run test             # Vitest
```

## Key Directories

```
src/
  components/
    ai/              # ChatPanel, ChatMessage, ChatInput
    analysis/        # DescriptivePage, NormalityPage, etc.
    charts/          # ChartWrapper, baseOptions
    data/            # FileUpload, DataPreview
    layout/          # Sidebar, Header
    report/          # ReportPage
    ui/              # shadcn/ui components
  hooks/             # useAnalysis
  lib/
    ai/              # client.ts, agent.ts, tools.ts, prompts.ts, autoAnalysis.ts
    ipc.ts           # IPC bridge (routes to Pyodide)
    pyodide/         # runtime.ts, stats.ts, parsers.ts
    report/          # generateReport.ts
    utils.ts         # cn() for shadcn
  stores/            # dataStore, settingsStore, chatStore
electron/
  main.ts            # Electron main process
  preload.ts         # Context bridge
public/
  pyodide/           # Pyodide WASM distribution files
python/              # Reference source (code embedded in src/lib/pyodide/)
```

## Analysis Modules

| Module | Pyodide Function | Frontend Page |
|--------|-----------------|---------------|
| Descriptive Stats | `descriptiveStats()` | DescriptivePage |
| Normality Test | `normalityTest()` | NormalityPage |
| Outlier Detection | `outlierDetection()` | OutlierPage |
| Process Capability | `processCapability()` | CapabilityPage |
| Control Chart | `controlChartAnalysis()` | ControlChartPage |
| Trend Analysis | `trendAnalysis()` | TrendPage |

## Pyodide Loading

Pyodide loads WASM + packages on first use (~3-10s). Status is exposed via `onPyodideStatus()`.
Installed packages (scipy, numpy, pandas) are cached in the browser.

## AI Agent

The AI agent uses OpenAI-compatible tool calling to orchestrate analysis:
- `tools.ts` defines 7 tools mapping to Pyodide analysis functions
- `agent.ts` implements the streaming tool-calling loop
- `prompts.ts` contains pharmaceutical QC domain knowledge
- `autoAnalysis.ts` runs all analyses on file upload

## Code Conventions

- Chinese UI text, English code comments
- shadcn/ui components for all UI
- `@/` path alias → `./src/`
- CSS variables for theming (--ps-* prefix for custom, shadcn variables for components)
