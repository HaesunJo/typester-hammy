import { databaseService } from '../DatabaseService';
import { TypingSession } from './TypingSession';
import { TypingEvent } from './TypingEvent';

export interface DailyStatsData {
    id?: number;
    date: string; // YYYY-MM-DD 형식
    total_keys: number;
    total_sessions: number;
    total_duration: number; // milliseconds
    average_speed: number; // keys per minute
    peak_hour: number; // 0-23
    created_at?: number;
    updated_at?: number;
}

export class DailyStats {
    /**
     * 일별 통계 생성 또는 업데이트
     */
    static async createOrUpdate(statsData: Omit<DailyStatsData, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        const existing = await this.findByDate(statsData.date);
        
        if (existing) {
            await databaseService.run(
                `UPDATE daily_stats 
                 SET total_keys = ?, total_sessions = ?, total_duration = ?, 
                     average_speed = ?, peak_hour = ?, updated_at = strftime('%s', 'now')
                 WHERE date = ?`,
                [
                    statsData.total_keys,
                    statsData.total_sessions,
                    statsData.total_duration,
                    statsData.average_speed,
                    statsData.peak_hour,
                    statsData.date
                ]
            );
        } else {
            await databaseService.run(
                `INSERT INTO daily_stats (date, total_keys, total_sessions, total_duration, average_speed, peak_hour)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    statsData.date,
                    statsData.total_keys,
                    statsData.total_sessions,
                    statsData.total_duration,
                    statsData.average_speed,
                    statsData.peak_hour
                ]
            );
        }
    }

    /**
     * 날짜로 일별 통계 조회
     */
    static async findByDate(date: string): Promise<DailyStatsData | null> {
        const row = await databaseService.get(
            'SELECT * FROM daily_stats WHERE date = ?',
            [date]
        );

        return row || null;
    }

    /**
     * 날짜 범위로 일별 통계 조회
     */
    static async findByDateRange(startDate: string, endDate: string): Promise<DailyStatsData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM daily_stats WHERE date >= ? AND date <= ? ORDER BY date ASC',
            [startDate, endDate]
        );

        return rows;
    }

    /**
     * 최근 N일 통계 조회
     */
    static async findRecent(days: number = 30): Promise<DailyStatsData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?',
            [days]
        );

        return rows.reverse(); // 날짜 순으로 정렬
    }

    /**
     * 특정 날짜의 통계를 실시간으로 계산하여 업데이트
     */
    static async calculateAndUpdateStats(date: string): Promise<DailyStatsData> {
        const sessions = await TypingSession.findByDate(date);
        const events = await TypingEvent.findByDate(date);
        
        // 기본 통계 계산
        const totalSessions = sessions.length;
        const totalKeys = sessions.reduce((sum, session) => sum + session.total_keys, 0);
        const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
        
        // 평균 타이핑 속도 계산 (분당 키 입력 수)
        const averageSpeed = totalDuration > 0 
            ? (totalKeys / (totalDuration / 1000)) * 60 
            : 0;

        // 가장 활발한 시간대 계산
        const hourlyActivity = await TypingEvent.getHourlyActivity(date);
        const peakHour = hourlyActivity.reduce((maxHour, current) => 
            current.eventCount > maxHour.eventCount ? current : maxHour
        ).hour;

        const statsData: Omit<DailyStatsData, 'id' | 'created_at' | 'updated_at'> = {
            date,
            total_keys: totalKeys,
            total_sessions: totalSessions,
            total_duration: totalDuration,
            average_speed: Math.round(averageSpeed * 100) / 100,
            peak_hour: peakHour
        };

        await this.createOrUpdate(statsData);
        
        return await this.findByDate(date) as DailyStatsData;
    }

    /**
     * 주간 통계 계산
     */
    static async getWeeklyStats(startDate: string): Promise<{
        totalKeys: number;
        totalSessions: number;
        totalDuration: number;
        averageSpeed: number;
        dailyStats: DailyStatsData[];
    }> {
        // 시작 날짜부터 7일간의 통계
        const endDate = new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        
        const dailyStats = await this.findByDateRange(startDate, endDate);
        
        const totalKeys = dailyStats.reduce((sum, day) => sum + day.total_keys, 0);
        const totalSessions = dailyStats.reduce((sum, day) => sum + day.total_sessions, 0);
        const totalDuration = dailyStats.reduce((sum, day) => sum + day.total_duration, 0);
        const averageSpeed = dailyStats.length > 0
            ? dailyStats.reduce((sum, day) => sum + day.average_speed, 0) / dailyStats.length
            : 0;

        return {
            totalKeys,
            totalSessions,
            totalDuration,
            averageSpeed: Math.round(averageSpeed * 100) / 100,
            dailyStats
        };
    }

    /**
     * 월간 통계 계산
     */
    static async getMonthlyStats(year: number, month: number): Promise<{
        totalKeys: number;
        totalSessions: number;
        totalDuration: number;
        averageSpeed: number;
        dailyStats: DailyStatsData[];
        peakDay: string;
    }> {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 해당 월의 마지막 날
        
        const dailyStats = await this.findByDateRange(startDate, endDate);
        
        const totalKeys = dailyStats.reduce((sum, day) => sum + day.total_keys, 0);
        const totalSessions = dailyStats.reduce((sum, day) => sum + day.total_sessions, 0);
        const totalDuration = dailyStats.reduce((sum, day) => sum + day.total_duration, 0);
        const averageSpeed = dailyStats.length > 0
            ? dailyStats.reduce((sum, day) => sum + day.average_speed, 0) / dailyStats.length
            : 0;

        // 가장 활발했던 날 찾기
        const peakDay = dailyStats.reduce((maxDay, current) => 
            current.total_keys > maxDay.total_keys ? current : maxDay,
            { total_keys: 0, date: startDate }
        ).date;

        return {
            totalKeys,
            totalSessions,
            totalDuration,
            averageSpeed: Math.round(averageSpeed * 100) / 100,
            dailyStats,
            peakDay
        };
    }

    /**
     * 타이핑 트렌드 분석 (최근 30일)
     */
    static async getTypingTrend(): Promise<{
        trend: 'increasing' | 'decreasing' | 'stable';
        changePercentage: number;
        recentStats: DailyStatsData[];
    }> {
        const recentStats = await this.findRecent(30);
        
        if (recentStats.length < 7) {
            return {
                trend: 'stable',
                changePercentage: 0,
                recentStats
            };
        }

        // 첫 주와 마지막 주 평균 비교
        const firstWeekAvg = recentStats.slice(0, 7)
            .reduce((sum, day) => sum + day.total_keys, 0) / 7;
        const lastWeekAvg = recentStats.slice(-7)
            .reduce((sum, day) => sum + day.total_keys, 0) / 7;

        const changePercentage = firstWeekAvg > 0 
            ? ((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100 
            : 0;

        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (Math.abs(changePercentage) > 10) {
            trend = changePercentage > 0 ? 'increasing' : 'decreasing';
        }

        return {
            trend,
            changePercentage: Math.round(changePercentage * 100) / 100,
            recentStats
        };
    }

    /**
     * 오늘 통계 실시간 업데이트
     */
    static async updateTodayStats(): Promise<DailyStatsData> {
        const today = new Date().toISOString().split('T')[0];
        return await this.calculateAndUpdateStats(today);
    }

    /**
     * 오래된 통계 삭제
     */
    static async deleteOldStats(daysToKeep: number = 365): Promise<number> {
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        
        const result = await databaseService.run(
            'DELETE FROM daily_stats WHERE date < ?',
            [cutoffDate]
        );

        return result.changes || 0;
    }

    /**
     * 전체 통계 수 조회
     */
    static async getTotalCount(): Promise<number> {
        const row = await databaseService.get('SELECT COUNT(*) as count FROM daily_stats');
        return row.count || 0;
    }

    /**
     * 통계 삭제
     */
    static async deleteByDate(date: string): Promise<boolean> {
        const result = await databaseService.run(
            'DELETE FROM daily_stats WHERE date = ?',
            [date]
        );

        return (result.changes || 0) > 0;
    }
}