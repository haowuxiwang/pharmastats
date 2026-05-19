# PharmaStats

Open-source QC data analysis tool for pharmaceutical industry. Desktop application built with Electron + React + Pyodide WASM.

## Features

- **6 Statistical Analysis Modules**: Descriptive statistics, normality testing, outlier detection, process capability, control charts, trend analysis
- **AI Data Analysis Agent**: Natural language interface for data analysis with automatic tool calling
- **Auto-Analysis Pipeline**: Automatic analysis on file upload with AI-generated summary
- **PDF Report Generation**: Export analysis results and charts to PDF
- **Multi-format Support**: Excel (.xlsx/.xls), CSV
- **Dark Mode**: System-aware light/dark theme
- **Zero Python Installation**: Statistics run as WebAssembly via Pyodide — no Python setup needed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, shadcn/ui, ECharts 6 |
| Desktop | Electron 42 |
| Statistics | Pyodide WASM (scipy, numpy, pandas) |
| AI | OpenAI-compatible API (DeepSeek, Qwen, SiliconFlow, OpenAI) |

## Quick Start

### Prerequisites

- Node.js 22+
- npm

### Install Dependencies

```bash
npm install
```

### Development

```bash
# Browser mode (Pyodide loads from public/pyodide/)
npm run dev

# Electron mode (full functionality)
npm run electron:dev
```

### Build

```bash
# Build for production (Windows portable .exe)
npm run electron:build
```

## Architecture

```
React Frontend  ←─ direct call ─→  Pyodide WASM (in renderer process)
     │                                  │
  Zustand stores                   scipy / numpy / pandas
  ECharts charts                   (WebAssembly)
  AI Chat Panel
```

Statistics run as WebAssembly inside the Electron renderer process. The Python code from `python/stats/` is embedded in `src/lib/pyodide/stats.ts` and executed via Pyodide. No Python subprocess, no system Python dependency.

## AI Agent

Configure your AI provider in Settings (API key, base URL, model). The agent can:

- Automatically analyze data on file upload
- Answer natural language questions about your data
- Call statistical analysis tools and explain results in Chinese
- Reference pharmaceutical QC standards (ICH Q8/Q9/Q10)

## License

MIT
