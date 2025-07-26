import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { dataManager } from '../services/database/DataManager';

export interface WindowConfig {
    width: number;
    height: number;
    x?: number;
    y?: number;
    alwaysOnTop?: boolean;
    frame?: boolean;
    transparent?: boolean;
    resizable?: boolean;
    skipTaskbar?: boolean;
    show?: boolean;
}

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private widgetWindow: BrowserWindow | null = null;
    private isDev = process.env.NODE_ENV === 'development';

    /**
     * 메인 창 생성
     */
    public createMainWindow(): BrowserWindow {
        const config: WindowConfig = {
            width: 1200,
            height: 800,
            show: false,
            frame: true,
            resizable: true,
            alwaysOnTop: false
        };

        this.mainWindow = this.createWindow(config, {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        });

        // 메인 창 로드
        if (this.isDev) {
            this.mainWindow.loadURL('http://localhost:3001');
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
        }

        // 준비되면 표시
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        // 창 닫힘 처리
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    /**
     * 위젯 창 생성
     */
    public async createWidgetWindow(): Promise<BrowserWindow> {
        if (this.widgetWindow) {
            return this.widgetWindow;
        }

        // 저장된 위치 불러오기
        const savedX = await dataManager.getSetting('widget_position_x') as number;
        const savedY = await dataManager.getSetting('widget_position_y') as number;
        
        // 기본 위치 (화면 우측 하단)
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        
        const defaultX = screenWidth - 140; // 위젯 너비 + 여백
        const defaultY = screenHeight - 140; // 위젯 높이 + 여백

        const config: WindowConfig = {
            width: 120,
            height: 120,
            x: savedX || defaultX,
            y: savedY || defaultY,
            alwaysOnTop: true,
            frame: false,
            transparent: true,
            resizable: false,
            skipTaskbar: true,
            show: false
        };

        this.widgetWindow = this.createWindow(config, {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        });

        // 위젯 창 로드
        if (this.isDev) {
            this.widgetWindow.loadURL('http://localhost:3002'); // 별도 포트
        } else {
            this.widgetWindow.loadFile(path.join(__dirname, '../../renderer/widget.html'));
        }

        // 화면 경계 내로 위치 조정
        this.constrainWidgetToScreen();

        // 준비되면 표시
        this.widgetWindow.once('ready-to-show', () => {
            this.widgetWindow?.show();
        });

        // 창 닫힘 처리
        this.widgetWindow.on('closed', () => {
            this.widgetWindow = null;
        });

        // 위치 변경 시 저장
        this.widgetWindow.on('moved', () => {
            this.saveWidgetPosition();
        });

        return this.widgetWindow;
    }

    /**
     * 기본 창 생성 함수
     */
    private createWindow(config: WindowConfig, webPreferences: any): BrowserWindow {
        return new BrowserWindow({
            width: config.width,
            height: config.height,
            x: config.x,
            y: config.y,
            alwaysOnTop: config.alwaysOnTop || false,
            frame: config.frame !== false,
            transparent: config.transparent || false,
            resizable: config.resizable !== false,
            skipTaskbar: config.skipTaskbar || false,
            show: config.show !== false,
            webPreferences,
            title: 'Typster Hammy'
        });
    }

    /**
     * 위젯을 화면 경계 내로 제한
     */
    private constrainWidgetToScreen(): void {
        if (!this.widgetWindow) return;

        const [x, y] = this.widgetWindow.getPosition();
        const [width, height] = this.widgetWindow.getSize();
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

        const constrainedX = Math.max(0, Math.min(x, screenWidth - width));
        const constrainedY = Math.max(0, Math.min(y, screenHeight - height));

        if (x !== constrainedX || y !== constrainedY) {
            this.widgetWindow.setPosition(constrainedX, constrainedY);
        }
    }

    /**
     * 위젯 위치 저장
     */
    private async saveWidgetPosition(): Promise<void> {
        if (!this.widgetWindow) return;

        try {
            const [x, y] = this.widgetWindow.getPosition();
            await dataManager.setSetting('widget_position_x', x);
            await dataManager.setSetting('widget_position_y', y);
        } catch (error) {
            console.error('Failed to save widget position:', error);
        }
    }

    /**
     * 위젯 표시/숨김
     */
    public showWidget(): void {
        if (this.widgetWindow) {
            this.widgetWindow.show();
        }
    }

    public hideWidget(): void {
        if (this.widgetWindow) {
            this.widgetWindow.hide();
        }
    }

    public toggleWidget(): void {
        if (this.widgetWindow) {
            if (this.widgetWindow.isVisible()) {
                this.hideWidget();
            } else {
                this.showWidget();
            }
        }
    }

    /**
     * 위젯 위치 설정
     */
    public setWidgetPosition(x: number, y: number): void {
        if (!this.widgetWindow) return;

        // 화면 경계 확인
        const [width, height] = this.widgetWindow.getSize();
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

        const constrainedX = Math.max(0, Math.min(x, screenWidth - width));
        const constrainedY = Math.max(0, Math.min(y, screenHeight - height));

        this.widgetWindow.setPosition(constrainedX, constrainedY);
    }

    /**
     * 위젯 위치 가져오기
     */
    public getWidgetPosition(): { x: number; y: number } | null {
        if (!this.widgetWindow) return null;

        const [x, y] = this.widgetWindow.getPosition();
        return { x, y };
    }

    /**
     * 창 상태 확인
     */
    public isMainWindowOpen(): boolean {
        return this.mainWindow !== null && !this.mainWindow.isDestroyed();
    }

    public isWidgetWindowOpen(): boolean {
        return this.widgetWindow !== null && !this.widgetWindow.isDestroyed();
    }

    public isWidgetVisible(): boolean {
        return this.isWidgetWindowOpen() && this.widgetWindow!.isVisible();
    }

    /**
     * 창 참조 가져오기
     */
    public getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    public getWidgetWindow(): BrowserWindow | null {
        return this.widgetWindow;
    }

    /**
     * 모든 창 닫기
     */
    public closeAllWindows(): void {
        if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
            this.widgetWindow.close();
        }
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.close();
        }
    }

    /**
     * 리소스 정리
     */
    public destroy(): void {
        this.closeAllWindows();
        this.mainWindow = null;
        this.widgetWindow = null;
    }
}

// 싱글톤 인스턴스
export const windowManager = new WindowManager();