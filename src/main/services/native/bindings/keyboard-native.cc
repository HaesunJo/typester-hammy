#include "keyboard-native.h"
#include "../common/keyboard-base.h"

#ifdef __APPLE__
#include "../platform/macos/keyboard-macos.h"
#endif

#include <iostream>

// 정적 멤버 초기화
std::unique_ptr<KeyboardListenerBase> KeyboardNativeBinding::s_listener = nullptr;
napi_threadsafe_function KeyboardNativeBinding::s_callback = nullptr;
napi_env KeyboardNativeBinding::s_env = nullptr;

// 플랫폼별 리스너 생성
KeyboardListenerBase* CreatePlatformListener() {
#ifdef __APPLE__
    return new KeyboardListenerMacOS();
#elif _WIN32
    // Windows 구현 (나중에 추가)
    return nullptr;
#elif __linux__
    // Linux 구현 (나중에 추가)
    return nullptr;
#else
    return nullptr;
#endif
}

// Node.js 모듈 초기화
napi_value KeyboardNativeBinding::Init(napi_env env, napi_value exports) {
    s_env = env;
    
    // API 함수들을 exports 객체에 추가
    napi_property_descriptor desc[] = {
        DECLARE_NAPI_METHOD("startListening", StartListening),
        DECLARE_NAPI_METHOD("stopListening", StopListening),
        DECLARE_NAPI_METHOD("checkPermissions", CheckPermissions),
        DECLARE_NAPI_METHOD("isListening", IsListening),
    };
    
    napi_status status = napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to define properties");
        return nullptr;
    }
    
    return exports;
}

// 키보드 리스닝 시작
napi_value KeyboardNativeBinding::StartListening(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_status status;
    
    // 인자 파싱 (콜백 함수)
    status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
    if (status != napi_ok || argc < 1) {
        napi_throw_error(env, nullptr, "Expected callback function");
        return nullptr;
    }
    
    // 콜백 함수 타입 확인
    napi_valuetype valuetype;
    status = napi_typeof(env, args[0], &valuetype);
    if (status != napi_ok || valuetype != napi_function) {
        napi_throw_error(env, nullptr, "Expected callback to be a function");
        return nullptr;
    }
    
    // 이미 리스닝 중인지 확인
    if (s_listener && s_listener->IsListening()) {
        napi_value result;
        napi_get_boolean(env, false, &result);
        return result;
    }
    
    // 플랫폼 리스너 생성
    if (!s_listener) {
        s_listener.reset(CreatePlatformListener());
        if (!s_listener) {
            napi_throw_error(env, nullptr, "Unsupported platform");
            return nullptr;
        }
    }
    
    // Thread-safe 함수 생성
    napi_value async_resource_name;
    status = napi_create_string_utf8(env, "KeyboardCallback", NAPI_AUTO_LENGTH, &async_resource_name);
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to create async resource name");
        return nullptr;
    }
    
    status = napi_create_threadsafe_function(
        env,
        args[0],                    // JavaScript 콜백 함수
        nullptr,                    // async_resource
        async_resource_name,        // async_resource_name
        0,                          // max_queue_size (무제한)
        1,                          // initial_thread_count
        nullptr,                    // thread_finalize_data
        nullptr,                    // thread_finalize_cb
        nullptr,                    // context
        CallJS,                     // call_js_cb
        &s_callback                 // result
    );
    
    if (status != napi_ok) {
        napi_throw_error(env, nullptr, "Failed to create threadsafe function");
        return nullptr;
    }
    
    // 키보드 리스닝 시작
    bool success = s_listener->StartListening(KeyEventCallback);
    
    napi_value result;
    napi_get_boolean(env, success, &result);
    return result;
}

// 키보드 리스닝 중지
napi_value KeyboardNativeBinding::StopListening(napi_env env, napi_callback_info info) {
    bool success = true;
    
    if (s_listener) {
        success = s_listener->StopListening();
    }
    
    // Thread-safe 함수 정리
    if (s_callback) {
        napi_release_threadsafe_function(s_callback, napi_tsfn_release);
        s_callback = nullptr;
    }
    
    napi_value result;
    napi_get_boolean(env, success, &result);
    return result;
}

