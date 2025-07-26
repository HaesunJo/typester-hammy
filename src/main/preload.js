import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '../shared/types';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Test IPC communication
    ping: () => ipcRenderer.invoke(IPCChannels.PING),
    
    // Dashboard controls
    openDashboard: () => ipcRenderer.send(IPCChannels.DASHBOARD_OPEN),
    closeDashboard: () => ipcRenderer.send(IPCChannels.DASHBOARD_CLOSE),
    
    // Typing events
    sendTypingEvent: (event) => ipcRenderer.send(IPCChannels.TYPING_EVENT, event),
    
    // Listen for Hammy reactions
    onHammyReaction: (callback) => {
        ipcRenderer.on(IPCChannels.HAMMY_REACTION, (_, reaction) => callback(reaction));
    },
    
    // Statistics
    requestStatistics: () => ipcRenderer.send(IPCChannels.STATISTICS_REQUEST),
    onStatisticsResponse: (callback) => {
        ipcRenderer.on(IPCChannels.STATISTICS_RESPONSE, (_, stats) => callback(stats));
    },
    
    // Settings
    updateSettings: (settings) => ipcRenderer.send(IPCChannels.SETTINGS_UPDATE, settings),
    
    // 키보드 서비스 제어
    startKeyboardService: () => ipcRenderer.invoke('keyboard:start'),
    stopKeyboardService: () => ipcRenderer.invoke('keyboard:stop'),
    getKeyboardStatus: () => ipcRenderer.invoke('keyboard:status'),
    
    // 타이핑 이벤트 리스너
    onTypingEvent: (callback) => {
        ipcRenderer.on(IPCChannels.TYPING_EVENT, (_, event) => callback(event));
    },
    onTypingSessionEnd: (callback) => {
        ipcRenderer.on(IPCChannels.TYPING_SESSION_END, (_, event) => callback(event));
    },
    onPermissionRequired: (callback) => {
        ipcRenderer.on('permission:required', (_, permissionInfo) => callback(permissionInfo));
    },
    
    // 데이터베이스 관련 API
    database: {
        getStats: (period = 'today') => ipcRenderer.invoke('database:getStats', period),
        getRecentSessions: (limit = 10) => ipcRenderer.invoke('database:getRecentSessions', limit),
        getSetting: (key) => ipcRenderer.invoke('database:getSetting', key),
        setSetting: (key, value) => ipcRenderer.invoke('database:setSetting', key, value),
        getAllSettings: () => ipcRenderer.invoke('database:getAllSettings'),
        getStatus: () => ipcRenderer.invoke('database:getStatus'),
        cleanupOldData: () => ipcRenderer.invoke('database:cleanupOldData')
    },
    
    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
