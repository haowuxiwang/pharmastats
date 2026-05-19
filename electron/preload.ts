import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialog
  openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),

  // Read file as ArrayBuffer (for Pyodide WASM)
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  // Platform info
  platform: process.platform,
});
