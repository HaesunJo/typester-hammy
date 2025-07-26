#include "keyboard-macos.h"

#ifdef __APPLE__

#include <iostream>
#include <chrono>

// 정적 멤버 초기화
KeyboardListenerMacOS* KeyboardListenerMacOS::s_instance = nullptr;

KeyboardListenerMacOS::KeyboardListenerMacOS() 
    : m_eventTap(nullptr), m_runLoopSource(nullptr) {
    s_instance = this;
}

KeyboardListenerMacOS::~KeyboardListenerMacOS() {
    StopListening();
    s_instance = nullptr;
}

bool KeyboardListenerMacOS::StartListening(KeyboardCallback callback) {
    if (m_isListening) {
        return true; // 이미 실행 중
    }
    
    // 접근성 권한 확인
    if (!CheckAccessibilityPermissions()) {
        std::cerr << "Accessibility permissions not granted" << std::endl;
        return false;
    }
    
    m_callback = callback;
    
    // CGEventTap 생성 (키보드 이벤트 감지)
    m_eventTap = CGEventTapCreate(
        kCGSessionEventTap,                    // 세션 레벨 이벤트 탭
        kCGHeadInsertEventTap,                 // 이벤트 체인의 앞쪽에 삽입
        kCGEventTapOptionDefault,              // 기본 옵션
        CGEventMaskBit(kCGEventKeyDown) |      // 키 다운 이벤트
        CGEventMaskBit(kCGEventKeyUp),         // 키 업 이벤트
        EventCallback,                         // 콜백 함수
        this                                   // 사용자 데이터
    );
    
    if (!m_eventTap) {
        std::cerr << "Failed to create event tap" << std::endl;
        return false;
    }
    
    // RunLoop 소스 생성
    m_runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, m_eventTap, 0);
    if (!m_runLoopSource) {
        std::cerr << "Failed to create run loop source" << std::endl;
        CFRelease(m_eventTap);
        m_eventTap = nullptr;
        return false;
    }
    
    // 현재 RunLoop에 소스 추가
    CFRunLoopAddSource(CFRunLoopGetCurrent(), m_runLoopSource, kCFRunLoopCommonModes);
    
    // 이벤트 탭 활성화
    CGEventTapEnable(m_eventTap, true);
    
    m_isListening = true;
    std::cout << "macOS keyboard listener started successfully" << std::endl;
    
    return true;
}

bool KeyboardListenerMacOS::StopListening() {
    if (!m_isListening) {
        return true; // 이미 중지됨
    }
    
    // 이벤트 탭 비활성화
    if (m_eventTap) {
        CGEventTapEnable(m_eventTap, false);
        CFRelease(m_eventTap);
        m_eventTap = nullptr;
    }
    
    // RunLoop 소스 제거
    if (m_runLoopSource) {
        CFRunLoopRemoveSource(CFRunLoopGetCurrent(), m_runLoopSource, kCFRunLoopCommonModes);
        CFRelease(m_runLoopSource);
        m_runLoopSource = nullptr;
    }
    
    m_isListening = false;
    m_callback = nullptr;
    
    std::cout << "macOS keyboard listener stopped" << std::endl;
    return true;
}

PermissionInfo KeyboardListenerMacOS::CheckPermissions() {
    PermissionInfo info;
    info.hasPermission = CheckAccessibilityPermissions();
    info.requiresElevation = false; // macOS는 관리자 권한이 아닌 접근성 권한 필요
    info.permissionMessage = GetPermissionInstructions();
    
    return info;
}

bool KeyboardListenerMacOS::IsListening() const {
    return m_isListening;
}

// 정적 콜백 함수 (C API 호환)
CGEventRef KeyboardListenerMacOS::EventCallback(CGEventTapProxy proxy, CGEventType type, 
                                               CGEventRef event, void* refcon) {
    KeyboardListenerMacOS* listener = static_cast<KeyboardListenerMacOS*>(refcon);
    if (listener) {
        return listener->HandleKeyEvent(type, event);
    }
    return event;
}

// 키 이벤트 처리
CGEventRef KeyboardListenerMacOS::HandleKeyEvent(CGEventType type, CGEventRef event) {
    if (!m_callback) {
        return event; // 콜백이 없으면 이벤트 통과
    }
    
    // 키 코드 추출
    CGKeyCode keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
    
    // 특수 키 필터링 (프라이버시 보호)
    if (IsSpecialKey(keyCode)) {
        return event; // 특수 키는 무시
    }
    
    // 키 이벤트 구조체 생성 (키 내용은 포함하지 않음)
    KeyEvent keyEvent;
    keyEvent.timestamp = GetCurrentTimestamp();
    keyEvent.keyCode = keyCode;
    keyEvent.isKeyDown = (type == kCGEventKeyDown);
    keyEvent.isSpecialKey = false;
    
    // 콜백 호출 (메타데이터만 전달)
    m_callback(keyEvent);
    
    return event; // 이벤트를 다른 애플리케이션으로 전달
}

// macOS 특수 키 판별
bool KeyboardListenerMacOS::IsSpecialKey(uint32_t keyCode) {
    // macOS 키 코드 기준 특수 키들
    switch (keyCode) {
        // 수정자 키들
        case 54: // Right Command
        case 55: // Left Command  
        case 56: // Left Shift
        case 57: // Caps Lock
        case 58: // Left Option
        case 59: // Left Control
        case 60: // Right Shift
        case 61: // Right Option
        case 62: // Right Control
        case 63: // Function
        
        // 기능 키들
        case 122: // F1
        case 120: // F2
        case 99:  // F3
        case 118: // F4
        case 96:  // F5
        case 97:  // F6
        case 98:  // F7
        case 100: // F8
        case 101: // F9
        case 109: // F10
        case 103: // F11
        case 111: // F12
        
        // 기타 특수 키
        case 53:  // Escape
        case 48:  // Tab
        case 36:  // Return
        case 51:  // Delete
            return true;
            
        default:
            return false;
    }
}

// 접근성 권한 확인
bool KeyboardListenerMacOS::CheckAccessibilityPermissions() {
    // macOS 10.9 이상에서 접근성 권한 확인
    return AXIsProcessTrustedWithOptions(nullptr);
}

// 권한 안내 메시지
const char* KeyboardListenerMacOS::GetPermissionInstructions() {
    return "Please grant accessibility permissions:\n"
           "1. Open System Preferences\n"
           "2. Go to Security & Privacy → Privacy → Accessibility\n"
           "3. Click the lock to make changes\n"
           "4. Add this application to the list\n"
           "5. Restart the application";
}

#endif // __APPLE__