#ifndef KEYBOARD_MACOS_H
#define KEYBOARD_MACOS_H

#include "../../common/keyboard-base.h"

#ifdef __APPLE__
#include <ApplicationServices/ApplicationServices.h>
#include <Carbon/Carbon.h>

class KeyboardListenerMacOS : public KeyboardListenerBase {
public:
    KeyboardListenerMacOS();
    virtual ~KeyboardListenerMacOS();
    
    // KeyboardListenerBase 인터페이스 구현
    bool StartListening(KeyboardCallback callback) override;
    bool StopListening() override;
    PermissionInfo CheckPermissions() override;
    bool IsListening() const override;

private:
    CFMachPortRef m_eventTap;
    CFRunLoopSourceRef m_runLoopSource;
    static KeyboardListenerMacOS* s_instance;
    
    // 정적 콜백 함수 (C API 호환)
    static CGEventRef EventCallback(CGEventTapProxy proxy, CGEventType type, 
                                   CGEventRef event, void* refcon);
    
    // 인스턴스 메서드
    CGEventRef HandleKeyEvent(CGEventType type, CGEventRef event);
    
    // macOS 특수 키 판별
    bool IsSpecialKey(uint32_t keyCode) override;
    
    // 권한 관련
    bool CheckAccessibilityPermissions();
    bool RequestAccessibilityPermissions();
    PermissionInfo GetDetailedPermissionInfo();
    void OpenAccessibilityPreferences();
    const char* GetPermissionInstructions();
};

#endif // __APPLE__

#endif // KEYBOARD_MACOS_H