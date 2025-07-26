/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/main/preload.ts":
/*!*****************************!*\
  !*** ./src/main/preload.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ \"electron\");\n/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _shared_types__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shared/types */ \"./src/shared/types.ts\");\n\n\n// Expose safe Node.js APIs\nelectron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('nodeAPI', {\n    // 플랫폼 정보\n    platform: process.platform,\n    arch: process.arch,\n    // 환경 변수 (필요한 것만)\n    env: {\n        NODE_ENV: \"development\" || 0,\n    },\n    // 버전 정보\n    versions: {\n        node: process.versions.node,\n        electron: process.versions.electron,\n        chrome: process.versions.chrome,\n    },\n});\n// Expose protected methods that allow the renderer process to use\n// the ipcRenderer without exposing the entire object\nelectron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('electronAPI', {\n    // Test IPC communication\n    ping: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.PING),\n    // Dashboard controls\n    openDashboard: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.DASHBOARD_OPEN),\n    closeDashboard: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.DASHBOARD_CLOSE),\n    // Typing events\n    sendTypingEvent: (event) => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.TYPING_EVENT, event),\n    // 키보드 서비스 제어 (invoke - 결과 필요)\n    startKeyboardService: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('keyboard:start'),\n    stopKeyboardService: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('keyboard:stop'),\n    getKeyboardStatus: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('keyboard:status'),\n    // 타이핑 이벤트 리스너 (on - 이벤트 수신)\n    onTypingEvent: (callback) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.TYPING_EVENT, (_, event) => callback(event));\n    },\n    onTypingSessionEnd: (callback) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.TYPING_SESSION_END, (_, event) => callback(event));\n    },\n    // Listen for Hammy reactions\n    onHammyReaction: (callback) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.HAMMY_REACTION, (_, reaction) => callback(reaction));\n    },\n    // Statistics\n    requestStatistics: () => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.STATISTICS_REQUEST),\n    onStatisticsResponse: (callback) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.STATISTICS_RESPONSE, (_, stats) => callback(stats));\n    },\n    // Settings\n    updateSettings: (settings) => electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send(_shared_types__WEBPACK_IMPORTED_MODULE_1__.IPCChannels.SETTINGS_UPDATE, settings),\n    // Permission handling\n    onPermissionRequired: (callback) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on('permission:required', (_, permissionInfo) => callback(permissionInfo));\n    },\n    // Remove listeners\n    removeAllListeners: (channel) => {\n        electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.removeAllListeners(channel);\n    },\n});\n// Type declarations are now managed in src/renderer/types.d.ts\n\n\n//# sourceURL=webpack://typster-hammy/./src/main/preload.ts?\n}");

/***/ }),

/***/ "./src/shared/types.ts":
/*!*****************************!*\
  !*** ./src/shared/types.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IPCChannels: () => (/* binding */ IPCChannels)\n/* harmony export */ });\n// Shared types between main and renderer processes\nvar IPCChannels;\n(function (IPCChannels) {\n    IPCChannels[\"TYPING_EVENT\"] = \"typing-event\";\n    IPCChannels[\"TYPING_SESSION_END\"] = \"typing-session-end\";\n    IPCChannels[\"HAMMY_REACTION\"] = \"hammy-reaction\";\n    IPCChannels[\"DASHBOARD_OPEN\"] = \"dashboard-open\";\n    IPCChannels[\"DASHBOARD_CLOSE\"] = \"dashboard-close\";\n    IPCChannels[\"STATISTICS_REQUEST\"] = \"statistics-request\";\n    IPCChannels[\"STATISTICS_RESPONSE\"] = \"statistics-response\";\n    IPCChannels[\"SETTINGS_UPDATE\"] = \"settings-update\";\n    IPCChannels[\"PING\"] = \"ping\";\n    IPCChannels[\"PONG\"] = \"pong\";\n})(IPCChannels || (IPCChannels = {}));\n\n\n//# sourceURL=webpack://typster-hammy/./src/shared/types.ts?\n}");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main/preload.ts");
/******/ 	
/******/ })()
;