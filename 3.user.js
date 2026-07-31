// ==UserScript==
// @name         页面安全验证计时器（增强版V6.0）
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时【支持后台运行+定位缓存+缓存超时销毁+智能风险检测+语音播报+暗黑/亮色主题+验证统计】
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
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

        // ==================== 样式定义 ====================
        GM_addStyle(`
            /* 基础重置和通用样式 */
            * {
                box-sizing: border-box;
            }
            
            /* 主题变量 */
            :root {
                --bg-primary: rgba(15, 23, 42, 0.95);
                --bg-secondary: rgba(30, 41, 59, 0.8);
                --bg-modal: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                --text-primary: #e0f2fe;
                --text-secondary: #94a3b8;
                --border-color: rgba(76, 201, 240, 0.5);
                --shadow-color: rgba(76, 201, 240, 0.2);
                --accent-color: #4cc9f0;
                --accent-gradient: linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%);
                --success-color: #48bb78;
                --danger-color: #f72585;
                --warning-color: #ffd60a;
            }
            
            [data-theme="light"] {
                --bg-primary: rgba(255, 255, 255, 0.95);
                --bg-secondary: rgba(240, 244, 248, 0.9);
                --bg-modal: linear-gradient(135deg, #e8edf5 0%, #d5dce6 100%);
                --text-primary: #1a2332;
                --text-secondary: #4a5568;
                --border-color: rgba(67, 97, 238, 0.4);
                --shadow-color: rgba(67, 97, 238, 0.15);
            }

            /* 风险指示器 */
            .risk-indicator {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 8px var(--shadow-color);
                z-index: 9999;
                user-select: none;
                transition: all 0.3s ease;
                display: none;
                cursor: pointer;
                color: var(--text-primary);
            }
            .risk-indicator.low { color: #4cc9f0; border-color: #4cc9f0; }
            .risk-indicator.medium { color: #ffd60a; border-color: #ffd60a; animation: pulse-warning 2s infinite; }
            .risk-indicator.high { color: #f72585; border-color: #f72585; animation: pulse-danger 1s infinite; }
            .risk-indicator.critical { color: #ff0000; border-color: #ff0000; animation: pulse-critical 0.5s infinite; background: rgba(255,0,0,0.1); }
            
            @keyframes pulse-warning { 0%,100% { color: #ffd60a; } 50% { color: #ffea80; } }
            @keyframes pulse-danger { 0%,100% { color: #f72585; } 50% { color: #ff6ba9; } }
            @keyframes pulse-critical { 0% { box-shadow: 0 0 5px rgba(255,0,0,0.5); } 50% { box-shadow: 0 0 20px rgba(255,0,0,0.8); } 100% { box-shadow: 0 0 5px rgba(255,0,0,0.5); } }

            /* 计时器 */
            .safe-timer {
                position: fixed;
                top: 12px;
                left: 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 8px 15px;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
                box-shadow: 0 2px 8px var(--shadow-color);
                z-index: 9999;
                user-select: none;
                transition: color 0.3s ease, box-shadow 0.3s ease;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .safe-timer:hover { box-shadow: 0 0 12px rgba(76, 201, 240, 0.4); }
            .safe-timer.warning { color: #ffd60a; animation: pulse-warning 1s infinite; }
            .safe-timer.danger { color: #f72585; animation: pulse-danger 0.8s infinite; }
            .safe-timer .timer-icon { font-size: 14px; }
            .safe-timer .timer-text { font-variant-numeric: tabular-nums; }

            /* 统计面板 */
            .stats-panel {
                position: fixed;
                bottom: 12px;
                left: 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 11px;
                color: var(--text-secondary);
                box-shadow: 0 2px 8px var(--shadow-color);
                z-index: 9998;
                user-select: none;
                cursor: pointer;
                transition: all 0.3s ease;
                display: none;
                max-width: 200px;
                line-height: 1.4;
            }
            .stats-panel:hover { box-shadow: 0 0 12px rgba(76, 201, 240, 0.3); }
            .stats-panel .stats-title { color: var(--text-primary); font-weight: 600; font-size: 12px; }
            .stats-panel .stats-item { display: flex; justify-content: space-between; gap: 10px; }
            .stats-panel .stats-value { color: var(--accent-color); font-weight: 500; }

            /* 主题切换按钮 */
            .theme-toggle {
                position: fixed;
                bottom: 12px;
                right: 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 50%;
                width: 36px;
                height: 36px;
                font-size: 16px;
                cursor: pointer;
                z-index: 9998;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-primary);
                box-shadow: 0 2px 8px var(--shadow-color);
            }
            .theme-toggle:hover { transform: scale(1.1); box-shadow: 0 0 12px rgba(76, 201, 240, 0.3); }
            .theme-toggle:active { transform: scale(0.95); }

            /* 网络状态 */
            .net-status {
                position: fixed;
                top: 12px;
                right: 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 8px 15px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px var(--shadow-color);
                z-index: 9999;
                user-select: none;
                cursor: pointer;
                transition: all 0.2s ease;
                color: var(--text-primary);
            }
            .net-status.online { color: #4cc9f0; }
            .net-status.offline { color: #f72585; }
            .net-status:active { transform: scale(0.95); }

            /* 定位刷新按钮 */
            .location-refresh-btn-standalone {
                position: fixed;
                top: 60px;
                left: 12px;
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                color: var(--accent-color);
                box-shadow: 0 2px 8px var(--shadow-color);
                z-index: 9999;
                user-select: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .location-refresh-btn-standalone:hover {
                background: rgba(76, 201, 240, 0.1);
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
            }
            .location-refresh-btn-standalone:active { transform: scale(0.95); }

            /* 模态框通用 */
            .verify-modal, .progress-verify-modal, .admin-modal, .risk-modal, .net-modal {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
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
            .verify-modal.active, .progress-verify-modal.active, .admin-modal.active, .risk-modal.active, .net-modal.active {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-box, .progress-modal-box, .admin-modal-box, .risk-modal-box, .net-modal-box {
                width: 100%;
                max-width: 380px;
                background: var(--bg-modal);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                padding: 30px 20px;
                box-shadow: 0 0 25px rgba(76, 201, 240, 0.3), inset 0 0 15px rgba(76, 201, 240, 0.1);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
                color: var(--text-primary);
            }
            .verify-modal.active .modal-box,
            .progress-verify-modal.active .progress-modal-box,
            .admin-modal.active .admin-modal-box,
            .risk-modal.active .risk-modal-box,
            .net-modal.active .net-modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
            }

            .modal-header { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; gap: 12px; }
            .modal-icon { font-size: 28px; }
            .modal-title { font-size: 22px; font-weight: bold; color: var(--accent-color); margin: 0; text-shadow: 0 0 6px rgba(76, 201, 240, 0.5); }
            .modal-desc { font-size: 14px; color: var(--text-primary); text-align: center; margin: 0 0 20px; line-height: 1.6; opacity: 0.9; }

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
                margin: 0 0 10px;
                cursor: pointer;
                user-select: none;
                box-shadow: 0 0 12px rgba(76, 201, 240, 0.2), inset 0 0 8px rgba(76, 201, 240, 0.4);
                text-shadow: 0 0 5px rgba(76, 201, 240, 0.7);
            }
            .verify-code:active { transform: scale(0.98); }

            .verify-input {
                width: 100%;
                padding: 12px 0;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                color: var(--text-primary);
                box-sizing: border-box;
            }
            .verify-input:focus { border-color: #4cc9f0; box-shadow: 0 0 10px rgba(76, 201, 240, 0.4); }
            .verify-error {
                display: none;
                color: #f72585;
                text-align: center;
                font-size: 13px;
                margin: 8px 0;
                font-weight: 600;
            }

            .modal-btns { display: flex; gap: 12px; margin-top: 15px; }
            .modal-btn {
                flex: 1;
                padding: 12px 0;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                color: #fff;
                transition: all 0.3s ease;
            }
            .modal-btn:active { transform: translateY(2px); }
            .confirm-btn { background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%); box-shadow: 0 0 12px rgba(67, 97, 238, 0.5); }
            .confirm-btn:hover { box-shadow: 0 0 18px rgba(67, 97, 238, 0.7); }
            .cancel-btn { background: linear-gradient(135deg, #f72585 0%, #7209b7 100%); box-shadow: 0 0 12px rgba(247, 37, 133, 0.5); }
            .cancel-btn:hover { box-shadow: 0 0 18px rgba(247, 37, 133, 0.7); }

            /* 滑块验证 */
            .slider-verify {
                width: 100%;
                height: 46px;
                background: var(--bg-secondary);
                border-radius: 23px;
                margin: 15px 0;
                position: relative;
                overflow: hidden;
                border: 1px solid var(--border-color);
            }
            .slider-track {
                position: absolute;
                left: 0; top: 0;
                width: 100%; height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary);
                font-size: 13px;
                user-select: none;
            }
            .slider-thumb {
                position: absolute;
                left: 4px; top: 4px;
                width: 38px; height: 38px;
                background: var(--accent-gradient);
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
                z-index: 2;
                transition: background 0.3s ease;
            }
            .slider-thumb:active { cursor: grabbing; }
            .slider-target {
                position: absolute;
                right: 8px; top: 4px;
                width: 38px; height: 38px;
                background: rgba(76, 201, 240, 0.15);
                border: 2px dashed #4cc9f0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #4cc9f0;
                font-size: 16px;
            }
            .slider-success {
                position: absolute;
                left: 0; top: 0;
                width: 0; height: 100%;
                background: rgba(76, 201, 240, 0.2);
                transition: width 0.1s ease;
                border-radius: 23px;
            }
            .slider-hint { text-align: center; color: var(--text-secondary); font-size: 12px; margin-top: 4px; }

            /* 点选验证 */
            .click-verify {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 15px 0;
            }
            .click-item {
                aspect-ratio: 1;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                font-size: 24px;
            }
            .click-item:hover { background: rgba(76, 201, 240, 0.1); border-color: #4cc9f0; }
            .click-item.selected { background: rgba(76, 201, 240, 0.3); border-color: #4cc9f0; box-shadow: 0 0 10px rgba(76, 201, 240, 0.5); }
            .click-item.correct { background: rgba(72, 187, 120, 0.3); border-color: #48bb78; }
            .click-item.wrong { background: rgba(245, 101, 101, 0.3); border-color: #f56565; }
            .click-hint { text-align: center; color: var(--text-secondary); font-size: 13px; margin-top: 4px; }

            /* 进度条验证 */
            .progress-bar-container {
                width: 100%;
                height: 20px;
                background: var(--bg-secondary);
                border-radius: 10px;
                overflow: hidden;
                margin: 0 0 20px;
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
            .progress-status { font-size: 14px; color: var(--text-secondary); text-align: center; margin: 0 0 5px; }
            .progress-error {
                display: none;
                color: #f72585;
                text-align: center;
                font-size: 13px;
                margin-top: 15px;
                font-weight: 600;
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
            .progress-retry-btn:hover { box-shadow: 0 0 12px rgba(247, 37, 133, 0.5); }
            .adaptive-progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 10px 0 15px;
                font-size: 12px;
                color: var(--text-secondary);
            }
            .adaptive-progress-speed { color: #4cc9f0; font-weight: 600; }
            .adaptive-progress-failure { color: #f72585; font-weight: 600; }

            /* 复制成功提示 */
            .copy-success {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                color: var(--accent-color);
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
                80% { opacity: 1; }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }

            .update-link-wrap { text-align: center; padding-top: 12px; border-top: 1px dashed rgba(76, 201, 240, 0.2); margin-top: 10px; }
            .update-link { font-size: 13px; color: #4cc9f0; text-decoration: none; cursor: pointer; }
            .update-link:hover { text-decoration: underline; }

            /* 网络模态框 */
            .net-modal-box { max-width: 320px; padding: 20px; }
            .net-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color);
            }
            .net-modal-title { font-size: 18px; font-weight: bold; color: var(--accent-color); margin: 0; }
            .net-modal-close {
                background: transparent;
                border: 1px solid var(--border-color);
                color: var(--accent-color);
                font-size: 18px;
                cursor: pointer;
                padding: 0 8px;
                border-radius: 4px;
            }
            .net-modal-close:hover { background: rgba(76, 201, 240, 0.1); }
            .net-info-list { list-style: none; padding: 0; margin: 0; }
            .net-info-item { padding: 6px 0; border-bottom: 1px dashed rgba(76, 201, 240, 0.15); font-size: 13px; }
            .net-info-label { color: var(--text-secondary); display: block; font-size: 11px; }
            .net-info-value { color: var(--text-primary); font-weight: 500; }
            .net-info-value.dynamic { color: var(--accent-color); }
            .location-refresh-btn {
                background: rgba(76, 201, 240, 0.2);
                border: 1px solid var(--border-color);
                color: var(--accent-color);
                font-size: 12px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 8px;
                transition: all 0.2s ease;
            }
            .location-refresh-btn:hover { background: rgba(76, 201, 240, 0.3); }

            /* 风险详情模态框 */
            .risk-details {
                background: var(--bg-secondary);
                border-radius: 8px;
                padding: 12px;
                margin: 15px 0;
                border: 1px solid var(--border-color);
            }
            .risk-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dashed rgba(76, 201, 240, 0.1);
            }
            .risk-item:last-child { border-bottom: none; }
            .risk-label { color: var(--text-secondary); font-size: 12px; }
            .risk-value { color: var(--text-primary); font-weight: 500; font-size: 12px; }
            .risk-value.low { color: #4cc9f0; }
            .risk-value.medium { color: #ffd60a; }
            .risk-value.high { color: #f72585; }
            .risk-value.critical { color: #ff0000; }
            .risk-btns { display: flex; gap: 12px; margin-top: 20px; }
            .risk-btn {
                flex: 1;
                padding: 12px 0;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                color: #fff;
                transition: all 0.3s ease;
            }
            .risk-confirm-btn { background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%); box-shadow: 0 0 10px rgba(67, 97, 238, 0.5); }
            .risk-confirm-btn:hover { box-shadow: 0 0 15px rgba(67, 97, 238, 0.7); }
            .risk-ignore-btn { background: linear-gradient(135deg, #ffd60a 0%, #ff9e00 100%); box-shadow: 0 0 10px rgba(255, 214, 10, 0.5); }
            .risk-ignore-btn:hover { box-shadow: 0 0 15px rgba(255, 214, 10, 0.7); }

            /* 管理员模态框 */
            .admin-input {
                width: 100%;
                padding: 12px 0;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                color: var(--text-primary);
                box-sizing: border-box;
                letter-spacing: 2px;
            }
            .admin-input:focus { border-color: #4cc9f0; box-shadow: 0 0 12px rgba(76, 201, 240, 0.5); }
            .admin-error { display: none; color: #f72585; text-align: center; font-size: 13px; margin: 8px 0; font-weight: 600; }
            .admin-btns { display: flex; gap: 12px; margin-top: 12px; }
            .admin-btn {
                flex: 1;
                padding: 11px 0;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                color: #fff;
                transition: all 0.3s ease;
            }
            .admin-confirm-btn { background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%); box-shadow: 0 0 10px rgba(67, 97, 238, 0.5); }
            .admin-confirm-btn:hover { box-shadow: 0 0 15px rgba(67, 97, 238, 0.7); }
            .admin-cancel-btn { background: linear-gradient(135deg, #f72585 0%, #7209b7 100%); box-shadow: 0 0 10px rgba(247, 37, 133, 0.5); }
            .admin-cancel-btn:hover { box-shadow: 0 0 15px rgba(247, 37, 133, 0.7); }
        `);

        // ==================== 配置常量 ====================
        const CONFIG = {
            STORAGE_KEY: 'safeTimerEndTime',
            LOG_STORAGE_KEY: 'safeTimerLogs',
            SESSION_KEY: 'safeTimerSession',
            RISK_HISTORY_KEY: 'safeTimerRiskHistory',
            STATS_KEY: 'safeTimerStats',
            THEME_KEY: 'safeTimerTheme',
            ADMIN_PASSWORD: '190212',
            LOG_MAX_SIZE: 200 * 1024,
            TOTAL_TIME: 15 * 60,
            UPDATE_URL: 'https://github.com/djdwix/2048games/blob/main/3.user.js',
            DESTROY_AFTER_END: 8 * 60,
            PROGRESS_FAILURE_PROBABILITY: 0.25,
            BACKGROUND_CHECK_INTERVAL: 5000,
            LOCAL_DELAY_INTERVAL: 5000,
            DELAY_TEST_TIMEOUT: 5000,
            IP_API_LIST: [
                { url: 'https://api.ipify.org?format=json', parser: (json) => json.ip },
                { url: 'https://ipinfo.io/json', parser: (json) => json.ip },
                { url: 'https://api.myip.com', parser: (json) => json.ip },
                { url: 'https://api64.ipify.org?format=json', parser: (json) => json.ip },
                { url: 'https://ipapi.co/json/', parser: (json) => json.ip }
            ],
            GEO_API_CONFIG: {
                reverseGeocodeList: [
                    (lat, lon) => `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`,
                    (lat, lon) => `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`,
                    (lat, lon) => `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&format=json`
                ],
                ipLocationList: [
                    (ip) => `https://ipinfo.io/${ip}/json`,
                    (ip) => `https://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`,
                    (ip) => `https://api.iplocation.net/?ip=${ip}`
                ]
            },
            RISK_LEVELS: {
                LOW: { threshold: 30, color: '#4cc9f0', name: '低风险' },
                MEDIUM: { threshold: 60, color: '#ffd60a', name: '中风险' },
                HIGH: { threshold: 85, color: '#f72585', name: '高风险' },
                CRITICAL: { threshold: 100, color: '#ff0000', name: '严重风险' }
            },
            VERIFY_TYPES: {
                SIMPLE_CODE: 'simple_code',
                MATH_PROBLEM: 'math_problem',
                SLIDER: 'slider',
                CLICK: 'click',
                PROGRESS: 'progress'
            }
        };

        // ==================== 状态变量 ====================
        let backgroundRunner = null;
        let networkMonitor = null;
        let currentVerificationCode = '';
        let riskIndicator = null;
        let currentRiskScore = 0;
        let riskHistory = [];
        let currentVerifyType = CONFIG.VERIFY_TYPES.SIMPLE_CODE;
        let timerInterval = null;
        let isTimerActive = false;
        let statsPanel = null;
        let themeToggle = null;
        let currentTheme = 'dark';
        let verifyAttempts = 0;
        let totalVerifies = 0;
        let stats = {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            averageRiskScore: 0,
            lastVerifyTime: null,
            verifyHistory: []
        };

        // ==================== 工具函数 ====================
        function log(content, isBackground = false) {
            try {
                const timeStr = new Date().toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }).replace(/\//g, '-');
                const logItem = {
                    time: timeStr,
                    content: content,
                    source: isBackground ? '后台' : '前台',
                    domain: window.location.hostname,
                    riskScore: currentRiskScore,
                    verifyType: currentVerifyType
                };
                let logs = JSON.parse(localStorage.getItem(CONFIG.LOG_STORAGE_KEY) || '[]');
                logs.push(logItem);
                if (logs.length > 200) logs = logs.slice(-200);
                localStorage.setItem(CONFIG.LOG_STORAGE_KEY, JSON.stringify(logs));
                console.log(`[安全计时器][${timeStr}] ${content}`);
            } catch (e) {
                console.log('日志记录失败:', e);
            }
        }

        function loadStats() {
            try {
                const stored = localStorage.getItem(CONFIG.STATS_KEY);
                if (stored) {
                    stats = JSON.parse(stored);
                }
            } catch (e) {}
        }

        function saveStats() {
            try {
                localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(stats));
            } catch (e) {}
        }

        function updateStats(success, riskScore) {
            stats.totalVerifications++;
            if (success) {
                stats.successfulVerifications++;
            } else {
                stats.failedVerifications++;
            }
            stats.averageRiskScore = ((stats.averageRiskScore * (stats.totalVerifications - 1)) + riskScore) / stats.totalVerifications;
            stats.lastVerifyTime = Date.now();
            stats.verifyHistory.push({
                time: Date.now(),
                success: success,
                riskScore: riskScore,
                type: currentVerifyType
            });
            if (stats.verifyHistory.length > 50) {
                stats.verifyHistory = stats.verifyHistory.slice(-50);
            }
            saveStats();
            updateStatsPanel();
        }

        function getVerifyTypeName(type) {
            const names = {
                [CONFIG.VERIFY_TYPES.SIMPLE_CODE]: '验证码',
                [CONFIG.VERIFY_TYPES.MATH_PROBLEM]: '数学题',
                [CONFIG.VERIFY_TYPES.SLIDER]: '滑块',
                [CONFIG.VERIFY_TYPES.CLICK]: '点选',
                [CONFIG.VERIFY_TYPES.PROGRESS]: '进度条'
            };
            return names[type] || '未知';
        }

        function generateDeviceFingerprint() {
            try {
                const components = [
                    navigator.userAgent,
                    `${screen.width}x${screen.height}x${screen.colorDepth}`,
                    new Date().getTimezoneOffset(),
                    navigator.language,
                    navigator.cookieEnabled ? '1' : '0'
                ];
                if (navigator.plugins) components.push(navigator.plugins.length);
                let hash = 0;
                const str = components.join('|');
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(16);
            } catch (e) {
                return 'unknown';
            }
        }

        function calculateRiskScore() {
            let score = 0;
            const factors = [];
            const fingerprint = generateDeviceFingerprint();
            
            // 设备指纹变化检测
            const stored = localStorage.getItem('safeTimerRiskData');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.fingerprint && data.fingerprint !== fingerprint) {
                        score += 25;
                        factors.push({ name: '设备指纹变化', value: '设备变更', score: 25 });
                    }
                } catch (e) {}
            }
            localStorage.setItem('safeTimerRiskData', JSON.stringify({
                fingerprint: fingerprint,
                timestamp: Date.now()
            }));

            // 屏幕尺寸异常
            if (screen.width < 320 || screen.height < 480) {
                score += 15;
                factors.push({ name: '异常屏幕尺寸', value: `${screen.width}x${screen.height}`, score: 15 });
            }
            
            // 非工作时间访问
            const hour = new Date().getHours();
            if (hour < 6 || hour > 23) {
                score += 10;
                factors.push({ name: '非工作时间', value: `${hour}时`, score: 10 });
            }

            // 高频访问检测
            if (riskHistory.length > 0) {
                const recentAccesses = riskHistory.filter(h => 
                    Date.now() - h.timestamp < 5 * 60 * 1000
                ).length;
                if (recentAccesses > 10) {
                    score += 30;
                    factors.push({ name: '高频访问', value: `${recentAccesses}次/5分钟`, score: 30 });
                } else if (recentAccesses > 5) {
                    score += 15;
                    factors.push({ name: '中频访问', value: `${recentAccesses}次/5分钟`, score: 15 });
                }
            }

            // 网络延迟检测
            if (networkMonitor && networkMonitor.localDelay !== '检测中...') {
                const delay = parseInt(networkMonitor.localDelay);
                if (!isNaN(delay)) {
                    if (delay > 1000) {
                        score += 20;
                        factors.push({ name: '高延迟', value: `${delay}ms`, score: 20 });
                    } else if (delay > 500) {
                        score += 10;
                        factors.push({ name: '中延迟', value: `${delay}ms`, score: 10 });
                    }
                }
            }

            // 可疑IP检测
            if (networkMonitor && networkMonitor.userIP !== '查找中...' && networkMonitor.userIP !== '查找失败') {
                const suspiciousIPs = ['1.1.1.1', '8.8.8.8', '0.0.0.0'];
                if (suspiciousIPs.includes(networkMonitor.userIP)) {
                    score += 40;
                    factors.push({ name: '可疑IP', value: networkMonitor.userIP, score: 40 });
                }
            }

            // 浏览器检测
            const browser = networkMonitor ? networkMonitor.getBrowserInfo() : '未知';
            if (browser === '未知' || browser === 'Via' || browser === 'X浏览器') {
                score += 15;
                factors.push({ name: '非常用浏览器', value: browser, score: 15 });
            }

            score = Math.min(100, Math.max(0, score));
            
            // 保存风险历史
            const riskRecord = {
                timestamp: Date.now(),
                score: score,
                factors: factors,
                deviceFingerprint: fingerprint,
                ip: networkMonitor ? networkMonitor.userIP : '未知'
            };
            riskHistory.push(riskRecord);
            if (riskHistory.length > 100) riskHistory = riskHistory.slice(-100);
            try {
                localStorage.setItem(CONFIG.RISK_HISTORY_KEY, JSON.stringify(riskHistory));
            } catch (e) {}

            return { score, factors };
        }

        function determineVerifyType(riskScore) {
            if (riskScore < CONFIG.RISK_LEVELS.LOW.threshold) {
                return Math.random() < 0.6 ? CONFIG.VERIFY_TYPES.SIMPLE_CODE : CONFIG.VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < CONFIG.RISK_LEVELS.MEDIUM.threshold) {
                return CONFIG.VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < CONFIG.RISK_LEVELS.HIGH.threshold) {
                return CONFIG.VERIFY_TYPES.SLIDER;
            } else {
                return CONFIG.VERIFY_TYPES.CLICK;
            }
        }

        function determineProgressParams(riskScore, networkDelay) {
            const baseDuration = 4000;
            const baseFailureProb = 0.25;
            let duration = baseDuration;
            let failureProbability = baseFailureProb;
            let speedLabel = '正常';
            
            if (riskScore > CONFIG.RISK_LEVELS.HIGH.threshold) {
                duration *= 1.8;
                failureProbability *= 1.5;
                speedLabel = '极慢';
            } else if (riskScore > CONFIG.RISK_LEVELS.MEDIUM.threshold) {
                duration *= 1.4;
                failureProbability *= 1.2;
                speedLabel = '较慢';
            } else if (riskScore < CONFIG.RISK_LEVELS.LOW.threshold) {
                duration *= 0.7;
                failureProbability *= 0.8;
                speedLabel = '快速';
            }
            
            if (!isNaN(networkDelay)) {
                if (networkDelay > 1000) {
                    duration *= 1.3;
                    failureProbability *= 0.9;
                } else if (networkDelay < 100) {
                    duration *= 0.9;
                }
            }
            
            duration = Math.max(2000, Math.min(10000, duration));
            failureProbability = Math.max(0.1, Math.min(0.8, failureProbability));
            
            return {
                duration: Math.round(duration),
                failureProbability: Math.round(failureProbability * 100) / 100,
                speedLabel: speedLabel
            };
        }

        // ==================== 语音播报功能 ====================
        function speak(text, lang = 'zh-CN') {
            try {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = lang;
                    utterance.rate = 0.9;
                    utterance.pitch = 1;
                    utterance.volume = 0.7;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                }
            } catch (e) {
                // 语音播报失败静默处理
            }
        }

        // ==================== 主题切换 ====================
        function loadTheme() {
            try {
                const stored = localStorage.getItem(CONFIG.THEME_KEY);
                if (stored) {
                    currentTheme = stored;
                }
            } catch (e) {}
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        function toggleTheme() {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            try {
                localStorage.setItem(CONFIG.THEME_KEY, currentTheme);
            } catch (e) {}
            if (themeToggle) {
                themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
                themeToggle.title = currentTheme === 'dark' ? '切换到亮色主题' : '切换到暗色主题';
            }
            log(`切换主题为: ${currentTheme}`);
        }

        function createThemeToggle() {
            const existing = document.querySelector('.theme-toggle');
            if (existing) existing.remove();
            
            themeToggle = document.createElement('button');
            themeToggle.className = 'theme-toggle';
            themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
            themeToggle.title = currentTheme === 'dark' ? '切换到亮色主题' : '切换到暗色主题';
            themeToggle.addEventListener('click', toggleTheme);
            document.body.appendChild(themeToggle);
        }

        // ==================== 统计面板 ====================
        function createStatsPanel() {
            const existing = document.querySelector('.stats-panel');
            if (existing) existing.remove();
            
            statsPanel = document.createElement('div');
            statsPanel.className = 'stats-panel';
            statsPanel.innerHTML = `
                <div class="stats-title">📊 验证统计</div>
                <div class="stats-item"><span>总验证</span><span class="stats-value" id="stats-total">0</span></div>
                <div class="stats-item"><span>成功</span><span class="stats-value" style="color:#48bb78;" id="stats-success">0</span></div>
                <div class="stats-item"><span>失败</span><span class="stats-value" style="color:#f72585;" id="stats-failed">0</span></div>
                <div class="stats-item"><span>平均风险</span><span class="stats-value" id="stats-risk">0</span></div>
            `;
            statsPanel.addEventListener('click', () => {
                const history = stats.verifyHistory.slice(-10).reverse();
                if (history.length === 0) {
                    alert('暂无验证记录');
                    return;
                }
                const text = history.map(h => 
                    `${new Date(h.time).toLocaleString()} | ${h.success ? '✅' : '❌'} | ${getVerifyTypeName(h.type)} | 风险: ${h.riskScore}`
                ).join('\n');
                alert(`最近10次验证记录:\n\n${text}`);
            });
            document.body.appendChild(statsPanel);
            updateStatsPanel();
        }

        function updateStatsPanel() {
            if (!statsPanel) return;
            const total = statsPanel.querySelector('#stats-total');
            const success = statsPanel.querySelector('#stats-success');
            const failed = statsPanel.querySelector('#stats-failed');
            const risk = statsPanel.querySelector('#stats-risk');
            
            if (total) total.textContent = stats.totalVerifications;
            if (success) success.textContent = stats.successfulVerifications;
            if (failed) failed.textContent = stats.failedVerifications;
            if (risk) risk.textContent = Math.round(stats.averageRiskScore);
            
            if (stats.totalVerifications > 0) {
                statsPanel.style.display = 'block';
            }
        }

        // ==================== 风险指示器 ====================
        function createRiskIndicator() {
            const existing = document.querySelector('.risk-indicator');
            if (existing) existing.remove();
            riskIndicator = document.createElement('div');
            riskIndicator.className = 'risk-indicator';
            riskIndicator.style.display = 'none';
            document.body.appendChild(riskIndicator);
            riskIndicator.addEventListener('click', showRiskDetailsModal);
        }

        function updateRiskIndicator(riskScore, factors) {
            if (!riskIndicator) return;
            let levelClass, levelName;
            if (riskScore < CONFIG.RISK_LEVELS.LOW.threshold) {
                levelClass = 'low';
                levelName = '低风险';
            } else if (riskScore < CONFIG.RISK_LEVELS.MEDIUM.threshold) {
                levelClass = 'medium';
                levelName = '中风险';
            } else if (riskScore < CONFIG.RISK_LEVELS.HIGH.threshold) {
                levelClass = 'high';
                levelName = '高风险';
            } else {
                levelClass = 'critical';
                levelName = '严重风险';
            }
            riskIndicator.className = `risk-indicator ${levelClass}`;
            riskIndicator.textContent = `⚠️ ${levelName} (${riskScore}分)`;
            riskIndicator.title = `点击查看详情\n因素: ${factors.map(f => f.name).join(', ')}`;
            riskIndicator.style.display = 'block';
            log(`风险检测: ${levelName} (${riskScore}分)`);
        }

        function showRiskDetailsModal() {
            const existing = document.querySelector('.risk-modal');
            if (existing) existing.remove();
            
            const modal = document.createElement('div');
            modal.className = 'risk-modal';
            const riskResult = calculateRiskScore();
            let factorsHtml = riskResult.factors.map(f => {
                let levelClass = f.score >= 30 ? 'critical' : f.score >= 20 ? 'high' : f.score >= 10 ? 'medium' : 'low';
                return `<div class="risk-item"><span class="risk-label">${f.name}</span><span class="risk-value ${levelClass}">${f.value} (+${f.score}分)</span></div>`;
            }).join('');
            
            modal.innerHTML = `
                <div class="risk-modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">⚠️</div>
                        <h2 class="modal-title">风险分析</h2>
                    </div>
                    <p class="modal-desc">当前验证已根据风险等级调整</p>
                    <div class="risk-details">
                        <div class="risk-item">
                            <span class="risk-label">总风险分</span>
                            <span class="risk-value ${currentRiskScore >= 85 ? 'critical' : currentRiskScore >= 60 ? 'high' : currentRiskScore >= 30 ? 'medium' : 'low'}">
                                ${currentRiskScore}分
                            </span>
                        </div>
                        <div class="risk-item">
                            <span class="risk-label">验证类型</span>
                            <span class="risk-value">${getVerifyTypeName(currentVerifyType)}</span>
                        </div>
                        ${factorsHtml}
                    </div>
                    <div class="risk-btns">
                        <button class="risk-btn risk-confirm-btn" id="risk-confirm">确定</button>
                        <button class="risk-btn risk-ignore-btn" id="risk-ignore">忽略 (-20分)</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);
            
            modal.querySelector('#risk-confirm').addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 400);
            });
            modal.querySelector('#risk-ignore').addEventListener('click', () => {
                currentRiskScore = Math.max(0, currentRiskScore - 20);
                const result = calculateRiskScore();
                updateRiskIndicator(currentRiskScore, result.factors);
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 400);
                log('忽略风险，分数-20');
            });
        }

        // ==================== 验证码生成 ====================
        function generateVerificationCode() {
            switch (currentVerifyType) {
                case CONFIG.VERIFY_TYPES.MATH_PROBLEM:
                    return generateMathProblem();
                case CONFIG.VERIFY_TYPES.SIMPLE_CODE:
                    return generateSimpleCode();
                case CONFIG.VERIFY_TYPES.SLIDER:
                    return { type: CONFIG.VERIFY_TYPES.SLIDER, display: 'slider' };
                case CONFIG.VERIFY_TYPES.CLICK:
                    return { type: CONFIG.VERIFY_TYPES.CLICK, display: 'click' };
                default:
                    return generateSimpleCode();
            }
        }

        function generateSimpleCode() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let code = '';
            const length = currentRiskScore > CONFIG.RISK_LEVELS.MEDIUM.threshold ? 8 : 6;
            for (let i = 0; i < length; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            currentVerificationCode = code;
            return { type: CONFIG.VERIFY_TYPES.SIMPLE_CODE, display: code };
        }

        function generateMathProblem() {
            const operators = ['+', '-', '*'];
            const num1 = Math.floor(Math.random() * 20) + 1;
            const num2 = Math.floor(Math.random() * 20) + 1;
            const op = operators[Math.floor(Math.random() * operators.length)];
            let result;
            switch (op) {
                case '+': result = num1 + num2; break;
                case '-': result = num1 - num2; break;
                case '*': result = num1 * num2; break;
            }
            currentVerificationCode = result.toString();
            return { type: CONFIG.VERIFY_TYPES.MATH_PROBLEM, display: `${num1} ${op} ${num2} = ?` };
        }

        // ==================== 滑块验证 ====================
        function createSliderVerify() {
            const container = document.createElement('div');
            container.innerHTML = `
                <div class="slider-verify">
                    <div class="slider-track">👉 滑动到右侧完成验证</div>
                    <div class="slider-success"></div>
                    <div class="slider-thumb">→</div>
                    <div class="slider-target">✓</div>
                </div>
                <div class="slider-hint">拖动滑块到右侧 ✓ 位置</div>
            `;
            const slider = container.querySelector('.slider-verify');
            const thumb = slider.querySelector('.slider-thumb');
            const target = slider.querySelector('.slider-target');
            const successBar = slider.querySelector('.slider-success');
            const track = slider.querySelector('.slider-track');

            let isDragging = false;
            let startX = 0;
            let thumbX = 4;
            const containerWidth = slider.offsetWidth || 300;
            const maxX = containerWidth - 42 - 4;
            const targetX = containerWidth - 42 - 8;

            thumb.style.left = thumbX + 'px';

            function onStart(e) {
                isDragging = true;
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                startX = clientX - thumbX;
                e.preventDefault();
            }

            function onMove(e) {
                if (!isDragging) return;
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                let newX = clientX - startX;
                newX = Math.max(4, Math.min(maxX, newX));
                thumb.style.left = newX + 'px';
                successBar.style.width = newX + 'px';

                if (newX >= targetX - 15) {
                    thumb.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    track.textContent = '✅ 验证成功';
                    track.style.color = '#48bb78';
                } else {
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '👉 滑动到右侧完成验证';
                    track.style.color = '#94a3b8';
                }
                e.preventDefault();
            }

            function onEnd() {
                if (!isDragging) return;
                isDragging = false;
                const finalX = parseInt(thumb.style.left);
                if (finalX >= targetX - 15) {
                    currentVerificationCode = 'SLIDER_SUCCESS';
                    speak('滑块验证成功');
                    const confirmBtn = document.querySelector('#confirm-verify');
                    if (confirmBtn) setTimeout(() => confirmBtn.click(), 300);
                } else {
                    thumb.style.transition = 'left 0.3s ease';
                    thumb.style.left = '4px';
                    successBar.style.width = '0px';
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '👉 滑动到右侧完成验证';
                    track.style.color = '#94a3b8';
                    setTimeout(() => { thumb.style.transition = ''; }, 300);
                }
            }

            thumb.addEventListener('mousedown', onStart);
            thumb.addEventListener('touchstart', onStart);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchend', onEnd);

            return container;
        }

        // ==================== 点选验证 ====================
        function createClickVerify() {
            const container = document.createElement('div');
            const grid = document.createElement('div');
            grid.className = 'click-verify';

            const total = 9;
            const correctCount = 3;
            const correctPositions = [];
            while (correctPositions.length < correctCount) {
                const pos = Math.floor(Math.random() * total);
                if (!correctPositions.includes(pos)) correctPositions.push(pos);
            }

            const prompts = ['汽车', '房子', '树', '猫', '狗', '花', '太阳', '星星', '月亮'];
            const targetPrompt = prompts[Math.floor(Math.random() * prompts.length)];
            const icons = ['🚗', '🏠', '🌳', '🐱', '🐶', '🌸', '☀️', '⭐', '🌙'];
            const iconMap = { '汽车': '🚗', '房子': '🏠', '树': '🌳', '猫': '🐱', '狗': '🐶', '花': '🌸', '太阳': '☀️', '星星': '⭐', '月亮': '🌙' };

            for (let i = 0; i < total; i++) {
                const item = document.createElement('div');
                item.className = 'click-item';
                const isCorrect = correctPositions.includes(i);
                item.textContent = isCorrect ? iconMap[targetPrompt] || '❓' : icons[i];
                item.dataset.correct = isCorrect ? 'true' : 'false';

                item.addEventListener('click', function() {
                    if (this.classList.contains('selected')) {
                        this.classList.remove('selected');
                        if (this.dataset.correct === 'true') this.classList.remove('correct');
                        else this.classList.remove('wrong');
                    } else {
                        this.classList.add('selected');
                        if (this.dataset.correct === 'true') this.classList.add('correct');
                        else this.classList.add('wrong');
                    }
                    const selected = grid.querySelectorAll('.click-item.selected');
                    const correctSelected = Array.from(selected).filter(el => el.dataset.correct === 'true').length;
                    const wrongSelected = selected.length - correctSelected;
                    if (correctSelected === correctCount && wrongSelected === 0) {
                        currentVerificationCode = 'CLICK_SUCCESS';
                        speak('点选验证成功');
                        const confirmBtn = document.querySelector('#confirm-verify');
                        if (confirmBtn) setTimeout(() => confirmBtn.click(), 300);
                    }
                });
                grid.appendChild(item);
            }

            const hint = document.createElement('div');
            hint.className = 'click-hint';
            hint.textContent = `👆 点击所有 "${targetPrompt}"`;

            container.appendChild(grid);
            container.appendChild(hint);
            return container;
        }

        // ==================== 管理员验证 ====================
        function showCopySuccess() {
            const tip = document.createElement('div');
            tip.className = 'copy-success';
            tip.textContent = '✅ 验证码已复制';
            document.body.appendChild(tip);
            setTimeout(() => { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 1500);
        }

        function showAdminModal(code) {
            const existing = document.querySelector('.admin-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.className = 'admin-modal';
            modal.innerHTML = `
                <div class="admin-modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔑</div>
                        <h2 class="modal-title">管理员验证</h2>
                    </div>
                    <p class="modal-desc">输入管理员密码复制验证码</p>
                    <input type="password" class="admin-input" id="admin-password" placeholder="6位密码" maxlength="6" inputmode="numeric">
                    <div class="admin-error" id="admin-error">❌ 密码错误</div>
                    <div class="admin-btns">
                        <button class="admin-btn admin-confirm-btn" id="admin-confirm">确认</button>
                        <button class="admin-btn admin-cancel-btn" id="admin-cancel">取消</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);

            const input = modal.querySelector('#admin-password');
            const error = modal.querySelector('#admin-error');
            const confirm = modal.querySelector('#admin-confirm');
            const cancel = modal.querySelector('#admin-cancel');

            function handleConfirm() {
                if (input.value.trim() === CONFIG.ADMIN_PASSWORD) {
                    navigator.clipboard.writeText(code).then(() => {
                        showCopySuccess();
                        speak('验证码已复制');
                        modal.classList.remove('active');
                        setTimeout(() => modal.remove(), 400);
                        log('管理员验证成功，验证码已复制');
                    }).catch(() => {
                        error.textContent = '⚠️ 复制失败，请手动复制';
                        error.style.display = 'block';
                    });
                } else {
                    error.style.display = 'block';
                    input.value = '';
                    log('管理员密码错误');
                }
            }

            confirm.addEventListener('click', handleConfirm);
            cancel.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 400);
            });
            input.addEventListener('input', () => {
                error.style.display = 'none';
                input.value = input.value.replace(/[^0-9]/g, '');
            });
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConfirm(); });
            setTimeout(() => input.focus(), 100);
        }

        // ==================== 验证主流程 ====================
        function showVerifyModal() {
            const existing = document.querySelector('.verify-modal');
            if (existing) existing.remove();

            const riskResult = calculateRiskScore();
            currentRiskScore = riskResult.score;
            currentVerifyType = determineVerifyType(currentRiskScore);
            updateRiskIndicator(currentRiskScore, riskResult.factors);
            log(`验证类型: ${getVerifyTypeName(currentVerifyType)}`);

            const verifyContent = generateVerificationCode();
            const isCodeType = verifyContent.type === CONFIG.VERIFY_TYPES.SIMPLE_CODE || 
                              verifyContent.type === CONFIG.VERIFY_TYPES.MATH_PROBLEM;

            const modal = document.createElement('div');
            modal.className = 'verify-modal';
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔒</div>
                        <h2 class="modal-title">安全验证</h2>
                    </div>
                    <p class="modal-desc">${isCodeType ? '请输入下方验证码' : verifyContent.type === CONFIG.VERIFY_TYPES.SLIDER ? '拖动滑块完成验证' : '点击所有指定图标'}</p>
                    ${isCodeType ? `<div class="verify-code" id="verify-code">${verifyContent.display}</div>` : ''}
                    ${isCodeType ? `<div id="interactive-container"></div>` : ''}
                    ${isCodeType ? `
                        <div style="margin: 12px 0 5px;">
                            <input type="text" class="verify-input" id="verify-input" placeholder="${verifyContent.type === CONFIG.VERIFY_TYPES.MATH_PROBLEM ? '输入计算结果' : '输入验证码'}" maxlength="10" autocomplete="off">
                            <div class="verify-error" id="verify-error">❌ 验证失败，请重试</div>
                        </div>
                    ` : ''}
                    <div id="interactive-container-full"></div>
                    <div class="modal-btns">
                        <button class="modal-btn confirm-btn" id="confirm-verify">✅ 确认</button>
                        <button class="modal-btn cancel-btn" id="cancel-verify">❌ 取消</button>
                    </div>
                    <div class="update-link-wrap">
                        <a class="update-link" id="update-link" href="${CONFIG.UPDATE_URL}" target="_blank">🔄 更新脚本</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);

            // 验证码点击复制
            const codeEl = modal.querySelector('#verify-code');
            if (codeEl) {
                let clickCount = 0;
                codeEl.addEventListener('click', () => {
                    clickCount++;
                    if (clickCount >= 2) {
                        clickCount = 0;
                        showAdminModal(currentVerificationCode);
                    }
                    setTimeout(() => { clickCount = 0; }, 500);
                });
                codeEl.title = '双击使用管理员密码复制';
            }

            // 交互式验证
            const container = modal.querySelector('#interactive-container-full');
            if (!isCodeType) {
                if (verifyContent.type === CONFIG.VERIFY_TYPES.SLIDER) {
                    container.appendChild(createSliderVerify());
                } else if (verifyContent.type === CONFIG.VERIFY_TYPES.CLICK) {
                    container.appendChild(createClickVerify());
                }
            }

            const input = modal.querySelector('#verify-input');
            const error = modal.querySelector('#verify-error');
            const confirmBtn = modal.querySelector('#confirm-verify');
            const cancelBtn = modal.querySelector('#cancel-verify');

            function handleConfirm() {
                let isValid = false;
                if (isCodeType) {
                    const val = input ? input.value.trim() : '';
                    isValid = val === currentVerificationCode;
                } else {
                    isValid = currentVerificationCode === 'SLIDER_SUCCESS' || 
                             currentVerificationCode === 'CLICK_SUCCESS';
                }

                if (isValid) {
                    updateStats(true, currentRiskScore);
                    speak('验证成功');
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.remove();
                        showProgressVerify();
                    }, 400);
                    log('验证成功，进入进度条');
                } else {
                    verifyAttempts++;
                    if (error) error.style.display = 'block';
                    if (input) input.value = '';
                    currentRiskScore = Math.min(100, currentRiskScore + 5);
                    const result = calculateRiskScore();
                    updateRiskIndicator(currentRiskScore, result.factors);
                    updateStats(false, currentRiskScore);
                    log(`验证失败 (尝试${verifyAttempts}次)`);
                    
                    if (verifyAttempts >= 3) {
                        speak('验证失败次数过多');
                        error.textContent = '⚠️ 多次失败，请刷新重试';
                    }
                }
            }

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    showVerifyModal();
                }, 400);
                log('验证取消');
            });

            if (input) {
                input.addEventListener('input', () => { if (error) error.style.display = 'none'; });
                input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConfirm(); });
                setTimeout(() => input.focus(), 200);
            }
        }

        // ==================== 进度条验证 ====================
        function showProgressVerify() {
            const existing = document.querySelector('.progress-verify-modal');
            if (existing) existing.remove();

            let networkDelay = 0;
            if (networkMonitor && networkMonitor.localDelay !== '检测中...') {
                const match = networkMonitor.localDelay.match(/(\d+)ms/);
                if (match) networkDelay = parseInt(match[1]);
            }

            const params = determineProgressParams(currentRiskScore, networkDelay);
            
            const modal = document.createElement('div');
            modal.className = 'progress-verify-modal';
            modal.innerHTML = `
                <div class="progress-modal-box">
                    <h2 class="modal-title" style="text-align:center;">⏳ 安全验证</h2>
                    <p class="modal-desc">请等待进度条完成</p>
                    <div class="adaptive-progress-info">
                        <span>速度: <span class="adaptive-progress-speed">${params.speedLabel}</span></span>
                        <span>失败率: <span class="adaptive-progress-failure">${Math.round(params.failureProbability * 100)}%</span></span>
                    </div>
                    <div class="progress-status" id="progress-status">0%</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="progress-bar"></div>
                    </div>
                    <div class="progress-error" id="progress-error">❌ 验证失败，请重试</div>
                    <button class="progress-retry-btn" id="progress-retry-btn" style="display:none;">🔄 重新验证</button>
                    <div class="update-link-wrap">
                        <a class="update-link" href="${CONFIG.UPDATE_URL}" target="_blank">🔄 更新脚本</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);

            const bar = modal.querySelector('#progress-bar');
            const status = modal.querySelector('#progress-status');
            const error = modal.querySelector('#progress-error');
            const retryBtn = modal.querySelector('#progress-retry-btn');

            let progress = 0;
            const target = 100;
            const duration = params.duration;
            const intervalTime = 50;
            const increment = target / (duration / intervalTime);

            const interval = setInterval(() => {
                progress += increment;
                if (progress >= target) {
                    progress = target;
                    clearInterval(interval);
                    bar.style.width = progress + '%';
                    status.textContent = Math.round(progress) + '%';

                    setTimeout(() => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            modal.remove();
                            startTimer();
                        }, 400);
                        log('进度条验证成功');
                    }, 500);
                } else {
                    bar.style.width = progress + '%';
                    status.textContent = Math.round(progress) + '%';
                }
            }, intervalTime);

            // 随机失败
            if (Math.random() < params.failureProbability) {
                const failTime = 1000 + Math.random() * (duration - 2000);
                setTimeout(() => {
                    clearInterval(interval);
                    bar.style.width = progress + '%';
                    error.style.display = 'block';
                    retryBtn.style.display = 'block';
                    speak('验证失败，请重试');
                    log('进度条验证失败');

                    retryBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            modal.remove();
                            showProgressVerify();
                        }, 400);
                    });
                }, failTime);
            }
        }

        // ==================== 计时器 ====================
        function startTimer() {
            isTimerActive = true;
            const endTime = Date.now() + CONFIG.TOTAL_TIME * 1000;
            GM_setValue(CONFIG.STORAGE_KEY, endTime.toString());
            GM_setValue(CONFIG.SESSION_KEY, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                domain: window.location.hostname,
                riskScore: currentRiskScore,
                verifyType: currentVerifyType
            }));
            log(`计时开始，${CONFIG.TOTAL_TIME}秒`);
            speak(`验证成功，计时${Math.floor(CONFIG.TOTAL_TIME / 60)}分钟`);
            initTimer();
        }

        function initTimer() {
            const storedEndTime = GM_getValue(CONFIG.STORAGE_KEY, null);
            if (!storedEndTime) {
                checkSessionStatus();
                return;
            }

            const endTime = parseInt(storedEndTime);
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

            if (remaining <= 0) {
                GM_deleteValue(CONFIG.STORAGE_KEY);
                GM_deleteValue(CONFIG.SESSION_KEY);
                isTimerActive = false;
                checkSessionStatus();
                return;
            }

            updateTimerDisplay(remaining);
        }

        function updateTimerDisplay(remainingSeconds) {
            let timerEl = document.querySelector('.safe-timer');
            if (!timerEl) {
                timerEl = document.createElement('div');
                timerEl.className = 'safe-timer';
                timerEl.innerHTML = `<span class="timer-icon">⏱</span><span class="timer-text" id="timer-text">00:00</span>`;
                document.body.appendChild(timerEl);

                timerEl.addEventListener('click', exportLogs);
                timerEl.title = '点击导出日志';
            }

            const textEl = timerEl.querySelector('.timer-text') || timerEl;
            const mins = Math.floor(remainingSeconds / 60);
            const secs = remainingSeconds % 60;
            textEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (remainingSeconds <= 60) {
                timerEl.className = 'safe-timer danger';
                if (remainingSeconds <= 10) {
                    speak(`剩余${remainingSeconds}秒`);
                }
            } else if (remainingSeconds <= 300) {
                timerEl.className = 'safe-timer warning';
            } else {
                timerEl.className = 'safe-timer';
            }

            if (timerInterval) clearTimeout(timerInterval);

            if (remainingSeconds > 0 && isTimerActive) {
                timerInterval = setTimeout(() => {
                    const storedEndTime = GM_getValue(CONFIG.STORAGE_KEY, null);
                    if (!storedEndTime) {
                        checkSessionStatus();
                        return;
                    }
                    const endTime = parseInt(storedEndTime);
                    const newRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                    if (newRemaining <= 0) {
                        GM_deleteValue(CONFIG.STORAGE_KEY);
                        GM_deleteValue(CONFIG.SESSION_KEY);
                        isTimerActive = false;
                        const el = document.querySelector('.safe-timer');
                        if (el) el.remove();
                        speak('计时结束');
                        checkSessionStatus();
                    } else {
                        updateTimerDisplay(newRemaining);
                    }
                }, 1000);
            }
        }

        function exportLogs() {
            try {
                const logs = JSON.parse(localStorage.getItem(CONFIG.LOG_STORAGE_KEY) || '[]');
                const text = logs.map(l => `[${l.time}] ${l.content}`).join('\n');
                const blob = new Blob([text || '暂无日志'], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const now = new Date();
                const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
                a.href = url;
                a.download = `安全计时器日志_${ts}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                log(`日志已导出 (${logs.length}条)`);
                speak('日志已导出');
            } catch (e) {
                console.error('导出日志失败:', e);
            }
        }

        function checkSessionStatus() {
            const sessionData = GM_getValue(CONFIG.SESSION_KEY, null);
            const storedEndTime = GM_getValue(CONFIG.STORAGE_KEY, null);

            if (sessionData && storedEndTime) {
                try {
                    const session = JSON.parse(sessionData);
                    const endTime = parseInt(storedEndTime);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
                    if (remaining > 0 && session.verified) {
                        log(`恢复会话，剩余${remaining}秒`);
                        isTimerActive = true;
                        initTimer();
                        return;
                    }
                } catch (e) {}
            }

            GM_deleteValue(CONFIG.STORAGE_KEY);
            GM_deleteValue(CONFIG.SESSION_KEY);
            isTimerActive = false;
            showVerifyModal();
        }

        // ==================== 后台运行 ====================
        class BackgroundRunner {
            constructor() {
                this.timer = null;
                this.isForeground = document.visibilityState === 'visible';
                this.init();
                this.bindVisibility();
                log('后台运行模块初始化', true);
            }

            init() {
                this.timer = setInterval(() => {
                    try {
                        const storedEndTime = GM_getValue(CONFIG.STORAGE_KEY, null);
                        if (!storedEndTime) return;

                        const endTime = parseInt(storedEndTime);
                        const now = Date.now();
                        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

                        if (remaining <= 0 || now >= endTime + CONFIG.DESTROY_AFTER_END * 1000) {
                            GM_deleteValue(CONFIG.STORAGE_KEY);
                            GM_deleteValue(CONFIG.SESSION_KEY);
                            log('后台缓存超时销毁', true);
                            if (this.isForeground) setTimeout(checkSessionStatus, 100);
                        }
                    } catch (e) {
                        console.error('后台同步错误:', e);
                    }
                }, CONFIG.BACKGROUND_CHECK_INTERVAL);
            }

            bindVisibility() {
                document.addEventListener('visibilitychange', () => {
                    this.isForeground = document.visibilityState === 'visible';
                    if (this.isForeground) {
                        setTimeout(initTimer, 100);
                    }
                });
            }

            destroy() {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
            }
        }

        // ==================== 网络监测 ====================
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
                this.initUI();
                this.bindEvents();
                this.startDelayDetect();
                setTimeout(() => {
                    this.fetchIP();
                    this.fetchLocation();
                }, 1000);
                log('网络监测模块初始化');
            }

            initUI() {
                const oldStatus = document.querySelector('.net-status');
                if (oldStatus) oldStatus.remove();
                const oldModal = document.querySelector('.net-modal');
                if (oldModal) oldModal.remove();

                this.statusEl = document.createElement('div');
                this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
                this.statusEl.textContent = this.isOnline ? '🌐 在线' : '📴 离线';
                document.body.appendChild(this.statusEl);

                this.modalEl = document.createElement('div');
                this.modalEl.className = 'net-modal';
                this.modalEl.innerHTML = `
                    <div class="net-modal-box">
                        <div class="net-modal-header">
                            <h3 class="net-modal-title">🌐 网络状态</h3>
                            <button class="net-modal-close">×</button>
                        </div>
                        <ul class="net-info-list">
                            <li class="net-info-item"><span class="net-info-label">状态</span><span class="net-info-value" id="net-status-val">${this.isOnline ? '在线' : '离线'}</span></li>
                            <li class="net-info-item"><span class="net-info-label">延迟</span><span class="net-info-value dynamic" id="net-delay">${this.localDelay}</span></li>
                            <li class="net-info-item"><span class="net-info-label">IP</span><span class="net-info-value dynamic" id="net-ip">${this.userIP}</span></li>
                            <li class="net-info-item"><span class="net-info-label">定位</span><span class="net-info-value dynamic" id="net-location">${this.locationInfo}</span></li>
                            <li class="net-info-item"><span class="net-info-label">地区</span><span class="net-info-value dynamic" id="net-area">${this.currentArea}</span></li>
                            <li class="net-info-item"><span class="net-info-label">网络类型</span><span class="net-info-value" id="net-type">${this.getNetworkType()}</span></li>
                            <li class="net-info-item"><span class="net-info-label">浏览器</span><span class="net-info-value" id="net-browser">${this.getBrowserInfo()}</span></li>
                        </ul>
                    </div>
                `;
                document.body.appendChild(this.modalEl);

                // 添加刷新按钮
                const locationItem = this.modalEl.querySelector('#net-location').closest('.net-info-item');
                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'location-refresh-btn';
                refreshBtn.textContent = '🔄';
                refreshBtn.title = '重新获取定位';
                locationItem.querySelector('.net-info-value').appendChild(refreshBtn);
                refreshBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.refreshLocation();
                });

                this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
                    this.modalEl.classList.remove('active');
                });
                this.statusEl.addEventListener('click', () => {
                    this.modalEl.classList.toggle('active');
                });
            }

            bindEvents() {
                window.addEventListener('online', () => this.updateStatus(true));
                window.addEventListener('offline', () => this.updateStatus(false));
                if (navigator.connection) {
                    navigator.connection.addEventListener('change', () => {
                        this.modalEl.querySelector('#net-type').textContent = this.getNetworkType();
                    });
                }
            }

            updateStatus(online) {
                this.isOnline = online;
                this.statusEl.className = `net-status ${online ? 'online' : 'offline'}`;
                this.statusEl.textContent = online ? '🌐 在线' : '📴 离线';
                this.modalEl.querySelector('#net-status-val').textContent = online ? '在线' : '离线';
                if (online) {
                    this.startDelayDetect();
                    this.fetchIP();
                    this.fetchLocation();
                } else {
                    this.stopDelayDetect();
                    this.localDelay = '离线';
                    this.modalEl.querySelector('#net-delay').textContent = '离线';
                }
                log(`网络: ${online ? '在线' : '离线'}`);
            }

            refreshLocation() {
                log('手动刷新定位');
                this.locationInfo = '刷新中...';
                this.currentArea = '刷新中...';
                this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                this.modalEl.querySelector('#net-area').textContent = this.currentArea;
                localStorage.removeItem(this.GEO_STORAGE_KEY);
                if (this.locationTimeout) clearTimeout(this.locationTimeout);
                this.fetchLocation();
                this.fetchIP();
            }

            startDelayDetect() {
                this.stopDelayDetect();
                this.calculateDelay();
                this.delayTimer = setInterval(() => this.calculateDelay(), CONFIG.LOCAL_DELAY_INTERVAL);
            }

            stopDelayDetect() {
                if (this.delayTimer) {
                    clearInterval(this.delayTimer);
                    this.delayTimer = null;
                }
            }

            calculateDelay() {
                if (!this.isOnline) return;
                const start = performance.now();
                const url = window.location.origin + '/?t=' + Date.now();
                fetch(url, { method: 'HEAD', cache: 'no-store' })
                    .then(() => {
                        const delay = Math.round(performance.now() - start);
                        this.localDelay = delay + 'ms';
                        this.modalEl.querySelector('#net-delay').textContent = this.localDelay;
                    })
                    .catch(() => {
                        this.localDelay = '超时';
                        this.modalEl.querySelector('#net-delay').textContent = this.localDelay;
                    });
            }

            fetchIP() {
                if (!this.isOnline) return;
                const apis = CONFIG.IP_API_LIST;
                let index = 0;

                const tryNext = () => {
                    if (index >= apis.length) {
                        this.userIP = '获取失败';
                        this.modalEl.querySelector('#net-ip').textContent = this.userIP;
                        return;
                    }
                    fetch(apis[index].url, { cache: 'no-store' })
                        .then(r => r.json())
                        .then(data => {
                            const ip = apis[index].parser(data);
                            if (ip) {
                                this.userIP = ip;
                                this.modalEl.querySelector('#net-ip').textContent = ip;
                                this.fetchIPLocation(ip);
                                return;
                            }
                            throw new Error('No IP');
                        })
                        .catch(() => { index++; tryNext(); });
                };
                tryNext();
            }

            fetchIPLocation(ip) {
                if (!ip || ip === '获取失败') return;
                fetch(`https://ip-api.com/json/${ip}?fields=country,regionName,city`, { cache: 'no-store' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.city || data.regionName) {
                            this.currentArea = `${data.regionName || ''} ${data.city || ''}`.trim() || '未知';
                            this.modalEl.querySelector('#net-area').textContent = this.currentArea;
                        }
                    })
                    .catch(() => {});
            }

            fetchLocation() {
                if (!this.isOnline) return;

                const cached = localStorage.getItem(this.GEO_STORAGE_KEY);
                if (cached) {
                    try {
                        const { lat, lon, area, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                            this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                            this.currentArea = area || this.currentArea;
                            this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                            this.modalEl.querySelector('#net-area').textContent = this.currentArea;
                            log('定位从缓存读取');
                            return;
                        }
                        localStorage.removeItem(this.GEO_STORAGE_KEY);
                    } catch (e) {}
                }

                if (!navigator.geolocation) {
                    this.locationInfo = '不支持定位';
                    this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                    return;
                }

                this.locationTimeout = setTimeout(() => {
                    this.locationInfo = '定位超时';
                    this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                }, 15000);

                navigator.geolocation.getCurrentPosition(
                    pos => {
                        if (this.locationTimeout) clearTimeout(this.locationTimeout);
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                        this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                        log(`定位成功: ${this.locationInfo}`);
                        
                        // 反向地理编码
                        this.reverseGeocode(lat, lon);
                    },
                    err => {
                        if (this.locationTimeout) clearTimeout(this.locationTimeout);
                        const msg = err.code === 1 ? '用户拒绝' : err.code === 2 ? '位置不可用' : '定位失败';
                        this.locationInfo = msg;
                        this.modalEl.querySelector('#net-location').textContent = msg;
                        log(`定位失败: ${msg}`);
                    },
                    { enableHighAccuracy: true, timeout: 12000 }
                );
            }

            reverseGeocode(lat, lon) {
                const urls = CONFIG.GEO_API_CONFIG.reverseGeocodeList;
                let index = 0;

                const tryNext = () => {
                    if (index >= urls.length) {
                        log('反向地理编码失败');
                        return;
                    }
                    fetch(urls[index](lat, lon), { cache: 'no-store' })
                        .then(r => r.json())
                        .then(data => {
                            let area = '';
                            if (data.address) {
                                area = data.address.county || data.address.city || data.address.state || data.address.country;
                            } else if (data.city) {
                                area = data.city;
                            } else if (data.region) {
                                area = data.region;
                            }
                            if (area) {
                                this.currentArea = area;
                                this.modalEl.querySelector('#net-area').textContent = area;
                                log(`地理编码: ${area}`);
                                const geoData = { lat, lon, area, timestamp: Date.now() };
                                localStorage.setItem(this.GEO_STORAGE_KEY, JSON.stringify(geoData));
                                return;
                            }
                            throw new Error('No area');
                        })
                        .catch(() => { index++; tryNext(); });
                };
                tryNext();
            }

            getNetworkType() {
                return navigator.connection?.effectiveType || '未知';
            }

            getBrowserInfo() {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
                if (ua.includes('Edg')) return 'Edge';
                return '其他';
            }

            destroy() {
                this.stopDelayDetect();
                if (this.locationTimeout) clearTimeout(this.locationTimeout);
                if (this.statusEl?.parentNode) this.statusEl.parentNode.removeChild(this.statusEl);
                if (this.modalEl?.parentNode) this.modalEl.parentNode.removeChild(this.modalEl);
            }
        }

        // ==================== 初始化 ====================
        loadTheme();
        loadStats();
        createRiskIndicator();
        createThemeToggle();
        createStatsPanel();
        
        networkMonitor = new NetworkMonitor();
        backgroundRunner = new BackgroundRunner();
        
        // 创建定位刷新按钮
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'location-refresh-btn-standalone';
        refreshBtn.textContent = '📍 刷新定位';
        refreshBtn.title = '重新获取定位';
        refreshBtn.addEventListener('click', () => {
            if (networkMonitor) networkMonitor.refreshLocation();
        });
        document.body.appendChild(refreshBtn);

        log('安全计时器 v6.0 初始化完成');
        
        setTimeout(checkSessionStatus, 500);
    }
})();