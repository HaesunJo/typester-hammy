// 네이티브 키보드 리스너 TypeScript 진입점

import * as path from 'path';
import { NativeKeyEvent, PlatformPermissions } from './types';

// 네이티브 모듈 인터페이스 정의
interface NativeModule {
  startListening(callback: (event: NativeKeyEvent) => void): boolean;
  stopListening(): boolean;
  checkPermissions(): PlatformPermissions;
  isListening(): boolean;
}

// 네이티브 모듈을 지연 로드하기 위한 변수
let nativeModule: NativeModule | null = null;

// 네이티브 모듈 로드 함수
function loadNativeModule(): NativeModule {
  if (nativeModule) {
    return nativeModule;
  }

  try {
    // 직접 경로를 하드코딩해서 시도
    const modulePath = path.join(process.cwd(), 'dist', 'main', 'build', 'Release', 'keyboard_native.node');

    console.log(`Attempting to load native module from: ${modulePath}`);

    // 파일 존재 확인
    const fs = require('fs');
    if (!fs.existsSync(modulePath)) {
      throw new Error(`Native module file does not exist at: ${modulePath}`);
    }

    console.log('Native module file exists, attempting to load...');

    // process.dlopen을 직접 사용해서 로드 시도
    const Module = require('module');
    const moduleObj = { exports: {} };

    try {
      process.dlopen(moduleObj, modulePath);
      nativeModule = moduleObj.exports as NativeModule;
      console.log('Successfully loaded native module using process.dlopen');
      return nativeModule;
    } catch (dlopenError) {
      console.log('process.dlopen failed, trying require...');
      // 백업: 일반 require 시도
      nativeModule = require(modulePath) as NativeModule;
      console.log('Successfully loaded native module using require');
      return nativeModule;
    }
  } catch (error) {
    console.error('Failed to load native keyboard module:', error);
    throw new Error('Native keyboard module not found. Please run "npm run build:native" first.');
  }
}

export class NativeKeyboardListener {
  private callback: ((event: NativeKeyEvent) => void) | null = null;

  /**
   * 키보드 리스닝 시작
   */
  public startListening(callback: (event: NativeKeyEvent) => void): boolean {
    if (this.callback) {
      throw new Error('Keyboard listener is already running');
    }

    this.callback = callback;

    try {
      const module = loadNativeModule();
      return module.startListening((event: NativeKeyEvent) => {
        if (this.callback) {
          this.callback(event);
        }
      });
    } catch (error) {
      this.callback = null;
      throw error;
    }
  }

  /**
   * 키보드 리스닝 중지
   */
  public stopListening(): boolean {
    if (!this.callback) {
      return true; // 이미 중지됨
    }

    try {
      const module = loadNativeModule();
      const result = module.stopListening();
      this.callback = null;
      return result;
    } catch (error) {
      console.error('Failed to stop keyboard listener:', error);
      return false;
    }
  }

  /**
   * 권한 확인
   */
  public checkPermissions(): PlatformPermissions {
    try {
      const module = loadNativeModule();
      return module.checkPermissions();
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        hasPermission: false,
        requiresElevation: true,
        permissionMessage: 'Failed to check permissions'
      };
    }
  }

  /**
   * 리스닝 상태 확인
   */
  public isListening(): boolean {
    try {
      const module = loadNativeModule();
      return module.isListening();
    } catch (error) {
      return false;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const nativeKeyboardListener = new NativeKeyboardListener();