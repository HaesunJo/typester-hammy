# Typster Hammy 프로젝트 문제 해결 가이드

## 개요
Electron + React + TypeScript 프로젝트 설정 중 발생한 문제들과 해결 방법을 정리한 문서입니다.

## 해결한 문제들

### 1. TypeScript 컴파일 에러 (Path Alias 문제)

**문제:**
```
error TS2307: Cannot find module '@shared/types' or its corresponding type declarations.
```

**원인:** 
- TypeScript가 webpack의 path alias를 인식하지 못함
- `@shared/types` 경로를 찾을 수 없음

**해결책:**
```typescript
// 상대 경로로 변경
import { IPCChannels } from '../shared/types';
```

**교훈:** 
- webpack alias와 TypeScript 설정이 일치하지 않을 때는 상대 경로 사용
- 또는 tsconfig.json의 paths 설정을 webpack과 동일하게 맞춰야 함

---

### 2. Preload 스크립트 빌드 문제

**문제:**
```
Unable to load preload script: /path/to/dist/main/preload.js
Error: ENOENT: no such file or directory
```

**원인:**
- webpack.main.config.js에서 preload.ts가 별도로 빌드되지 않음
- main.ts만 빌드되고 preload.ts는 무시됨

**해결책:**
```javascript
// webpack.main.config.js를 배열 형태로 변경
module.exports = [
  // Main process
  {
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: { filename: 'main.js' }
  },
  // Preload script
  {
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: { filename: 'preload.js' }
  }
];
```

**교훈:**
- Electron에서 main과 preload는 별도의 빌드 타겟이 필요
- webpack 설정을 배열로 구성하여 여러 엔트리 포인트 관리

---

### 3. `global is not defined` 에러

**문제:**
```
Uncaught ReferenceError: global is not defined
at renderer.js:1149:12
```

**원인:**
- React/React-DOM이 Node.js의 `global` 객체를 참조
- 브라우저 환경에서는 `global`이 정의되지 않음

**해결책 1: 직접 Polyfill**
```typescript
// src/renderer/index.tsx 맨 위에 추가
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: 'development' } };
```

**해결책 2: Webpack DefinePlugin**
```javascript
// webpack.renderer.config.js
new webpack.DefinePlugin({
  'global': 'globalThis',
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
})
```

**교훈:**
- Electron renderer는 브라우저 환경이므로 Node.js 전역 객체가 없음
- 필요한 전역 객체는 polyfill로 제공해야 함

---

### 4. Content Security Policy (CSP) 위반

**문제:**
```
Uncaught EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script
```

**원인:**
- webpack dev server가 `eval()` 사용
- CSP에서 `unsafe-eval`을 허용하지 않음

**해결책 1: CSP 수정**
```html
<!-- src/renderer/index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';">
```

**해결책 2: Webpack Devtool 변경**
```javascript
// webpack.renderer.config.js
module.exports = {
  devtool: 'source-map', // eval 대신 source-map 사용
}
```

**교훈:**
- 개발 환경에서는 CSP를 완화하거나 webpack devtool 설정 조정
- 프로덕션에서는 보안을 위해 엄격한 CSP 유지

---

### 5. `require is not defined` 에러

**문제:**
```
Uncaught ReferenceError: require is not defined
at Object.events [external node-commonjs "events"]:1
```

**원인:**
- webpack이 Node.js 모듈을 외부 의존성으로 처리
- 브라우저 환경에서는 `require` 함수가 없음

**해결책:**
```javascript
// webpack.renderer.config.js
module.exports = {
  target: 'web', // electron-renderer 대신 web 사용
  resolve: {
    fallback: {
      "events": require.resolve("events/"),
      "util": require.resolve("util/"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "os": false,
      "crypto": false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      global: require.resolve('global/window'),
      process: 'process/browser',
    }),
  ],
}
```

**필요한 패키지 설치:**
```bash
npm install events util path-browserify global process
```

**교훈:**
- Electron renderer에서 Node.js 모듈 사용 시 브라우저용 polyfill 필요
- webpack target을 'web'으로 설정하여 브라우저 환경에 최적화

---

## 최종 해결된 설정

### webpack.renderer.config.js
```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  target: 'web', // 핵심: electron-renderer 대신 web 사용
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.js',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: {
      "events": require.resolve("events/"),
      "util": require.resolve("util/"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "os": false,
      "crypto": false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
    new webpack.ProvidePlugin({
      global: require.resolve('global/window'),
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
};
```

### src/renderer/index.tsx
```typescript
// Global polyfill for Electron renderer - must be first!
(window as any).global = window;
(window as any).process = { env: { NODE_ENV: 'development' } };

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 나머지 코드...
```

### src/renderer/index.html
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';">
```

## 핵심 교훈

1. **Electron Renderer는 브라우저 환경**: Node.js 모듈 사용 시 polyfill 필요
2. **webpack target 설정이 중요**: `electron-renderer` 대신 `web` 사용
3. **CSP 설정 주의**: 개발 환경에서는 완화, 프로덕션에서는 엄격하게
4. **preload 스크립트는 별도 빌드**: main과 preload를 분리하여 빌드
5. **전역 객체 polyfill**: `global`, `process` 등을 명시적으로 정의

## 참고 자료

- [Electron Security Guidelines](https://www.electronjs.org/docs/tutorial/security)
- [Webpack Browser Compatibility](https://webpack.js.org/configuration/target/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)