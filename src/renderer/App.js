import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import './App.css';
const App = () => {
    const [connectionStatus, setConnectionStatus] = useState('연결 중...');
    const [pingCount, setPingCount] = useState(0);
    useEffect(() => {
        // Test IPC connection on component mount
        testIPCConnection();
    }, []);
    const testIPCConnection = async () => {
        try {
            const response = await window.electronAPI.ping();
            if (response === 'pong') {
                setConnectionStatus('IPC 연결 성공!');
            }
            else {
                setConnectionStatus('IPC 연결 실패');
            }
        }
        catch (error) {
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
        }
        catch (error) {
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
        };
        window.electronAPI.sendTypingEvent(testEvent);
    };
    return (_jsx("div", { className: "app", children: _jsxs("div", { className: "container", children: [_jsx("h1", { children: "\uD83D\uDC39 Typster Hammy" }), _jsx("p", { className: "subtitle", children: "\uB2F9\uC2E0\uC758 \uD0C0\uC774\uD551 \uB3D9\uBC18\uC790" }), _jsxs("div", { className: "status-card", children: [_jsx("h3", { children: "\uC5F0\uACB0 \uC0C1\uD0DC" }), _jsx("p", { className: `status ${connectionStatus.includes('성공') ? 'success' : 'error'}`, children: connectionStatus })] }), _jsxs("div", { className: "test-section", children: [_jsx("h3", { children: "IPC \uD1B5\uC2E0 \uD14C\uC2A4\uD2B8" }), _jsxs("div", { className: "button-group", children: [_jsxs("button", { onClick: handlePingTest, className: "test-button", children: ["Ping \uD14C\uC2A4\uD2B8 (", pingCount, ")"] }), _jsx("button", { onClick: handleDashboardTest, className: "test-button", children: "\uB300\uC2DC\uBCF4\uB4DC \uC5F4\uAE30 \uD14C\uC2A4\uD2B8" }), _jsx("button", { onClick: handleTypingEventTest, className: "test-button", children: "\uD0C0\uC774\uD551 \uC774\uBCA4\uD2B8 \uD14C\uC2A4\uD2B8" })] })] }), _jsxs("div", { className: "info-section", children: [_jsx("h3", { children: "\uD504\uB85C\uC81D\uD2B8 \uC815\uBCF4" }), _jsxs("ul", { children: [_jsx("li", { children: "\u2705 Electron \uAE30\uBCF8 \uAD6C\uC870 \uC124\uC815 \uC644\uB8CC" }), _jsx("li", { children: "\u2705 TypeScript \uC124\uC815 \uC644\uB8CC" }), _jsx("li", { children: "\u2705 React \uD1B5\uD569 \uC644\uB8CC" }), _jsx("li", { children: "\u2705 IPC \uD1B5\uC2E0 \uAD6C\uC870 \uC644\uB8CC" }), _jsx("li", { children: "\u2705 \uAC1C\uBC1C \uD658\uACBD \uC124\uC815 \uC644\uB8CC" })] })] })] }) }));
};
export default App;
