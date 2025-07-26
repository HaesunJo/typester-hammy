import { databaseService } from '../DatabaseService';

export interface TypingSessionData {
    id?: number;
    session_id: string;
    start_time: number;
    end_time?: number;
    total_keys: number;
    duration: number;
    average_interval: number;
    created_at?: number;
}

export class TypingSession {
    /**
     * 새로운 타이핑 세션 생성
     */
    static async create(sessionData: Omit<TypingSessionData, 'id' | 'created_at'>): Promise<number> {
        const result = await databaseService.run(
            `INSERT INTO typing_sessions (session_id, start_time, end_time, total_keys, duration, average_interval)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                sessionData.session_id,
                sessionData.start_time,
                sessionData.end_time || null,
                sessionData.total_keys,
                sessionData.duration,
                sessionData.average_interval
            ]
        );

        return result.lastID!;
    }

    /**
     * 세션 ID로 타이핑 세션 조회
     */
    static async findBySessionId(sessionId: string): Promise<TypingSessionData | null> {
        const row = await databaseService.get(
            'SELECT * FROM typing_sessions WHERE session_id = ?',
            [sessionId]
        );

        return row || null;
    }

    /**
     * 활성 세션 조회 (end_time이 null인 세션)
     */
    static async findActiveSessions(): Promise<TypingSessionData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM typing_sessions WHERE end_time IS NULL ORDER BY start_time DESC'
        );

        return rows;
    }

    /**
     * 세션 종료 처리
     */
    static async endSession(sessionId: string, endTime: number, totalKeys: number, duration: number, averageInterval: number): Promise<void> {
        await databaseService.run(
            `UPDATE typing_sessions 
             SET end_time = ?, total_keys = ?, duration = ?, average_interval = ?
             WHERE session_id = ?`,
            [endTime, totalKeys, duration, averageInterval, sessionId]
        );
    }

    /**
     * 날짜 범위로 세션 조회
     */
    static async findByDateRange(startDate: number, endDate: number): Promise<TypingSessionData[]> {
        const rows = await databaseService.all(
            `SELECT * FROM typing_sessions 
             WHERE start_time >= ? AND start_time <= ?
             ORDER BY start_time DESC`,
            [startDate, endDate]
        );

        return rows;
    }

    /**
     * 특정 날짜의 세션 조회
     */
    static async findByDate(date: string): Promise<TypingSessionData[]> {
        // date는 'YYYY-MM-DD' 형식
        const startOfDay = new Date(date + 'T00:00:00').getTime();
        const endOfDay = new Date(date + 'T23:59:59').getTime();

        return this.findByDateRange(startOfDay, endOfDay);
    }

    /**
     * 최근 N개 세션 조회
     */
    static async findRecent(limit: number = 10): Promise<TypingSessionData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM typing_sessions ORDER BY start_time DESC LIMIT ?',
            [limit]
        );

        return rows;
    }

    /**
     * 세션 통계 조회
     */
    static async getSessionStats(sessionId: string): Promise<{
        totalKeys: number;
        duration: number;
        averageInterval: number;
        keyRate: number; // keys per minute
    } | null> {
        const session = await this.findBySessionId(sessionId);
        
        if (!session || !session.end_time) {
            return null;
        }

        const keyRate = session.duration > 0 
            ? (session.total_keys / (session.duration / 1000)) * 60 
            : 0;

        return {
            totalKeys: session.total_keys,
            duration: session.duration,
            averageInterval: session.average_interval,
            keyRate: Math.round(keyRate * 100) / 100
        };
    }

    /**
     * 오래된 세션 삭제 (데이터 정리)
     */
    static async deleteOldSessions(daysToKeep: number = 365): Promise<number> {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        const result = await databaseService.run(
            'DELETE FROM typing_sessions WHERE start_time < ?',
            [cutoffTime]
        );

        return result.changes || 0;
    }

    /**
     * 세션 삭제
     */
    static async delete(sessionId: string): Promise<boolean> {
        const result = await databaseService.run(
            'DELETE FROM typing_sessions WHERE session_id = ?',
            [sessionId]
        );

        return (result.changes || 0) > 0;
    }

    /**
     * 모든 세션 수 조회
     */
    static async getTotalCount(): Promise<number> {
        const row = await databaseService.get('SELECT COUNT(*) as count FROM typing_sessions');
        return row.count || 0;
    }

    /**
     * 세션 업데이트 (진행 중인 세션의 키 카운트 업데이트)
     */
    static async updateKeyCount(sessionId: string, totalKeys: number, averageInterval: number): Promise<void> {
        await databaseService.run(
            'UPDATE typing_sessions SET total_keys = ?, average_interval = ? WHERE session_id = ?',
            [totalKeys, averageInterval, sessionId]
        );
    }
}