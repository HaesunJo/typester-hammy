#ifndef KEYBOARD_BASE_H
#define KEYBOARD_BASE_H

#include <stdint.h>
#include <functional>

// 크로스 플랫폼 키 이벤트 구조체
struct KeyEvent {
    uint64_t timestamp;
    uint32_t keyCode;
    bool isKeyDown;
    bool isSpecialKey;
};

// 권한 정보 구조체
struct PermissionInfo {
    bool hasPermission;
    bool requiresElevation;
    const char* permissionMessage;
};

// 키보드 리스너 콜백 타입
typedef std::function<void(const KeyEvent&)> KeyboardCallback;

// 플랫폼별 구현을 위한 추상 인터페이스
class KeyboardListenerBase {
public:
    virtual ~KeyboardListenerBase() = default;
    
    // 순수 가상 함수 - 각 플랫폼에서 구현
    virtual bool StartListening(KeyboardCallback callback) = 0;
    virtual bool StopListening() = 0;
    virtual PermissionInfo CheckPermissions() = 0;
    virtual bool IsListening() const = 0;
    
protected:
    KeyboardCallback m_callback;
    bool m_isListening = false;
    
    // 공통 유틸리티 함수
    uint64_t GetCurrentTimestamp();
    virtual bool IsSpecialKey(uint32_t keyCode);
};

// 플랫폼별 팩토리 함수
KeyboardListenerBase* CreatePlatformListener();

#endif // KEYBOARD_BASE_H