// 권한 확인
napi_value KeyboardNativeBinding::CheckPermissions(napi_env env, napi_callback_info info) {
    if (!s_listener) {
        s_listener.reset(CreatePlatformListener());
        if (!s_listener) {
            napi_throw_error(env, nullptr, "Unsupported platform");
            return nullptr;
        }
    }
    
    PermissionInfo permInfo = s_listener->CheckPermissions();
    return CreatePermissionObject(env, permInfo);
}

// 리스닝 상태 확인
napi_value KeyboardNativeBinding::IsListening(napi_env env, napi_callback_info info) {
    bool isListening = s_listener && s_listener->IsListening();
    
    napi_value result;
    napi_get_boolean(env, isListening, &result);
    return result;
}

// 키 이벤트 콜백 (네이티브 → JavaScript)
void KeyboardNativeBinding::KeyEventCallback(const KeyEvent& event) {
    if (s_callback) {
        // Thread-safe 함수 호출
        napi_call_threadsafe_function(s_callback, (void*)&event, napi_tsfn_blocking);
    }
}

// JavaScript 콜백 호출
void KeyboardNativeBinding::CallJS(napi_env env, napi_value js_callback, void* context, void* data) {
    if (env && js_callback) {
        KeyEvent* event = static_cast<KeyEvent*>(data);
        
        // KeyEvent 객체 생성
        napi_value eventObj = CreateKeyEventObject(env, *event);
        
        // JavaScript 콜백 함수 호출
        napi_value global;
        napi_get_global(env, &global);
        
        napi_value result;
        napi_call_function(env, global, js_callback, 1, &eventObj, &result);
    }
}

// KeyEvent 객체 생성
napi_value KeyboardNativeBinding::CreateKeyEventObject(napi_env env, const KeyEvent& event) {
    napi_value obj;
    napi_create_object(env, &obj);
    
    // timestamp
    napi_value timestamp;
    napi_create_bigint_uint64(env, event.timestamp, &timestamp);
    napi_set_named_property(env, obj, "timestamp", timestamp);
    
    // keyCode
    napi_value keyCode;
    napi_create_uint32(env, event.keyCode, &keyCode);
    napi_set_named_property(env, obj, "keyCode", keyCode);
    
    // isKeyDown
    napi_value isKeyDown;
    napi_get_boolean(env, event.isKeyDown, &isKeyDown);
    napi_set_named_property(env, obj, "isKeyDown", isKeyDown);
    
    // isSpecialKey
    napi_value isSpecialKey;
    napi_get_boolean(env, event.isSpecialKey, &isSpecialKey);
    napi_set_named_property(env, obj, "isSpecialKey", isSpecialKey);
    
    return obj;
}

// Permission 객체 생성
napi_value KeyboardNativeBinding::CreatePermissionObject(napi_env env, const PermissionInfo& info) {
    napi_value obj;
    napi_create_object(env, &obj);
    
    // hasPermission
    napi_value hasPermission;
    napi_get_boolean(env, info.hasPermission, &hasPermission);
    napi_set_named_property(env, obj, "hasPermission", hasPermission);
    
    // requiresElevation
    napi_value requiresElevation;
    napi_get_boolean(env, info.requiresElevation, &requiresElevation);
    napi_set_named_property(env, obj, "requiresElevation", requiresElevation);
    
    // permissionMessage
    napi_value permissionMessage;
    napi_create_string_utf8(env, info.permissionMessage, NAPI_AUTO_LENGTH, &permissionMessage);
    napi_set_named_property(env, obj, "permissionMessage", permissionMessage);
    
    return obj;
}

// Node.js 모듈 등록
NAPI_MODULE(NODE_GYP_MODULE_NAME, KeyboardNativeBinding::Init)