// ==UserScript==
// @name         页面安全验证计时器（增强版V5.6）
// @namespace    http://tampermonkey.net/
// @version      5.6
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时【支持后台运行+定位缓存+缓存超时销毁+智能风险检测】
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
            }
            .risk-indicator.low {
                color: #4cc9f0;
                border-color: #4cc9f0;
            }
            .risk-indicator.medium {
                color: #ffd60a;
                border-color: #ffd60a;
                animation: pulse-warning 2s infinite;
            }
            .risk-indicator.high {
                color: #f72585;
                border-color: #f72585;
                animation: pulse-danger 1s infinite;
            }
            .risk-indicator.critical {
                color: #ff0000;
                border-color: #ff0000;
                animation: pulse-critical 0.5s infinite;
                background: rgba(255, 0, 0, 0.1);
            }
            @keyframes pulse-critical {
                0% { box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
                50% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); }
                100% { box-shadow: 0 0 5px rgba(255, 0, 0, 0.5); }
            }
            .risk-modal {
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
                z-index: 10003;
                padding: 0 15px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .risk-modal.active {
                opacity: 1;
                visibility: visible;
            }
            .risk-modal-box {
                width: 100%;
                max-width: 350px;
                background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
                border: 1px solid rgba(76, 201, 240, 0.7);
                border-radius: 16px;
                padding: 25px 20px;
                box-shadow: 0 0 30px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
                transform: scale(0.9) translateY(15px);
                transition: transform 0.4s ease, box-shadow 0.4s ease;
            }
            .risk-modal.active .risk-modal-box {
                transform: scale(1) translateY(0);
                box-shadow: 0 0 40px rgba(76, 201, 240, 0.5), inset 0 0 25px rgba(76, 201, 240, 0.2);
            }
            .risk-modal-header {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                gap: 12px;
            }
            .risk-modal-icon {
                font-size: 24px;
                color: #4cc9f0;
                text-shadow: 0 0 8px rgba(76, 201, 240, 0.6);
            }
            .risk-modal-title {
                font-size: 20px;
                font-weight: bold;
                color: #4cc9f0;
                margin: 0;
                text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
                letter-spacing: 0.5px;
            }
            .risk-modal-desc {
                font-size: 14px;
                color: #e0e7ff;
                text-align: center;
                margin: 0 0 15px;
                line-height: 1.5;
                padding: 0 10px;
                opacity: 0.9;
            }
            .risk-details {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 8px;
                padding: 12px;
                margin: 15px 0;
                border: 1px solid rgba(76, 201, 240, 0.3);
            }
            .risk-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dashed rgba(76, 201, 240, 0.1);
            }
            .risk-item:last-child {
                border-bottom: none;
            }
            .risk-label {
                color: #94a3b8;
                font-size: 12px;
            }
            .risk-value {
                color: #e0f2fe;
                font-weight: 500;
                font-size: 12px;
            }
            .risk-value.low { color: #4cc9f0; }
            .risk-value.medium { color: #ffd60a; }
            .risk-value.high { color: #f72585; }
            .risk-value.critical { color: #ff0000; }
            .risk-btns {
                display: flex;
                gap: 12px;
                margin-top: 20px;
            }
            .risk-btn {
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
            .risk-confirm-btn {
                background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
                box-shadow: 0 0 10px rgba(67, 97, 238, 0.5);
            }
            .risk-confirm-btn:hover {
                box-shadow: 0 0 15px rgba(67, 97, 238, 0.7);
            }
            .risk-ignore-btn {
                background: linear-gradient(135deg, #ffd60a 0%, #ff9e00 100%);
                box-shadow: 0 0 10px rgba(255, 214, 10, 0.5);
            }
            .risk-ignore-btn:hover {
                box-shadow: 0 0 15px rgba(255, 214, 10, 0.7);
            }
            .slider-verify {
                width: 100%;
                height: 50px;
                background: rgba(30, 41, 59, 0.8);
                border-radius: 25px;
                margin: 20px 0;
                position: relative;
                overflow: hidden;
                border: 1px solid rgba(76, 201, 240, 0.3);
            }
            .slider-track {
                position: absolute;
                left: 0;
                top: 0;
                height: 100%;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
                font-size: 14px;
                user-select: none;
            }
            .slider-thumb {
                position: absolute;
                left: 5px;
                top: 5px;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%);
                border-radius: 50%;
                cursor: grab;
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                transition: background 0.3s ease;
                z-index: 2;
            }
            .slider-thumb:active {
                cursor: grabbing;
                background: linear-gradient(135deg, #3a0ca3 0%, #4361ee 100%);
            }
            .slider-target {
                position: absolute;
                right: 10px;
                top: 5px;
                width: 40px;
                height: 40px;
                background: rgba(76, 201, 240, 0.2);
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
                left: 0;
                top: 0;
                width: 0;
                height: 100%;
                background: rgba(76, 201, 240, 0.3);
                transition: width 0.1s ease;
            }
            .slider-hint {
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                margin-top: 5px;
                font-style: italic;
            }
            .click-verify {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin: 20px 0;
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
                font-size: 20px;
            }
            .click-item:hover {
                background: rgba(76, 201, 240, 0.1);
                border-color: #4cc9f0;
            }
            .click-item.selected {
                background: rgba(76, 201, 240, 0.3);
                border-color: #4cc9f0;
                box-shadow: 0 0 10px rgba(76, 201, 240, 0.5);
            }
            .click-item.correct {
                background: rgba(72, 187, 120, 0.3);
                border-color: #48bb78;
            }
            .click-item.wrong {
                background: rgba(245, 101, 101, 0.3);
                border-color: #f56565;
            }
            .click-hint {
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                margin-top: 5px;
                font-style: italic;
            }
            .adaptive-progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 10px 0 15px;
                font-size: 12px;
                color: #94a3b8;
            }
            .adaptive-progress-label {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .adaptive-progress-speed {
                color: #4cc9f0;
                font-weight: 600;
            }
            .adaptive-progress-failure {
                color: #f72585;
                font-weight: 600;
            }
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
        const RISK_HISTORY_KEY = 'safeTimerRiskHistory';
        const ADMIN_PASSWORD = '190212';
        const LOG_MAX_SIZE = 200 * 1024;
        // 修复点1：将倒计时从15分钟修改至12分钟
        const TOTAL_TIME = 12 * 60;
        const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/3.user.js';
        const STRENGTHEN_COUNT = 2;
        const FAST_VERIFY_THRESHOLD = 3000;
        const LOCAL_DELAY_INTERVAL = 5000;
        const DELAY_TEST_TIMEOUT = 5000;
        const BACKGROUND_CHECK_INTERVAL = 5000;
        const DESTROY_AFTER_END = 8 * 60;
        const PROGRESS_FAILURE_PROBABILITY = 0.25;
        const MATH_PROBLEM_PROBABILITY = 0.45;
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
            CLICK: 'click',
            PROGRESS: 'progress'
        };

        let backgroundRunner = null;
        let networkMonitor = null;
        let currentVerificationCode = '';
        let riskIndicator = null;
        let currentRiskScore = 0;
        let riskHistory = [];
        let currentVerifyType = VERIFY_TYPES.SIMPLE_CODE;

        function generateDeviceFingerprint() {
            const components = [];
            const ua = navigator.userAgent;
            components.push(ua);
            components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
            components.push(new Date().getTimezoneOffset());
            components.push(navigator.language);
            components.push(navigator.cookieEnabled ? '1' : '0');
            if (navigator.plugins) {
                components.push(navigator.plugins.length);
            }
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const txt = '安全计时器';
                ctx.textBaseline = 'top';
                ctx.font = "14px 'Arial'";
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125,1,62,20);
                ctx.fillStyle = '#069';
                ctx.fillText(txt, 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText(txt, 4, 17);
                const canvasData = canvas.toDataURL();
                components.push(canvasData.substring(canvasData.length - 20));
            } catch(e) {
                components.push('canvas_err');
            }
            let hash = 0;
            const str = components.join('|');
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }

        function loadRiskHistory() {
            try {
                const stored = localStorage.getItem(RISK_HISTORY_KEY);
                if (stored) {
                    riskHistory = JSON.parse(stored);
                    if (riskHistory.length > 100) {
                        riskHistory = riskHistory.slice(-100);
                    }
                }
            } catch (e) {
                riskHistory = [];
            }
        }

        function saveRiskHistory() {
            try {
                localStorage.setItem(RISK_HISTORY_KEY, JSON.stringify(riskHistory));
            } catch (e) {
                console.error('保存风险历史失败:', e);
            }
        }

        function calculateRiskScore() {
            let score = 0;
            const factors = [];
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
            const networkInfo = networkMonitor ? {
                ip: networkMonitor.userIP,
                location: networkMonitor.locationInfo,
                area: networkMonitor.currentArea
            } : null;
            if (networkInfo && networkInfo.ip !== '查找中...' && networkInfo.ip !== '查找失败') {
                const suspiciousIPs = ['1.1.1.1', '8.8.8.8'];
                if (suspiciousIPs.includes(networkInfo.ip)) {
                    score += 40;
                    factors.push({ name: '可疑IP', value: networkInfo.ip, score: 40 });
                }
            }
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
            const browser = networkMonitor ? networkMonitor.getBrowserInfo() : '未知';
            if (browser === '未知' || browser === 'Via' || browser === 'X浏览器') {
                score += 15;
                factors.push({ name: '非常用浏览器', value: browser, score: 15 });
            }
            if (screen.width < 320 || screen.height < 480) {
                score += 25;
                factors.push({ name: '异常屏幕尺寸', value: `${screen.width}x${screen.height}`, score: 25 });
            }
            const hour = new Date().getHours();
            if (hour < 6 || hour > 23) {
                score += 10;
                factors.push({ name: '非工作时间访问', value: `${hour}时`, score: 10 });
            }
            const deviceFingerprint = generateDeviceFingerprint();
            const lastFingerprint = riskHistory.length > 0 ? riskHistory[riskHistory.length - 1].deviceFingerprint : null;
            if (lastFingerprint && lastFingerprint !== deviceFingerprint) {
                score += 35;
                factors.push({ name: '设备指纹变化', value: '设备变更', score: 35 });
            }
            score = Math.min(100, Math.max(0, score));
            const riskRecord = {
                timestamp: Date.now(),
                score: score,
                factors: factors,
                deviceFingerprint: deviceFingerprint,
                ip: networkInfo ? networkInfo.ip : '未知',
                location: networkInfo ? networkInfo.location : '未知'
            };
            riskHistory.push(riskRecord);
            saveRiskHistory();
            return { score, factors };
        }

        function determineVerifyType(riskScore) {
            if (riskScore < RISK_LEVELS.LOW.threshold) {
                return Math.random() < 0.5 ? VERIFY_TYPES.SIMPLE_CODE : VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < RISK_LEVELS.MEDIUM.threshold) {
                return VERIFY_TYPES.MATH_PROBLEM;
            } else if (riskScore < RISK_LEVELS.HIGH.threshold) {
                return VERIFY_TYPES.SLIDER;
            } else {
                return VERIFY_TYPES.CLICK;
            }
        }

        function determineProgressParams(riskScore, networkDelay) {
            const baseDuration = 4000;
            const baseFailureProb = 0.25;
            let duration = baseDuration;
            let failureProbability = baseFailureProb;
            let speedLabel = '正常';
            if (riskScore > RISK_LEVELS.HIGH.threshold) {
                duration *= 1.8;
                failureProbability *= 1.5;
                speedLabel = '极慢';
            } else if (riskScore > RISK_LEVELS.MEDIUM.threshold) {
                duration *= 1.4;
                failureProbability *= 1.2;
                speedLabel = '较慢';
            } else if (riskScore < RISK_LEVELS.LOW.threshold) {
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

        function createRiskIndicator() {
            const existingIndicator = document.querySelector('.risk-indicator');
            if (existingIndicator) existingIndicator.remove();
            riskIndicator = document.createElement('div');
            riskIndicator.className = 'risk-indicator';
            riskIndicator.style.display = 'none';
            document.body.appendChild(riskIndicator);
            riskIndicator.addEventListener('click', showRiskDetailsModal);
        }

        function updateRiskIndicator(riskScore, factors) {
            if (!riskIndicator) return;
            let levelClass = '';
            let levelName = '';
            if (riskScore < RISK_LEVELS.LOW.threshold) {
                levelClass = 'low';
                levelName = '低风险';
            } else if (riskScore < RISK_LEVELS.MEDIUM.threshold) {
                levelClass = 'medium';
                levelName = '中风险';
            } else if (riskScore < RISK_LEVELS.HIGH.threshold) {
                levelClass = 'high';
                levelName = '高风险';
            } else {
                levelClass = 'critical';
                levelName = '严重风险';
            }
            riskIndicator.className = `risk-indicator ${levelClass}`;
            riskIndicator.textContent = `风险等级: ${levelName} (${riskScore}分)`;
            riskIndicator.title = `点击查看详细信息\n风险因素: ${factors.map(f => f.name).join(', ')}`;
            riskIndicator.style.display = 'block';
            log(`风险检测完成: ${levelName} (${riskScore}分), 因素: ${factors.map(f => f.name).join(', ')}`);
        }

        function showRiskDetailsModal() {
            const existingModal = document.querySelector('.risk-modal');
            if (existingModal) existingModal.remove();
            const modal = document.createElement('div');
            modal.className = 'risk-modal';
            let factorsHtml = '';
            const riskResult = calculateRiskScore();
            riskResult.factors.forEach(factor => {
                let levelClass = '';
                if (factor.score >= 30) levelClass = 'critical';
                else if (factor.score >= 20) levelClass = 'high';
                else if (factor.score >= 10) levelClass = 'medium';
                else levelClass = 'low';
                factorsHtml += `
                    <div class="risk-item">
                        <span class="risk-label">${factor.name}</span>
                        <span class="risk-value ${levelClass}">${factor.value} (+${factor.score}分)</span>
                    </div>
                `;
            });
            modal.innerHTML = `
                <div class="risk-modal-box">
                    <div class="risk-modal-header">
                        <div class="risk-modal-icon">⚠️</div>
                        <h2 class="risk-modal-title">风险分析报告</h2>
                    </div>
                    <p class="risk-modal-desc">系统检测到以下风险因素，当前验证已根据风险等级调整</p>
                    <div class="risk-details">
                        <div class="risk-item">
                            <span class="risk-label">总体风险分数</span>
                            <span class="risk-value ${currentRiskScore >= 85 ? 'critical' : currentRiskScore >= 60 ? 'high' : currentRiskScore >= 30 ? 'medium' : 'low'}">
                                ${currentRiskScore}分
                            </span>
                        </div>
                        <div class="risk-item">
                            <span class="risk-label">当前验证类型</span>
                            <span class="risk-value">${getVerifyTypeName(currentVerifyType)}</span>
                        </div>
                        ${factorsHtml}
                    </div>
                    <div class="risk-btns">
                        <button class="risk-btn risk-confirm-btn" id="risk-confirm">确定</button>
                        <button class="risk-btn risk-ignore-btn" id="risk-ignore">忽略风险</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            modal.querySelector('#risk-confirm').addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                }, 400);
            });
            modal.querySelector('#risk-ignore').addEventListener('click', () => {
                currentRiskScore = Math.max(0, currentRiskScore - 20);
                updateRiskIndicator(currentRiskScore, riskResult.factors);
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                }, 400);
                log('用户选择忽略风险，风险分数降低20分');
            });
        }

        function getVerifyTypeName(type) {
            const names = {
                [VERIFY_TYPES.SIMPLE_CODE]: '简单验证码',
                [VERIFY_TYPES.MATH_PROBLEM]: '数学计算题',
                [VERIFY_TYPES.SLIDER]: '滑块验证',
                [VERIFY_TYPES.CLICK]: '点选验证',
                [VERIFY_TYPES.PROGRESS]: '进度条验证'
            };
            return names[type] || '未知验证';
        }

        function generateVerificationCode() {
            switch (currentVerifyType) {
                case VERIFY_TYPES.MATH_PROBLEM:
                    return generateMathProblem();
                case VERIFY_TYPES.SIMPLE_CODE:
                    return generateSimpleCode();
                case VERIFY_TYPES.SLIDER:
                    return { type: VERIFY_TYPES.SLIDER, display: 'slider' };
                case VERIFY_TYPES.CLICK:
                    return { type: VERIFY_TYPES.CLICK, display: 'click' };
                default:
                    return generateSimpleCode();
            }
        }

        function generateSimpleCode() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            let code = '';
            const length = currentRiskScore > RISK_LEVELS.MEDIUM.threshold ? 8 : 6;
            for (let i = 0; i < length; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            currentVerificationCode = code;
            return { type: VERIFY_TYPES.SIMPLE_CODE, display: code };
        }

        // 修复点1：修复计算题验证答案出现小数位的bug
        function generateMathProblem() {
            const operators = ['+', '-', '*'];
            const numCount = 2 + Math.floor(Math.random() * 2); // 2-3个数字
            let expression = '';
            let numbers = [];
            
            // 确保计算结果是整数
            for (let i = 0; i < numCount; i++) {
                numbers.push(Math.floor(Math.random() * 20) + 1);
            }
            
            // 构建表达式，避免产生小数
            for (let i = 0; i < numCount - 1; i++) {
                expression += numbers[i];
                const operator = operators[Math.floor(Math.random() * operators.length)];
                
                // 如果使用除法，确保结果是整数
                if (operator === '/') {
                    // 确保被除数能被除数整除
                    const divisor = Math.floor(Math.random() * 5) + 1;
                    numbers[i + 1] = numbers[i] * divisor;
                    expression += '÷';
                } else {
                    expression += operator;
                }
            }
            expression += numbers[numCount - 1];
            
            try {
                // 使用安全的计算方式
                const result = Math.round(eval(expression.replace('÷', '/')));
                // 确保结果不是NaN或无限大
                if (isNaN(result) || !isFinite(result)) {
                    // 如果结果无效，返回一个简单的加法题
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    currentVerificationCode = (num1 + num2).toString();
                    return { type: VERIFY_TYPES.MATH_PROBLEM, display: `${num1} + ${num2} = ?` };
                }
                currentVerificationCode = result.toString();
                return { type: VERIFY_TYPES.MATH_PROBLEM, display: expression.replace('/', '÷') + ' = ?' };
            } catch (e) {
                // 如果计算失败，返回一个简单的加法题
                const num1 = Math.floor(Math.random() * 10) + 1;
                const num2 = Math.floor(Math.random() * 10) + 1;
                currentVerificationCode = (num1 + num2).toString();
                return { type: VERIFY_TYPES.MATH_PROBLEM, display: `${num1} + ${num2} = ?` };
            }
        }

        function createSliderVerify() {
            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-verify';
            sliderContainer.innerHTML = `
                <div class="slider-track">请滑动滑块到右侧完成验证</div>
                <div class="slider-success"></div>
                <div class="slider-thumb">→</div>
                <div class="slider-target">✓</div>
            `;
            const thumb = sliderContainer.querySelector('.slider-thumb');
            const target = sliderContainer.querySelector('.slider-target');
            const successBar = sliderContainer.querySelector('.slider-success');
            const track = sliderContainer.querySelector('.slider-track');
            const containerWidth = sliderContainer.offsetWidth;
            const thumbWidth = thumb.offsetWidth;
            const targetWidth = target.offsetWidth;
            const maxX = containerWidth - thumbWidth - 10;
            const targetX = containerWidth - targetWidth - 5;
            let isDragging = false;
            let startX = 0;
            let thumbX = 5;
            thumb.style.left = `${thumbX}px`;
            const onMouseDown = (e) => {
                isDragging = true;
                startX = e.clientX || e.touches[0].clientX;
                thumb.style.cursor = 'grabbing';
                e.preventDefault();
            };
            const onMouseMove = (e) => {
                if (!isDragging) return;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                if (!clientX) return;
                const deltaX = clientX - startX;
                let newX = thumbX + deltaX;
                newX = Math.max(5, Math.min(maxX, newX));
                thumb.style.left = `${newX}px`;
                successBar.style.width = `${newX}px`;
                if (newX >= targetX - 20) {
                    thumb.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    track.textContent = '验证成功 ✓';
                    track.style.color = '#48bb78';
                } else {
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '请滑动滑块到右侧完成验证';
                    track.style.color = '#94a3b8';
                }
            };
            const onMouseUp = () => {
                if (!isDragging) return;
                isDragging = false;
                thumb.style.cursor = 'grab';
                const finalX = parseInt(thumb.style.left);
                if (finalX >= targetX - 20) {
                    currentVerificationCode = 'SLIDER_SUCCESS';
                    setTimeout(() => {
                        const confirmBtn = document.querySelector('#confirm-verify');
                        if (confirmBtn) confirmBtn.click();
                    }, 500);
                } else {
                    thumb.style.transition = 'left 0.3s ease';
                    thumb.style.left = `${thumbX}px`;
                    successBar.style.width = `${thumbX}px`;
                    thumb.style.background = 'linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%)';
                    track.textContent = '请滑动滑块到右侧完成验证';
                    track.style.color = '#94a3b8';
                    setTimeout(() => {
                        thumb.style.transition = '';
                    }, 300);
                }
            };
            thumb.addEventListener('mousedown', onMouseDown);
            thumb.addEventListener('touchstart', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('touchmove', (e) => {
                onMouseMove(e);
                e.preventDefault();
            }, { passive: false });
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchend', onMouseUp);
            return sliderContainer;
        }

        function createClickVerify() {
            const clickContainer = document.createElement('div');
            clickContainer.className = 'click-verify';
            const totalItems = 9;
            const correctCount = 3;
            const correctPositions = [];
            while (correctPositions.length < correctCount) {
                const pos = Math.floor(Math.random() * totalItems);
                if (!correctPositions.includes(pos)) {
                    correctPositions.push(pos);
                }
            }
            const prompts = ['汽车', '房子', '树', '猫', '狗', '花', '太阳', '星星', '月亮'];
            const correctPrompt = prompts[Math.floor(Math.random() * prompts.length)];
            const promptText = `请点击所有的"${correctPrompt}"`;
            const icons = ['🚗', '🏠', '🌳', '🐱', '🐶', '🌸', '☀️', '⭐', '🌙'];
            for (let i = 0; i < totalItems; i++) {
                const isCorrect = correctPositions.includes(i);
                const icon = isCorrect ? correctPrompt === '汽车' ? '🚗' : 
                          correctPrompt === '房子' ? '🏠' :
                          correctPrompt === '树' ? '🌳' :
                          correctPrompt === '猫' ? '🐱' :
                          correctPrompt === '狗' ? '🐶' :
                          correctPrompt === '花' ? '🌸' :
                          correctPrompt === '太阳' ? '☀️' :
                          correctPrompt === '星星' ? '⭐' : '🌙' : icons[i];
                const item = document.createElement('div');
                item.className = 'click-item';
                item.textContent = icon;
                item.dataset.correct = isCorrect;
                item.addEventListener('click', () => {
                    if (item.classList.contains('selected')) {
                        item.classList.remove('selected');
                    } else {
                        item.classList.add('selected');
                        if (isCorrect) {
                            item.classList.add('correct');
                        } else {
                            item.classList.add('wrong');
                        }
                    }
                    const selectedItems = clickContainer.querySelectorAll('.click-item.selected');
                    const correctSelected = Array.from(selectedItems).filter(item => 
                        item.dataset.correct === 'true'
                    ).length;
                    const wrongSelected = selectedItems.length - correctSelected;
                    if (correctSelected === correctCount && wrongSelected === 0) {
                        currentVerificationCode = 'CLICK_SUCCESS';
                        setTimeout(() => {
                            const confirmBtn = document.querySelector('#confirm-verify');
                            if (confirmBtn) confirmBtn.click();
                        }, 500);
                    }
                });
                clickContainer.appendChild(item);
            }
            const hint = document.createElement('div');
            hint.className = 'click-hint';
            hint.textContent = promptText;
            const wrapper = document.createElement('div');
            wrapper.appendChild(clickContainer);
            wrapper.appendChild(hint);
            return wrapper;
        }

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
                    domain: window.location.hostname,
                    riskScore: currentRiskScore,
                    verifyType: currentVerifyType
                };

                let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
                logs.push(logItem);

                const logsJson = JSON.stringify(logs);
                if (new Blob([logsJson]).size > LOG_MAX_SIZE) {
                    while (logs.length > 1 && new Blob([JSON.stringify(logs)]).size > LOG_MAX_SIZE) {
                        logs.shift();
                    }
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

                const tryNextApi = (apiIndex = 0) {
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
                if (ua.includes('XBrowser') || ua.includes('com.mmbox.xbrowser.pro')) return 'X浏览器';
                if (ua.includes('Via') || ua.includes('mark.via')) return 'Via';
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
            const riskResult = calculateRiskScore();
            currentRiskScore = riskResult.score;
            updateRiskIndicator(currentRiskScore, riskResult.factors);
            currentVerifyType = determineVerifyType(currentRiskScore);
            log(`根据风险分数${currentRiskScore}选择验证类型: ${getVerifyTypeName(currentVerifyType)}`);
            
            const existingModal = document.querySelector('.verify-modal');
            if (existingModal) existingModal.remove();

            const verifyContent = generateVerificationCode();
            let codeDisplay = '';
            let extraContent = '';
            let placeholderText = '';
            let isInteractive = false;
            
            if (verifyContent.type === VERIFY_TYPES.SIMPLE_CODE || verifyContent.type === VERIFY_TYPES.MATH_PROBLEM) {
                codeDisplay = verifyContent.display;
                placeholderText = verifyContent.type === VERIFY_TYPES.MATH_PROBLEM ? '请输入计算结果' : '请输入验证码';
            } else if (verifyContent.type === VERIFY_TYPES.SLIDER) {
                codeDisplay = '滑块验证';
                isInteractive = true;
            } else if (verifyContent.type === VERIFY_TYPES.CLICK) {
                codeDisplay = '点选验证';
                isInteractive = true;
            }
            
            const modal = document.createElement('div');
            modal.className = 'verify-modal';
            modal.innerHTML = `
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔒</div>
                        <h2 class="modal-title">安全验证</h2>
                    </div>
                    <p class="modal-desc">${verifyContent.type === VERIFY_TYPES.MATH_PROBLEM ? '请计算下方数学题并输入答案以继续访问' : 
                                           verifyContent.type === VERIFY_TYPES.SIMPLE_CODE ? '请复制下方验证码并输入以继续访问' :
                                           verifyContent.type === VERIFY_TYPES.SLIDER ? '请滑动滑块到右侧完成验证' :
                                           '请按照提示完成点选验证'}</p>
                    ${isInteractive ? '' : `<div class="verify-code" id="verify-code">${codeDisplay}</div>`}
                    ${!isInteractive ? `<p class="copy-tip">双击验证码使用管理员密码复制</p>
                    <p class="double-click-tip">双击验证码可输入管理员密码快速复制</p>` : ''}
                    <div id="interactive-container"></div>
                    ${!isInteractive ? `<div class="verify-input-wrap">
                        <input type="text" class="verify-input" id="verify-input" placeholder="${placeholderText}" maxlength="10">
                        <div class="verify-error" id="verify-error">${verifyContent.type === VERIFY_TYPES.MATH_PROBLEM ? '答案错误，请重新计算' : '验证码错误，请重新输入'}</div>
                    </div>` : ''}
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

            if (isInteractive) {
                const container = modal.querySelector('#interactive-container');
                if (verifyContent.type === VERIFY_TYPES.SLIDER) {
                    container.appendChild(createSliderVerify());
                    const hint = document.createElement('div');
                    hint.className = 'slider-hint';
                    hint.textContent = '拖动滑块到右侧✓位置完成验证';
                    container.appendChild(hint);
                } else if (verifyContent.type === VERIFY_TYPES.CLICK) {
                    container.appendChild(createClickVerify());
                }
            }

            const codeEl = modal.querySelector('#verify-code');
            const inputEl = modal.querySelector('#verify-input');
            const errorEl = modal.querySelector('#verify-error');
            const confirmBtn = modal.querySelector('#confirm-verify');
            const cancelBtn = modal.querySelector('#cancel-verify');
            const updateLink = modal.querySelector('#update-link');

            updateLink.href = UPDATE_URL;

            if (!isInteractive && codeEl) {
                let lastClickTime = 0;

                codeEl.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    showAdminModal(currentVerificationCode);
                });

                codeEl.addEventListener('click', (e) => {
                    const currentTime = new Date().getTime();
                    if (currentTime - lastClickTime < 300) {
                        e.preventDefault();
                        showAdminModal(currentVerificationCode);
                    }
                    lastClickTime = currentTime;
                });
            }

            confirmBtn.addEventListener('click', () => {
                let isValid = false;
                if (isInteractive) {
                    isValid = currentVerificationCode === 'SLIDER_SUCCESS' || currentVerificationCode === 'CLICK_SUCCESS';
                } else {
                    const inputCode = inputEl ? inputEl.value.trim() : '';
                    isValid = inputCode === currentVerificationCode;
                }
                if (isValid) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        if (modal.parentNode) modal.parentNode.removeChild(modal);
                        setTimeout(showProgressVerify, 100);
                    }, 400);
                    log('验证成功，开始计时');
                } else {
                    if (errorEl) errorEl.style.display = 'block';
                    if (inputEl) inputEl.value = '';
                    log('验证失败：答案错误');
                    currentRiskScore = Math.min(100, currentRiskScore + 10);
                    updateRiskIndicator(currentRiskScore, riskResult.factors);
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

            if (inputEl) {
                inputEl.addEventListener('input', () => {
                    if (errorEl) errorEl.style.display = 'none';
                });

                inputEl.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        confirmBtn.click();
                    }
                });

                inputEl.focus();
            }
        }

        function showProgressVerify() {
            const existingModal = document.querySelector('.progress-verify-modal');
            if (existingModal) existingModal.remove();

            let networkDelay = 0;
            if (networkMonitor && networkMonitor.localDelay !== '检测中...') {
                const delayMatch = networkMonitor.localDelay.match(/(\d+)ms/);
                if (delayMatch) {
                    networkDelay = parseInt(delayMatch[1]);
                }
            }
            
            const progressParams = determineProgressParams(currentRiskScore, networkDelay);
            
            const modal = document.createElement('div');
            modal.className = 'progress-verify-modal';
            modal.innerHTML = `
                <div class="progress-modal-box">
                    <h2 class="progress-title">安全验证</h2>
                    <p class="progress-desc">请等待进度条完成以继续访问</p>
                    <div class="adaptive-progress-info">
                        <div class="adaptive-progress-label">
                            <span>验证速度:</span>
                            <span class="adaptive-progress-speed">${progressParams.speedLabel}</span>
                        </div>
                        <div class="adaptive-progress-label">
                            <span>失败概率:</span>
                            <span class="adaptive-progress-failure">${Math.round(progressParams.failureProbability * 100)}%</span>
                        </div>
                    </div>
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
            const duration = progressParams.duration;
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
                            domain: window.location.hostname,
                            riskScore: currentRiskScore,
                            verifyType: currentVerifyType
                        });
                        startTimer();
                        log(`进度条验证成功，风险分数: ${currentRiskScore}, 验证类型: ${getVerifyTypeName(currentVerifyType)}`);
                    }, 500);
                } else {
                    progressBar.style.width = `${progress}%`;
                    progressStatus.textContent = `${Math.round(progress)}%`;
                }
            }, intervalTime);

            const shouldFail = Math.random() < progressParams.failureProbability;
            if (shouldFail) {
                const failTime = 1000 + Math.random() * (duration - 2000);
                setTimeout(() => {
                    clearInterval(interval);
                    progressBar.style.width = `${progress}%`;
                    errorEl.style.display = 'block';
                    retryBtn.style.display = 'block';
                    log(`进度条验证失败，风险分数: ${currentRiskScore}`);

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
                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                                    (now.getMonth() + 1).toString().padStart(2, '0') +
                                    now.getDate().toString().padStart(2, '0') +
                                    now.getHours().toString().padStart(2, '0') +
                                    now.getMinutes().toString().padStart(2, '0') +
                                    now.getSeconds().toString().padStart(2, '0');
                    a.href = url;
                    a.download = `安全计时器日志_${timestamp}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    log('日志已导出');
                });
            }

            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (remainingSeconds <= 60) {
                timerEl.className = 'safe-timer danger';
            } else if (remainingSeconds <= 300) {
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

        loadRiskHistory();
        createRiskIndicator();
        
        log('安全计时器脚本开始初始化（版本：5.6）');

        backgroundRunner = new BackgroundRunner();
        networkMonitor = new NetworkMonitor();
        createLocationRefreshButton();
        setTimeout(checkSessionStatus, 500);

        log('安全计时器脚本初始化完成（版本：5.6）');
    }
})();