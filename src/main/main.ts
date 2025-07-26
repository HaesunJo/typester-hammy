import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { IPCChannels, TypingEvent } from '../shared/types';
import { KeyboardService, TypingMetadata } from './services/KeyboardService';
import { dataManager } from './services/database/DataManager';

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private keyboardService: KeyboardService | null = null;
  private isDev = process.env.NODE_ENV === 'development';

  constructor() {
    this.initializeApp();
    this.initializeKeyboardService();
  }

  private initializeApp(): void {
    // Handle app ready event
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIPC();
      
      // macOS specific: recreate window when dock icon is clicked
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });

    // 앱 종료 시 서비스 정리
    app.on('before-quit', async () => {
      if (this.keyboardService) {
        this.keyboardService.destroy();
      }
      
      // 데이터 관리자 종료
      try {
        await dataManager.shutdown();
      } catch (error) {
        console.error('Failed to shutdown DataManager:', error);
      }
    });
  }

  private createMainWindow(): void {
    // Check if preload script exists
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
      console.error(`Preload script not found at: ${preloadPath}`);
      console.log('Available files in dist/main:', fs.readdirSync(__dirname));
    } else {
      console.log(`Preload script found at: ${preloadPath}`);
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
      show: false, // Don't show until ready
      title: 'Typster Hammy',
    });

    // Load the renderer
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:3001');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private initializeKeyboardService(): void {
    this.keyboardService = new KeyboardService();
    
    // 타이핑 이벤트 리스너 (send 사용 - 단방향)
    this.keyboardService.on('typing', (metadata: TypingMetadata) => {
      const typingEvent: TypingEvent = {
        timestamp: metadata.timestamp,
        keyCount: metadata.keyCount,
        interval: metadata.interval,
        isActive: metadata.isActive,
        sessionId: metadata.sessionId
      };
      
      console.log('Typing detected:', {
        keyCount: typingEvent.keyCount,
        interval: typingEvent.interval,
        sessionId: typingEvent.sessionId
      });
      
      // 렌더러로 타이핑 이벤트 전송 (응답 불필요)
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPCChannels.TYPING_EVENT, typingEvent);
      }
    });

    // 타이핑 세션 종료 이벤트 (send 사용)
    this.keyboardService.on('typingEnd', (metadata: TypingMetadata) => {
      const typingEvent: TypingEvent = {
        timestamp: metadata.timestamp,
        keyCount: metadata.keyCount,
        interval: metadata.interval,
        isActive: false,
        sessionId: metadata.sessionId
      };
      
      console.log('Typing session ended:', typingEvent.sessionId);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPCChannels.TYPING_SESSION_END, typingEvent);
      }
    });

    // 권한 요청 처리
    this.keyboardService.on('permissionRequired', (permissionInfo) => {
      console.log('Permission required:', permissionInfo);
      
      // 시스템 다이얼로그로 권한 요청 안내
      this.showPermissionDialog(permissionInfo);
      
      // 렌더러로 권한 요청 정보 전송
      if (this.mainWindow) {
        this.mainWindow.webContents.send('permission:required', permissionInfo);
      }
    });

    // 서비스 에러 처리
    this.keyboardService.on('serviceError', (error) => {
      console.error('Keyboard service error:', error);
    });
  }

  private setupIPC(): void {
    // Test IPC communication
    ipcMain.handle(IPCChannels.PING, async () => {
      console.log('Main process received ping');
      return 'pong';
    });

    // 키보드 서비스 제어 (invoke 사용 - 결과 필요)
    ipcMain.handle('keyboard:start', async () => {
      try {
        this.keyboardService?.startListening();
        return { success: true, message: 'Keyboard service started' };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('keyboard:stop', async () => {
      try {
        this.keyboardService?.stopListening();
        return { success: true, message: 'Keyboard service stopped' };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('keyboard:status', async () => {
      return {
        isActive: this.keyboardService?.isActive() || false,
        keyCount: this.keyboardService?.getKeyCount() || 0,
        sessionId: this.keyboardService?.getCurrentSession() || null
      };
    });

    // Handle dashboard open request
    ipcMain.on(IPCChannels.DASHBOARD_OPEN, () => {
      console.log('Dashboard open requested');
      // TODO: Implement dashboard window creation
    });

    // Handle dashboard close request
    ipcMain.on(IPCChannels.DASHBOARD_CLOSE, () => {
      console.log('Dashboard close requested');
      // TODO: Implement dashboard window closing
    });

    // Handle typing events (will be implemented in future tasks)
    ipcMain.on(IPCChannels.TYPING_EVENT, (_, event) => {
      console.log('Typing event received:', event);
      // TODO: Process typing event and trigger Hammy reaction
    });

    // 데이터베이스 관련 IPC 핸들러
    ipcMain.handle('database:getStats', async (_, period: 'today' | 'week' | 'month' = 'today') => {
      try {
        const stats = await dataManager.getStats(period);
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:getRecentSessions', async (_, limit: number = 10) => {
      try {
        const sessions = await dataManager.getRecentSessions(limit);
        return { success: true, data: sessions };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:getSetting', async (_, key: string) => {
      try {
        const value = await dataManager.getSetting(key);
        return { success: true, data: value };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:setSetting', async (_, key: string, value: any) => {
      try {
        await dataManager.setSetting(key, value);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:getAllSettings', async () => {
      try {
        const settings = await dataManager.getAllSettings();
        return { success: true, data: settings };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:getStatus', async () => {
      try {
        const status = await dataManager.getStatus();
        return { success: true, data: status };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('database:cleanupOldData', async () => {
      try {
        await dataManager.cleanupOldData();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
  }

  private async showPermissionDialog(permissionInfo: any): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: '키보드 접근 권한 필요',
      message: 'Typster Hammy가 키보드 이벤트를 감지하려면 접근성 권한이 필요합니다.',
      detail: `macOS 시스템 환경설정에서 접근성 권한을 부여해주세요:

1. 시스템 환경설정을 엽니다
2. 보안 및 개인 정보 보호를 클릭합니다
3. 개인 정보 보호 탭을 선택합니다
4. 접근성을 클릭합니다
5. 자물쇠를 클릭하여 변경을 허용합니다
6. + 버튼을 클릭하여 앱을 추가합니다
7. Electron 또는 Typster Hammy를 찾아 추가합니다
8. 체크박스를 활성화합니다

권한을 부여한 후 앱을 다시 시작해주세요.`,
      buttons: ['시스템 환경설정 열기', '나중에', '개발 모드로 계속'],
      defaultId: 0,
      cancelId: 1
    });

    switch (result.response) {
      case 0: // 시스템 환경설정 열기
        try {
          // macOS 시스템 환경설정의 접근성 페이지 직접 열기
          await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
        } catch (error) {
          console.error('Failed to open system preferences:', error);
          // 백업: 일반 시스템 환경설정 열기
          await shell.openExternal('x-apple.systempreferences:com.apple.preference.security');
        }
        break;
      case 1: // 나중에
        console.log('User chose to set permissions later');
        break;
      case 2: // 개발 모드로 계속
        console.log('User chose to continue in development mode');
        // 시뮬레이션 모드는 이미 KeyboardService에서 처리됨
        break;
    }
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}

// Initialize the application
new ElectronApp();