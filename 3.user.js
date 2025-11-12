// ==UserScript==
// @name         页面安全验证计时器（增强版V5.2）
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时【支持后台运行+定位缓存+缓存超时销毁】
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// ==/UserScript==

(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    function init() {
        if (window.safeTimerInitialized) {
            return;
        }
        window.safeTimerInitialized = true;

        GM_addStyle(`
            .safe-timer {
                position: fixed;
                top: 12px;
                left: 12px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                padding: 8px 15px;
                font-size: 16px;
                font-weight: 600;
                color: #e0f2fe;
                box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
                z-index: 9999;
                user-select: none;
                transition: color 0.3s ease, box-shadow 0.3s ease;
                cursor: pointer;
            }
            .safe-timer:hover {
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
            }
            .safe-timer.warning {
                color: #ffd60a;
                animation: pulse-warning 1s infinite;
            }
            .safe-timer.danger {
                color: #f72585;
                animation: pulse-danger 0.8s infinite;
            }
            @keyframes pulse-warning {
                0% { color: #ffd60a; }
                50% { color: #ffea80; }
                100% { color: #ffd60a; }
            }
            @keyframes pulse-danger {
                0% { color: #f72585; }
                50% { color: #ff6ba9; }
                100% { color: #f72585; }
            }
            .location-refresh-btn-standalone {
                position: fixed;
                top: 60px;
                left: 12px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                color: #4cc9f0;
                box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
                z-index: 9999;
                user-select: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .location-refresh-btn-standalone:hover {
                background: rgba(76, 201, 240, 0.1);
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
            }
            .location-refresh-btn-standalone:active {
                transform: scale(0.95);
            }
            .net-status {
                position: fixed;
                top: 12px;
                right: 12px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                padding: 8px 15px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
                z-index: 9999;
                user-select: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .net-status.online {
                color: #4cc9f0;
            }
            .net-status.offline {
                color: #f72585;
            }
            .net-status:active {
                transform: scale(0.95);
                box-shadow: 0 0 8px rgba(76, 201, 240, 0.1);
            }
            .net-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 15, 30, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
                padding: 0 15px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            .net-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .net-modal-box {
                width: 100%;
                max-width: 280px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 12px;
                padding: 15px 10px;
                box-shadow: 0 0 15px rgba(76, 201, 240, 0.3);
                transform: scale(0.9) translateY(10px);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .net-modal.active .net-modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 20px rgba(76, 201, 240, 0.4);
            }
            .net-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(76, 201, 240, 0.3);
            }
            .net-modal-title {
                font-size: 18px;
                font-weight: bold;
                color: #4cc9f0;
                margin: 0;
                display: flex;
                align-items: center;
                text-shadow: 0 0 5px rgba(76, 201, 240, 0.5);
            }
            .net-modal-title span {
                margin-right: 6px;
                font-size: 20px;
            }
            .net-modal-close {
                background: transparent;
                border: 1px solid rgba(76, 201, 240, 0.5);
                color: #4cc9f0;
                font-size: 18px;
                cursor: pointer;
                padding: 0 6px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .net-modal-close:hover {
                background: rgba(76, 201, 240, 0.1);
                box-shadow: 0 0 6px rgba(76, 201, 240, 0.3);
            }
            .net-info-list {
                list-style: none;
                padding: 0;
                margin: 0 0 12px;
            }
            .net-info-item {
                padding: 8px 0;
                border-bottom: 1px dashed rgba(76, 201, 240, 0.2);
                font-size: 14px;
            }
            .net-info-label {
                color: #94a3b8;
                display: block;
                margin-bottom: 2px;
                font-size: 12px;
            }
            .net-info-value {
                color: #e0f2fe;
                font-weight: 500;
            }
            .net-info-value.dynamic {
                color: #4cc9f0;
                text-shadow: 0 0 3px rgba(76, 201, 240, 0.4);
            }
            .location-refresh-btn {
                background: rgba(76, 201, 240, 0.2);
                border: 1px solid rgba(76, 201, 240, 0.5);
                color: #4cc9f0;
                font-size: 12px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 8px;
                transition: all 0.2s ease;
            }
            .location-refresh-btn:hover {
                background: rgba(76, 201, 240, 0.3);
                box-shadow: 0 0 6px rgba(76, 201, 240, 0.3);
            }
            .location-refresh-btn:active {
                transform: scale(0.95);
            }
            .verify-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 15, 30, 0.9);
                backdrop-filter: blur(10px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                padding: 0 15px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .verify-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .modal-box {
                width: 100%;
                max-width: 380px;
                background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.6);
                border-radius: 16px;
                padding: 30px 20px;
                box-shadow: 0 0 25px rgba(76, 201, 240, 0.3), inset 0 0 15px rgba(76, 201, 240, 0.1);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }
            .verify-modal.active .modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
            }
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                gap: 12px;
            }
            .modal-icon {
                font-size: 28px;
                color: #4cc9f0;
                text-shadow: 0 0 8px rgba(76, 201, 240, 0.6);
            }
            .modal-title {
                font-size: 22px;
                font-weight: bold;
                color: #4cc9f0;
                margin: 0;
                text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
                letter-spacing: 0.5px;
            }
            .modal-desc {
                font-size: 15px;
                color: #e0e7ff;
                text-align: center;
                margin: 0 0 25px;
                line-height: 1.6;
                padding: 0 10px;
                opacity: 0.9;
            }
            .verify-code {
                width: 100%;
                padding: 15px 0;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                border: 1px solid rgba(76, 201, 240, 0.6);
                border-radius: 12px;
                font-size: 24px;
                font-weight: bold;
                color: #4cc9f0;
                text-align: center;
                letter-spacing: 6px;
                margin: 0 0 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                user-select: none;
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.2), inset 0 0 8px rgba(76, 201, 240, 0.4);
                text-shadow: 0 0 5px rgba(76, 201, 240, 0.7);
                position: relative;
                overflow: hidden;
            }
            .verify-code:active {
                transform: scale(0.98);
                background: linear-gradient(135deg, #2a5298 0%, #1e3c72 100%);
                border-color: rgba(76, 201, 240, 0.4);
                box-shadow: 0 0 8px rgba(76, 201, 240, 0.15), inset 0 0 6px rgba(76, 201, 240, 0.3);
            }
            .verify-code.uncopyable {
                cursor: default;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-color: rgba(76, 201, 240, 0.3);
                pointer-events: none;
                box-shadow: inset 0 0 6px rgba(76, 201, 240, 0.2);
            }
            .verify-input-wrap {
                margin: 15px 0 5px;
            }
            .verify-input {
                width: 100%;
                padding: 12px 0;
                background: #1e293b;
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                transition: all 0.3s ease;
                color: #f8fafc;
                box-shadow: inset 0 0 6px rgba(76, 201, 240, 0.1);
            }
            .verify-input:focus {
                border-color: #4cc9f0;
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.4), inset 0 0 8px rgba(76, 201, 240, 0.2);
            }
            .verify-error {
                display: none;
                color: #f72585;
                text-align: center;
                font-size: 13px;
                margin-top: -10px;
                margin-bottom: 15px;
                font-weight: 600;
                text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
            }
            .copy-tip {
                font-size: 13px;
                color: #b5c8ff;
                text-align: center;
                margin: 0 0 25px;
                font-style: italic;
                opacity: 0.8;
            }
            .double-click-tip {
                font-size: 12px;
                color: #f72585;
                text-align: center;
                margin: 5px 0 0;
                font-weight: 600;
                text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
            }
            .modal-btns {
                display: flex;
                gap: 15px;
                margin-top: 10px;
                margin-bottom: 20px;
            }
            .modal-btn {
                flex: 1;
                padding: 13px 0;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #fff;
                letter-spacing: 0.5px;
            }
            .modal-btn:active {
                transform: translateY(2px);
                box-shadow: 0 0 8px rgba(0,0,0,0.2);
            }
            .confirm-btn {
                background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
                box-shadow: 0 0 12px rgba(67, 97, 238, 0.5);
            }
            .confirm-btn:hover {
                box-shadow: 0 0 18px rgba(67, 97, 238, 0.7);
            }
            .cancel-btn {
                background: linear-gradient(135deg, #f72585 0%, #7209b7 100%);
                box-shadow: 0 0 12px rgba(247, 37, 133, 0.5);
            }
            .cancel-btn:hover {
                box-shadow: 0 0 18px rgba(247, 37, 133, 0.7);
            }
            .copy-success {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.9);
                border: 1px solid rgba(76, 201, 240, 0.6);
                color: #4cc9f0;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 15px;
                z-index: 10003;
                opacity: 0;
                box-shadow: 0 0 15px rgba(76, 201, 240, 0.4);
                animation: fadeInOut 1.5s ease;
            }
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            .update-link-wrap {
                text-align: center;
                padding-top: 10px;
                border-top: 1px dashed rgba(76, 201, 240, 0.3);
            }
            .update-link {
                font-size: 13px;
                color: #4cc9f0;
                text-decoration: none;
                cursor: pointer;
                text-shadow: 0 0 3px rgba(76, 201, 240, 0.5);
            }
            .update-link:hover, .update-link:active {
                text-decoration: underline;
                color: #7dd3fc;
                text-shadow: 0 0 5px rgba(76, 201, 240, 0.7);
            }
            .progress-verify-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 15, 30, 0.9);
                backdrop-filter: blur(10px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                padding: 0 15px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .progress-verify-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .progress-modal-box {
                width: 100%;
                max-width: 380px;
                background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.6);
                border-radius: 16px;
                padding: 30px 20px;
                box-shadow: 0 0 25px rgba(76, 201, 240, 0.3), inset 0 0 15px rgba(76, 201, 240, 0.1);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }
            .progress-verify-modal.active .progress-modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
            }
            .progress-title {
                font-size: 22px;
                font-weight: bold;
                color: #4cc9f0;
                margin: 0 0 15px;
                text-align: center;
                text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
                letter-spacing: 0.5px;
            }
            .progress-desc {
                font-size: 15px;
                color: #e0e7ff;
                text-align: center;
                margin: 0 0 25px;
                line-height: 1.6;
                padding: 0 10px;
                opacity: 0.9;
            }
            .progress-bar-container {
                width: 100%;
                height: 20px;
                background: rgba(30, 41, 59, 0.8);
                border-radius: 10px;
                overflow: hidden;
                margin: 0 0 30px;
                box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4361ee 0%, #4cc9f0 50%, #4361ee 100%);
                border-radius: 10px;
                width: 0%;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.5);
            }
            .progress-status {
                font-size: 14px;
                color: #94a3b8;
                text-align: center;
                margin: 0 0 5px;
            }
            .progress-error {
                display: none;
                color: #f72585;
                text-align: center;
                font-size: 13px;
                margin-top: 15px;
                font-weight: 600;
                text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
            }
            .progress-retry-btn {
                background: linear-gradient(135deg, #f72585 0%, #7209b7 100%);
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 15px;
                transition: all 0.3s ease;
            }
            .progress-retry-btn:hover {
                box-shadow: 0 0 12px rgba(247, 37, 133, 0.5);
            }
            .admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 15, 30, 0.95);
                backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10002;
                padding: 0 15px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .admin-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .admin-modal-box {
                width: 100%;
                max-width: 320px;
                background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.7);
                border-radius: 16px;
                padding: 25px 20px;
                box-shadow: 0 0 30px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }
            .admin-modal.active .admin-modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 40px rgba(76, 201, 240, 0.5), inset 0 0 25px rgba(76, 201, 240, 0.2);
            }
            .admin-modal-header {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                gap: 12px;
            }
            .admin-modal-icon {
                font-size: 24px;
                color: #4cc9f0;
                text-shadow: 0 0 8px rgba(76, 201, 240, 0.6);
            }
            .admin-modal-title {
                font-size: 20px;
                font-weight: bold;
                color: #4cc9f0;
                margin: 0;
                text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
                letter-spacing: 0.5px;
            }
            .admin-modal-desc {
                font-size: 14px;
                color: #e0e7ff;
                text-align: center;
                margin: 0 0 20px;
                line-height: 1.5;
                padding: 0 10px;
                opacity: 0.9;
            }
            .admin-input-wrap {
                margin: 15px 0 5px;
            }
            .admin-input {
                width: 100%;
                padding: 12px 0;
                background: #1e293b;
                border: 1px solid rgba(76, 201, 240, 0.6);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                transition: all 0.3s ease;
                color: #f8fafc;
                box-shadow: inset 0 0 8px rgba(76, 201, 240, 0.1);
                letter-spacing: 2px;
            }
            .admin-input:focus {
                border-color: #4cc9f0;
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.5), inset 0 0 10px rgba(76, 201, 240, 0.2);
            }
            .admin-error {
                display: none;
                color: #f72585;
                text-align: center;
                font-size: 13px;
                margin-top: 10px;
                margin-bottom: 15px;
                font-weight: 600;
                text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
            }
            .admin-btns {
                display: flex;
                gap: 12px;
                margin-top: 15px;
            }
            .admin-btn {
                flex: 1;
                padding: 12px 0;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #fff;
                letter-spacing: 0.5px;
            }
            .admin-confirm-btn {
                background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
                box-shadow: 0 0 10px rgba(67, 97, 238, 0.5);
            }
            .admin-confirm-btn:hover {
                box-shadow: 0 0 15px rgba(67, 97, 238, 0.7);
            }
            .admin-cancel-btn {
                background: linear-gradient(135deg, #f72585 0%, #7209b7 100%);
                box-shadow: 0 0 10px rgba(247, 37, 133, 0.5);
            }
            .admin-cancel-btn:hover {
                box-shadow: 0 0 15px rgba(247, 37, 133, 0.7);
            }
        `);

        const STORAGE_KEY = 'safeTimerEndTime';
        const LOG_STORAGE_KEY = 'safeTimerLogs';
        const SESSION_KEY = 'safeTimerSession';
        const ADMIN_PASSWORD = '739164'; // 6位复杂数字密码
        const LOG_MAX_LENGTH = 3000;
        const TOTAL_TIME = 15 * 60; // 15分钟
        const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/3.user.js';
        const STRENGTHEN_COUNT = 2;
        const FAST_VERIFY_THRESHOLD = 3000;
        const LOCAL_DELAY_INTERVAL = 5000;
        const DELAY_TEST_TIMEOUT = 5000;
        const BACKGROUND_CHECK_INTERVAL = 5000;
        const DESTROY_AFTER_END = 8 * 60;
        const IP_API_LIST = [
            { url: 'https://api.ipify.org?format=json', parser: (json) => json.ip },
            { url: 'https://ipinfo.io/json', parser: (json) => json.ip },
            { url: 'https://api.myip.com', parser: (json) => json.ip },
            { url: 'https://api64.ipify.org?format=json', parser: (json) => json.ip },
            { url: 'https://ipapi.co/json/', parser: (json) => json.ip }
        ];
        const GEO_API_CONFIG = {
            reverseGeocodeList: [
                (lat, lon) => `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`,
                (lat, lon) => `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`,
                (lat, lon) => `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&format=json`,
                (lat, lon) => `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`,
                (lat, lon) => `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh`
            ],
            ipLocationList: [
                (ip) => `https://ipinfo.io/${ip}/json`,
                (ip) => `https://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`,
                (ip) => `https://api.ipapi.com/${ip}?access_key=demo`,
                (ip) => `https://ipapi.co/${ip}/json/`,
                (ip) => `https://api.iplocation.net/?ip=${ip}`
            ]
        };

        let backgroundRunner = null;
        let networkMonitor = null;
        let currentVerificationCode = '';

        function log(content, isBackground = false) {
            try {
                const timeStr = new Date().toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }).replace(/\//g, '-');
                const logPrefix = isBackground ? '[安全计时器-后台]' : '[安全计时器]';
                const logItem = { 
                    time: timeStr, 
                    content: content, 
                    source: isBackground ? '后台' : '前台',
                    domain: window.location.hostname
                };

                let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
                logs.push(logItem);

                if (logs.length > LOG_MAX_LENGTH) {
                    logs = logs.slice(logs.length - LOG_MAX_LENGTH);
                }

                localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
                console.log(`${logPrefix}[${timeStr}] ${content}`);
            } catch (e) {
                console.log('安全计时器日志记录失败:', e);
            }
        }

        function createLocationRefreshButton() {
            const existingBtn = document.querySelector('.location-refresh-btn-standalone');
            if (existingBtn) {
                existingBtn.remove();
            }

            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'location-refresh-btn-standalone';
            refreshBtn.textContent = '重新获取定位';
            refreshBtn.title = '重新获取定位权限';

            refreshBtn.addEventListener('click', () => {
                if (networkMonitor && typeof networkMonitor.refreshLocation === 'function') {
                    networkMonitor.refreshLocation();
                } else {
                    log('网络监测模块未正确初始化，无法重新获取定位');
                }
            });

            document.body.appendChild(refreshBtn);
            log('独立重新获取定位按钮创建完成');
        }

        class BackgroundRunner {
            constructor() {
                this.backgroundTimer = null;
                this.isForeground = document.visibilityState === 'visible';
                this.destroyTimer = null;
                this.initBackgroundSync();
                this.bindVisibilityEvents();
                log('后台运行模块初始化完成', true);
            }

            initBackgroundSync() {
                this.backgroundTimer = setInterval(() => {
                    try {
                        const storedEndTime = GM_getValue(STORAGE_KEY, null);
                        if (!storedEndTime) return;

                        const endTime = parseInt(storedEndTime);
                        const now = Date.now();
                        const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

                        const destroyTime = endTime + (DESTROY_AFTER_END * 1000);
                        if (now >= destroyTime) {
                            this.destroyStorage();
                            return;
                        }

                        if (remainingTime <= 0) {
                            this.destroyStorage();
                            return;
                        }

                        if (remainingTime % 60 === 0) {
                            log(`后台倒计时同步：剩余${remainingTime}秒`, true);
                        }
                    } catch (e) {
                        console.error('后台同步错误:', e);
                    }
                }, BACKGROUND_CHECK_INTERVAL);
            }

            destroyStorage() {
                if (this.backgroundTimer) {
                    clearInterval(this.backgroundTimer);
                }
                GM_deleteValue(STORAGE_KEY);
                GM_deleteValue(SESSION_KEY);
                log(`后台检测到缓存超时，自动销毁缓存`, true);

                if (this.isForeground) {
                    setTimeout(checkSessionStatus, 100);
                }
            }

            bindVisibilityEvents() {
                document.addEventListener('visibilitychange', () => {
                    this.isForeground = document.visibilityState === 'visible';
                    if (this.isForeground) {
                        log('页面切换至前台，同步最新缓存倒计时状态', false);
                        setTimeout(initTimer, 100);
                    } else {
                        log('页面切换至后台，后台缓存计时器继续运行', true);
                    }
                });
            }

            destroy() {
                if (this.backgroundTimer) {
                    clearInterval(this.backgroundTimer);
                    log('后台定时器已销毁', true);
                }
                if (this.destroyTimer) {
                    clearTimeout(this.destroyTimer);
                    log('自动销毁定时器已销毁', true);
                }
            }
        }

        class NetworkMonitor {
            constructor() {
                this.isOnline = navigator.onLine;
                this.localDelay = '检测中...';
                this.userIP = '查找中...';
                this.locationInfo = '获取中...';
                this.currentArea = '获取中...';
                this.statusEl = null;
                this.modalEl = null;
                this.delayTimer = null;
                this.GEO_STORAGE_KEY = `geo_${window.location.hostname}`;
                this.locationTimeout = null;
                this.initElements();
                this.bindEvents();
                this.startLocalDelayDetect();
                setTimeout(() => {
                    this.fetchUserIPWithAI();
                    this.fetchLocation();
                }, 1000);
                log('网络监测模块初始化完成', false);
            }

            initElements() {
                const oldStatus = document.querySelector('.net-status');
                if (oldStatus) oldStatus.remove();
                const oldModal = document.querySelector('.net-modal');
                if (oldModal) oldModal.remove();

                this.statusEl = document.createElement('div');
                this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
                this.statusEl.textContent = this.isOnline ? '在线' : '离线';
                document.body.appendChild(this.statusEl);

                this.modalEl = document.createElement('div');
                this.modalEl.className = 'net-modal';
                this.modalEl.innerHTML = `
                    <div class="net-modal-box">
                        <div class="net-modal-header">
                            <h3 class="net-modal-title"><span>${this.isOnline ? '🌐' : '❌'}</span>网络状态</h3>
                            <button class="net-modal-close">×</button>
                        </div>
                        <ul class="net-info-list">
                            <li class="net-info-item">
                                <span class="net-info-label">连接状态</span>
                                <span class="net-info-value" id="net-status-value">${this.isOnline ? '在线' : '离线'}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">本地-网页延迟</span>
                                <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">当前IP</span>
                                <span class="net-info-value dynamic" id="user-ip-value">${this.userIP}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">当前定位</span>
                                <span class="net-info-value dynamic" id="location-info-value">${this.locationInfo}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">当前位置</span>
                                <span class="net-info-value dynamic" id="current-area-value">${this.currentArea}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">网络类型</span>
                                <span class="net-info-value" id="net-type-value">${this.getNetworkType()}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">浏览器</span>
                                <span class="net-info-value" id="browser-info-value">${this.getBrowserInfo()}</span>
                            </li>
                            <li class="net-info-item">
                                <span class="net-info-label">屏幕尺寸</span>
                                <span class="net-info-value" id="screen-size-value">${this.getScreenSize()}</span>
                            </li>
                        </ul>
                    </div>
                `;
                document.body.appendChild(this.modalEl);

                const locationItem = this.modalEl.querySelector('#location-info-value').closest('.net-info-item');
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'location-refresh-btn';
                refreshBtn.textContent = '重新获取';
                refreshBtn.title = '重新获取定位权限';
                locationItem.querySelector('.net-info-value').appendChild(refreshBtn);

                refreshBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.refreshLocation();
                });

                this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
                    this.modalEl.classList.remove('active');
                });
            }

            bindEvents() {
                this.statusEl.addEventListener('click', () => this.modalEl.classList.toggle('active'));
                window.addEventListener('online', () => this.updateStatus(true));
                window.addEventListener('offline', () => this.updateStatus(false));

                if (navigator.connection) {
                    const handleConnectionChange = () => {
                        const type = this.getNetworkType();
                        this.modalEl.querySelector('#net-type-value').textContent = type;
                        log(`网络类型变化：${type}`);
                    };
                    navigator.connection.addEventListener('change', handleConnectionChange);
                }
            }

            refreshLocation() {
                log('用户手动触发重新获取定位');
                this.locationInfo = '重新获取中...';
                this.currentArea = '重新获取中...';
                this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;

                localStorage.removeItem(this.GEO_STORAGE_KEY);
                if (this.locationTimeout) {
                    clearTimeout(this.locationTimeout);
                    this.locationTimeout = null;
                }

                this.fetchLocation();
            }

            updateStatus(online) {
                this.isOnline = online;
                const statusText = online ? '在线' : '离线';
                this.statusEl.className = `net-status ${online ? 'online' : 'offline'}`;
                this.statusEl.textContent = statusText;
                this.modalEl.querySelector('#net-status-value').textContent = statusText;
                this.modalEl.querySelector('.net-modal-title span').textContent = online ? '🌐' : '❌';
                log(`网络状态变化：${statusText}`);

                if (online) {
                    this.startLocalDelayDetect();
                    this.resetNetworkInfo();
                    setTimeout(() => {
                        this.fetchUserIPWithAI();
                        this.fetchLocation();
                    }, 1000);
                    setTimeout(initTimer, 100);
                } else {
                    this.stopLocalDelayDetect();
                    this.setOfflineInfo();
                }
            }

            calculateLocalDelay() {
                if (!window.location.origin) {
                    this.localDelay = '无效域名';
                    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
                    log(`本地-网页延迟检测：${this.localDelay}`);
                    return;
                }

                const testUrl = `${window.location.origin}/?delayTest=${Date.now()}`;
                const startTime = performance.now();
                let timeoutTimer;

                const timeoutPromise = new Promise((_, reject) => {
                    timeoutTimer = setTimeout(() => reject(new Error('TimeoutError')), DELAY_TEST_TIMEOUT);
                });

                Promise.race([
                    fetch(testUrl, { method: 'GET', mode: 'cors', cache: 'no-store' }),
                    timeoutPromise
                ])
                .then(() => {
                    clearTimeout(timeoutTimer);
                    const delay = Math.round(performance.now() - startTime);
                    this.localDelay = `${delay}ms`;
                    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
                    log(`本地-网页延迟检测：${this.localDelay}`);
                })
                .catch(error => {
                    clearTimeout(timeoutTimer);
                    this.localDelay = error.message === 'TimeoutError' ? '超时' : `检测失败`;
                    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
                    log(`本地-网页延迟检测：${this.localDelay}`);
                });
            }

            startLocalDelayDetect() {
                if (!this.isOnline) return;
                this.stopLocalDelayDetect();
                this.calculateLocalDelay();
                this.delayTimer = setInterval(() => this.calculateLocalDelay(), LOCAL_DELAY_INTERVAL);
            }

            stopLocalDelayDetect() {
                if (this.delayTimer) {
                    clearInterval(this.delayTimer);
                    this.delayTimer = null;
                }
            }

            fetchUserIPWithAI() {
                if (!this.isOnline) return;

                const tryNextApi = (apiIndex = 0) => {
                    if (apiIndex >= IP_API_LIST.length) {
                        this.userIP = '查找失败';
                        this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
                        log(`IP获取失败：所有接口尝试完毕`);
                        return;
                    }

                    const { url, parser } = IP_API_LIST[apiIndex];
                    fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 8000 })
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            const ip = parser(data);
                            const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
                            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

                            if (ip && (ipv4Regex.test(ip) || ipv6Regex.test(ip))) {
                                this.userIP = ip;
                                this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
                                log(`IP获取成功：${ip}`);
                                this.fetchIPBasedLocation(ip);
                            } else {
                                throw new Error('IP格式无效');
                            }
                        })
                        .catch((error) => {
                            log(`IP获取接口${apiIndex + 1}失败：${error.message}`);
                            tryNextApi(apiIndex + 1);
                        });
                };

                tryNextApi();
            }

            fetchReverseGeocode(lat, lon) {
                const tryNextApi = (apiIndex = 0) => {
                    if (apiIndex >= GEO_API_CONFIG.reverseGeocodeList.length) {
                        this.currentArea = '定位失败';
                        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                        log(`逆地理编码失败：所有接口尝试完毕`);
                        return;
                    }

                    const apiUrl = GEO_API_CONFIG.reverseGeocodeList[apiIndex](lat, lon);
                    fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 10000 })
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            let area = '';
                            if (data.address) {
                                area = data.address.county || data.address.city || data.address.state || data.address.country;
                            } else if (data.region) {
                                area = data.region;
                            } else if (data.localityInfo && data.localityInfo.administrative) {
                                area = data.localityInfo.administrative[2]?.name || data.localityInfo.administrative[1]?.name || data.localityInfo.administrative[0]?.name;
                            } else if (data.city) {
                                area = data.city;
                            } else if (data.results && data.results[0]) {
                                area = data.results[0].formatted;
                            }

                            if (area) {
                                this.currentArea = area;
                                this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                                log(`逆地理编码成功：${area}`);
                            } else {
                                throw new Error('无法解析位置信息');
                            }
                        })
                        .catch((error) => {
                            log(`逆地理编码接口${apiIndex + 1}失败：${error.message}`);
                            tryNextApi(apiIndex + 1);
                        });
                };

                tryNextApi();
            }

            fetchIPBasedLocation(ip) {
                if (!ip || ip === '查找失败') {
                    this.currentArea = 'IP定位失败';
                    this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                    log(`IP定位失败：IP无效`);
                    return;
                }

                const tryNextApi = (apiIndex = 0) => {
                    if (apiIndex >= GEO_API_CONFIG.ipLocationList.length) {
                        this.currentArea = 'IP定位失败';
                        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                        log(`IP定位失败：所有接口尝试完毕`);
                        return;
                    }

                    const apiUrl = GEO_API_CONFIG.ipLocationList[apiIndex](ip);
                    fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 10000 })
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            let area = '';
                            if (data.city && data.regionName) {
                                area = `${data.regionName} ${data.city}`;
                            } else if (data.city) {
                                area = data.city;
                            } else if (data.region) {
                                area = data.region;
                            } else if (data.country) {
                                area = data.country;
                            } else if (data.location) {
                                area = data.location;
                            }

                            if (area) {
                                this.currentArea = area;
                                this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                                log(`IP定位成功：${area}`);
                            } else {
                                throw new Error('无法解析位置信息');
                            }
                        })
                        .catch((error) => {
                            log(`IP定位接口${apiIndex + 1}失败：${error.message}`);
                            tryNextApi(apiIndex + 1);
                        });
                };

                tryNextApi();
            }

            fetchLocation() {
                if (!this.isOnline) return;

                if (this.locationTimeout) {
                    clearTimeout(this.locationTimeout);
                    this.locationTimeout = null;
                }

                const cachedGeo = localStorage.getItem(this.GEO_STORAGE_KEY);
                if (cachedGeo) {
                    try {
                        const { lat, lon, area, timestamp } = JSON.parse(cachedGeo);
                        const now = Date.now();
                        const isExpired = (now - timestamp) > (24 * 60 * 60 * 1000);

                        if (!isExpired) {
                            this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                            this.currentArea = area;
                            this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                            this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
                            log(`定位信息从缓存读取：${this.locationInfo} - ${this.currentArea}`);
                            return;
                        } else {
                            localStorage.removeItem(this.GEO_STORAGE_KEY);
                        }
                    } catch (e) {
                        localStorage.removeItem(this.GEO_STORAGE_KEY);
                    }
                }

                if (!navigator.geolocation) {
                    this.locationInfo = '浏览器不支持定位';
                    this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                    log(`定位失败：浏览器不支持`);
                    if (this.userIP && this.userIP !== '查找中...' && this.userIP !== '查找失败') {
                        this.fetchIPBasedLocation(this.userIP);
                    }
                    return;
                }

                this.locationTimeout = setTimeout(() => {
                    this.locationInfo = '定位请求超时';
                    this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                    log(`定位失败：请求超时`);
                    if (this.userIP && this.userIP !== '查找中...' && this.userIP !== '查找失败') {
                        this.fetchIPBasedLocation(this.userIP);
                    }
                }, 15000);

                navigator.geolocation.getCurrentPosition(
                    position => {
                        if (this.locationTimeout) {
                            clearTimeout(this.locationTimeout);
                            this.locationTimeout = null;
                        }

                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                        log(`定位成功：${this.locationInfo}`);

                        this.fetchReverseGeocode(lat, lon);

                        setTimeout(() => {
                            if (this.currentArea && this.currentArea !== '获取中...' && !this.currentArea.includes('失败')) {
                                const geoData = {
                                    lat: lat,
                                    lon: lon,
                                    area: this.currentArea,
                                    timestamp: Date.now()
                                };
                                localStorage.setItem(this.GEO_STORAGE_KEY, JSON.stringify(geoData));
                                log(`定位信息已缓存：${this.currentArea}`);
                            }
                        }, 1000);
                    },
                    error => {
                        if (this.locationTimeout) {
                            clearTimeout(this.locationTimeout);
                            this.locationTimeout = null;
                        }

                        const errorMsg = error.code === 1 ? '用户拒绝权限' : 
                                        error.code === 2 ? '位置不可用' : 
                                        error.code === 3 ? '请求超时' : '未知错误';
                        this.locationInfo = `定位失败（${errorMsg}）`;
                        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                        log(`定位失败：${errorMsg}`);
                        if (this.userIP && this.userIP !== '查找中...' && this.userIP !== '查找失败') {
                            this.fetchIPBasedLocation(this.userIP);
                        }
                    },
                    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
                );
            }

            resetNetworkInfo() {
                this.localDelay = '检测中...';
                this.userIP = '查找中...';
                this.locationInfo = '获取中...';
                this.currentArea = '获取中...';
                this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
                this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
                this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
            }

            setOfflineInfo() {
                this.localDelay = '离线';
                this.userIP = '离线';
                this.locationInfo = '离线';
                this.currentArea = '离线';
                this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
                this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
                this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
                this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
            }

            getNetworkType() {
                if (navigator.connection && navigator.connection.effectiveType) {
                    return navigator.connection.effectiveType;
                }
                return '未知';
            }

            getBrowserInfo() {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari')) return 'Safari';
                if (ua.includes('Edge')) return 'Edge';
                return '未知';
            }

            getScreenSize() {
                return `${screen.width} × ${screen.height}`;
            }

            destroy() {
                this.stopLocalDelayDetect();
                if (this.locationTimeout) {
                    clearTimeout(this.locationTimeout);
                    this.locationTimeout = null;
                }
                if (this.statusEl && this.statusEl.parentNode) {
                    this.statusEl.parentNode.removeChild(this.statusEl);
                }
                if (this.modalEl && this.modalEl.parentNode) {
                    this.modalEl.parentNode.removeChild(this.modalEl);
                }
            }
        }

        function generateVerificationCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        function showCopySuccess() {
            const tip = document.createElement('div');
            tip.className = 'copy-success';
            tip.textContent = '验证码已复制到剪贴板';
            document.body.appendChild(tip);
            setTimeout(() => {
                if (tip.parentNode) tip.parentNode.removeChild(tip);
            }, 1500);
        }

        function showAdminModal(code) {
            const existingModal = document.querySelector('.admin-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'admin-modal';
            modal.innerHTML = `
                <div class="admin-modal-box">
                    <div class="admin-modal-header">
                        <div class="admin-modal-icon">🔑</div>
                        <h2 class="admin-modal-title">管理员验证</h2>
                    </div>
                    <p class="admin-modal-desc">请输入管理员密码以复制验证码</p>
                    <div class="admin-input-wrap">
                        <input type="password" class="admin-input" id="admin-password-input" placeholder="请输入6位管理员密码" maxlength="6" inputmode="numeric">
                        <div class="admin-error" id="admin-error">密码错误，请重新输入</div>
                    </div>
                    <div class="admin-btns">
                        <button class="admin-btn admin-confirm-btn" id="admin-confirm">确认</button>
                        <button class="admin-btn admin-cancel-btn" id="admin-cancel">取消</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.add('active');
            }, 10);

            const passwordInput = modal.querySelector('#admin-password-input');
            const errorEl = modal.querySelector('#admin-error');
            const confirmBtn = modal.querySelector('#admin-confirm');
            const cancelBtn = modal.querySelector('#admin-cancel');

            const handleConfirm = () => {
                const inputPassword = passwordInput.value.trim();
                if (inputPassword === ADMIN_PASSWORD) {
                    navigator.clipboard.writeText(code).then(() => {
                        showCopySuccess();
                        modal.classList.remove('active');
                        setTimeout(() => {
                            if (modal.parentNode) modal.parentNode.removeChild(modal);
                        }, 400);
                        log('管理员验证成功，验证码已复制');
                    }).catch(() => {
                        errorEl.textContent = '复制失败，请手动输入';
                        errorEl.style.display = 'block';
                        log('管理员验证成功但复制失败');
                    });
                } else {
                    errorEl.textContent = '密码错误，请重新输入';
                    errorEl.style.display = 'block';
                    passwordInput.value = '';
                    log('管理员密码验证失败');
                }
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                }, 400);
            });

            passwordInput.addEventListener('input', () => {
                errorEl.style.display = 'none';
                passwordInput.value = passwordInput.value.replace(/[^0-9]/g, '');
            });

            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                }
            });

            passwordInput.focus();
        }

        function checkSessionStatus() {
            const sessionData = GM_getValue(SESSION_KEY, null);
            const storedEndTime = GM_getValue(STORAGE_KEY, null);
            
            if (sessionData && storedEndTime) {
                const endTime = parseInt(storedEndTime);
                const now = Date.now();
                const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));
                
                if (remainingTime > 0) {
                    log(`检测到有效会话，剩余时间：${remainingTime}秒`);
                    initTimer();
                    return;
                }
            }
            
            showInitialVerify();
        }

        function showInitialVerify() {
            const existingModal = document.querySelector('.verify-modal');
            if (existingModal) existingModal.remove();

            const code = generateVerificationCode();
            currentVerificationCode = code;
            const modal = document.createElement('div');
            modal.className = 'verify-modal';
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔒</div>
                        <h2 class="modal-title">安全验证</h2>
                    </div>
                    <p class="modal-desc">请复制下方验证码并输入以继续访问</p>
                    <div class="verify-code" id="verify-code">${code}</div>
                    <p class="copy-tip">双击验证码使用管理员密码复制</p>
                    <p class="double-click-tip">双击验证码可输入管理员密码快速复制</p>
                    <div class="verify-input-wrap">
                        <input type="text" class="verify-input" id="verify-input" placeholder="请输入验证码" maxlength="6">
                        <div class="verify-error" id="verify-error">验证码错误，请重新输入</div>
                    </div>
                    <div class="modal-btns">
                        <button class="modal-btn confirm-btn" id="confirm-verify">确认</button>
                        <button class="modal-btn cancel-btn" id="cancel-verify">取消</button>
                    </div>
                    <div class="update-link-wrap">
                        <a class="update-link" id="update-link" target="_blank">遇到问题？点击更新脚本</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.add('active');
            }, 10);

            const codeEl = modal.querySelector('#verify-code');
            const inputEl = modal.querySelector('#verify-input');
            const errorEl = modal.querySelector('#verify-error');
            const confirmBtn = modal.querySelector('#confirm-verify');
            const cancelBtn = modal.querySelector('#cancel-verify');
            const updateLink = modal.querySelector('#update-link');

            updateLink.href = UPDATE_URL;

            let lastClickTime = 0;

            codeEl.addEventListener('dblclick', (e) => {
                e.preventDefault();
                showAdminModal(code);
            });

            codeEl.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                if (currentTime - lastClickTime < 300) {
                    e.preventDefault();
                    showAdminModal(code);
                }
                lastClickTime = currentTime;
            });

            confirmBtn.addEventListener('click', () => {
                const inputCode = inputEl.value.trim();
                if (inputCode === code) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                        setTimeout(showProgressVerify, 100);
                    }, 400);
                    log('验证成功，开始计时');
                } else {
                    errorEl.style.display = 'block';
                    inputEl.value = '';
                    log('验证失败：验证码错误');
                }
            });

            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                    showInitialVerify();
                }, 400);
                log('验证取消，重新显示验证界面');
            });

            inputEl.addEventListener('input', () => {
                errorEl.style.display = 'none';
            });

            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });

            inputEl.focus();
        }

        function showProgressVerify() {
            const existingModal = document.querySelector('.progress-verify-modal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.className = 'progress-verify-modal';
            modal.innerHTML = `
                <div class="progress-modal-box">
                    <h2 class="progress-title">安全验证</h2>
                    <p class="progress-desc">请等待进度条完成以继续访问</p>
                    <div class="progress-status" id="progress-status">0%</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="progress-bar"></div>
                    </div>
                    <div class="progress-error" id="progress-error">验证失败，请重试</div>
                    <button class="progress-retry-btn" id="progress-retry-btn" style="display: none;">重新验证</button>
                    <div class="update-link-wrap">
                        <a class="update-link" id="update-link" target="_blank">遇到问题？点击更新脚本</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.add('active');
            }, 10);

            const progressBar = modal.querySelector('#progress-bar');
            const progressStatus = modal.querySelector('#progress-status');
            const errorEl = modal.querySelector('#progress-error');
            const retryBtn = modal.querySelector('#progress-retry-btn');
            const updateLink = modal.querySelector('#update-link');

            updateLink.href = UPDATE_URL;

            let progress = 0;
            const targetProgress = 100;
            const duration = 4000 + Math.random() * 3000;
            const intervalTime = 50;
            const steps = duration / intervalTime;
            const increment = targetProgress / steps;

            const interval = setInterval(() => {
                progress += increment;
                if (progress >= targetProgress) {
                    progress = targetProgress;
                    clearInterval(interval);
                    progressBar.style.width = `${progress}%`;
                    progressStatus.textContent = `${Math.round(progress)}%`;

                    setTimeout(() => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            if (modal.parentNode) modal.parentNode.removeChild(modal);
                        }, 400);
                        GM_setValue(SESSION_KEY, {
                            verified: true,
                            timestamp: Date.now(),
                            domain: window.location.hostname
                        });
                        startTimer();
                        log('进度条验证成功，开始计时');
                    }, 500);
                } else {
                    progressBar.style.width = `${progress}%`;
                    progressStatus.textContent = `${Math.round(progress)}%`;
                }
            }, intervalTime);

            const shouldFail = Math.random() < 0.15;
            if (shouldFail) {
                const failTime = 1000 + Math.random() * 2000;
                setTimeout(() => {
                    clearInterval(interval);
                    progressBar.style.width = `${progress}%`;
                    errorEl.style.display = 'block';
                    retryBtn.style.display = 'block';
                    log('进度条验证失败');

                    retryBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            if (modal.parentNode) modal.parentNode.removeChild(modal);
                            showProgressVerify();
                        }, 400);
                    });
                }, failTime);
            }
        }

        function startTimer() {
            const endTime = Date.now() + TOTAL_TIME * 1000;
            GM_setValue(STORAGE_KEY, endTime.toString());
            log(`计时开始，结束时间：${new Date(endTime).toLocaleString()}`);
            initTimer();
        }

        function initTimer() {
            const oldTimer = document.querySelector('.safe-timer');
            if (oldTimer) oldTimer.remove();

            const storedEndTime = GM_getValue(STORAGE_KEY, null);
            if (!storedEndTime) {
                checkSessionStatus();
                return;
            }

            const endTime = parseInt(storedEndTime);
            const now = Date.now();
            const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

            if (remainingTime <= 0) {
                GM_deleteValue(STORAGE_KEY);
                GM_deleteValue(SESSION_KEY);
                checkSessionStatus();
                return;
            }

            updateTimerDisplay(remainingTime);
            log(`初始化倒计时，剩余时间：${remainingTime}秒`);
        }

        function updateTimerDisplay(remainingSeconds) {
            let timerEl = document.querySelector('.safe-timer');
            if (!timerEl) {
                timerEl = document.createElement('div');
                timerEl.className = 'safe-timer';
                document.body.appendChild(timerEl);

                timerEl.addEventListener('click', () => {
                    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
                    const logText = logs.map(log => `[${log.time}] ${log.content}`).join('\n');
                    const blob = new Blob([logText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `安全计时器日志_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    log('日志已导出');
                });
            }

            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // 完善倒计时器字体颜色标识
            if (remainingSeconds <= 60) {
                timerEl.className = 'safe-timer danger';
            } else if (remainingSeconds <= 300) { // 5分钟内显示警告色
                timerEl.className = 'safe-timer warning';
            } else {
                timerEl.className = 'safe-timer';
            }

            if (remainingSeconds > 0) {
                setTimeout(() => {
                    const storedEndTime = GM_getValue(STORAGE_KEY, null);
                    if (!storedEndTime) {
                        checkSessionStatus();
                        return;
                    }

                    const endTime = parseInt(storedEndTime);
                    const now = Date.now();
                    const newRemaining = Math.max(0, Math.ceil((endTime - now) / 1000));
                    updateTimerDisplay(newRemaining);
                }, 1000);
            } else {
                GM_deleteValue(STORAGE_KEY);
                GM_deleteValue(SESSION_KEY);
                checkSessionStatus();
            }
        }

        log('安全计时器脚本开始初始化（版本：5.2）');

        backgroundRunner = new BackgroundRunner();
        networkMonitor = new NetworkMonitor();
        createLocationRefreshButton();
        setTimeout(checkSessionStatus, 500);

        log('安全计时器脚本初始化完成（版本：5.2）');
    }
})();