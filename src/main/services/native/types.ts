// 네이티브 키보드 리스너 타입 정의

export interface NativeKeyEvent {
  timestamp: number;
  keyCode: number;
  isKeyDown: boolean;
  isSpecialKey: boolean;
}

export interface KeyboardMetadata {
  timestamp: number;
  interval: number;
  keyCount: number;
  sessionId: string;
}

export interface PlatformPermissions {
  hasPermission: boolean;
  requiresElevation: boolean;
  permissionMessage: string;
}

export interface NativeKeyboardListener {
  startListening(callback: (event: NativeKeyEvent) => void): boolean;
  stopListening(): boolean;
  checkPermissions(): PlatformPermissions;
  isListening(): boolean;
}

// 네이티브 모듈 타입은 index.ts에서 직접 처리