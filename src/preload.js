'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('office', {
  onEvent: (cb) => ipcRenderer.on('office:event', (_e, ev) => cb(ev)),
  onSettings: (cb) => ipcRenderer.on('office:settings', (_e, s) => cb(s)),
  onLimits: (cb) => ipcRenderer.on('office:limits', (_e, l) => cb(l)),
  onShowStats: (cb) => ipcRenderer.on('office:showStats', () => cb()),
  focus: (sessionId) => ipcRenderer.invoke('office:focus', sessionId),
  stats: () => ipcRenderer.invoke('office:stats'),
  snapshot: () => ipcRenderer.invoke('office:snapshot'),
  info: () => ipcRenderer.invoke('office:info'),
});
