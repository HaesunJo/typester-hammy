import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface DatabaseConfig {
    dbPath?: string;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
}

export class DatabaseService {
    private db: sqlite3.Database | null = null;
    private dbPath: string;
    private isInitialized: boolean = false;

    constructor(config: DatabaseConfig = {}) {
        // 데이터베이스 파일 경로 설정 (사용자 데이터 디렉토리)
        const userDataPath = app.getPath('userData');
        this.dbPath = config.dbPath || path.join(userDataPath, 'typster-hammy.db');
        
        // 디렉토리가 없으면 생성
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }

    /**
     * 데이터베이스 연결 및 초기화
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection failed:', err);
                    reject(err);
                    return;
                }

                console.log(`Connected to SQLite database: ${this.dbPath}`);
                this.setupDatabase()
                    .then(() => {
                        this.isInitialized = true;
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    /**
     * 데이터베이스 설정 및 스키마 생성
     */
    private async setupDatabase(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not connected');
        }

        // WAL 모드 활성화 (성능 향상)
        await this.run('PRAGMA journal_mode = WAL');
        
        // 외래 키 제약 조건 활성화
        await this.run('PRAGMA foreign_keys = ON');
        
        // 스키마 생성
        await this.createTables();
        
        // 인덱스 생성
        await this.createIndexes();
        
        // 기본 데이터 삽입
        await this.insertDefaultData();
    }

    /**
     * 테이블 생성
     */
    private async createTables(): Promise<void> {
        const tables = [
            // 타이핑 세션 테이블
            `CREATE TABLE IF NOT EXISTS typing_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                total_keys INTEGER DEFAULT 0,
                duration INTEGER DEFAULT 0,
                average_interval REAL DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,

            // 타이핑 이벤트 테이블
            `CREATE TABLE IF NOT EXISTS typing_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                key_count INTEGER NOT NULL,
                interval_ms INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (session_id) REFERENCES typing_sessions(session_id)
            )`,

            // 일별 통계 테이블
            `CREATE TABLE IF NOT EXISTS daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                total_keys INTEGER DEFAULT 0,
                total_sessions INTEGER DEFAULT 0,
                total_duration INTEGER DEFAULT 0,
                average_speed REAL DEFAULT 0,
                peak_hour INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,

            // 시간별 통계 테이블
            `CREATE TABLE IF NOT EXISTS hourly_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                hour INTEGER NOT NULL,
                key_count INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                duration INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(date, hour)
            )`,

            // 앱 설정 테이블
            `CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                type TEXT DEFAULT 'string',
                description TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,

            // Hammy 커스터마이징 테이블
            `CREATE TABLE IF NOT EXISTS hammy_customization (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'default',
                color_scheme TEXT DEFAULT 'default',
                accessories TEXT,
                position_x INTEGER DEFAULT 100,
                position_y INTEGER DEFAULT 100,
                size_scale REAL DEFAULT 1.0,
                animation_speed REAL DEFAULT 1.0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`
        ];

        for (const tableSQL of tables) {
            await this.run(tableSQL);
        }

        console.log('Database tables created successfully');
    }

    /**
     * 인덱스 생성
     */
    private async createIndexes(): Promise<void> {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_typing_events_session_id ON typing_events(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_typing_events_timestamp ON typing_events(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_typing_sessions_start_time ON typing_sessions(start_time)',
            'CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date)',
            'CREATE INDEX IF NOT EXISTS idx_hourly_stats_date_hour ON hourly_stats(date, hour)'
        ];

        for (const indexSQL of indexes) {
            await this.run(indexSQL);
        }

        console.log('Database indexes created successfully');
    }

    /**
     * 기본 데이터 삽입
     */
    private async insertDefaultData(): Promise<void> {
        // 기본 설정이 이미 있는지 확인
        const existingSettings = await this.get('SELECT COUNT(*) as count FROM app_settings');
        
        if (existingSettings.count === 0) {
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
                await this.run(
                    'INSERT INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)',
                    [key, value, type, description]
                );
            }
        }

        // 기본 Hammy 커스터마이징이 있는지 확인
        const existingCustomization = await this.get('SELECT COUNT(*) as count FROM hammy_customization');
        
        if (existingCustomization.count === 0) {
            await this.run(
                'INSERT INTO hammy_customization (user_id, color_scheme, accessories, position_x, position_y) VALUES (?, ?, ?, ?, ?)',
                ['default', 'orange', '[]', 100, 100]
            );
        }

        console.log('Default data inserted successfully');
    }

    /**
     * SQL 실행 (Promise 래퍼)
     */
    public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    /**
     * 단일 행 조회
     */
    public get(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * 다중 행 조회
     */
    public all(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * 트랜잭션 실행
     */
    public async transaction(operations: () => Promise<void>): Promise<void> {
        await this.run('BEGIN TRANSACTION');
        
        try {
            await operations();
            await this.run('COMMIT');
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }

    /**
     * 데이터베이스 연결 종료
     */
    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Database connection closed');
                    this.db = null;
                    this.isInitialized = false;
                    resolve();
                }
            });
        });
    }

    /**
     * 데이터베이스 연결 상태 확인
     */
    public isConnected(): boolean {
        return this.db !== null && this.isInitialized;
    }

    /**
     * 데이터베이스 파일 경로 반환
     */
    public getDatabasePath(): string {
        return this.dbPath;
    }
}

// 싱글톤 인스턴스
export const databaseService = new DatabaseService();