#ifndef KEYBOARD_WINDOWS_H
#define KEYBOARD_WINDOWS_H

#include "../../common/keyboard-base.h"

#ifdef _WIN32
#include <windows.h>

class KeyboardListenerWindows : public KeyboardListenerBase {
public:
    KeyboardListenerWindows();
    virtual ~KeyboardListenerWindows();
    
    // KeyboardListenerBase 인터페이스 구현
    bool StartListening(KeyboardCallback callback) override;
    bool StopListening() override;
    PermissionInfo CheckPermissions() override;
    bool IsListening() const override;

private:
    HHOOK m_keyboardHook;
    static KeyboardListenerWindows* s_instance;
    
    // 정적 콜백 함수 (Win32 API 호환)
    static LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam);
    
    // 인스턴스 메서드
    void HandleKeyEvent(WPARAM wParam, KBDLLHOOKSTRUCT* pKeyboard);
    
    // Windows 특수 키 판별
    bool IsSpecialKey(uint32_t keyCode) override;
    
    // 권한 관련
    bool CheckAdminPermissions();
    bool IsRunningAsAdmin();
    const char* GetPermissionInstructions();
};

#endif // _WIN32

#endif // KEYBOARD_WINDOWS_H