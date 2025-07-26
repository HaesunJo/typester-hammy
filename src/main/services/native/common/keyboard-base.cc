#include "keyboard-base.h"
#include <chrono>

// 현재 타임스탬프 가져오기 (밀리초)
uint64_t KeyboardListenerBase::GetCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    return std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
}

// 특수 키 판별 (플랫폼 공통)
bool KeyboardListenerBase::IsSpecialKey(uint32_t keyCode) {
    // 일반적인 특수 키들 (플랫폼별로 키 코드는 다를 수 있음)
    // 이 함수는 각 플랫폼에서 오버라이드 가능
    
    // 기본적으로 알파벳, 숫자가 아닌 키들을 특수 키로 간주
    // 실제 구현은 플랫폼별로 세분화 필요
    return false; // 기본값, 플랫폼별로 구현
}