import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'PharmaStats',
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Crash recovery: reload renderer if it crashes or becomes unresponsive
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason);
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  mainWindow.on('unresponsive', () => {
    console.warn('Window became unresponsive');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  // File dialog
  ipcMain.handle('dialog:openFile', async (_, options) => {
    if (!mainWindow) {
      return [];
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelectionAllowed'],
      filters: [
        { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'pdf'] },
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'PDF Files', extensions: ['pdf'] },
      ],
      ...options,
    });
    return result.filePaths;
  });

  // Read file as ArrayBuffer (for Pyodide WASM)
  ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (err) {
      throw new Error(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
  });
}

app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
