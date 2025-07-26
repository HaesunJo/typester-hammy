import { EventEmitter } from 'events';
import { NativeKeyboardListener } from './native';
import { NativeKeyEvent } from './native/types';
import { dataManager } from './database/DataManager';

export interface TypingMetadata {
    timestamp: number;
    keyCount: number;
    interval: number;
    isActive: boolean;
    sessionId: string;
}

export class KeyboardService extends EventEmitter {
    private nativeListener: NativeKeyboardListener;
    private lastKeyTime: number = 0;
    private keyCount: number = 0;
    private sessionId: string;
    private isListening: boolean = false;
    private typingTimeout: NodeJS.Timeout | null = null;
    private readonly TYPING_TIMEOUT = 2000; // 2초 후 타이핑 세션 종료
    private simulationInterval: NodeJS.Timeout | null = null;
    private isSimulationMode: boolean = false;

    constructor() {
        super();
        this.nativeListener = new NativeKeyboardListener();
        this.sessionId = this.generateSessionId();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    private handleNativeKeyEvent(event: NativeKeyEvent): void {
        // 키를 누를 때만 처리 (키를 뗄 때는 무시)
        if (!event.isKeyDown) return;

        // 특수 키는 무시 (프라이버시 보호)
        if (event.isSpecialKey) return;

        this.handleKeyPress(event.timestamp);
    }

    private handleKeyPress(timestamp?: number): void {
        const currentTime = timestamp || Date.now();
        const interval = this.lastKeyTime > 0 ? currentTime - this.lastKeyTime : 0;

        this.keyCount++;
        this.lastKeyTime = currentTime;

        // 타이핑 세션 타임아웃 리셋
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // 메타데이터 생성 (키 내용은 포함하지 않음 - 프라이버시 보호)
        const metadata: TypingMetadata = {
            timestamp: currentTime,
            keyCount: this.keyCount,
            interval,
            isActive: true,
            sessionId: this.sessionId
        };

        // 데이터베이스에 타이핑 이벤트 저장
        dataManager.handleTypingEvent(metadata).catch(error => {
            console.error('Failed to save typing event to database:', error);
        });

        // 타이핑 이벤트 발생
        this.emit('typing', metadata);

        // 타이핑 세션 종료 타이머 설정
        this.typingTimeout = setTimeout(() => {
            this.endTypingSession();
        }, this.TYPING_TIMEOUT);
    }

    private endTypingSession(): void {
        const endMetadata: TypingMetadata = {
            timestamp: Date.now(),
            keyCount: this.keyCount,
            interval: 0,
            isActive: false,
            sessionId: this.sessionId
        };

        // 데이터베이스에 세션 종료 저장
        dataManager.handleSessionEnd(endMetadata).catch(error => {
            console.error('Failed to save session end to database:', error);
        });

        this.emit('typingEnd', endMetadata);

        // 새로운 세션 시작 준비
        this.keyCount = 0;
        this.lastKeyTime = 0;
        this.sessionId = this.generateSessionId();
    }

    public startListening(): void {
        if (this.isListening) return;

        try {
            // 권한 확인
            const permissions = this.nativeListener.checkPermissions();
            if (!permissions.hasPermission) {
                console.warn('Keyboard permissions not granted:');
                console.warn(permissions.permissionMessage);
                
                // 더 자세한 권한 안내 메시지
                const detailedMessage = process.platform === 'darwin' 
                    ? 'macOS 접근성 권한이 필요합니다.\n\n1. 시스템 환경설정을 엽니다\n2. 보안 및 개인 정보 보호를 클릭합니다\n3. 개인 정보 보호 탭을 선택합니다\n4. 접근성을 클릭합니다\n5. Electron 또는 Typster Hammy 앱을 체크합니다\n\n권한을 부여한 후 앱을 다시 시작해주세요.'
                    : permissions.permissionMessage;
                
                this.emit('permissionRequired', {
                    platform: process.platform,
                    message: detailedMessage,
                    requiresElevation: permissions.requiresElevation
                });
                
                // 개발 중에는 권한 없이도 계속 진행 (시뮬레이션 모드)
                console.log('개발 모드: 권한 없이 시뮬레이션 모드로 진행합니다.');
                this.startSimulationMode();
                return;
            }

            // 네이티브 키보드 리스너 시작
            const success = this.nativeListener.startListening((event: NativeKeyEvent) => {
                this.handleNativeKeyEvent(event);
            });

            if (!success) {
                throw new Error('Failed to start native keyboard listener');
            }

            this.isListening = true;
            console.log('Native keyboard service started successfully');
            this.emit('serviceStarted');
        } catch (error) {
            console.error('Failed to start keyboard service:', error);
            this.emit('serviceError', error);
            throw error;
        }
    }

    public stopListening(): void {
        if (!this.isListening) return;

        try {
            // 타이핑 타임아웃 정리
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
                this.typingTimeout = null;
            }

            // 시뮬레이션 모드인 경우
            if (this.isSimulationMode) {
                this.stopSimulationMode();
            } else {
                // 네이티브 리스너 중지
                this.nativeListener.stopListening();
            }

            this.isListening = false;
            console.log('Keyboard service stopped');
            this.emit('serviceStopped');
        } catch (error) {
            console.error('Failed to stop keyboard service:', error);
            this.emit('serviceError', error);
        }
    }

    public isActive(): boolean {
        return this.isListening && (this.isSimulationMode || this.nativeListener.isListening());
    }

    public getCurrentSession(): string {
        return this.sessionId;
    }

    public getKeyCount(): number {
        return this.keyCount;
    }

    public checkPermissions() {
        return this.nativeListener.checkPermissions();
    }

    private startSimulationMode(): void {
        this.isSimulationMode = true;
        this.isListening = true;
        
        console.log('시뮬레이션 모드 시작: 가짜 타이핑 이벤트를 생성합니다.');
        
        // 3초마다 랜덤한 타이핑 이벤트 생성
        this.simulationInterval = setInterval(() => {
            // 랜덤한 간격으로 타이핑 이벤트 생성 (100ms ~ 500ms)
            const interval = Math.random() * 400 + 100;
            
            setTimeout(() => {
                this.handleKeyPress();
            }, interval);
            
            // 가끔 연속 타이핑 시뮬레이션 (30% 확률)
            if (Math.random() < 0.3) {
                setTimeout(() => {
                    this.handleKeyPress();
                }, interval + 150);
                
                setTimeout(() => {
                    this.handleKeyPress();
                }, interval + 300);
            }
        }, 3000);
        
        this.emit('serviceStarted');
    }

    private stopSimulationMode(): void {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.isSimulationMode = false;
        console.log('시뮬레이션 모드 중지');
    }

    public destroy(): void {
        this.stopListening();
        this.stopSimulationMode();
        this.removeAllListeners();
    }
}