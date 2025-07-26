import { databaseService } from '../DatabaseService';

export interface AppSettingData {
    id?: number;
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
    created_at?: number;
    updated_at?: number;
}

export class AppSettings {
    /**
     * 설정 값 조회
     */
    static async get<T = any>(key: string): Promise<T | null> {
        const row = await databaseService.get(
            'SELECT * FROM app_settings WHERE key = ?',
            [key]
        );

        if (!row) {
            return null;
        }

        return this.parseValue(row.value, row.type);
    }

    /**
     * 설정 값 설정
     */
    static async set(key: string, value: any, type?: 'string' | 'number' | 'boolean' | 'json', description?: string): Promise<void> {
        const inferredType = type || this.inferType(value);
        const stringValue = this.stringifyValue(value, inferredType);

        const existing = await databaseService.get(
            'SELECT id FROM app_settings WHERE key = ?',
            [key]
        );

        if (existing) {
            await databaseService.run(
                `UPDATE app_settings 
                 SET value = ?, type = ?, description = COALESCE(?, description), updated_at = strftime('%s', 'now')
                 WHERE key = ?`,
                [stringValue, inferredType, description, key]
            );
        } else {
            await databaseService.run(
                `INSERT INTO app_settings (key, value, type, description)
                 VALUES (?, ?, ?, ?)`,
                [key, stringValue, inferredType, description || '']
            );
        }
    }

    /**
     * 여러 설정 값 한번에 조회
     */
    static async getMultiple(keys: string[]): Promise<Record<string, any>> {
        if (keys.length === 0) {
            return {};
        }

        const placeholders = keys.map(() => '?').join(',');
        const rows = await databaseService.all(
            `SELECT key, value, type FROM app_settings WHERE key IN (${placeholders})`,
            keys
        );

        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.key] = this.parseValue(row.value, row.type);
        }

        return result;
    }

    /**
     * 여러 설정 값 한번에 설정
     */
    static async setMultiple(settings: Record<string, any>): Promise<void> {
        await databaseService.transaction(async () => {
            for (const [key, value] of Object.entries(settings)) {
                await this.set(key, value);
            }
        });
    }

    /**
     * 모든 설정 조회
     */
    static async getAll(): Promise<Record<string, any>> {
        const rows = await databaseService.all(
            'SELECT key, value, type FROM app_settings ORDER BY key'
        );

        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.key] = this.parseValue(row.value, row.type);
        }

        return result;
    }

    /**
     * 설정 존재 여부 확인
     */
    static async exists(key: string): Promise<boolean> {
        const row = await databaseService.get(
            'SELECT 1 FROM app_settings WHERE key = ?',
            [key]
        );

        return !!row;
    }

    /**
     * 설정 삭제
     */
    static async delete(key: string): Promise<boolean> {
        const result = await databaseService.run(
            'DELETE FROM app_settings WHERE key = ?',
            [key]
        );

        return (result.changes || 0) > 0;
    }

    /**
     * 설정 초기화 (기본값으로 복원)
     */
    static async reset(): Promise<void> {
        await databaseService.run('DELETE FROM app_settings');
        
        // 기본 설정 다시 삽입
        const defaultSettings = [
            ['auto_start', 'false', 'boolean', '시스템 시작 시 자동 실행'],
            ['notifications_enabled', 'true', 'boolean', '알림 활성화'],
            ['sound_enabled', 'true', 'boolean', '사운드 활성화'],
            ['theme', 'light', 'string', '앱 테마 (light/dark)'],
            ['typing_timeout', '2000', 'number', '타이핑 세션 타임아웃 (ms)'],
            ['widget_always_on_top', 'true', 'boolean', '위젯 항상 위에 표시'],
            ['data_retention_days', '365', 'number', '데이터 보관 기간 (일)']
        ];

        for (const [key, value, type, description] of defaultSettings) {
            await databaseService.run(
                'INSERT INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)',
                [key, value, type, description]
            );
        }
    }

    /**
     * 특정 접두사를 가진 설정들 조회
     */
    static async getByPrefix(prefix: string): Promise<Record<string, any>> {
        const rows = await databaseService.all(
            'SELECT key, value, type FROM app_settings WHERE key LIKE ? ORDER BY key',
            [`${prefix}%`]
        );

        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.key] = this.parseValue(row.value, row.type);
        }

        return result;
    }

    /**
     * 설정 메타데이터 조회 (타입, 설명 포함)
     */
    static async getMetadata(key: string): Promise<AppSettingData | null> {
        const row = await databaseService.get(
            'SELECT * FROM app_settings WHERE key = ?',
            [key]
        );

        return row || null;
    }

    /**
     * 모든 설정 메타데이터 조회
     */
    static async getAllMetadata(): Promise<AppSettingData[]> {
        const rows = await databaseService.all(
            'SELECT * FROM app_settings ORDER BY key'
        );

        return rows;
    }

    /**
     * 값의 타입 추론
     */
    private static inferType(value: any): 'string' | 'number' | 'boolean' | 'json' {
        if (typeof value === 'boolean') {
            return 'boolean';
        } else if (typeof value === 'number') {
            return 'number';
        } else if (typeof value === 'object' && value !== null) {
            return 'json';
        } else {
            return 'string';
        }
    }

    /**
     * 값을 문자열로 변환
     */
    private static stringifyValue(value: any, type: string): string {
        switch (type) {
            case 'boolean':
                return value ? 'true' : 'false';
            case 'number':
                return value.toString();
            case 'json':
                return JSON.stringify(value);
            default:
                return String(value);
        }
    }

    /**
     * 문자열 값을 원래 타입으로 파싱
     */
    private static parseValue(value: string, type: string): any {
        switch (type) {
            case 'boolean':
                return value === 'true';
            case 'number':
                return parseFloat(value);
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return null;
                }
            default:
                return value;
        }
    }

    // 편의 메서드들
    static async getString(key: string, defaultValue: string = ''): Promise<string> {
        const value = await this.get<string>(key);
        return value !== null ? value : defaultValue;
    }

    static async getNumber(key: string, defaultValue: number = 0): Promise<number> {
        const value = await this.get<number>(key);
        return value !== null ? value : defaultValue;
    }

    static async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
        const value = await this.get<boolean>(key);
        return value !== null ? value : defaultValue;
    }

    static async getJSON<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
        const value = await this.get<T>(key);
        return value !== null ? value : defaultValue;
    }
}