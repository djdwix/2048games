// ==UserScript==
// @name         安全验证码自动输入助手
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  自动识别并填写页面安全验证计时器的验证码（配套脚本）- 支持后台运行版
// @author       You
// @match        *://*/*
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript
// @grant        GM_download
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置参数
    const CHECK_INTERVAL = 15000; // 检测间隔15秒一次
    const AUTO_CONFIRM_DELAY = 1000; // 自动确认延迟1秒
    const BACKGROUND_CHECK_INTERVAL = 5000; // 后台检测间隔5秒

    // 获取用户设置 - 默认自动输入开启
    let autoFillEnabled = GM_getValue('autoFillEnabled', true);
    let autoConfirmEnabled = GM_getValue('autoConfirmEnabled', true);
    let notificationEnabled = GM_getValue('notificationEnabled', true);
    let imageCaptchaEnabled = GM_getValue('imageCaptchaEnabled', true);

    let filledCodes = new Set();
    let currentSession = Date.now();
    let isInitialized = false;
    let checkIntervalId = null;
    let backgroundCheckId = null;
    let observer = null;
    let isForeground = document.visibilityState === 'visible';
    let operationLogs = [];

    // 添加全局样式
    GM_addStyle(`
        .auto-fill-menu {
            position: fixed !important;
            background: rgba(15, 23, 42, 0.98) !important;
            border: 1px solid rgba(76, 201, 240, 0.6) !important;
            border-radius: 8px !important;
            padding: 8px 0 !important;
            z-index: 10001 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            min-width: 180px !important;
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
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            padding: 10px 15px !important;
            background: rgba(15, 23, 42, 0.95) !important;
            border: 1px solid rgba(76, 201, 240, 0.6) !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            z-index: 10000 !important;
            cursor: pointer !important;
            user-select: none !important;
            box-shadow: 0 3px 12px rgba(76, 201, 240, 0.4) !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            transition: all 0.3s ease !important;
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

    // 添加日志记录
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).replace(/\//g, '-');
        
        const logEntry = {
            timestamp,
            type,
            message
        };
        
        operationLogs.push(logEntry);
        
        // 保持日志数量在合理范围内
        if (operationLogs.length > 1000) {
            operationLogs = operationLogs.slice(-500);
        }
        
        log(message);
    }

    // 导出日志
    function exportLogs() {
        try {
            if (operationLogs.length === 0) {
                showNotification('暂无日志可导出');
                return;
            }

            const logContent = operationLogs.map(log => 
                `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
            ).join('\n');

            const filename = `验证助手日志_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
            
            if (typeof GM_download === 'function') {
                GM_download({
                    data: 'data:text/plain;charset=utf-8,' + encodeURIComponent(logContent),
                    filename: filename,
                    saveAs: true
                });
            } else {
                // 备用下载方法
                const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            
            showNotification('日志导出成功');
            addLog('用户导出了操作日志', 'export');
        } catch (error) {
            console.error('导出日志时出错:', error);
            showNotification('日志导出失败');
        }
    }

    // 后台运行功能
    function initBackgroundRunner() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            isForeground = document.visibilityState === 'visible';
            if (isForeground) {
                addLog('页面切换到前台，恢复正常检测');
                startForegroundMonitoring();
            } else {
                addLog('页面切换到后台，启用后台检测');
                startBackgroundMonitoring();
            }
        });

        addLog('后台运行模块初始化完成');
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
                    addLog('后台检测到验证元素，可能需要用户交互');
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
                '[class*="code"][class*="verify"]',
                '.captcha-img',
                '.verification-image',
                '.img-captcha'
            ];

            for (const selector of codeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el && el.offsetParent) {
                        // 文本验证码
                        if (el.textContent) {
                            const text = el.textContent || '';
                            const codeText = text.replace(/\s/g, '');
                            if ((codeText.length === 6 && /^\d{6}$/.test(codeText)) || 
                                (codeText.length >= 4 && codeText.length <= 8 && /^[a-zA-Z0-9]+$/.test(codeText))) {
                                return true;
                            }
                        }
                        // 图片验证码
                        if (el.tagName === 'IMG' && imageCaptchaEnabled) {
                            const altText = el.alt || '';
                            const srcText = el.src || '';
                            if (altText.length >= 4 && altText.length <= 8 && /^[a-zA-Z0-9]+$/.test(altText)) {
                                return true;
                            }
                            if (srcText.includes('captcha') || srcText.includes('verify') || 
                                srcText.includes('code') || el.className.includes('captcha')) {
                                return true;
                            }
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
        indicator.id = 'auto-fill-status';
        indicator.style.color = autoFillEnabled ? '#4cc9f0' : '#f72585';
        indicator.innerHTML = `
            <span style="font-size:16px !important">${autoFillEnabled ? '🔓' : '🔒'}</span>
            <span>验证助手: ${autoFillEnabled ? '开启' : '关闭'}</span>
        `;

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
                    addLog(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
                } else if (e.ctrlKey) {
                    notificationEnabled = !notificationEnabled;
                    GM_setValue('notificationEnabled', notificationEnabled);
                    showNotification(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                    addLog(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                } else if (e.altKey) {
                    imageCaptchaEnabled = !imageCaptchaEnabled;
                    GM_setValue('imageCaptchaEnabled', imageCaptchaEnabled);
                    showNotification(`图片验证码 ${imageCaptchaEnabled ? '开启' : '关闭'}`);
                    addLog(`图片验证码 ${imageCaptchaEnabled ? '开启' : '关闭'}`);
                } else {
                    autoFillEnabled = !autoFillEnabled;
                    GM_setValue('autoFillEnabled', autoFillEnabled);
                    updateStatusIndicator();
                    showNotification(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                    addLog(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                }
            } catch (error) {
                console.error('切换功能时出错:', error);
                addLog('切换功能时出错: ' + error.message, 'error');
            }
        });

        // 添加右键菜单
        indicator.addEventListener('contextmenu', function(e) {
            try {
                e.preventDefault();
                showQuickMenu(e.clientX, e.clientY);
            } catch (error) {
                console.error('显示右键菜单时出错:', error);
                addLog('显示右键菜单时出错: ' + error.message, 'error');
            }
        });

        try {
            document.body.appendChild(indicator);
        } catch (error) {
            console.error('添加状态指示器失败:', error);
            addLog('添加状态指示器失败: ' + error.message, 'error');
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
        
        // 菜单移动到中间偏下位置
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight * 0.6; // 中间偏下
        menu.style.left = Math.min(centerX - 90, window.innerWidth - 180) + 'px';
        menu.style.top = Math.min(centerY, window.innerHeight - 250) + 'px';

        menu.innerHTML = `
            <div class="menu-item" data-action="toggle-auto">自动输入: ${autoFillEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-confirm">自动确认: ${autoConfirmEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-notify">通知: ${notificationEnabled ? '关闭' : '开启'}</div>
            <div class="menu-item" data-action="toggle-image-captcha">图片验证码: ${imageCaptchaEnabled ? '关闭' : '开启'}</div>
            <hr style="margin:5px 0;border-color:rgba(76, 201, 240, 0.3)">
            <div class="menu-item" data-action="manual-trigger">立即检测验证码</div>
            <div class="menu-item" data-action="reset-session">重置当前会话</div>
            <div class="menu-item" data-action="check-now">强制立即检测</div>
            <div class="menu-item" data-action="toggle-background">后台模式: ${isForeground ? '关闭' : '开启'}</div>
            <hr style="margin:5px 0;border-color:rgba(76, 201, 240, 0.3)">
            <div class="menu-item" data-action="export-logs">导出操作日志</div>
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
                        addLog(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                        break;
                    case 'toggle-confirm':
                        autoConfirmEnabled = !autoConfirmEnabled;
                        GM_setValue('autoConfirmEnabled', autoConfirmEnabled);
                        showNotification(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
                        addLog(`自动确认 ${autoConfirmEnabled ? '开启' : '关闭'}`);
                        break;
                    case 'toggle-notify':
                        notificationEnabled = !notificationEnabled;
                        GM_setValue('notificationEnabled', notificationEnabled);
                        showNotification(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                        addLog(`通知 ${notificationEnabled ? '开启' : '关闭'}`);
                        break;
                    case 'toggle-image-captcha':
                        imageCaptchaEnabled = !imageCaptchaEnabled;
                        GM_setValue('imageCaptchaEnabled', imageCaptchaEnabled);
                        showNotification(`图片验证码 ${imageCaptchaEnabled ? '开启' : '关闭'}`);
                        addLog(`图片验证码 ${imageCaptchaEnabled ? '开启' : '关闭'}`);
                        break;
                    case 'manual-trigger':
                        monitorVerification();
                        showNotification('正在检测验证码...');
                        addLog('手动触发验证码检测');
                        break;
                    case 'reset-session':
                        currentSession = Date.now();
                        filledCodes.clear();
                        showNotification('会话已重置');
                        addLog('会话已重置');
                        break;
                    case 'check-now':
                        checkForVerificationImmediately();
                        break;
                    case 'toggle-background':
                        if (isForeground) {
                            startBackgroundMonitoring();
                            showNotification('已启用后台检测模式');
                            addLog('已启用后台检测模式');
                        } else {
                            startForegroundMonitoring();
                            showNotification('已启用前台检测模式');
                            addLog('已启用前台检测模式');
                        }
                        break;
                    case 'export-logs':
                        exportLogs();
                        break;
                }
                menu.remove();
            } catch (error) {
                console.error('菜单操作时出错:', error);
                addLog('菜单操作时出错: ' + error.message, 'error');
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
                addLog('关闭菜单时出错: ' + error.message, 'error');
            }
        };

        setTimeout(() => {
            try {
                document.addEventListener('click', closeMenuHandler);
            } catch (error) {
                console.error('添加菜单关闭监听器失败:', error);
                addLog('添加菜单关闭监听器失败: ' + error.message, 'error');
            }
        }, 100);

        try {
            document.body.appendChild(menu);
        } catch (error) {
            console.error('添加菜单失败:', error);
            addLog('添加菜单失败: ' + error.message, 'error');
        }
    }

    // 立即检测验证码
    function checkForVerificationImmediately() {
        showNotification('强制检测中...');
        addLog('强制检测验证码');
        monitorVerification();
    }

    // 更新状态指示器
    function updateStatusIndicator() {
        try {
            const indicator = document.getElementById('auto-fill-status');
            if (indicator) {
                indicator.style.color = autoFillEnabled ? '#4cc9f0' : '#f72585';
                const spans = indicator.getElementsByTagName('span');
                if (spans[0]) spans[0].textContent = autoFillEnabled ? '🔓' : '🔒';
                if (spans[1]) spans[1].textContent = `验证助手: ${autoFillEnabled ? '开启' : '关闭'}`;
            }
        } catch (error) {
            console.error('更新状态指示器时出错:', error);
            addLog('更新状态指示器时出错: ' + error.message, 'error');
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
                        title: '验证助手 v1.8',
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
            addLog('显示通知时出错: ' + error.message, 'error');
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
                '.captcha-code',
                '.verification-code'
            ];

            // 图片验证码选择器
            const imageSelectors = [
                '.captcha-img',
                '.verification-image',
                '.img-captcha',
                '.image-code',
                'img[src*="captcha"]',
                'img[src*="verify"]',
                'img[src*="code"]',
                'img[alt*="验证码"]',
                'img[alt*="captcha"]'
            ];

            // 先查找文本验证码
            for (const selector of codeSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        if (!el || !el.offsetParent) continue;

                        const text = el.textContent || '';
                        const cleanText = text.replace(/\s/g, '');
                        
                        // 支持数字和字母验证码
                        if ((cleanText.length === 6 && /^\d{6}$/.test(cleanText)) || 
                            (cleanText.length >= 4 && cleanText.length <= 8 && /^[a-zA-Z0-9]+$/.test(cleanText))) {
                            const inputElement = findInputElement();
                            if (inputElement) {
                                return {
                                    codeElement: el,
                                    inputElement: inputElement,
                                    modal: el.closest('.verify-modal, .modal, .popup, .dialog'),
                                    type: 'text'
                                };
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // 如果启用图片验证码支持，查找图片验证码
            if (imageCaptchaEnabled) {
                for (const selector of imageSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        for (const el of elements) {
                            if (!el || !el.offsetParent || el.tagName !== 'IMG') continue;

                            // 尝试从alt属性获取验证码
                            const altText = (el.alt || '').replace(/\s/g, '');
                            if (altText.length >= 4 && altText.length <= 8 && /^[a-zA-Z0-9]+$/.test(altText)) {
                                const inputElement = findInputElement();
                                if (inputElement) {
                                    return {
                                        codeElement: el,
                                        inputElement: inputElement,
                                        modal: el.closest('.verify-modal, .modal, .popup, .dialog'),
                                        type: 'image',
                                        code: altText
                                    };
                                }
                            }

                            // 尝试从data属性获取验证码
                            const dataAttributes = ['data-code', 'data-value', 'data-captcha', 'data-verify'];
                            for (const attr of dataAttributes) {
                                const dataValue = el.getAttribute(attr);
                                if (dataValue) {
                                    const cleanData = dataValue.replace(/\s/g, '');
                                    if (cleanData.length >= 4 && cleanData.length <= 8 && /^[a-zA-Z0-9]+$/.test(cleanData)) {
                                        const inputElement = findInputElement();
                                        if (inputElement) {
                                            return {
                                                codeElement: el,
                                                inputElement: inputElement,
                                                modal: el.closest('.verify-modal, .modal, .popup, .dialog'),
                                                type: 'image',
                                                code: cleanData
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            return null;
        } catch (error) {
            console.warn('查找验证元素时出错:', error);
            addLog('查找验证元素时出错: ' + error.message, 'error');
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
            'input[type="text"][maxlength="8"]',
            'input[type="text"][pattern="[a-zA-Z0-9]+"]',
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
    function extractVerificationCode(codeElement, type = 'text') {
        if (!codeElement) return null;

        try {
            if (type === 'image') {
                // 图片验证码，直接从传入的code中获取
                return codeElement.code || null;
            }

            // 文本验证码
            let code = codeElement.textContent || '';
            code = code.replace(/\s/g, ''); // 移除所有空白字符

            // 支持数字和字母验证码
            if ((code.length === 6 && /^\d{6}$/.test(code)) || 
                (code.length >= 4 && code.length <= 8 && /^[a-zA-Z0-9]+$/.test(code))) {
                return code;
            }

            const dataAttributes = ['data-code', 'data-value', 'data-verify', 'data-number', 'data-auth'];
            for (const attr of dataAttributes) {
                try {
                    const dataCode = codeElement.getAttribute(attr);
                    if (dataCode) {
                        const cleanCode = dataCode.replace(/\s/g, '');
                        if ((cleanCode.length === 6 && /^\d{6}$/.test(cleanCode)) || 
                            (cleanCode.length >= 4 && cleanCode.length <= 8 && /^[a-zA-Z0-9]+$/.test(cleanCode))) {
                            return cleanCode;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            return null;
        } catch (error) {
            console.warn('提取验证码时出错:', error);
            addLog('提取验证码时出错: ' + error.message, 'error');
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

            const verificationCode = elements.type === 'image' 
                ? elements.code 
                : extractVerificationCode(elements.codeElement, elements.type);
                
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
            ['input', 'change', 'blur'].forEach(eventType => {
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

            addLog(`安全验证码已自动填写: ${verificationCode} (类型: ${elements.type})`);
            return true;

        } catch (error) {
            console.error('自动填写过程中出错:', error);
            addLog('自动填写过程中出错: ' + error.message, 'error');
            return false;
        }
    }

    // 尝试自动点击确认按钮
    function tryAutoConfirm() {
        if (!autoConfirmEnabled) return false;

        try {
            const confirmSelectors = [
                '.confirm-btn', '.submit-btn', '.verify-btn', 
                'button[class*="confirm"]', 'button[class*="submit"]', 
                'button[class*="verify"]', 'button[type="submit"]',
                '.btn-confirm', '.btn-submit', '.btn-verify'
            ];

            for (const selector of confirmSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    for (const button of buttons) {
                        if (button && button.offsetParent && 
                            !button.disabled && 
                            window.getComputedStyle(button).display !== 'none' &&
                            window.getComputedStyle(button).visibility !== 'hidden') {
                            setTimeout(() => {
                                try {
                                    button.click();
                                    if (notificationEnabled) {
                                        showNotification('✅ 已自动提交验证');
                                    }
                                    addLog('已自动点击确认按钮');
                                    return true;
                                } catch (e) {
                                    console.warn('点击确认按钮时出错:', e);
                                    addLog('点击确认按钮时出错: ' + e.message, 'error');
                                }
                            }, AUTO_CONFIRM_DELAY);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            return false;
        } catch (error) {
            console.warn('查找确认按钮时出错:', error);
            addLog('查找确认按钮时出错: ' + error.message, 'error');
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
            addLog('监控过程中出错: ' + error.message, 'error');
        }
    }

    // 初始化
    function init() {
        if (isInitialized) return;

        console.log('安全验证码自动输入助手 v1.8 (支持后台运行版) 已启动');
        addLog('脚本已启动 - 检测间隔: 15秒 | 支持后台运行 | 支持字母和图片验证码');

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
            if (GM_getValue('imageCaptchaEnabled') === undefined) {
                GM_setValue('imageCaptchaEnabled', true);
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
                        addLog(`自动输入 ${autoFillEnabled ? '开启' : '关闭'}`);
                    }
                    if (e.altKey && e.key === 's') {
                        e.preventDefault();
                        monitorVerification();
                        showNotification('手动触发检测');
                        addLog('手动触发验证码检测');
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
                            addLog('已启用后台检测模式');
                        } else {
                            startForegroundMonitoring();
                            showNotification('已启用前台检测模式');
                            addLog('已启用前台检测模式');
                        }
                    }
                    if (e.altKey && e.key === 'l') {
                        e.preventDefault();
                        exportLogs();
                    }
                } catch (error) {
                    console.error('快捷键处理错误:', error);
                    addLog('快捷键处理错误: ' + error.message, 'error');
                }
            });

            showNotification(`验证助手已启动 (${isForeground ? '前台' : '后台'}模式)`);

        } catch (error) {
            console.error('初始化过程中出错:', error);
            addLog('初始化过程中出错: ' + error.message, 'error');
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
            addLog('安全初始化失败: ' + error.message, 'error');
            setTimeout(init, 3000);
        }
    }

    // 启动脚本
    safeInit();

})();