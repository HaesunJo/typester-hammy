# Design Document

## Overview

Typester Hammy는 Electron 기반의 데스크탑 애플리케이션으로, 메인 프로세스에서 글로벌 키보드 이벤트를 감지하고 렌더러 프로세스에서 감성적인 UI를 제공합니다. 애플리케이션은 항상 떠있는 작은 위젯과 필요시 열리는 대시보드로 구성되며, 사용자의 타이핑 패턴에 따라 실시간으로 반응하는 햄스터 캐릭터를 중심으로 설계됩니다.

핵심 설계 원칙:
- **비침입적 존재감**: 사용자 작업을 방해하지 않으면서도 항상 함께하는 느낌
- **프라이버시 우선**: 실제 입력 내용은 절대 저장하지 않고 메타데이터만 수집
- **감성적 상호작용**: 기계적이지 않은 자연스럽고 귀여운 반응
- **크로스 플랫폼 일관성**: 모든 OS에서 동일한 경험 제공

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)          │  Renderer Process (UI)   │
│  ┌─────────────────────────────┐  │  ┌─────────────────────┐ │
│  │  Global Keyboard Hook       │  │  │  Hammy Widget       │ │
│  │  - iohook integration       │  │  │  - Always on top    │ │
│  │  - Event filtering          │  │  │  - Draggable        │ │
│  │  - Privacy protection       │  │  │  - Animations       │ │
│  └─────────────────────────────┘  │  └─────────────────────┘ │
│  ┌─────────────────────────────┐  │  ┌─────────────────────┐ │
│  │  Data Management            │  │  │  Dashboard Modal    │ │
│  │  - SQLite database          │  │  │  - Customization    │ │
│  │  - Typing metadata          │  │  │  - Statistics       │ │
│  │  - Settings storage         │  │  │  - Theme settings   │ │
│  └─────────────────────────────┘  │  └─────────────────────┘ │
│  ┌─────────────────────────────┐  │                         │
│  │  System Integration         │  │                         │
│  │  - Auto-start management    │  │                         │
│  │  - System tray              │  │                         │
│  │  - Window management        │  │                         │
│  └─────────────────────────────┘  │                         │
└─────────────────────────────────────────────────────────────┘
```

### Process Communication

메인 프로세스와 렌더러 프로세스 간 통신은 Electron의 IPC(Inter-Process Communication)를 통해 이루어집니다:

```
Main Process                    Renderer Process
     │                               │
     │ ←── typing-event ──────────── │ (키보드 이벤트 전달)
     │ ──── hammy-reaction ────────→ │ (반응 애니메이션 트리거)
     │ ←── dashboard-open ─────────── │ (대시보드 열기 요청)
     │ ──── statistics-data ───────→ │ (통계 데이터 전달)
     │ ←── settings-update ────────── │ (설정 변경 요청)
```

## Components and Interfaces

### 1. Keyboard Hook Service (Main Process)

```typescript
interface KeyboardHookService {
  startListening(): Promise<void>
  stopListening(): void
  onTypingEvent(callback: (event: TypingEvent) => void): void
}

interface TypingEvent {
  timestamp: number
  keyCount: number
  interval: number
  isActive: boolean
}
```

**책임:**
- 글로벌 키보드 이벤트 감지
- 개인정보 보호를 위한 키 내용 필터링
- 타이핑 패턴 메타데이터 생성
- 렌더러 프로세스로 이벤트 전달

### 2. Hammy Character Component (Renderer)

```typescript
interface HammyCharacter {
  currentState: HammyState
  playAnimation(animation: AnimationType): void
  showMessage(message: string, duration?: number): void
  updateMood(mood: MoodType): void
}

enum HammyState {
  IDLE = 'idle',
  TYPING = 'typing',
  EXCITED = 'excited',
  RESTING = 'resting',
  SLEEPING = 'sleeping'
}

enum AnimationType {
  WAVE = 'wave',
  BOUNCE = 'bounce',
  STRETCH = 'stretch',
  NOD = 'nod'
}
```

**책임:**
- 타이핑 이벤트에 따른 실시간 반응
- 애니메이션 상태 관리
- 말풍선 메시지 표시
- 커스터마이징 옵션 적용

### 3. Widget Window Manager (Main Process)

```typescript
interface WidgetWindowManager {
  createWidget(): BrowserWindow
  showWidget(): void
  hideWidget(): void
  setPosition(x: number, y: number): void
  setAlwaysOnTop(flag: boolean): void
}
```

**책임:**
- 위젯 창 생성 및 관리
- 항상 최상위 표시 제어
- 드래그 앤 드롭 위치 저장
- 창 상태 관리

### 4. Dashboard Component (Renderer)

```typescript
interface Dashboard {
  tabs: DashboardTab[]
  currentTab: string
  openTab(tabId: string): void
  closeModal(): void
}

interface DashboardTab {
  id: string
  title: string
  component: React.ComponentType
}
```

**탭 구성:**
- **Customizer Tab**: Hammy 외형, 액세서리, 배경 테마 선택
- **Status Tab**: 현재 기분, 활동 상태, 응원 메시지
- **Theme Tab**: 전체 앱 색상 테마 (햇살 모드, 별밤 모드 등)
- **Statistics Tab**: 타이핑 통계 차트 및 그래프
- **Settings Tab**: 자동 실행, 알림, 소리 설정

### 5. Data Storage Service (Main Process)

```typescript
interface DataStorageService {
  saveTypingSession(session: TypingSession): Promise<void>
  getStatistics(period: StatisticsPeriod): Promise<Statistics>
  saveSettings(settings: AppSettings): Promise<void>
  getSettings(): Promise<AppSettings>
}

