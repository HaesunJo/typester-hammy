import { TypingEvent } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
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

      onHammyReaction: (callback: (reaction: any) => void) => void;
      requestStatistics: () => void;
      onStatisticsResponse: (callback: (stats: any) => void) => void;
      updateSettings: (settings: any) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export { };