import { TypingEvent } from '../shared/types';

// ElectronAPI 타입 정의
export interface ElectronAPI {
  // 기본 IPC
  ping: () => Promise<string>;
  openDashboard: () => void;
  closeDashboard: () => void;
  sendTypingEvent: (event: TypingEvent) => void;

  // 키보드 서비스 제어
  startKeyboardService: () => Promise<{ success: boolean; message?: string; error?: string }>;
  stopKeyboardService: () => Promise<{ success: boolean; message?: string; error?: string }>;
  getKeyboardStatus: () => Promise<{ isActive: boolean; keyCount: number; sessionId: string | null }>;

  // 타이핑 이벤트 리스너
  onTypingEvent: (callback: (event: TypingEvent) => void) => void;
  onTypingSessionEnd: (callback: (event: TypingEvent) => void) => void;
  onPermissionRequired: (callback: (permissionInfo: any) => void) => void;

  // 데이터베이스 관련 API
  database: {
    getStats: (period?: 'today' | 'week' | 'month') => Promise<{ success: boolean; data?: any; error?: string }>;
    getRecentSessions: (limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getSetting: (key: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    setSetting: (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
    getAllSettings: () => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
    cleanupOldData: () => Promise<{ success: boolean; error?: string }>;
  };

  // 위젯 관련 API
  widget: {
    show: () => Promise<{ success: boolean; error?: string }>;
    hide: () => Promise<{ success: boolean; error?: string }>;
    toggle: () => Promise<{ success: boolean; visible?: boolean; error?: string }>;
    setPosition: (x: number, y: number) => Promise<{ success: boolean; error?: string }>;
    getPosition: () => Promise<{ success: boolean; data?: { x: number; y: number }; error?: string }>;
    savePosition: (x: number, y: number) => Promise<{ success: boolean; error?: string }>;
    getStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
  };

  // 기타
  onHammyReaction: (callback: (reaction: any) => void) => void;
  requestStatistics: () => void;
  onStatisticsResponse: (callback: (stats: any) => void) => void;
  updateSettings: (settings: any) => void;
  removeAllListeners: (channel: string) => void;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}