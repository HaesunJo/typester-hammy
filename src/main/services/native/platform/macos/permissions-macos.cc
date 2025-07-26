#include "keyboard-macos.h"

#ifdef __APPLE__

#include <iostream>
#include <ApplicationServices/ApplicationServices.h>

// 접근성 권한 요청 (사용자에게 다이얼로그 표시)
bool KeyboardListenerMacOS::RequestAccessibilityPermissions() {
    // 권한 요청 옵션 설정
    CFStringRef keys[] = { kAXTrustedCheckOptionPrompt };
    CFBooleanRef values[] = { kCFBooleanTrue };
    
    CFDictionaryRef options = CFDictionaryCreate(
        kCFAllocatorDefault,
        (const void**)keys,
        (const void**)values,
        1,
        &kCFTypeDictionaryKeyCallBacks,
        &kCFTypeDictionaryValueCallBacks
    );
    
    // 권한 확인 및 요청
    bool isTrusted = AXIsProcessTrustedWithOptions(options);
    
    CFRelease(options);
    
    if (!isTrusted) {
        std::cout << "Accessibility permissions requested. Please check System Preferences." << std::endl;
    }
    
    return isTrusted;
}

// 상세한 권한 상태 확인
PermissionInfo KeyboardListenerMacOS::GetDetailedPermissionInfo() {
    PermissionInfo info;
    
    // 현재 권한 상태 확인
    info.hasPermission = AXIsProcessTrustedWithOptions(nullptr);
    info.requiresElevation = false; // macOS는 관리자 권한이 아닌 접근성 권한
    
    if (info.hasPermission) {
        info.permissionMessage = "Accessibility permissions granted";
    } else {
        info.permissionMessage = GetPermissionInstructions();
    }
    
    return info;
}

// 시스템 환경설정 열기
void KeyboardListenerMacOS::OpenAccessibilityPreferences() {
    // 접근성 설정 패널 열기
    CFStringRef urlString = CFSTR("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
    CFURLRef url = CFURLCreateWithString(kCFAllocatorDefault, urlString, nullptr);
    
    if (url) {
        LSOpenCFURLRef(url, nullptr);
        CFRelease(url);
        std::cout << "Opening Accessibility preferences..." << std::endl;
    } else {
        std::cerr << "Failed to open Accessibility preferences" << std::endl;
    }
}

#endif // __APPLE__