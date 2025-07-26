import React, { useState, useEffect, useRef } from 'react';
import HammyCharacter from './components/HammyCharacter';
import { TypingEvent } from '../../shared/types';

export type HammyState = 'idle' | 'typing' | 'excited' | 'sleeping';

const HammyWidget: React.FC = () => {
    const [hammyState, setHammyState] = useState<HammyState>('idle');
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const widgetRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // 타이핑 이벤트 리스너 등록
        if (window.electronAPI) {
            window.electronAPI.onTypingEvent((event: TypingEvent) => {
                handleTypingEvent(event);
            });

            window.electronAPI.onTypingSessionEnd(() => {
                handleTypingEnd();
            });
        }

        // 컴포넌트 언마운트 시 정리
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleTypingEvent = (event: TypingEvent) => {
        // 타이핑 상태로 변경
        setHammyState('typing');

        // 기존 타이머 클리어
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // 연속 타이핑 감지 (빠른 타이핑 시 excited 상태)
        if (event.interval < 100 && event.keyCount > 5) {
            setHammyState('excited');
        }

        // 2초 후 idle 상태로 복귀
        typingTimeoutRef.current = setTimeout(() => {
            setHammyState('idle');
        }, 2000);
    };

    const handleTypingEnd = () => {
        // 타이핑 세션 종료 시 idle 상태로
        setHammyState('idle');
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.screenX,
            y: e.screenY
        });
        e.preventDefault();
    };

    const handleMouseMove = async (e: React.MouseEvent) => {
        if (!isDragging) return;

        const deltaX = e.screenX - dragStart.x;
        const deltaY = e.screenY - dragStart.y;

        // Electron API를 통해 창 위치 이동
        if (window.electronAPI && (window.electronAPI as any).widget) {
            const currentPosResult = await (window.electronAPI as any).widget.getPosition();
            if (currentPosResult.success && currentPosResult.data) {
                (window.electronAPI as any).widget.setPosition(
                    currentPosResult.data.x + deltaX,
                    currentPosResult.data.y + deltaY
                );
            }
        }

        setDragStart({
            x: e.screenX,
            y: e.screenY
        });
    };

    const handleMouseUp = async () => {
        if (isDragging) {
            setIsDragging(false);

            // 위치 저장
            if (window.electronAPI && (window.electronAPI as any).widget) {
                const positionResult = await (window.electronAPI as any).widget.getPosition();
                if (positionResult.success && positionResult.data) {
                    (window.electronAPI as any).widget.savePosition(
                        positionResult.data.x,
                        positionResult.data.y
                    );
                }
            }
        }
    };

    const handleDoubleClick = () => {
        // 더블클릭 시 대시보드 열기
        if (window.electronAPI) {
            window.electronAPI.openDashboard();
        }
    };

    return (
        <div
            ref={widgetRef}
            className="hammy-widget"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
            }}
        >
            <HammyCharacter
                state={hammyState}
                isDragging={isDragging}
            />

            {/* 개발 모드에서 상태 표시 */}
            {process.env.NODE_ENV === 'development' && (
                <div className="debug-info">
                    <div>State: {hammyState}</div>
                    <div>Dragging: {isDragging ? 'Yes' : 'No'}</div>
                </div>
            )}
        </div>
    );
};

export default HammyWidget;