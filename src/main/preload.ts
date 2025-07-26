import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels, TypingEvent } from '../shared/types';

// Expose safe Node.js APIs
contextBridge.exposeInMainWorld('nodeAPI', {
  // 플랫폼 정보
  platform: process.platform,
  arch: process.arch,

  // 환경 변수 (필요한 것만)
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },

  // 버전 정보
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Test IPC communication
  ping: () => ipcRenderer.invoke(IPCChannels.PING),

  // Dashboard controls
  openDashboard: () => ipcRenderer.send(IPCChannels.DASHBOARD_OPEN),
  closeDashboard: () => ipcRenderer.send(IPCChannels.DASHBOARD_CLOSE),

  // Typing events
  sendTypingEvent: (event: TypingEvent) =>
    ipcRenderer.send(IPCChannels.TYPING_EVENT, event),

  // 키보드 서비스 제어 (invoke - 결과 필요)
  startKeyboardService: () => ipcRenderer.invoke('keyboard:start'),
  stopKeyboardService: () => ipcRenderer.invoke('keyboard:stop'),
  getKeyboardStatus: () => ipcRenderer.invoke('keyboard:status'),
  
  // 타이핑 이벤트 리스너 (on - 이벤트 수신)
  onTypingEvent: (callback: (event: TypingEvent) => void) => {
    ipcRenderer.on(IPCChannels.TYPING_EVENT, (_, event) => callback(event));
  },
  
  onTypingSessionEnd: (callback: (event: TypingEvent) => void) => {
    ipcRenderer.on(IPCChannels.TYPING_SESSION_END, (_, event) => callback(event));
  },

  // Listen for Hammy reactions
  onHammyReaction: (callback: (reaction: any) => void) => {
    ipcRenderer.on(IPCChannels.HAMMY_REACTION, (_, reaction) => callback(reaction));
  },

  // Statistics
  requestStatistics: () => ipcRenderer.send(IPCChannels.STATISTICS_REQUEST),
  onStatisticsResponse: (callback: (stats: any) => void) => {
    ipcRenderer.on(IPCChannels.STATISTICS_RESPONSE, (_, stats) => callback(stats));
  },

  // Settings
  updateSettings: (settings: any) =>
    ipcRenderer.send(IPCChannels.SETTINGS_UPDATE, settings),

  // Permission handling
  onPermissionRequired: (callback: (permissionInfo: any) => void) => {
    ipcRenderer.on('permission:required', (_, permissionInfo) => callback(permissionInfo));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declarations are now managed in src/renderer/types.d.ts