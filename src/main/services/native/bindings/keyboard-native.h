#ifndef KEYBOARD_NATIVE_H
#define KEYBOARD_NATIVE_H

#include <node_api.h>
#include "../common/keyboard-base.h"
#include <memory>

// Node.js 바인딩 클래스
class KeyboardNativeBinding {
public:
    static napi_value Init(napi_env env, napi_value exports);

private:
    // 정적 멤버
    static std::unique_ptr<KeyboardListenerBase> s_listener;
    static napi_threadsafe_function s_callback;
    static napi_env s_env;
    
    // Node.js API 함수들
    static napi_value StartListening(napi_env env, napi_callback_info info);
    static napi_value StopListening(napi_env env, napi_callback_info info);
    static napi_value CheckPermissions(napi_env env, napi_callback_info info);
    static napi_value IsListening(napi_env env, napi_callback_info info);
    
    // 콜백 처리
    static void KeyEventCallback(const KeyEvent& event);
    static void CallJS(napi_env env, napi_value js_callback, void* context, void* data);
    
    // 유틸리티 함수
    static napi_value CreateKeyEventObject(napi_env env, const KeyEvent& event);
    static napi_value CreatePermissionObject(napi_env env, const PermissionInfo& info);
};

// Node.js 모듈 초기화 매크로
#define DECLARE_NAPI_METHOD(name, func) \
    { name, 0, func, 0, 0, 0, napi_default, 0 }

#endif // KEYBOARD_NATIVE_H