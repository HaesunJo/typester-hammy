#ifndef KEYBOARD_LINUX_H
#define KEYBOARD_LINUX_H

#include "../../common/keyboard-base.h"

#ifdef __linux__
#include <X11/Xlib.h>
#include <X11/extensions/XInput2.h>
#include <X11/extensions/record.h>
#include <thread>

class KeyboardListenerLinux : public KeyboardListenerBase {
public:
    KeyboardListenerLinux();
    virtual ~KeyboardListenerLinux();
    
    // KeyboardListenerBase 인터페이스 구현
    bool StartListening(KeyboardCallback callback) override;
    bool StopListening() override;
    PermissionInfo CheckPermissions() override;
    bool IsListening() const override;

private:
    Display* m_display;
    Display* m_recordDisplay;
    XRecordContext m_recordContext;
    std::thread m_listenerThread;
    bool m_shouldStop;
    
    // X11 이벤트 처리
    static void EventCallback(XPointer closure, XRecordInterceptData* data);
    void HandleKeyEvent(XRecordInterceptData* data);
    void ListenerThreadFunc();
    
    // Linux 특수 키 판별
    bool IsSpecialKey(uint32_t keyCode) override;
    
    // 권한 관련
    bool CheckX11Permissions();
    const char* GetPermissionInstructions();
    
    // X11 초기화
    bool InitializeX11();
    void CleanupX11();
};

#endif // __linux__

#endif // KEYBOARD_LINUX_H