interface TypingSession {
  id: string
  startTime: number
  endTime: number
  keyCount: number
  averageSpeed: number
  peakSpeed: number
  breakCount: number
}
```

**데이터베이스 스키마:**
```sql
-- 타이핑 세션 테이블
CREATE TABLE typing_sessions (
  id TEXT PRIMARY KEY,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  key_count INTEGER NOT NULL,
  average_speed REAL NOT NULL,
  peak_speed REAL NOT NULL,
  break_count INTEGER DEFAULT 0
);

-- 설정 테이블
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Hammy 커스터마이징 테이블
CREATE TABLE hammy_customization (
  category TEXT NOT NULL,
  item_id TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (category, item_id)
);
```

## Data Models

### 1. Typing Metadata Model

```typescript
interface TypingMetadata {
  sessionId: string
  timestamp: number
  keyCount: number
  typingSpeed: number // WPM (Words Per Minute)
  pauseDuration: number // milliseconds
  activityLevel: ActivityLevel
}

enum ActivityLevel {
  LOW = 'low',      // < 30 WPM
  MEDIUM = 'medium', // 30-60 WPM  
  HIGH = 'high',     // 60-100 WPM
  INTENSE = 'intense' // > 100 WPM
}
```

### 2. Hammy State Model

```typescript
interface HammyStateModel {
  currentMood: MoodType
  energy: number // 0-100
  lastInteraction: number
  customization: HammyCustomization
  preferences: HammyPreferences
}

interface HammyCustomization {
  bodyColor: string
  accessory: string | null
  background: string
  theme: ThemeType
}

enum MoodType {
  HAPPY = 'happy',
  EXCITED = 'excited',
  CALM = 'calm',
  SLEEPY = 'sleepy',
  ENCOURAGING = 'encouraging'
}
```

### 3. Statistics Model

```typescript
interface DailyStatistics {
  date: string // YYYY-MM-DD
  totalKeystrokes: number
  totalTypingTime: number // minutes
  averageSpeed: number
  peakSpeed: number
  sessionsCount: number
  hourlyActivity: HourlyActivity[]
}

interface HourlyActivity {
  hour: number // 0-23
  keystrokes: number
  averageSpeed: number
}
```

## Error Handling

### 1. Keyboard Hook Errors

```typescript
class KeyboardHookError extends Error {
  constructor(
    message: string,
    public code: KeyboardErrorCode,
    public platform: string
  ) {
    super(message)
  }
}

enum KeyboardErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  HOOK_FAILED = 'HOOK_FAILED',
  PLATFORM_UNSUPPORTED = 'PLATFORM_UNSUPPORTED'
}
```

**처리 전략:**
- macOS: 접근성 권한 요청 가이드 표시
- Windows: 관리자 권한 필요시 안내
- Linux: X11/Wayland 호환성 확인
- 실패시 graceful degradation으로 수동 모드 제공

### 2. Data Storage Errors

```typescript
class StorageError extends Error {
  constructor(
    message: string,
    public operation: StorageOperation,
    public originalError?: Error
  ) {
    super(message)
  }
}

enum StorageOperation {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  MIGRATE = 'MIGRATE'
}
```

**복구 전략:**
- 데이터베이스 손상시 백업에서 복구
- 마이그레이션 실패시 이전 버전으로 롤백
- 디스크 공간 부족시 오래된 데이터 정리 제안

### 3. UI Error Boundaries

React Error Boundary를 사용하여 UI 컴포넌트 오류 격리:

```typescript
class HammyErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 오류 로깅 및 fallback UI 표시
    this.showFallbackHammy()
  }
  
  showFallbackHammy() {
    // 기본 정적 Hammy 이미지 표시
    // 애니메이션 비활성화하고 기본 기능만 유지
  }
}
```

## Testing Strategy

### 1. Unit Testing

**Main Process Tests:**
- Keyboard hook service 모킹 테스트
- Data storage CRUD 작업 테스트
- IPC 통신 메시지 검증
- 설정 관리 로직 테스트

**Renderer Process Tests:**
- React 컴포넌트 렌더링 테스트
- 애니메이션 상태 전환 테스트
- 사용자 인터랙션 시뮬레이션
- 테마 변경 로직 테스트

### 2. Integration Testing

```typescript
describe('Typing Detection Integration', () => {
  it('should trigger Hammy reaction when typing detected', async () => {
    // 키보드 이벤트 시뮬레이션
    const mockKeyEvent = createMockKeyEvent()
    
    // 이벤트 발생
    keyboardHook.emit('keydown', mockKeyEvent)
    
    // Hammy 반응 확인
    await waitFor(() => {
      expect(hammyComponent.currentState).toBe(HammyState.TYPING)
    })
  })
})
```

### 3. End-to-End Testing

Playwright를 사용한 E2E 테스트:
- 애플리케이션 시작부터 종료까지 전체 플로우
- 크로스 플랫폼 동작 검증
- 시스템 트레이 인터랙션 테스트
- 대시보드 모든 탭 기능 검증

### 4. Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should handle high-frequency typing without lag', async () => {
    const startTime = performance.now()
    
    // 초당 100회 키 이벤트 시뮬레이션
    for (let i = 0; i < 1000; i++) {
      await simulateKeyPress()
    }
    
    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(1000) // 1초 이내
  })
})
```

### 5. Security Testing

- 키보드 후킹 권한 최소화 검증
- 데이터 암호화 및 로컬 저장 확인
- 메모리 누수 및 민감 정보 잔존 검사
- 네트워크 통신 차단 확인 (완전 오프라인 동작)

이 설계는 확장 가능하고 유지보수가 용이하도록 모듈화되어 있으며, 사용자 프라이버시와 시스템 성능을 모두 고려한 아키텍처를 제공합니다.