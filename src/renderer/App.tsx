import React, { useState, useEffect } from 'react';
import './App.css';
import { TypingEvent } from '../shared/types';

const App: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('연결 중...');
  const [pingCount, setPingCount] = useState<number>(0);
  const [keyboardStatus, setKeyboardStatus] = useState({
    isActive: false,
    keyCount: 0,
    sessionId: null as string | null
  });
  const [recentTypingEvents, setRecentTypingEvents] = useState<TypingEvent[]>([]);
  const [permissionMessage, setPermissionMessage] = useState<string>('');
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>({});

  useEffect(() => {
    // Test IPC connection on component mount
    testIPCConnection();
    
    // 타이핑 이벤트 리스너 등록
    window.electronAPI.onTypingEvent((event: TypingEvent) => {
      console.log('Typing event:', event);
      setRecentTypingEvents(prev => [...prev.slice(-4), event]); // 최근 5개만 유지
    });

    window.electronAPI.onTypingSessionEnd((event: TypingEvent) => {
      console.log('Typing session ended:', event);
    });

    // 권한 요청 리스너 등록
    window.electronAPI.onPermissionRequired((permissionInfo: any) => {
      console.log('Permission required:', permissionInfo);
      setPermissionMessage(permissionInfo.message);
    });

    // 초기 키보드 상태 확인
    updateKeyboardStatus();
    
    // 데이터베이스 상태 및 데이터 로드
    loadDatabaseData();
  }, []);

  const testIPCConnection = async () => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        setConnectionStatus('electronAPI 사용 불가');
        console.error('window.electronAPI is not available');
        return;
      }
      
      const response = await window.electronAPI.ping();
      if (response === 'pong') {
        setConnectionStatus('IPC 연결 성공!');
      } else {
        setConnectionStatus('IPC 연결 실패');
      }
    } catch (error) {
      setConnectionStatus('IPC 연결 오류');
      console.error('IPC connection error:', error);
    }
  };

  const handlePingTest = async () => {
    try {
      const response = await window.electronAPI.ping();
      if (response === 'pong') {
        setPingCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Ping test error:', error);
    }
  };

  const handleDashboardTest = () => {
    window.electronAPI.openDashboard();
  };

  const handleTypingEventTest = () => {
    const testEvent = {
      timestamp: Date.now(),
      keyCount: 1,
      interval: 100,
      isActive: true,
      sessionId: 'test-session'
    };
    window.electronAPI.sendTypingEvent(testEvent);
  };

  const handleStartKeyboard = async () => {
    try {
      const result = await window.electronAPI.startKeyboardService();
      console.log('Start result:', result);
      updateKeyboardStatus();
    } catch (error) {
      console.error('Start keyboard error:', error);
    }
  };

  const handleStopKeyboard = async () => {
    try {
      const result = await window.electronAPI.stopKeyboardService();
      console.log('Stop result:', result);
      updateKeyboardStatus();
    } catch (error) {
      console.error('Stop keyboard error:', error);
    }
  };

  const updateKeyboardStatus = async () => {
    try {
      const status = await window.electronAPI.getKeyboardStatus();
      setKeyboardStatus(status);
    } catch (error) {
      console.error('Get keyboard status error:', error);
    }
  };

  const loadDatabaseData = async () => {
    try {
      // 데이터베이스 상태 조회
      const statusResult = await window.electronAPI.database.getStatus();
      if (statusResult.success) {
        setDatabaseStatus(statusResult.data);
      }

      // 오늘 통계 조회
      const statsResult = await window.electronAPI.database.getStats('today');
      if (statsResult.success) {
        setTodayStats(statsResult.data);
      }

      // 최근 세션 조회
      const sessionsResult = await window.electronAPI.database.getRecentSessions(5);
      if (sessionsResult.success) {
        setRecentSessions(sessionsResult.data);
      }

      // 앱 설정 조회
      const settingsResult = await window.electronAPI.database.getAllSettings();
      if (settingsResult.success) {
        setAppSettings(settingsResult.data);
      }
    } catch (error) {
      console.error('Failed to load database data:', error);
    }
  };

  const handleRefreshData = () => {
    loadDatabaseData();
  };

  const handleCleanupData = async () => {
    try {
      const result = await window.electronAPI.database.cleanupOldData();
      if (result.success) {
        console.log('Data cleanup completed');
        loadDatabaseData(); // 데이터 새로고침
      }
    } catch (error) {
      console.error('Failed to cleanup data:', error);
    }
  };

  const handleToggleSetting = async (key: string) => {
    try {
      const currentValue = appSettings[key];
      const newValue = !currentValue;
      
      const result = await window.electronAPI.database.setSetting(key, newValue);
      if (result.success) {
        setAppSettings(prev => ({ ...prev, [key]: newValue }));
      }
    } catch (error) {
      console.error('Failed to toggle setting:', error);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header-section">
          <h1>🐹 Typester Hammy</h1>
          <p className="subtitle">당신의 타이핑 동반자</p>
          
          <div className="status-card">
            <h3>연결 상태</h3>
            <p className={`status ${connectionStatus.includes('성공') ? 'success' : 'error'}`}>
              {connectionStatus}
            </p>
          </div>

          {permissionMessage && (
            <div className="permission-alert">
              <h3>⚠️ 권한 필요</h3>
              <div className="permission-message">
                {permissionMessage.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
              <button onClick={() => setPermissionMessage('')} className="close-button">
                확인
              </button>
            </div>
          )}
        </div>

        <div className="content-grid">
          <div>
            <div className="test-section">
              <h3>IPC 통신 테스트</h3>
              <div className="button-group">
                <button onClick={handlePingTest} className="test-button">
                  Ping 테스트 ({pingCount})
                </button>
                <button onClick={handleDashboardTest} className="test-button">
                  대시보드 열기 테스트
                </button>
                <button onClick={handleTypingEventTest} className="test-button">
                  타이핑 이벤트 테스트
                </button>
              </div>
            </div>

            <div className="test-section">
              <h3>키보드 서비스 테스트</h3>
              <div className="button-group">
                <button onClick={handleStartKeyboard} className="test-button">
                  키보드 서비스 시작
                </button>
                <button onClick={handleStopKeyboard} className="test-button">
                  키보드 서비스 중지
                </button>
                <button onClick={updateKeyboardStatus} className="test-button">
                  상태 확인
                </button>
              </div>
              
              <div className="status-info">
                <p><strong>상태:</strong> {keyboardStatus.isActive ? '🟢 활성' : '🔴 비활성'}</p>
                <p><strong>키 카운트:</strong> {keyboardStatus.keyCount}</p>
                <p><strong>세션 ID:</strong> {keyboardStatus.sessionId || 'None'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="test-section">
              <h3>최근 타이핑 이벤트</h3>
              <div className="recent-events">
                {recentTypingEvents.length > 0 ? (
                  recentTypingEvents.map((event, index) => (
                    <div key={index} className="event-item">
                      키: {event.keyCount}, 간격: {event.interval}ms, 시간: {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  ))
                ) : (
                  <p>타이핑 이벤트가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="test-section">
              <h3>데이터베이스 테스트</h3>
              <div className="button-group">
                <button onClick={handleRefreshData} className="test-button">
                  데이터 새로고침
                </button>
                <button onClick={handleCleanupData} className="test-button">
                  오래된 데이터 정리
                </button>
              </div>
              
              <div className="status-info">
                <h4>데이터베이스 상태</h4>
                {databaseStatus ? (
                  <>
                    <p><strong>연결:</strong> {databaseStatus.isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}</p>
                    <p><strong>경로:</strong> {databaseStatus.dbPath}</p>
                    <p><strong>세션:</strong> {databaseStatus.totalSessions}개</p>
                    <p><strong>이벤트:</strong> {databaseStatus.totalEvents}개</p>
                    <p><strong>통계:</strong> {databaseStatus.totalStats}개</p>
                  </>
                ) : (
                  <p>데이터베이스 상태 로딩 중...</p>
                )}
              </div>

              <div className="status-info">
                <h4>오늘 통계</h4>
                {todayStats ? (
                  <>
                    <p><strong>총 키:</strong> {todayStats.total_keys}개</p>
                    <p><strong>세션:</strong> {todayStats.total_sessions}개</p>
                    <p><strong>시간:</strong> {Math.round(todayStats.total_duration / 1000)}초</p>
                    <p><strong>속도:</strong> {todayStats.average_speed.toFixed(1)} keys/min</p>
                    <p><strong>피크 시간:</strong> {todayStats.peak_hour}시</p>
                  </>
                ) : (
                  <p>오늘 통계가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="info-section">
              <h3>프로젝트 정보</h3>
              <ul>
                <li>✅ Electron 기본 구조 설정 완료</li>
                <li>✅ TypeScript 설정 완료</li>
                <li>✅ React 통합 완료</li>
                <li>✅ IPC 통신 구조 완료</li>
                <li>✅ 개발 환경 설정 완료</li>
                <li>✅ 키보드 후킹 시스템 구현 완료</li>
                <li>✅ 데이터베이스 시스템 구현 완료</li>
                <li>🔄 Hammy 위젯 UI 구현 예정</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;