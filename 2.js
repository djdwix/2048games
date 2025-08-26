// ==UserScript==
// @name         安全验证码自动输入助手
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  自动识别并填写页面安全验证计时器的验证码（配套脚本）- 支持后台运行版
// @author       You
// @match        *://*/*
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript  // 新增：后台运行权限
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置参数
    const CHECK_INTERVAL = 15000; // 检测间隔15秒一次
    const AUTO_CONFIRM_DELAY = 1000; // 自动确认延迟1秒
    const BACKGROUND_CHECK_INTERVAL = 5000; // 后台检测间隔5秒
    
    // 获取用户设置 - 默认全部开启
    let autoFillEnabled = GM_getValue('autoFillEnabled', true);
    let autoConfirmEnabled = GM_getValue('autoConfirmEnabled', true);
    let notificationEnabled = GM_getValue('notificationEnabled', true);
    
    let filledCodes = new Set();
    let currentSession = Date.now();
    let isInitialized = false;
    let checkIntervalId = null;
    let backgroundCheckId = null;
    let observer = null;
    let isForeground = document.visibilityState === 'visible';

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
        /* 适配文件2的验证弹窗样式 */
        .verify-modal .verify-code {
            cursor: pointer !important;
        }
        .verify-modal .verify-code.uncopyable {
            cursor: default !important;
            pointer-events: none !important;
        }
    `);
    
    // 后台运行功能
    function initBackgroundRunner() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            isForeground = document.visibilityState === 'visible';
            if (isForeground) {
                log('页面切换到前台，恢复正常检测');
                startForegroundMonitoring();
            } else {
                log('页面切换到后台，启用后台检测');
                startBackgroundMonitoring();
            }
        });
        
        log('后台运行模块初始化完成');
    }
    
    // 前台监控
    function startForegroundMonitoring() {
        // 停止后台检测
        if (backgroundCheckId) {
            clearInterval(backgroundCheckId);
            backgroundCheckId = null;
        }
        
        // 启动前台检测
        if (!checkIntervalId) {
            checkIntervalId = setInterval(monitorVerification, CHECK_INTERVAL);
        }
        
        // 重新启动DOM观察器
        if (observer) {
            observer.disconnect();
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'id']
            });
        }
    }
    
    // 后台监控
    function startBackgroundMonitoring() {
        // 停止前台检测
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }
        
        // 停止DOM观察器
        if (observer) {
            observer.disconnect();
        }
        
        // 启动后台检测（简化版，减少资源消耗）
        if (!backgroundCheckId) {
            backgroundCheckId = setInterval(() => {
                if (hasVerificationElements()) {
                    log('后台检测到验证元素，可能需要用户交互');
                    // 可以在这里触发通知或其它后台操作
                }
            }, BACKGROUND_CHECK_INTERVAL);
        }
    }
    
    // 简单的日志功能
    function log(message) {
        const timeStr = new Date().toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).replace(/\//g, '-');
        console.log(`[验证助手][${timeStr}] ${message}`);
    }
    
    // 检查是否存在验证元素（简化版，用于后台检测）
    function hasVerificationElements() {
        try {
            const codeSelectors = [
                '.verify-code',
                '.security-code',
                '.auth-code',
                '[class*="code"][class*="verify"]'
            ];
            
            for (const selector of codeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el && el.offsetParent) {
                        const text = el.textContent || '';
                        const numericText = text.replace(/\D/g, '');
                        if (numericText.length === 6 && /^\d{6}$/.test(numericText)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // 创建增强版状态指示器
    function createEnhancedStatusIndicator() {
        const oldIndicator = document.getElementById('auto-fill-status');
        if (oldIndicator) {
            try {
                oldIndicator.remove();
            } catch (e) {
                console.warn('移除旧指示器失败:', e);
            }
        }
        
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
            <span>验证助手: ${autoFillEnabled ? '开启' : '关闭'}</span>
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
            try {
                if (e.shiftKey) {
                    autoConfirmEnabled = !autoConfirmEnabled;
                    GM_setValue('autoConfirmEnabled', autoConfirmEnabled);
                    showNotification(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
                } else if (e.ctrlKey) {
                    notificationEnabled = !notificationEnabled;
                    GM_setValue('notificationEnabled', notificationEnabled);
                    showNotification(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                } else {
                    autoFillEnabled = !autoFillEnabled;
                    GM_setValue('autoFillEnabled', autoFillEnabled);
                    updateStatusIndicator();
                    showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                }
            } catch (error) {
                console.error('切换功能时出错:', error);
            }
        });
        
        // 添加右键菜单
        indicator.addEventListener('contextmenu', function(e) {
            try {
                e.preventDefault();
                showQuickMenu(e.clientX, e.clientY);
            } catch (error) {
                console.error('显示右键菜单时出错:', error);
            }
        });
        
        try {
            document.body.appendChild(indicator);
        } catch (error) {
            console.error('添加状态指示器失败:', error);
        }
        
        return indicator;
    }
    
    // 显示快捷菜单
    function showQuickMenu(x, y) {
        const existingMenu = document.getElementById('auto-fill-menu');
        if (existingMenu) {
            try {
                existingMenu.remove();
            } catch (e) {
                console.warn('移除旧菜单失败:', e);
            }
        }
        
        const menu = document.createElement('div');
        menu.id = 'auto-fill-menu';
        menu.className = 'auto-fill-menu';
        menu.style.left = Math.min(x, window.innerWidth - 170) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
        
        menu.innerHTML = `
            <div class="menu-item" data-action="toggle-auto">自动输入: ${autoFillEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-confirm">自动确认: ${autoConfirmEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-notify">通知: ${notificationEnabled ? '关闭' : '开启'}</div>
            <hr style="margin:5px 0;border-color:rgba(76, 201, 240, 0.3)">
            <div class="menu-item" data-action="manual-trigger">立即检测验证码</div>
            <div class="menu-item" data-action="reset-session">重置当前会话</div>
            <div class="menu-item" data-action="check-now">强制立即检测</div>
            <div class="menu-item" data-action="toggle-background">后台模式: ${isForeground ? '关闭' : '开启'}</div>
        `;
        
        menu.addEventListener('click', function(e) {
            try {
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
                        showNotification('正在检测验证码...');
                        break;
                    case 'reset-session':
                        currentSession = Date.now();
                        filledCodes.clear();
                        showNotification('会话已重置');
                        break;
                    case 'check-now':
                        checkForVerificationImmediately();
                        break;
                    case 'toggle-background':
                        if (isForeground) {
                            // 模拟切换到后台
                            startBackgroundMonitoring();
                            showNotification('已启用后台检测模式');
                        } else {
                            // 模拟切换到前台
                            startForegroundMonitoring();
                            showNotification('已启用前台检测模式');
                        }
                        break;
                }
                menu.remove();
            } catch (error) {
                console.error('菜单操作时出错:', error);
            }
        });
        
        const closeMenuHandler = function(e) {
            try {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenuHandler);
                }
            } catch (error) {
                console.error('关闭菜单时出错:', error);
            }
        };
        
        setTimeout(() => {
            try {
                document.addEventListener('click', closeMenuHandler);
            } catch (error) {
                console.error('添加菜单关闭监听器失败:', error);
            }
        }, 100);
        
        try {
            document.body.appendChild(menu);
        } catch (error) {
            console.error('添加菜单失败:', error);
        }
    }
    
    // 立即检测验证码
    function checkForVerificationImmediately() {
        showNotification('强制检测中...');
        monitorVerification();
    }
    
    // 更新状态指示器
    function updateStatusIndicator() {
        try {
            const indicator = document.getElementById('auto-fill-status');
            if (indicator) {
                indicator.style.color = autoFillEnabled ? '#4cc9f0' : '#f72585';
                const spans = indicator.getElementsByTagName('span');
                if (spans[0]) spans[0].textContent = autoFillEnabled ? '🔒' : '🔓';
                if (spans[1]) spans[1].textContent = `验证助手: ${autoFillEnabled ? '开启' : '关闭'}`;
            }
        } catch (error) {
            console.error('更新状态指示器时出错:', error);
        }
    }
    
    // 显示通知
    function showNotification(message) {
        if (!notificationEnabled) return;
        
        try {
            const oldNotices = document.querySelectorAll('.auto-fill-notice');
            oldNotices.forEach(notice => {
                try {
                    notice.remove();
                } catch (e) {
                    console.warn('移除旧通知失败:', e);
                }
            });
            
            if (typeof GM_notification === 'function') {
                try {
                    GM_notification({
                        text: message,
                        title: '验证助手 v1.5',
                        timeout: 2500,
                        highlight: true
                    });
                    return;
                } catch (error) {
                    console.warn('GM_notification 失败，使用备用通知:', error);
                }
            }
            
            // 备用通知
            const notice = document.createElement('div');
            notice.className = 'auto-fill-notice';
            notice.textContent = message;
            
            document.body.appendChild(notice);
            setTimeout(() => {
                try {
                    if (notice.parentNode) {
                        notice.remove();
                    }
                } catch (e) {
                    console.warn('移除通知失败:', e);
                }
            }, 2500);
            
        } catch (error) {
            console.error('显示通知时出错:', error);
        }
    }
    
    // 查找验证码和输入框
    function findVerificationElements() {
        try {
            const codeSelectors = [
                '.verify-code:not(.uncopyable)',
                '.verify-code',
                '.security-code',
                '.auth-code',
                '.validation-code',
                '[class*="code"][class*="verify"]',
                '[class*="verify"][class*="code"]',
                '[class*="security"][class*="code"]',
                '.code-text',
                '.verification-number',
                '.captcha-code'
            ];
            
            for (const selector of codeSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        if (!el || !el.offsetParent) continue;
                        
                        const text = el.textContent || '';
                        const numericText = text.replace(/\D/g, '');
                        if (numericText.length === 6 && /^\d{6}$/.test(numericText)) {
                            const inputElement = findInputElement();
                            if (inputElement) {
                                return {
                                    codeElement: el,
                                    inputElement: inputElement,
                                    modal: el.closest('.verify-modal, .modal, .popup, .dialog')
                                };
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('查找验证元素时出错:', error);
            return null;
        }
    }
    
    // 查找输入框
    function findInputElement() {
        const inputSelectors = [
            '.verify-input',
            '.security-input',
            '.auth-input',
            '.code-input',
            'input[type="text"][placeholder*="码"]',
            'input[type="text"][placeholder*="code"]',
            'input[type="text"][placeholder*="验证"]',
            'input[type="text"][placeholder*="请输入"]',
            'input[type="text"][maxlength="6"]',
            'input[type="text"][pattern="\\d{6}"]',
            'input[type="text"]'
        ];
        
        for (const selector of inputSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el && el.offsetParent && !el.disabled && el.type === 'text') {
                        return el;
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }
    
    // 提取验证码
    function extractVerificationCode(codeElement) {
        if (!codeElement) return null;
        
        try {
            let code = codeElement.textContent || '';
            code = code.replace(/\D/g, '');
            
            if (code.length === 6 && /^\d{6}$/.test(code)) {
                return code;
            }
            
            const dataAttributes = ['data-code', 'data-value', 'data-verify', 'data-number', 'data-auth'];
            for (const attr of dataAttributes) {
                try {
                    const dataCode = codeElement.getAttribute(attr);
                    if (dataCode) {
                        const numericCode = dataCode.replace(/\D/g, '');
                        if (numericCode.length === 6) {
                            return numericCode;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('提取验证码时出错:', error);
            return null;
        }
    }
    
    // 自动填写验证码
    function autoFillVerificationCode() {
        if (!autoFillEnabled) return false;
        
        try {
            const elements = findVerificationElements();
            if (!elements) return false;
            
            // 检查元素是否仍然在DOM中
            if (!document.body.contains(elements.codeElement) || !document.body.contains(elements.inputElement)) {
                return false;
            }
            
            const verificationCode = extractVerificationCode(elements.codeElement);
            if (!verificationCode) return false;
            
            const codeKey = `${currentSession}_${verificationCode}`;
            if (filledCodes.has(codeKey)) {
                return false;
            }
            
            // 检查是否已经填写
            if (elements.inputElement.value === verificationCode) {
                filledCodes.add(codeKey);
                return false;
            }
            
            // 填写验证码
            elements.inputElement.value = verificationCode;
            
            // 触发事件
            ['input', 'change'].forEach(eventType => {
                try {
                    const event = new Event(eventType, { bubbles: true });
                    elements.inputElement.dispatchEvent(event);
                } catch (e) {
                    // 忽略事件错误
                }
            });
            
            filledCodes.add(codeKey);
            
            if (notificationEnabled) {
                showNotification(`✅ 验证码已自动填写: ${verificationCode}`);
            }
            
            log(`安全验证码已自动填写: ${verificationCode}`);
            return true;
            
        } catch (error) {
            console.error('自动填写过程中出错:', error);
            return false;
        }
    }
    
    // 尝试自动点击确认按钮
    function tryAutoConfirm() {
        if (!autoConfirmEnabled) return false;
        
        try {
            const confirmButtons = document.querySelectorAll(
                '.confirm-btn, .submit-btn, .verify-btn, ' +
                'button[class*="confirm"], button[class*="submit"], ' +
                'button[class*="verify"], button[type="submit"]'
            );
            
            for (const button of confirmButtons) {
                try {
                    if (button && button.offsetParent && 
                        !button.disabled && 
                        window.getComputedStyle(button).display !== 'none') {
                        setTimeout(() => {
                            try {
                                button.click();
                                if (notificationEnabled) {
                                    showNotification('✅ 已自动提交验证');
                                }
                            } catch (e) {
                                console.warn('点击确认按钮时出错:', e);
                            }
                        }, AUTO_CONFIRM_DELAY);
                        return true;
                    }
                } catch (e) {
                    continue;
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
        if (!isInitialized || !autoFillEnabled) return;
        
        try {
            const filled = autoFillVerificationCode();
            if (filled) {
                setTimeout(tryAutoConfirm, 100);
            }
        } catch (error) {
            console.error('监控过程中出错:', error);
        }
    }
    
    // 初始化
    function init() {
        if (isInitialized) return;
        
        console.log('安全验证码自动输入助手 v1.5 (支持后台运行版) 已启动');
        log('检测间隔: 15秒 | 支持后台运行');
        
        try {
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
            
            // 初始化后台运行模块
            initBackgroundRunner();
            
            // 根据当前可见状态启动相应的监控模式
            if (isForeground) {
                startForegroundMonitoring();
            } else {
                startBackgroundMonitoring();
            }
            
            // 监听DOM变化（仅在前台）
            observer = new MutationObserver(function(mutations) {
                if (!isForeground) return;
                
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
                        setTimeout(monitorVerification, 500);
                        break;
                    }
                }
            });
            
            if (isForeground) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'style', 'id']
                });
            }
            
            // 页面加载后立即检测一次
            setTimeout(monitorVerification, 3000);
            
            // 添加键盘快捷键
            document.addEventListener('keydown', function(e) {
                try {
                    if (e.altKey && e.key === 'a') {
                        e.preventDefault();
                        autoFillEnabled = !autoFillEnabled;
                        GM_setValue('autoFillEnabled', autoFillEnabled);
                        updateStatusIndicator();
                        showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                    }
                    if (e.altKey && e.key === 's') {
                        e.preventDefault();
                        monitorVerification();
                        showNotification('手动触发检测');
                    }
                    if (e.altKey && e.key === 'd') {
                        e.preventDefault();
                        checkForVerificationImmediately();
                    }
                    if (e.altKey && e.key === 'b') {
                        e.preventDefault();
                        if (isForeground) {
                            startBackgroundMonitoring();
                            showNotification('已启用后台检测模式');
                        } else {
                            startForegroundMonitoring();
                            showNotification('已启用前台检测模式');
                        }
                    }
                } catch (error) {
                    console.error('快捷键处理错误:', error);
                }
            });
            
            showNotification(`验证助手已启动 (${isForeground ? '前台' : '后台'}模式)`);
            
        } catch (error) {
            console.error('初始化过程中出错:', error);
            // 重试初始化
            setTimeout(init, 5000);
        }
    }
    
    // 安全初始化
    function safeInit() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                setTimeout(init, 2000);
            }
        } catch (error) {
            console.error('安全初始化失败:', error);
            setTimeout(init, 3000);
        }
    }
    
    // 启动脚本
    safeInit();
    
})();