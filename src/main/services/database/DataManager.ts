import { databaseService } from './DatabaseService';
import { TypingSession } from './models/TypingSession';
import { TypingEvent } from './models/TypingEvent';
import { DailyStats } from './models/DailyStats';
import { AppSettings } from './models/AppSettings';
import { TypingMetadata } from '../KeyboardService';

/**
 * 데이터 관리자 - 키보드 서비스와 데이터베이스 간의 중간 계층
 */
export class DataManager {
    private currentSessionId: string | null = null;
    private sessionStartTime: number = 0;
    private sessionKeyCount: number = 0;
    private sessionIntervals: number[] = [];

    constructor() {
        this.initialize();
    }

    /**
     * 데이터 관리자 초기화
     */
    private async initialize(): Promise<void> {
        try {
            await databaseService.initialize();
            console.log('DataManager initialized successfully');
            
            // 앱 시작 시 오늘 통계 업데이트
            await this.updateTodayStats();
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            throw error;
        }
    }

    /**
     * 타이핑 이벤트 처리 (KeyboardService에서 호출)
     */
    public async handleTypingEvent(metadata: TypingMetadata): Promise<void> {
        try {
            // 새로운 세션 시작
            if (metadata.sessionId !== this.currentSessionId) {
                await this.startNewSession(metadata);
            }

            // 타이핑 이벤트 저장
            await TypingEvent.create({
                session_id: metadata.sessionId,
                timestamp: metadata.timestamp,
                key_count: metadata.keyCount,
                interval_ms: metadata.interval,
                is_active: metadata.isActive
            });

            // 세션 정보 업데이트
            this.sessionKeyCount = metadata.keyCount;
            if (metadata.interval > 0) {
                this.sessionIntervals.push(metadata.interval);
            }

            // 진행 중인 세션 업데이트
            await this.updateCurrentSession(metadata);

            console.log(`Typing event saved: Session ${metadata.sessionId}, Key ${metadata.keyCount}`);
        } catch (error) {
            console.error('Failed to handle typing event:', error);
        }
    }

    /**
     * 타이핑 세션 종료 처리
     */
    public async handleSessionEnd(metadata: TypingMetadata): Promise<void> {
        if (!this.currentSessionId || this.currentSessionId !== metadata.sessionId) {
            return;
        }

        try {
            const endTime = metadata.timestamp;
            const duration = endTime - this.sessionStartTime;
            const averageInterval = this.sessionIntervals.length > 0
                ? this.sessionIntervals.reduce((sum, interval) => sum + interval, 0) / this.sessionIntervals.length
                : 0;

            // 세션 종료 처리
            await TypingSession.endSession(
                metadata.sessionId,
                endTime,
                this.sessionKeyCount,
                duration,
                averageInterval
            );

            console.log(`Session ended: ${metadata.sessionId}, Duration: ${duration}ms, Keys: ${this.sessionKeyCount}`);

            // 세션 정보 초기화
            this.resetSessionData();

            // 오늘 통계 업데이트
            await this.updateTodayStats();
        } catch (error) {
            console.error('Failed to handle session end:', error);
        }
    }

    /**
     * 새로운 세션 시작
     */
    private async startNewSession(metadata: TypingMetadata): Promise<void> {
        // 이전 세션이 있다면 강제 종료
        if (this.currentSessionId) {
            await this.forceEndCurrentSession();
        }

        // 새 세션 생성
        await TypingSession.create({
            session_id: metadata.sessionId,
            start_time: metadata.timestamp,
            total_keys: 0,
            duration: 0,
            average_interval: 0
        });

        // 세션 정보 설정
        this.currentSessionId = metadata.sessionId;
        this.sessionStartTime = metadata.timestamp;
        this.sessionKeyCount = 0;
        this.sessionIntervals = [];

        console.log(`New session started: ${metadata.sessionId}`);
    }

    /**
     * 현재 세션 업데이트
     */
    private async updateCurrentSession(metadata: TypingMetadata): Promise<void> {
        if (!this.currentSessionId) return;

        const averageInterval = this.sessionIntervals.length > 0
            ? this.sessionIntervals.reduce((sum, interval) => sum + interval, 0) / this.sessionIntervals.length
            : 0;

        await TypingSession.updateKeyCount(
            this.currentSessionId,
            this.sessionKeyCount,
            averageInterval
        );
    }

    /**
     * 현재 세션 강제 종료
     */
    private async forceEndCurrentSession(): Promise<void> {
        if (!this.currentSessionId) return;

        const endTime = Date.now();
        const duration = endTime - this.sessionStartTime;
        const averageInterval = this.sessionIntervals.length > 0
            ? this.sessionIntervals.reduce((sum, interval) => sum + interval, 0) / this.sessionIntervals.length
            : 0;

        await TypingSession.endSession(
            this.currentSessionId,
            endTime,
            this.sessionKeyCount,
            duration,
            averageInterval
        );

        console.log(`Force ended session: ${this.currentSessionId}`);
    }

