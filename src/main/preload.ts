import { contextBridge, ipcRenderer } from 'electron';
import type { OSCMessage, OSCStatus } from './osc-manager';

contextBridge.exposeInMainWorld('oscBridge', {
  onMessage: (callback: (msg: OSCMessage) => void) => {
    ipcRenderer.on('osc-message', (_event, msg: OSCMessage) => callback(msg));
  },
  onStatus: (callback: (status: OSCStatus) => void) => {
    ipcRenderer.on('osc-status', (_event, status: OSCStatus) => callback(status));
  },
});
