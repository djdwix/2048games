// ==UserScript==
// @name         页面安全验证计时器（增强版V5.6）
// @namespace    http://tampermonkey.net/
// @version      5.6
// @description  安全验证计时器 - 智能风险检测与验证
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
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
            .risk-indicator {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
                z-index: 9999;
                user-select: none;
                transition: all 0.3s ease;
                display: none;
                cursor: pointer;
            }
            .risk-indicator.low { color: #4cc9f0; border-color: #4cc9f0; }
            .risk-indicator.medium { color: #ffd60a; border-color: #ffd60a; animation: pulse-warning 2s infinite; }
            .risk-indicator.high { color: #f72585; border-color: #f72585; animation: pulse-danger 1s infinite; }
            .risk-indicator.critical { color: #ff0000; border-color: #ff0000; animation: pulse-critical 0.5s infinite; background: rgba(255,0,0,0.1); }
            @keyframes pulse-warning { 0%,100% { color: #ffd60a; } 50% { color: #ffea80; } }
            @keyframes pulse-danger { 0%,100% { color: #f72585; } 50% { color: #ff6ba9; } }
            @keyframes pulse-critical { 0% { box-shadow: 0 0 5px rgba(255,0,0,0.5); } 50% { box-shadow: 0 0 20px rgba(255,0,0,0.8); } 100% { box-shadow: 0 0 5px rgba(255,0,0,0.5); } }

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
                cursor: pointer;
                transition: color 0.3s ease, box-shadow 0.3s ease;
            }
            .safe-timer:hover { box-shadow: 0 0 12px rgba(76, 201, 240, 0.4); }
            .safe-timer.warning { color: #ffd60a; animation: pulse-warning 1s infinite; }
            .safe-timer.danger { color: #f72585; animation: pulse-danger 0.8s infinite; }

            .net-status {
                position: fixed;
                top: 12px;
                right: 12px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                padding: 8px 15px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
                z-index: 9999;
                user-select: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .net-status.online { color: #4cc9f0; }
            .net-status.offline { color: #f72585; }
            .net-status:active { transform: scale(0.95); }

            .net-modal {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
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
            .net-modal.active { opacity: 1; visibility: visible; }
            .net-modal-box {
                width: 100%;
                max-width: 320px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 0 15px rgba(76, 201, 240, 0.3);
                transform: scale(0.9) translateY(10px);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .net-modal.active .net-modal-box { transform: scale(1) translateY(0); box-shadow: 0 0 20px rgba(76, 201, 240, 0.4); }
            .net-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(76, 201, 240, 0.3);
            }
            .net-modal-title { font-size: 18px; font-weight: bold; color: #4cc9f0; margin: 0; }
            .net-modal-close {
                background: transparent;
                border: 1px solid rgba(76, 201, 240, 0.5);
                color: #4cc9f0;
                font-size: 18px;
                cursor: pointer;
                padding: 0 8px;
                border-radius: 4px;
            }
            .net-modal-close:hover { background: rgba(76, 201, 240, 0.1); }
            .net-info-list { list-style: none; padding: 0; margin: 0; }
            .net-info-item { padding: 6px 0; border-bottom: 1px dashed rgba(76, 201, 240, 0.15); font-size: 13px; }
            .net-info-label { color: #94a3b8; display: block; font-size: 11px; }
            .net-info-value { color: #e0f2fe; font-weight: 500; }
            .net-info-value.dynamic { color: #4cc9f0; }

            .verify-modal {
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
            .verify-modal.active { opacity: 1; visibility: visible; }
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
            .verify-modal.active .modal-box { transform: scale(1) translateY(0); box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15); }
            .modal-header { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; gap: 12px; }
            .modal-icon { font-size: 28px; color: #4cc9f0; text-shadow: 0 0 8px rgba(76, 201, 240, 0.6); }
            .modal-title { font-size: 22px; font-weight: bold; color: #4cc9f0; margin: 0; text-shadow: 0 0 6px rgba(76, 201, 240, 0.5); }
            .modal-desc { font-size: 14px; color: #e0e7ff; text-align: center; margin: 0 0 20px; line-height: 1.6; opacity: 0.9; }
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
                background: #1e293b;
                border: 1px solid rgba(76, 201, 240, 0.5);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                color: #f8fafc;
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
            .modal-btns {
                display: flex;
                gap: 12px;
                margin-top: 15px;
            }
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

            .slider-verify {
                width: 100%;
                height: 46px;
                background: rgba(30, 41, 59, 0.8);
                border-radius: 23px;
                margin: 15px 0;
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(76, 201, 240, 0.3);
            }
            .slider-track {
                position: absolute;
                left: 0; top: 0;
                width: 100%; height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
                font-size: 13px;
                user-select: none;
            }
            .slider-thumb {
                position: absolute;
                left: 4px; top: 4px;
                width: 38px; height: 38px;
                background: linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%);
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
            .slider-thumb:active { cursor: grabbing; background: linear-gradient(135deg, #3a0ca3 0%, #4361ee 100%); }
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
            .slider-hint { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 4px; }

            .click-verify {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 15px 0;
            }
            .click-item {
                aspect-ratio: 1;
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(76, 201, 240, 0.3);
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
            .click-hint { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 4px; }

            .copy-success {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.95);
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
                80% { opacity: 1; }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            }
            .update-link-wrap { text-align: center; padding-top: 12px; border-top: 1px dashed rgba(76, 201, 240, 0.2); margin-top: 10px; }
            .update-link { font-size: 13px; color: #4cc9f0; text-decoration: none; cursor: pointer; }
            .update-link:hover { text-decoration: underline; }

            .admin-modal {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
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
            .admin-modal.active { opacity: 1; visibility: visible; }
            .admin-modal-box {
                width: 100%;
                max-width: 320px;
                background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.7);
                border-radius: 16px;
                padding: 25px 20px;
                box-shadow: 0 0 30px rgba(76, 201, 240, 0.4);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }
            .admin-modal.active .admin-modal-box { transform: scale(1) translateY(0); }
            .admin-modal-header { display: flex; align-items: center; justify-content: center; margin-bottom: 15px; gap: 10px; }
            .admin-modal-title { font-size: 20px; font-weight: bold; color: #4cc9f0; margin: 0; }
            .admin-modal-desc { font-size: 14px; color: #e0e7ff; text-align: center; margin: 0 0 15px; opacity: 0.9; }
            .admin-input {
                width: 100%;
                padding: 12px 0;
                background: #1e293b;
                border: 1px solid rgba(76, 201, 240, 0.6);
                border-radius: 8px;
                font-size: 16px;
                text-align: center;
                outline: none;
                color: #f8fafc;
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

        const STORAGE_KEY = 'safeTimerEndTime';
        const LOG_STORAGE_KEY = 'safeTimerLogs';
        const SESSION_KEY = 'safeTimerSession';
        const ADMIN_PASSWORD = '190212';
        const TOTAL_TIME = 15 * 60;
        const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/3.user.js';
        const DESTROY_AFTER_END = 8 * 60;

        const RISK_LEVELS = {
            LOW: { threshold: 30, color: '#4cc9f0', name: '低风险' },
            MEDIUM: { threshold: 60, color: '#ffd60a', name: '中风险' },
            HIGH: { threshold: 85, color: '#f72585', name: '高风险' },
            CRITICAL: { threshold: 100, color: '#ff0000', name: '严重风险' }
        };

        const VERIFY_TYPES = {
            SIMPLE_CODE: 'simple_code',
            MATH_PROBLEM: 'math_problem',
            SLIDER: 'slider',
            CLICK: 'click'
        };

        let currentVerificationCode = '';
        let riskIndicator = null;
        let currentRiskScore = 0;
        let currentVerifyType = VERIFY_TYPES.SIMPLE_CODE;
        let networkMonitor = null;
        let timerInterval = null;
        let isTimerRunning = false;
        let isVerified = false;

        function log(content) {
            try {
                const timeStr = new Date().toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }).replace(/\//g, '-');
                const logItem = {
                    time: timeStr,
                    content: content,
                    domain: window.location.hostname
                };
                let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
                logs.push(logItem);
                if (logs.length > 200) logs = logs.slice(-200);
                localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
                console.log(`[安全计时器][${timeStr}] ${content}`);
            } catch (e) {
                console.log('日志记录失败:', e);
            }
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
            const fingerprint = generateDeviceFingerprint();
            const stored = localStorage.getItem('safeTimerRiskData');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.fingerprint && data.fingerprint !== fingerprint) {
                        score += 25;
                    }
                } catch (e) {}
            }
            localStorage.setItem('safeTimerRiskData', JSON.stringify({
                fingerprint: fingerprint,
                timestamp: Date.now()
            }));

            if (screen.width < 320 || screen.height < 480) {
                score += 15;
            }
            const hour = new Date().getHours();
            if (hour < 6 || hour > 23) {
                score += 10;
            }
            return Math.min(100, Math.max(0, score));
        }

        function determineVerifyType(riskScore) {
            if (riskScore < RISK_LEVELS.LOW.threshold) {
                return Math.random() < 0.6 ? VERIFY_TYPES.SIMPLE_CODE : VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < RISK_LEVELS.MEDIUM.threshold) {
                return VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < RISK_LEVELS.HIGH.threshold) {
                return VERIFY_TYPES.SLIDER;
            } else {
                return VERIFY_TYPES.CLICK;
            }
        }

        function createRiskIndicator() {
            const existing = document.querySelector('.risk-indicator');
            if (existing) existing.remove();
            riskIndicator = document.createElement('div');
            riskIndicator.className = 'risk-indicator';
            riskIndicator.style.display = 'none';
            document.body.appendChild(riskIndicator);
            riskIndicator.addEventListener('click', showRiskInfo);
        }

        function updateRiskIndicator(riskScore) {
            if (!riskIndicator) return;
            let levelClass, levelName;
            if (riskScore < RISK_LEVELS.LOW.threshold) { levelClass = 'low'; levelName = '低风险'; }
            else if (riskScore < RISK_LEVELS.MEDIUM.threshold) { levelClass = 'medium'; levelName = '中风险'; }
            else if (riskScore < RISK_LEVELS.HIGH.threshold) { levelClass = 'high'; levelName = '高风险'; }
            else { levelClass = 'critical'; levelName = '严重风险'; }
            riskIndicator.className = `risk-indicator ${levelClass}`;
            riskIndicator.textContent = `风险: ${levelName} (${riskScore}分)`;
            riskIndicator.style.display = 'block';
        }

        function showRiskInfo() {
            const level = currentRiskScore < 30 ? '低' : currentRiskScore < 60 ? '中' : currentRiskScore < 85 ? '高' : '严重';
            alert(`当前风险等级: ${level} (${currentRiskScore}分)\n验证类型: ${getVerifyTypeName(currentVerifyType)}`);
        }

        function getVerifyTypeName(type) {
            const names = {
                [VERIFY_TYPES.SIMPLE_CODE]: '验证码',
                [VERIFY_TYPES.MATH_PROBLEM]: '数学题',
                [VERIFY_TYPES.SLIDER]: '滑块',
                [VERIFY_TYPES.CLICK]: '点选'
            };
            return names[type] || '未知';
        }

        function generateVerificationCode() {
            if (currentVerifyType === VERIFY_TYPES.MATH_PROBLEM) {
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
                return { type: VERIFY_TYPES.MATH_PROBLEM, display: `${num1} ${op} ${num2} = ?` };
            } else {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                const len = currentRiskScore > 60 ? 8 : 6;
                for (let i = 0; i < len; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                currentVerificationCode = code;
                return { type: VERIFY_TYPES.SIMPLE_CODE, display: code };
            }
        }

        function createSliderVerify() {
            const container = document.createElement('div');
            container.innerHTML = `
                <div class="slider-verify">
                    <div class="slider-track">滑动到右侧完成验证</div>
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
                    track.textContent = '✓ 验证成功';
                    track.style.color = '#48bb78';
                } else {
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '滑动到右侧完成验证';
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
                    const confirmBtn = document.querySelector('#confirm-verify');
                    if (confirmBtn) setTimeout(() => confirmBtn.click(), 300);
                } else {
                    thumb.style.transition = 'left 0.3s ease';
                    thumb.style.left = '4px';
                    successBar.style.width = '0px';
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '滑动到右侧完成验证';
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

            for (let i = 0; i < total; i++) {
                const item = document.createElement('div');
                item.className = 'click-item';
                const isCorrect = correctPositions.includes(i);
                const iconMap = { '汽车': '🚗', '房子': '🏠', '树': '🌳', '猫': '🐱', '狗': '🐶', '花': '🌸', '太阳': '☀️', '星星': '⭐', '月亮': '🌙' };
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
                        const confirmBtn = document.querySelector('#confirm-verify');
                        if (confirmBtn) setTimeout(() => confirmBtn.click(), 300);
                    }
                });
                grid.appendChild(item);
            }

            const hint = document.createElement('div');
            hint.className = 'click-hint';
            hint.textContent = `请点击所有"${targetPrompt}"`;

            container.appendChild(grid);
            container.appendChild(hint);
            return container;
        }

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
                    <div class="admin-modal-header">
                        <span style="font-size:24px;">🔑</span>
                        <h2 class="admin-modal-title">管理员验证</h2>
                    </div>
                    <p class="admin-modal-desc">输入管理员密码复制验证码</p>
                    <input type="password" class="admin-input" id="admin-password" placeholder="6位密码" maxlength="6" inputmode="numeric">
                    <div class="admin-error" id="admin-error">密码错误</div>
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
                if (input.value.trim() === ADMIN_PASSWORD) {
                    navigator.clipboard.writeText(code).then(() => {
                        showCopySuccess();
                        modal.classList.remove('active');
                        setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 400);
                        log('验证码已复制');
                    }).catch(() => {
                        error.textContent = '复制失败，请手动复制';
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
                setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 400);
            });
            input.addEventListener('input', () => {
                error.style.display = 'none';
                input.value = input.value.replace(/[^0-9]/g, '');
            });
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConfirm(); });
            setTimeout(() => input.focus(), 100);
        }

        function showVerifyModal() {
            const existing = document.querySelector('.verify-modal');
            if (existing) existing.remove();

            currentRiskScore = calculateRiskScore();
            currentVerifyType = determineVerifyType(currentRiskScore);
            updateRiskIndicator(currentRiskScore);
            log(`风险分数: ${currentRiskScore}, 验证类型: ${getVerifyTypeName(currentVerifyType)}`);

            const verifyContent = generateVerificationCode();
            const isCodeType = verifyContent.type === VERIFY_TYPES.SIMPLE_CODE || verifyContent.type === VERIFY_TYPES.MATH_PROBLEM;

            const modal = document.createElement('div');
            modal.className = 'verify-modal';
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔒</div>
                        <h2 class="modal-title">安全验证</h2>
                    </div>
                    <p class="modal-desc">${isCodeType ? '请输入下方验证码' : verifyContent.type === VERIFY_TYPES.SLIDER ? '拖动滑块完成验证' : '点击所有指定图标完成验证'}</p>
                    ${isCodeType ? `<div class="verify-code" id="verify-code">${verifyContent.display}</div>` : ''}
                    ${isCodeType ? `<div id="interactive-container"></div>` : ''}
                    ${isCodeType ? `
                        <div style="margin: 12px 0 5px;">
                            <input type="text" class="verify-input" id="verify-input" placeholder="${verifyContent.type === VERIFY_TYPES.MATH_PROBLEM ? '输入计算结果' : '输入验证码'}" maxlength="10">
                            <div class="verify-error" id="verify-error">验证码错误，请重新输入</div>
                        </div>
                    ` : ''}
                    <div id="interactive-container-full"></div>
                    <div class="modal-btns">
                        <button class="modal-btn confirm-btn" id="confirm-verify">确认</button>
                        <button class="modal-btn cancel-btn" id="cancel-verify">取消</button>
                    </div>
                    <div class="update-link-wrap">
                        <a class="update-link" id="update-link" href="${UPDATE_URL}" target="_blank">遇到问题？更新脚本</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('active'), 10);

            const codeEl = modal.querySelector('#verify-code');
            if (codeEl) {
                codeEl.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    showAdminModal(currentVerificationCode);
                });
                codeEl.addEventListener('click', function(e) {
                    if (this.dataset.clickCount) {
                        this.dataset.clickCount = parseInt(this.dataset.clickCount) + 1;
                    } else {
                        this.dataset.clickCount = 1;
                    }
                    if (this.dataset.clickCount >= 2) {
                        this.dataset.clickCount = 0;
                        showAdminModal(currentVerificationCode);
                    }
                    setTimeout(() => { if (this.dataset.clickCount) this.dataset.clickCount = 0; }, 500);
                });
            }

            const container = modal.querySelector('#interactive-container-full');
            if (!isCodeType) {
                if (verifyContent.type === VERIFY_TYPES.SLIDER) {
                    container.appendChild(createSliderVerify());
                } else if (verifyContent.type === VERIFY_TYPES.CLICK) {
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
                    isValid = currentVerificationCode === 'SLIDER_SUCCESS' || currentVerificationCode === 'CLICK_SUCCESS';
                }

                if (isValid) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                        startTimer();
                    }, 400);
                    log('验证成功，开始计时');
                } else {
                    if (error) error.style.display = 'block';
                    if (input) input.value = '';
                    currentRiskScore = Math.min(100, currentRiskScore + 5);
                    updateRiskIndicator(currentRiskScore);
                    log('验证失败');
                }
            }

            confirmBtn.addEventListener('click', handleConfirm);

            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
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

        function startTimer() {
            if (isTimerRunning) return;
            isTimerRunning = true;
            isVerified = true;

            const endTime = Date.now() + TOTAL_TIME * 1000;
            GM_setValue(STORAGE_KEY, endTime.toString());
            GM_setValue(SESSION_KEY, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                domain: window.location.hostname
            }));

            log(`计时开始，${TOTAL_TIME}秒`);
            updateTimerDisplay();
        }

        function updateTimerDisplay() {
            const storedEndTime = GM_getValue(STORAGE_KEY, null);
            if (!storedEndTime) {
                if (isTimerRunning) {
                    isTimerRunning = false;
                    showVerifyModal();
                }
                return;
            }

            const endTime = parseInt(storedEndTime);
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

            if (remaining <= 0) {
                GM_deleteValue(STORAGE_KEY);
                GM_deleteValue(SESSION_KEY);
                isTimerRunning = false;
                const timerEl = document.querySelector('.safe-timer');
                if (timerEl) timerEl.remove();
                showVerifyModal();
                log('计时结束，重新验证');
                return;
            }

            let timerEl = document.querySelector('.safe-timer');
            if (!timerEl) {
                timerEl = document.createElement('div');
                timerEl.className = 'safe-timer';
                document.body.appendChild(timerEl);
                timerEl.addEventListener('click', exportLogs);
            }

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            if (remaining <= 60) timerEl.className = 'safe-timer danger';
            else if (remaining <= 300) timerEl.className = 'safe-timer warning';
            else timerEl.className = 'safe-timer';

            if (timerInterval) clearTimeout(timerInterval);
            timerInterval = setTimeout(updateTimerDisplay, 1000);
        }

        function exportLogs() {
            try {
                const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
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
                log('日志已导出');
            } catch (e) {
                console.error('导出日志失败:', e);
            }
        }

        class NetworkMonitor {
            constructor() {
                this.isOnline = navigator.onLine;
                this.localDelay = '检测中...';
                this.userIP = '查找中...';
                this.locationInfo = '获取中...';
                this.statusEl = null;
                this.modalEl = null;
                this.delayTimer = null;
                this.initUI();
                this.bindEvents();
                this.startDelayDetect();
                this.fetchIP();
                log('网络监测初始化完成');
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
                            <li class="net-info-item"><span class="net-info-label">连接状态</span><span class="net-info-value" id="net-status">${this.isOnline ? '在线' : '离线'}</span></li>
                            <li class="net-info-item"><span class="net-info-label">本地延迟</span><span class="net-info-value dynamic" id="net-delay">${this.localDelay}</span></li>
                            <li class="net-info-item"><span class="net-info-label">IP地址</span><span class="net-info-value dynamic" id="net-ip">${this.userIP}</span></li>
                            <li class="net-info-item"><span class="net-info-label">定位信息</span><span class="net-info-value dynamic" id="net-location">${this.locationInfo}</span></li>
                            <li class="net-info-item"><span class="net-info-label">网络类型</span><span class="net-info-value" id="net-type">${this.getNetworkType()}</span></li>
                            <li class="net-info-item"><span class="net-info-label">浏览器</span><span class="net-info-value" id="net-browser">${this.getBrowserInfo()}</span></li>
                        </ul>
                    </div>
                `;
                document.body.appendChild(this.modalEl);

                this.statusEl.addEventListener('click', () => this.modalEl.classList.toggle('active'));
                this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
                    this.modalEl.classList.remove('active');
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
                this.modalEl.querySelector('#net-status').textContent = online ? '在线' : '离线';
                if (online) {
                    this.startDelayDetect();
                    this.fetchIP();
                } else {
                    this.stopDelayDetect();
                    this.localDelay = '离线';
                    this.modalEl.querySelector('#net-delay').textContent = '离线';
                }
                log(`网络状态: ${online ? '在线' : '离线'}`);
            }

            startDelayDetect() {
                this.stopDelayDetect();
                this.calculateDelay();
                this.delayTimer = setInterval(() => this.calculateDelay(), 8000);
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
                fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'cors' })
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
                const apis = [
                    'https://api.ipify.org?format=json',
                    'https://ipinfo.io/json',
                    'https://api.myip.com'
                ];
                let index = 0;

                function tryNext() {
                    if (index >= apis.length) {
                        this.userIP = '获取失败';
                        this.modalEl.querySelector('#net-ip').textContent = this.userIP;
                        return;
                    }
                    fetch(apis[index], { cache: 'no-store' })
                        .then(r => r.json())
                        .then(data => {
                            const ip = data.ip || data.ip_address || null;
                            if (ip) {
                                this.userIP = ip;
                                this.modalEl.querySelector('#net-ip').textContent = ip;
                                this.fetchLocation(ip);
                                return;
                            }
                            throw new Error('No IP');
                        })
                        .catch(() => {
                            index++;
                            tryNext.call(this);
                        });
                }
                tryNext.call(this);
            }

            fetchLocation(ip) {
                if (!ip || ip === '获取失败') return;
                fetch(`https://ip-api.com/json/${ip}?fields=country,regionName,city`, { cache: 'no-store' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.city || data.regionName) {
                            this.locationInfo = `${data.regionName || ''} ${data.city || ''}`.trim() || '未知地区';
                            this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                        }
                    })
                    .catch(() => {
                        this.locationInfo = '定位失败';
                        this.modalEl.querySelector('#net-location').textContent = this.locationInfo;
                    });
            }

            getNetworkType() {
                if (navigator.connection && navigator.connection.effectiveType) {
                    return navigator.connection.effectiveType;
                }
                return '未知';
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
                if (this.statusEl && this.statusEl.parentNode) this.statusEl.parentNode.removeChild(this.statusEl);
                if (this.modalEl && this.modalEl.parentNode) this.modalEl.parentNode.removeChild(this.modalEl);
            }
        }

        function checkSessionAndStart() {
            const sessionData = GM_getValue(SESSION_KEY, null);
            const storedEndTime = GM_getValue(STORAGE_KEY, null);

            if (sessionData && storedEndTime) {
                try {
                    const session = JSON.parse(sessionData);
                    const endTime = parseInt(storedEndTime);
                    const now = Date.now();
                    if (now < endTime && session.verified) {
                        const remaining = Math.ceil((endTime - now) / 1000);
                        if (remaining > 0) {
                            log(`恢复会话，剩余 ${remaining} 秒`);
                            isVerified = true;
                            isTimerRunning = true;
                            updateTimerDisplay();
                            return;
                        }
                    }
                } catch (e) {}
            }

            // 清理无效会话
            GM_deleteValue(STORAGE_KEY);
            GM_deleteValue(SESSION_KEY);
            isTimerRunning = false;
            showVerifyModal();
        }

        // 初始化
        createRiskIndicator();
        networkMonitor = new NetworkMonitor();
        log('脚本初始化完成 v5.6');

        // 延迟启动，确保页面加载完成
        setTimeout(checkSessionAndStart, 300);
    }
})();