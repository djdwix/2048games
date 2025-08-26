// ==UserScript==
// @name         安全验证码自动输入助手
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  自动识别并填写页面安全验证计时器的验证码（配套脚本）- 增强版
// @author       You
// @match        *://*/*
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置参数
    const CHECK_INTERVAL = 800; // 检查间隔缩短至800ms
    const MAX_WAIT_TIME = 45000; // 最大等待时间延长至45秒
    const AUTO_CONFIRM_DELAY = 800; // 自动确认延迟调整至800ms
    
    // 获取用户设置 - 默认全部开启
    let autoFillEnabled = GM_getValue('autoFillEnabled', true);
    let autoConfirmEnabled = GM_getValue('autoConfirmEnabled', true);
    let notificationEnabled = GM_getValue('notificationEnabled', true);
    
    let startTime = Date.now();
    let filledCodes = new Set(); // 记录已填写的验证码，避免重复操作
    let currentSession = Date.now(); // 当前会话标识
    let isInitialized = false;

    // 添加全局样式
    GM_addStyle(`
        .auto-fill-menu {
            position: fixed;
            background: rgba(15, 23, 42, 0.98) !important;
            border: 1px solid rgba(76, 201, 240, 0.6) !important;
            border-radius: 8px !important;
            padding: 8px 0 !important;
            z-index: 10001 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            min-width: 150px !important;
            backdrop-filter: blur(10px) !important;
        }
        .menu-item {
            padding: 8px 15px !important;
            cursor: pointer !important;
            color: #e0f2fe !important;
            font-size: 13px !important;
            transition: background 0.2s ease !important;
        }
        .menu-item:hover {
            background: rgba(76, 201, 240, 0.2) !important;
        }
        #auto-fill-status {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        .auto-fill-notice {
            position: fixed !important;
            top: 60px !important;
            right: 20px !important;
            background: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(76, 201, 240, 0.6) !important;
            border-radius: 8px !important;
            padding: 10px 15px !important;
            color: #4cc9f0 !important;
            z-index: 10000 !important;
            box-shadow: 0 3px 12px rgba(76, 201, 240, 0.4) !important;
            font-size: 14px !important;
            font-weight: 600 !important;
        }
    `);
    
    // 创建增强版状态指示器
    function createEnhancedStatusIndicator() {
        // 移除可能存在的旧指示器
        const oldIndicator = document.getElementById('auto-fill-status');
        if (oldIndicator) oldIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.padding = '10px 15px';
        indicator.style.background = 'rgba(15, 23, 42, 0.95)';
        indicator.style.border = '1px solid rgba(76, 201, 240, 0.6)';
        indicator.style.borderRadius = '10px';
        indicator.style.color = autoFillEnabled ? '#4cc9f0' : '#f72585';
        indicator.style.fontSize = '14px';
        indicator.style.fontWeight = '600';
        indicator.style.zIndex = '10000';
        indicator.style.cursor = 'pointer';
        indicator.style.userSelect = 'none';
        indicator.style.boxShadow = '0 3px 12px rgba(76, 201, 240, 0.4)';
        indicator.style.display = 'flex';
        indicator.style.alignItems = 'center';
        indicator.style.gap = '8px';
        indicator.style.transition = 'all 0.3s ease';
        indicator.innerHTML = `
            <span style="font-size:16px">${autoFillEnabled ? '🔒' : '🔓'}</span>
            <span>自动输入: ${autoFillEnabled ? '开启' : '关闭'}</span>
        `;
        indicator.id = 'auto-fill-status';
        
        // 添加悬停效果
        indicator.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 5px 15px rgba(76, 201, 240, 0.6)';
        });
        
        indicator.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 3px 12px rgba(76, 201, 240, 0.4)';
        });
        
        // 点击切换功能
        indicator.addEventListener('click', function(e) {
            if (e.shiftKey) {
                // Shift+点击：切换自动确认
                autoConfirmEnabled = !autoConfirmEnabled;
                GM_setValue('autoConfirmEnabled', autoConfirmEnabled);
                showNotification(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
            } else if (e.ctrlKey) {
                // Ctrl+点击：切换通知
                notificationEnabled = !notificationEnabled;
                GM_setValue('notificationEnabled', notificationEnabled);
                showNotification(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
            } else {
                // 普通点击：切换自动输入
                autoFillEnabled = !autoFillEnabled;
                GM_setValue('autoFillEnabled', autoFillEnabled);
                updateStatusIndicator();
                showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
            }
        });
        
        // 添加右键菜单
        indicator.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showQuickMenu(e.clientX, e.clientY);
        });
        
        document.body.appendChild(indicator);
        return indicator;
    }
    
    // 显示快捷菜单
    function showQuickMenu(x, y) {
        // 移除现有菜单
        const existingMenu = document.getElementById('auto-fill-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.id = 'auto-fill-menu';
        menu.className = 'auto-fill-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        menu.innerHTML = `
            <div class="menu-item" data-action="toggle-auto">自动输入: ${autoFillEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-confirm">自动确认: ${autoConfirmEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-notify">通知: ${notificationEnabled ? '关闭' : '开启'}</div>
            <hr style="margin:5px 0;border-color:rgba(76, 201, 240, 0.3)">
            <div class="menu-item" data-action="manual-trigger">手动触发检测</div>
            <div class="menu-item" data-action="reset-session">重置会话</div>
        `;
        
        // 菜单项点击处理
        menu.addEventListener('click', function(e) {
            const target = e.target;
            if (!target.classList.contains('menu-item')) return;
            
            const action = target.getAttribute('data-action');
            switch(action) {
                case 'toggle-auto':
                    autoFillEnabled = !autoFillEnabled;
                    GM_setValue('autoFillEnabled', autoFillEnabled);
                    updateStatusIndicator();
                    showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                    break;
                case 'toggle-confirm':
                    autoConfirmEnabled = !autoConfirmEnabled;
                    GM_setValue('autoConfirmEnabled', autoConfirmEnabled);
                    showNotification(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
                    break;
                case 'toggle-notify':
                    notificationEnabled = !notificationEnabled;
                    GM_setValue('notificationEnabled', notificationEnabled);
                    showNotification(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                    break;
                case 'manual-trigger':
                    monitorVerification();
                    showNotification('手动触发检测中...');
                    break;
                case 'reset-session':
                    currentSession = Date.now();
                    filledCodes.clear();
                    showNotification('会话已重置');
                    break;
            }
            menu.remove();
        });
        
        // 点击外部关闭菜单
        const closeMenuHandler = function(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenuHandler);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenuHandler);
        }, 100);
        
        document.body.appendChild(menu);
    }
    
    // 更新状态指示器
    function updateStatusIndicator() {
        const indicator = document.getElementById('auto-fill-status');
        if (indicator) {
            indicator.style.color = autoFillEnabled ? '#4cc9f0' : '#f72585';
            const iconSpan = indicator.querySelector('span:first-child');
            const textSpan = indicator.querySelector('span:last-child');
            if (iconSpan) iconSpan.textContent = autoFillEnabled ? '🔒' : '🔓';
            if (textSpan) textSpan.textContent = `自动输入: ${autoFillEnabled ? '开启' : '关闭'}`;
        }
    }
    
    // 显示通知
    function showNotification(message) {
        if (!notificationEnabled) return;
        
        // 移除旧的通知
        const oldNotices = document.querySelectorAll('.auto-fill-notice');
        oldNotices.forEach(notice => notice.remove());
        
        if (typeof GM_notification === 'function') {
            try {
                GM_notification({
                    text: message,
                    title: '验证助手',
                    timeout: 2000,
                    highlight: true
                });
            } catch (error) {
                // GM_notification 失败时使用备用方案
                createFallbackNotification(message);
            }
        } else {
            createFallbackNotification(message);
        }
    }
    
    // 创建备用通知
    function createFallbackNotification(message) {
        const notice = document.createElement('div');
        notice.className = 'auto-fill-notice';
        notice.textContent = message;
        
        document.body.appendChild(notice);
        setTimeout(() => {
            if (notice.parentNode) {
                notice.remove();
            }
        }, 2000);
    }
    
    // 查找验证码和输入框（增强版）
    function findVerificationElements() {
        try {
            // 优先查找主验证脚本的特定元素
            const codeSelectors = [
                '.verify-code:not(.uncopyable)',
                '.verify-code',
                '[class*="code"][class*="verify"]',
                '[class*="verify"][class*="code"]'
            ];
            
            let codeElement = null;
            for (const selector of codeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    // 检查元素是否可见
                    if (el.offsetParent === null) continue;
                    
                    const text = el.textContent.trim();
                    const numericText = text.replace(/\D/g, '');
                    if (numericText.length === 6 && /^\d{6}$/.test(numericText)) {
                        codeElement = el;
                        break;
                    }
                }
                if (codeElement) break;
            }
            
            if (!codeElement) return null;
            
            // 查找输入框 - 优先查找主验证脚本的输入框
            const inputSelectors = [
                '.verify-input',
                'input[type="text"]',
                'input[placeholder*="验证码"]',
                'input[placeholder*="code"]',
                'input[placeholder*="请输入"]'
            ];
            
            let inputElement = null;
            for (const selector of inputSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el.offsetParent !== null && el.disabled === false) {
                        inputElement = el;
                        break;
                    }
                }
                if (inputElement) break;
            }
            
            if (!inputElement) return null;
            
            return {
                codeElement: codeElement,
                inputElement: inputElement,
                modal: codeElement.closest('.verify-modal')
            };
        } catch (error) {
            console.warn('查找验证元素时出错:', error);
            return null;
        }
    }
    
    // 提取验证码（增强版）
    function extractVerificationCode(codeElement) {
        if (!codeElement) return null;
        
        try {
            // 多种提取方式
            let code = codeElement.textContent.trim();
            
            // 清理非数字字符
            code = code.replace(/\D/g, '');
            
            // 验证是否为6位数字
            if (code.length === 6 && /^\d{6}$/.test(code)) {
                return code;
            }
            
            // 尝试从data属性获取
            const dataAttributes = ['data-code', 'data-value', 'data-verify', 'data-number'];
            for (const attr of dataAttributes) {
                const dataCode = codeElement.getAttribute(attr);
                if (dataCode && /^\d{6}$/.test(dataCode.replace(/\D/g, ''))) {
                    return dataCode.replace(/\D/g, '');
                }
            }
            
            return null;
        } catch (error) {
            console.warn('提取验证码时出错:', error);
            return null;
        }
    }
    
    // 自动填写验证码（增强版）
    function autoFillVerificationCode() {
        if (!autoFillEnabled) return false;
        
        // 检查超时
        if (Date.now() - startTime > MAX_WAIT_TIME) {
            if (notificationEnabled) {
                showNotification('自动输入超时，请手动操作');
            }
            return false;
        }
        
        try {
            const elements = findVerificationElements();
            if (!elements) return false;
            
            // 确保验证弹窗是可见的
            if (elements.modal && !elements.modal.classList.contains('active')) {
                return false;
            }
            
            const verificationCode = extractVerificationCode(elements.codeElement);
            if (!verificationCode) return false;
            
            // 检查是否已经填写过这个验证码
            const codeKey = `${currentSession}_${verificationCode}`;
            if (filledCodes.has(codeKey)) {
                return false;
            }
            
            // 检查输入框是否已经有值
            if (elements.inputElement.value.trim() === verificationCode) {
                filledCodes.add(codeKey);
                return false;
            }
            
            // 填写验证码
            elements.inputElement.value = verificationCode;
            elements.inputElement.focus();
            
            // 触发所有可能的事件
            const events = ['input', 'change', 'keydown', 'keypress', 'keyup', 'blur'];
            events.forEach(eventType => {
                try {
                    const event = new Event(eventType, { bubbles: true });
                    elements.inputElement.dispatchEvent(event);
                } catch (e) {
                    // 忽略事件触发错误
                }
            });
            
            // 标记为已填写
            filledCodes.add(codeKey);
            
            if (notificationEnabled) {
                showNotification(`验证码已自动填写: ${verificationCode}`);
            }
            
            console.log('安全验证码已自动填写:', verificationCode);
            return true;
            
        } catch (error) {
            console.error('自动填写过程中出错:', error);
            return false;
        }
    }
    
    // 尝试自动点击确认按钮（增强版）
    function tryAutoConfirm() {
        if (!autoConfirmEnabled) return false;
        
        try {
            const confirmButtons = document.querySelectorAll('.confirm-btn, button[class*="confirm"], button[class*="submit"]');
            for (const button of confirmButtons) {
                if (button.offsetParent !== null && 
                    button.disabled === false && 
                    button.style.display !== 'none') {
                    setTimeout(() => {
                        try {
                            button.click();
                            if (notificationEnabled) {
                                showNotification('已自动提交验证');
                            }
                        } catch (e) {
                            console.warn('点击确认按钮时出错:', e);
                        }
                    }, AUTO_CONFIRM_DELAY);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn('查找确认按钮时出错:', error);
            return false;
        }
    }
    
    // 主监控函数
    function monitorVerification() {
        if (!isInitialized) return;
        
        try {
            if (autoFillEnabled) {
                const filled = autoFillVerificationCode();
                if (filled) {
                    setTimeout(tryAutoConfirm, 100);
                }
            }
        } catch (error) {
            console.error('监控过程中出错:', error);
        }
    }
    
    // 初始化
    function init() {
        if (isInitialized) return;
        
        console.log('安全验证码自动输入助手 v1.2 已启动');
        createEnhancedStatusIndicator();
        isInitialized = true;
        
        // 确保默认设置正确
        if (GM_getValue('autoFillEnabled') === undefined) {
            GM_setValue('autoFillEnabled', true);
        }
        if (GM_getValue('autoConfirmEnabled') === undefined) {
            GM_setValue('autoConfirmEnabled', true);
        }
        if (GM_getValue('notificationEnabled') === undefined) {
            GM_setValue('notificationEnabled', true);
        }
        
        // 定时检查验证码
        const checkInterval = setInterval(monitorVerification, CHECK_INTERVAL);
        
        // 监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    setTimeout(monitorVerification, 300);
                    break;
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // 页面加载完成后立即检查
        setTimeout(monitorVerification, 2000);
        
        // 添加键盘快捷键
        document.addEventListener('keydown', function(e) {
            // Alt+A: 切换自动输入
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                autoFillEnabled = !autoFillEnabled;
                GM_setValue('autoFillEnabled', autoFillEnabled);
                updateStatusIndicator();
                showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
            }
            // Alt+S: 手动触发检测
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                monitorVerification();
                showNotification('手动触发检测');
            }
        });
        
        // 清理函数
        window.addEventListener('beforeunload', function() {
            clearInterval(checkInterval);
            observer.disconnect();
        });
    }
    
    // 安全初始化
    function safeInit() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                // 延迟初始化以确保页面完全加载
                setTimeout(init, 1000);
            }
        } catch (error) {
            console.error('初始化失败:', error);
            // 重试初始化
            setTimeout(init, 2000);
        }
    }
    
    // 启动脚本
    safeInit();
    
})();