    /**
     * 세션 데이터 초기화
     */
    private resetSessionData(): void {
        this.currentSessionId = null;
        this.sessionStartTime = 0;
        this.sessionKeyCount = 0;
        this.sessionIntervals = [];
    }

    /**
     * 오늘 통계 업데이트
     */
    private async updateTodayStats(): Promise<void> {
        try {
            await DailyStats.updateTodayStats();
        } catch (error) {
            console.error('Failed to update today stats:', error);
        }
    }

    /**
     * 통계 데이터 조회
     */
    public async getStats(period: 'today' | 'week' | 'month' = 'today'): Promise<any> {
        try {
            const today = new Date().toISOString().split('T')[0];

            switch (period) {
                case 'today':
                    return await DailyStats.findByDate(today);
                
                case 'week':
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - 6);
                    const weekStartStr = weekStart.toISOString().split('T')[0];
                    return await DailyStats.getWeeklyStats(weekStartStr);
                
                case 'month':
                    const now = new Date();
                    return await DailyStats.getMonthlyStats(now.getFullYear(), now.getMonth() + 1);
                
                default:
                    return null;
            }
        } catch (error) {
            console.error('Failed to get stats:', error);
            return null;
        }
    }

    /**
     * 최근 세션 조회
     */
    public async getRecentSessions(limit: number = 10): Promise<any[]> {
        try {
            return await TypingSession.findRecent(limit);
        } catch (error) {
            console.error('Failed to get recent sessions:', error);
            return [];
        }
    }

    /**
     * 설정 관리
     */
    public async getSetting<T = any>(key: string): Promise<T | null> {
        try {
            return await AppSettings.get<T>(key);
        } catch (error) {
            console.error(`Failed to get setting ${key}:`, error);
            return null;
        }
    }

    public async setSetting(key: string, value: any): Promise<void> {
        try {
            await AppSettings.set(key, value);
        } catch (error) {
            console.error(`Failed to set setting ${key}:`, error);
        }
    }

    public async getAllSettings(): Promise<Record<string, any>> {
        try {
            return await AppSettings.getAll();
        } catch (error) {
            console.error('Failed to get all settings:', error);
            return {};
        }
    }

    /**
     * 데이터 정리 (오래된 데이터 삭제)
     */
    public async cleanupOldData(): Promise<void> {
        try {
            const retentionDays = await AppSettings.getNumber('data_retention_days', 365);
            
            const deletedSessions = await TypingSession.deleteOldSessions(retentionDays);
            const deletedEvents = await TypingEvent.deleteOldEvents(retentionDays);
            const deletedStats = await DailyStats.deleteOldStats(retentionDays);

            console.log(`Data cleanup completed: ${deletedSessions} sessions, ${deletedEvents} events, ${deletedStats} stats deleted`);
        } catch (error) {
            console.error('Failed to cleanup old data:', error);
        }
    }

    /**
     * 데이터베이스 상태 확인
     */
    public async getStatus(): Promise<{
        isConnected: boolean;
        dbPath: string;
        totalSessions: number;
        totalEvents: number;
        totalStats: number;
    }> {
        try {
            const isConnected = databaseService.isConnected();
            const dbPath = databaseService.getDatabasePath();
            
            if (!isConnected) {
                return {
                    isConnected: false,
                    dbPath,
                    totalSessions: 0,
                    totalEvents: 0,
                    totalStats: 0
                };
            }

            const totalSessions = await TypingSession.getTotalCount();
            const totalEvents = await TypingEvent.getTotalCount();
            const totalStats = await DailyStats.getTotalCount();

            return {
                isConnected,
                dbPath,
                totalSessions,
                totalEvents,
                totalStats
            };
        } catch (error) {
            console.error('Failed to get database status:', error);
            return {
                isConnected: false,
                dbPath: '',
                totalSessions: 0,
                totalEvents: 0,
                totalStats: 0
            };
        }
    }

    /**
     * 데이터 관리자 종료
     */
    public async shutdown(): Promise<void> {
        try {
            // 현재 세션이 있다면 종료
            if (this.currentSessionId) {
                await this.forceEndCurrentSession();
            }

            // 데이터베이스 연결 종료
            await databaseService.close();
            console.log('DataManager shutdown completed');
        } catch (error) {
            console.error('Failed to shutdown DataManager:', error);
        }
    }
}

// 싱글톤 인스턴스
export const dataManager = new DataManager();