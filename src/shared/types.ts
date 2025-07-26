// Shared types between main and renderer processes

export interface TypingEvent {
  timestamp: number;
  keyCount: number;
  interval: number;
  isActive: boolean;
  sessionId: string;
}

export interface IPCMessage {
  type: string;
  payload?: any;
}

export enum IPCChannels {
  TYPING_EVENT = 'typing-event',
  TYPING_SESSION_END = 'typing-session-end',
  HAMMY_REACTION = 'hammy-reaction',
  DASHBOARD_OPEN = 'dashboard-open',
  DASHBOARD_CLOSE = 'dashboard-close',
  STATISTICS_REQUEST = 'statistics-request',
  STATISTICS_RESPONSE = 'statistics-response',
  SETTINGS_UPDATE = 'settings-update',
  PING = 'ping',
  PONG = 'pong',
}

export interface WindowConfig {
  width: number;
  height: number;
  x?: number;
  y?: number;
  alwaysOnTop?: boolean;
  frame?: boolean;
  transparent?: boolean;
  resizable?: boolean;
}