import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { startOSCReceiver, stopOSCReceiver } from './osc-manager';

const OSC_PORT = 8000;
const OSC_HOST = '0.0.0.0';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    backgroundColor: '#1b1b1b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', '..', 'index.html'));

  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
  }

  startOSCReceiver(OSC_PORT, OSC_HOST, win);

  win.on('closed', () => {
    stopOSCReceiver();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopOSCReceiver();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
