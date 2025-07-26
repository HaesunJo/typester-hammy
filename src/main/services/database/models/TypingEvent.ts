import { databaseService } from '../DatabaseService';

export interface TypingEventData {
    id?: number;
    session_id: string;
    timestamp: number;
    key_count: number;
    interval_ms: number;
    is_active: boolean;
    created_at?: number;
}

export class TypingEvent {
    /**
     * 새로운 타이핑 이벤트 생성
     */
    static async create(eventData: Omit<TypingEventData, 'id' | 'created_at'>): Promise<number> {
        const result = await databaseService.run(
            `INSERT INTO typing_events (session_id, timestamp, key_count, interval_ms, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [
                eventData.session_id,
                eventData.timestamp,
                eventData.key_count,
                eventData.interval_ms,
                eventData.is_active ? 1 : 0
            ]
        );

        return result.lastID!;
    }

    /**
     * 세션 ID로 타이핑 이벤트 조회
     */
    static async findBySessionId(sessionId: string): Promise<TypingEventData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM typing_events WHERE session_id = ? ORDER BY timestamp ASC',
            [sessionId]
        );

        return rows.map(row => ({
            ...row,
            is_active: Boolean(row.is_active)
        }));
    }

    /**
     * 날짜 범위로 타이핑 이벤트 조회
     */
    static async findByDateRange(startDate: number, endDate: number): Promise<TypingEventData[]> {
        const rows = await databaseService.all(
            `SELECT * FROM typing_events 
             WHERE timestamp >= ? AND timestamp <= ?
             ORDER BY timestamp ASC`,
            [startDate, endDate]
        );

        return rows.map(row => ({
            ...row,
            is_active: Boolean(row.is_active)
        }));
    }

    /**
     * 특정 날짜의 타이핑 이벤트 조회
     */
    static async findByDate(date: string): Promise<TypingEventData[]> {
        // date는 'YYYY-MM-DD' 형식
        const startOfDay = new Date(date + 'T00:00:00').getTime();
        const endOfDay = new Date(date + 'T23:59:59').getTime();

        return this.findByDateRange(startOfDay, endOfDay);
    }

    /**
     * 최근 N개 이벤트 조회
     */
    static async findRecent(limit: number = 100): Promise<TypingEventData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM typing_events ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );

        return rows.map(row => ({
            ...row,
            is_active: Boolean(row.is_active)
        }));
    }

    /**
     * 세션의 타이핑 패턴 분석
     */
    static async analyzeSessionPattern(sessionId: string): Promise<{
        totalEvents: number;
        averageInterval: number;
        minInterval: number;
        maxInterval: number;
        burstPeriods: number; // 빠른 타이핑 구간 수 (간격 < 100ms)
        pausePeriods: number; // 긴 휴식 구간 수 (간격 > 2000ms)
    }> {
        const events = await this.findBySessionId(sessionId);
        
        if (events.length === 0) {
            return {
                totalEvents: 0,
                averageInterval: 0,
                minInterval: 0,
                maxInterval: 0,
                burstPeriods: 0,
                pausePeriods: 0
            };
        }

        const intervals = events
            .filter(event => event.interval_ms > 0)
            .map(event => event.interval_ms);

        if (intervals.length === 0) {
            return {
                totalEvents: events.length,
                averageInterval: 0,
                minInterval: 0,
                maxInterval: 0,
                burstPeriods: 0,
                pausePeriods: 0
            };
        }

        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const minInterval = Math.min(...intervals);
        const maxInterval = Math.max(...intervals);
        const burstPeriods = intervals.filter(interval => interval < 100).length;
        const pausePeriods = intervals.filter(interval => interval > 2000).length;

        return {
            totalEvents: events.length,
            averageInterval: Math.round(averageInterval * 100) / 100,
            minInterval,
            maxInterval,
            burstPeriods,
            pausePeriods
        };
    }

    /**
     * 시간대별 타이핑 활동 분석
     */
    static async getHourlyActivity(date: string): Promise<{ hour: number; eventCount: number }[]> {
        const startOfDay = new Date(date + 'T00:00:00').getTime();
        const endOfDay = new Date(date + 'T23:59:59').getTime();

        const rows = await databaseService.all(
            `SELECT 
                strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) as hour,
                COUNT(*) as event_count
             FROM typing_events 
             WHERE timestamp >= ? AND timestamp <= ?
             GROUP BY hour
             ORDER BY hour`,
            [startOfDay, endOfDay]
        );

        // 0-23시까지 모든 시간대 포함 (데이터가 없는 시간대는 0으로)
        const hourlyData: { hour: number; eventCount: number }[] = [];
        
        for (let hour = 0; hour < 24; hour++) {
            const found = rows.find(row => parseInt(row.hour) === hour);
            hourlyData.push({
                hour,
                eventCount: found ? found.event_count : 0
            });
        }

        return hourlyData;
    }

    /**
     * 타이핑 속도 계산 (분당 키 입력 수)
     */
    static async calculateTypingSpeed(sessionId: string): Promise<number> {
        const events = await this.findBySessionId(sessionId);
        
        if (events.length < 2) {
            return 0;
        }

        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];
        const durationMinutes = (lastEvent.timestamp - firstEvent.timestamp) / (1000 * 60);

        if (durationMinutes === 0) {
            return 0;
        }

        const keysPerMinute = events.length / durationMinutes;
        return Math.round(keysPerMinute * 100) / 100;
    }

    /**
     * 배치로 여러 이벤트 생성 (성능 최적화)
     */
    static async createBatch(events: Omit<TypingEventData, 'id' | 'created_at'>[]): Promise<void> {
        if (events.length === 0) return;

        await databaseService.transaction(async () => {
            for (const event of events) {
                await this.create(event);
            }
        });
    }

    /**
     * 오래된 이벤트 삭제 (데이터 정리)
     */
    static async deleteOldEvents(daysToKeep: number = 365): Promise<number> {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        const result = await databaseService.run(
            'DELETE FROM typing_events WHERE timestamp < ?',
            [cutoffTime]
        );

        return result.changes || 0;
    }

    /**
     * 세션의 모든 이벤트 삭제
     */
    static async deleteBySessionId(sessionId: string): Promise<number> {
        const result = await databaseService.run(
            'DELETE FROM typing_events WHERE session_id = ?',
            [sessionId]
        );

        return result.changes || 0;
    }

    /**
     * 전체 이벤트 수 조회
     */
    static async getTotalCount(): Promise<number> {
        const row = await databaseService.get('SELECT COUNT(*) as count FROM typing_events');
        return row.count || 0;
    }

    /**
     * 세션별 이벤트 수 조회
     */
    static async getEventCountBySession(sessionId: string): Promise<number> {
        const row = await databaseService.get(
            'SELECT COUNT(*) as count FROM typing_events WHERE session_id = ?',
            [sessionId]
        );
        return row.count || 0;
    }
}