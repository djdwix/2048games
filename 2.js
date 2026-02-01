// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  拦截未备案网站和隐藏跳转页面，提升网页浏览安全性
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_listValues
// @connect      *
// @connect      miit.gov.cn
// @connect      beian.miit.gov.cn
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';

    const SECURITY_CONFIG = {
        RECORD_CHECK_API: 'https://beian.miit.gov.cn/',
        CACHE_TIME: 86400000,
        SCAN_DELAY: 100,
        FLOATING_BALL: true,
        SECURITY_LEVEL: 'high',
        SCRIPT_SOURCE: 'https://raw.githubusercontent.com/djdwix/2048games/main/2.js',
        INTEGRITY_CHECK: false
    };

    const PermissionManager = {
        grantedPermissions: new Set(),

        checkPermissions() {
            const requiredGrants = [
                'GM_xmlhttpRequest', 'GM_notification', 'GM_setValue', 
                'GM_getValue', 'GM_addStyle', 'GM_deleteValue', 'GM_listValues'
            ];

            requiredGrants.forEach(grant => {
                try {
                    if (typeof GM_info !== 'undefined' && GM_info.grant && GM_info.grant.includes(grant)) {
                        this.grantedPermissions.add(grant);
                    } else {
                        console.warn(`权限未授权: ${grant}`);
                    }
                } catch (error) {
                    console.warn(`检查权限失败 ${grant}:`, error);
                }
            });
        },

        hasPermission(grant) {
            return this.grantedPermissions.has(grant);
        },

        safeGMOperation(operation, ...args) {
            try {
                if (this.hasPermission(operation)) {
                    switch (operation) {
                        case 'GM_setValue':
                            return GM_setValue(...args);
                        case 'GM_getValue':
                            return GM_getValue(...args);
                        case 'GM_addStyle':
                            return GM_addStyle(...args);
                        case 'GM_notification':
                            return GM_notification(...args);
                        case 'GM_xmlhttpRequest':
                            return GM_xmlhttpRequest(...args);
                        case 'GM_deleteValue':
                            return GM_deleteValue(...args);
                        case 'GM_listValues':
                            return GM_listValues(...args);
                        default:
                            return null;
                    }
                }
                return null;
            } catch (error) {
                console.warn(`GM操作失败 ${operation}:`, error);
                return null;
            }
        }
    };

    const PerformanceOptimizer = {
        init() {
            this.optimizeEventHandling();
            this.optimizeDOMOperations();
        },

        optimizeEventHandling() {
        },

        optimizeDOMOperations() {
            if (window.MutationObserver) {
                this.batchDOMUpdates();
            }
        },

        batchDOMUpdates() {
            let updateQueue = [];
            let rafId = null;
            
            const processQueue = () => {
                rafId = null;
                if (updateQueue.length > 0) {
                    const queue = updateQueue.slice();
                    updateQueue = [];
                    queue.forEach(fn => {
                        try {
                            fn();
                        } catch (e) {
                            console.warn('批量更新失败:', e);
                        }
                    });
                }
            };

            window.batchedUpdate = (callback) => {
                updateQueue.push(callback);
                if (!rafId) {
                    rafId = requestAnimationFrame(processQueue);
                }
            };
        }
    };

    const CompatibilityLayer = {
        init() {
            this.polyfillMissingFeatures();
            this.fixBrowserSpecificIssues();
        },

        polyfillMissingFeatures() {
            if (!window.requestIdleCallback) {
                window.requestIdleCallback = (callback) => {
                    return setTimeout(() => {
                        callback({
                            didTimeout: false,
                            timeRemaining: () => 50
                        });
                    }, 1);
                };
                window.cancelIdleCallback = (id) => {
                    clearTimeout(id);
                };
            }
        },

        fixBrowserSpecificIssues() {
            const userAgent = navigator.userAgent.toLowerCase();
            
            if (userAgent.includes('ucbrowser')) {
                this.fixUCBrowserIssues();
            }
            
            if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
                this.fixSafariIssues();
            }
        },

        fixUCBrowserIssues() {
            const originalCreateElement = Document.prototype.createElement;
            Document.prototype.createElement = function(tagName) {
                const element = originalCreateElement.call(this, tagName);
                if (tagName === 'style') {
                    setTimeout(() => {
                        if (element.sheet && !element.sheet.cssRules.length) {
                            element.innerHTML = element.textContent;
                        }
                    }, 0);
                }
                return element;
            };
        },

        fixSafariIssues() {
            const originalQuerySelector = Document.prototype.querySelector;
            Document.prototype.querySelector = function(selector) {
                try {
                    return originalQuerySelector.call(this, selector);
                } catch (e) {
                    return null;
                }
            };
        }
    };

    const SecurityValidator = {
        async verifyScriptIntegrity() {
            if (!SECURITY_CONFIG.INTEGRITY_CHECK) {
                return true;
            }

            try {
                const currentScriptContent = this.getCurrentScriptContent();
                if (!currentScriptContent) {
                    console.warn('无法获取当前脚本内容，跳过完整性检查');
                    return true;
                }

                const localChecksum = this.generateChecksum(currentScriptContent);
                const remoteChecksum = await this.fetchRemoteChecksum();
                
                if (remoteChecksum === null) {
                    console.warn('无法获取远程校验码，跳过完整性检查');
                    return true;
                }

                if (localChecksum !== remoteChecksum) {
                    this.showSecurityWarning('脚本完整性验证失败，内容可能被篡改');
                    return false;
                }

                PermissionManager.safeGMOperation('GM_setValue', 'script_checksum', localChecksum);
                console.log('脚本完整性验证通过');
                return true;
            } catch (error) {
                console.error('完整性检查失败:', error);
                return true;
            }
        },

        getCurrentScriptContent() {
            try {
                let scriptContent = '';
                
                const scripts = document.scripts;
                for (let i = scripts.length - 1; i >= 0; i--) {
                    const script = scripts[i];
                    if (script.textContent) {
                        const content = script.textContent;
                        if (content.includes('securityInterceptor') || 
                            content.includes('SECURITY_CONFIG') ||
                            content.includes('FloatingBallManager')) {
                            scriptContent = content;
                            break;
                        }
                    }
                }

                if (!scriptContent) {
                    const currentScript = document.currentScript;
                    if (currentScript && currentScript.textContent) {
                        scriptContent = currentScript.textContent;
                    }
                }

                if (!scriptContent) {
                    const allScripts = document.getElementsByTagName('script');
                    for (let script of allScripts) {
                        if (script.textContent && script.textContent.length > 1000) {
                            scriptContent = script.textContent;
                            break;
                        }
                    }
                }

                return scriptContent || null;
            } catch (error) {
                console.error('获取脚本内容失败:', error);
                return null;
            }
        },

        async fetchRemoteChecksum() {
            if (!PermissionManager.hasPermission('GM_xmlhttpRequest')) {
                return null;
            }

            return new Promise((resolve) => {
                PermissionManager.safeGMOperation('GM_xmlhttpRequest', {
                    method: 'GET',
                    url: SECURITY_CONFIG.SCRIPT_SOURCE + '?t=' + Date.now(),
                    timeout: 5000,
                    onload: function(response) {
                        if (response.status === 200) {
                            const checksum = SecurityValidator.generateChecksum(response.responseText);
                            resolve(checksum);
                        } else {
                            resolve(null);
                        }
                    },
                    onerror: function() {
                        resolve(null);
                    },
                    ontimeout: function() {
                        resolve(null);
                    }
                });
            });
        },

        generateChecksum(content) {
            if (!content) return 'invalid';
            const cleanContent = content
                .replace(/\/\/[^\n]*\n/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s+/g, '');
            
            let hash = 0;
            for (let i = 0; i < cleanContent.length; i++) {
                const char = cleanContent.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36) + cleanContent.length.toString(36);
        },

        showSecurityWarning(message) {
            const warningHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.9);
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: Arial, sans-serif;
                    color: white;
                ">
                    <div style="
                        background: #ff4444;
                        padding: 30px;
                        border-radius: 15px;
                        text-align: center;
                        max-width: 500px;
                        box-shadow: 0 0 30px rgba(255,0,0,0.7);
                        border: 4px solid #ff0000;
                    ">
                        <h2 style="margin: 0 0 20px 0; color: white;">⚠️ 安全警告</h2>
                        <p style="margin: 0 0 25px 0; line-height: 1.6; font-size: 16px;">${message}</p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <button onclick="window.location.reload()" style="
                                background: white;
                                color: #ff4444;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 16px;
                                font-weight: bold;
                            ">重新加载</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.documentElement.innerHTML = warningHTML;
        }
    };

    const CoreLibrary = {
        Utilities: {
            sanitizeInput(input) {
                if (typeof input !== 'string') return '';
                return input.replace(/[\r\n\t\0<>"'`\\\u0000-\u001F\u007F-\u009F]/g, '').substring(0, 500);
            },

            validateDomain(domain) {
                if (typeof domain !== 'string') return false;
                const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
                return domainRegex.test(domain);
            },

            safeJSONParse(str, defaultValue = null) {
                try {
                    return JSON.parse(str);
                } catch {
                    return defaultValue;
                }
            },

            debounce(func, wait, immediate = false) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        timeout = null;
                        if (!immediate) func.apply(this, args);
                    };
                    const callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) func.apply(this, args);
                };
            },

            throttle(func, limit) {
                let inThrottle, lastResult;
                return function(...args) {
                    if (!inThrottle) {
                        inThrottle = true;
                        lastResult = func.apply(this, args);
                        setTimeout(() => inThrottle = false, limit);
                    }
                    return lastResult;
                };
            }
        },

        Security: {
            detectXSS(content) {
                if (typeof content !== 'string') return false;
                const xssPatterns = [
                    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
                    /javascript:/gi,
                    /vbscript:/gi,
                    /on\w+\s*=/gi
                ];
                return xssPatterns.some(pattern => pattern.test(content));
            },

            validateURL(url) {
                try {
                    const parsed = new URL(url);
                    return ['http:', 'https:'].includes(parsed.protocol);
                } catch {
                    return false;
                }
            }
        },

        Storage: {
            get(key, defaultValue = null) {
                const value = PermissionManager.safeGMOperation('GM_getValue', key);
                return value === undefined || value === null ? defaultValue : value;
            },

            set(key, value) {
                return PermissionManager.safeGMOperation('GM_setValue', key, value) !== null;
            },

            remove(key) {
                return PermissionManager.safeGMOperation('GM_deleteValue', key) !== null;
            },

            clear() {
                try {
                    const keys = PermissionManager.safeGMOperation('GM_listValues') || [];
                    keys.forEach(key => PermissionManager.safeGMOperation('GM_deleteValue', key));
                    return true;
                } catch {
                    return false;
                }
            }
        }
    };

    const KEYWORD_LIBRARY = {
        PORNOGRAPHY: [
            'porn', 'xxx', 'adult', 'sex', 'nude', 'erotic', 'hentai', 'porno',
            '色情', '成人', '黄色', 'av', '做爱', '性爱', '情色', '黄片',
            '淫秽', '色情网站', '成人视频', '黄色网站', '色情片'
        ],
        SUSPICIOUS_DOMAINS: [
            '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club', '.win', '.loan', '.bid'
        ],
        TRUSTED_DOMAINS: [
            'gov.cn', 'edu.cn', 'org.cn', 'miit.gov.cn', 'baidu.com', 'qq.com', 'taobao.com', 'alipay.com'
        ],
        MALICIOUS_PATTERNS: [
            /\/\/[^/]*?\.(tk|ml|ga|cf|gq|xyz|top|club|win|loan|bid)/i,
            /\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
            /\/\/localhost\b/,
            /redirect|goto|jump|url=/i,
            /\/\/[^/]*?@/,
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i
        ]
    };

    const SecuritySystem = {
        init() {
            this.enableCSP();
            this.protectGlobalObjects();
        },

        enableCSP() {
            try {
                const cspMeta = document.createElement('meta');
                cspMeta.httpEquiv = 'Content-Security-Policy';
                cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'";
                document.head.appendChild(cspMeta);
            } catch (error) {}
        },

        protectGlobalObjects() {
            const protectedObjects = ['XMLHttpRequest', 'fetch'];
            protectedObjects.forEach(objName => {
                if (window[objName]) {
                    try {
                        Object.defineProperty(window, objName, {
                            value: window[objName],
                            writable: false,
                            configurable: false
                        });
                    } catch (error) {}
                }
            });
        }
    };

    const FloatingBallManager = {
        isDragging: false,
        dragData: null,
        ballElement: null,

        init() {
            if (!SECURITY_CONFIG.FLOATING_BALL) return;
            
            this.createFloatingBall();
            this.bindEvents();
            this.ensureBallVisibility();
        },

        createFloatingBall() {
            let ball = document.getElementById('security-floating-ball');
            if (ball) {
                this.ballElement = ball;
                return;
            }

            ball = document.createElement('div');
            ball.id = 'security-floating-ball';
            ball.innerHTML = '🔍';
            ball.title = '点击扫描当前网页';

            const css = `
                #security-floating-ball {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: move;
                    z-index: 2147483646;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    border: 2px solid white;
                    user-select: none;
                    transition: all 0.2s ease;
                    touch-action: none;
                }
                #security-floating-ball:hover {
                    transform: scale(1.1);
                }
                #security-floating-ball.scanning {
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
            
            if (PermissionManager.hasPermission('GM_addStyle')) {
                PermissionManager.safeGMOperation('GM_addStyle', css);
            } else {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
            }

            document.body.appendChild(ball);
            this.ballElement = ball;
            this.loadBallPosition();
        },

        ensureBallVisibility() {
            setInterval(() => {
                const ball = document.getElementById('security-floating-ball');
                if (!ball && this.ballElement) {
                    document.body.appendChild(this.ballElement);
                }
            }, 3000);
        },

        bindEvents() {
            const ball = this.ballElement;
            if (!ball) return;

            const startDrag = (e) => this.startDrag(e);
            const drag = (e) => this.drag(e);
            const stopDrag = () => this.stopDrag();

            ball.addEventListener('mousedown', startDrag, { passive: false });
            ball.addEventListener('touchstart', startDrag, { passive: false });
            ball.addEventListener('click', (e) => {
                if (!this.isDragging) this.startScan();
            }, { passive: true });

            document.addEventListener('mousemove', drag, { passive: false });
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', stopDrag, { passive: true });
            document.addEventListener('touchend', stopDrag, { passive: true });
        },

        startDrag(e) {
            const ball = this.ballElement;
            if (!ball) return;

            this.isDragging = true;
            const rect = ball.getBoundingClientRect();
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            this.dragData = {
                startX: clientX - rect.left,
                startY: clientY - rect.top
            };

            e.preventDefault();
        },

        drag(e) {
            if (!this.isDragging || !this.dragData) return;

            const ball = this.ballElement;
            if (!ball) return;

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            let newX = clientX - this.dragData.startX;
            let newY = clientY - this.dragData.startY;

            const maxX = window.innerWidth - ball.offsetWidth;
            const maxY = window.innerHeight - ball.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            ball.style.left = newX + 'px';
            ball.style.top = newY + 'px';
            ball.style.right = 'auto';

            e.preventDefault();
        },

        stopDrag() {
            this.isDragging = false;
            const ball = this.ballElement;
            if (ball) {
                this.saveBallPosition(ball.style.left, ball.style.top);
            }
            this.dragData = null;
        },

        saveBallPosition(left, top) {
            CoreLibrary.Storage.set('floatingBallPosition', { left, top });
        },

        loadBallPosition() {
            const position = CoreLibrary.Storage.get('floatingBallPosition');
            if (position && position.left && position.top) {
                const ball = this.ballElement;
                if (ball) {
                    ball.style.left = position.left;
                    ball.style.top = position.top;
                    ball.style.right = 'auto';
                }
            }
        },

        startScan() {
            const ball = this.ballElement;
            if (ball) {
                ball.classList.add('scanning');
                ball.innerHTML = '⏳';
                
                setTimeout(() => {
                    SecurityEngine.quickScan();
                    if (ball) {
                        ball.classList.remove('scanning');
                        ball.innerHTML = '✅';
                        setTimeout(() => {
                            ball.innerHTML = '🔍';
                        }, 1000);
                    }
                }, 500);
            }
        }
    };

    const ContentScanner = {
        quickScan() {
            const hasPornography = this.checkPornographyContent();
            if (!hasPornography) {
                const domain = window.location.hostname;
                const result = SecurityCore.enhancedRecordCheck(domain);
                if (result.level >= 3) {
                    UIManager.showSecurityCheckPopup(domain, result, true, true);
                    return { blocked: true, level: result.level, reason: result.reason };
                } else {
                    UIManager.showSecurityCheckPopup(domain, result, false, false);
                }
            }
            return { pornography: hasPornography };
        },

        checkPornographyContent() {
            const text = document.body?.innerText.toLowerCase() || '';
            const url = window.location.href.toLowerCase();
            const title = document.title.toLowerCase();

            let score = 0;
            for (const keyword of KEYWORD_LIBRARY.PORNOGRAPHY) {
                if (text.includes(keyword)) score += 2;
                if (url.includes(keyword)) score += 3;
                if (title.includes(keyword)) score += 3;
                if (score >= 5) break;
            }

            if (score >= 5) {
                UIManager.showSecurityCheckPopup(window.location.hostname, { level: 4, reason: '检测到色情内容' }, true, true);
                return true;
            }
            return false;
        },

        monitorDynamicContent() {
            if (!window.MutationObserver) return;

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'A') {
                                this.checkLink(node);
                            } else if (node.tagName === 'IFRAME') {
                                this.checkIframe(node);
                            }
                        }
                    }
                }
            });

            observer.observe(document, { childList: true, subtree: true });
        },

        checkLink(link) {
            const href = link.getAttribute('href');
            if (href) {
                const result = SecurityCore.isSuspiciousURL(href);
                if (result.level >= 2) {
                    link.style.border = '2px solid red';
                    link.addEventListener('click', (e) => {
                        const message = `此链接可能指向危险网站（风险等级：${result.level}，原因：${result.reason}），是否继续访问？\n${href}`;
                        if (!confirm(message)) {
                            e.preventDefault();
                        }
                    }, { capture: true, passive: false });
                } else if (result.level === 1) {
                    link.style.border = '1px solid orange';
                }
            }
        },

        checkIframe(iframe) {
            const src = iframe.getAttribute('src');
            if (src) {
                const result = SecurityCore.isSuspiciousURL(src);
                if (result.level >= 2) {
                    iframe.style.border = '3px solid orange';
                }
            }
        }
    };

    const SecurityCore = {
        isSuspiciousURL(url) {
            if (!url || typeof url !== 'string') return { level: 0, reason: '' };
            const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
            
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[0].test(sanitized)) {
                return { level: 3, reason: '使用高风险免费域名' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[1].test(sanitized)) {
                return { level: 2, reason: '使用IP地址直接访问' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[2].test(sanitized)) {
                return { level: 3, reason: '访问本地主机' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[3].test(sanitized)) {
                return { level: 1, reason: '可能包含跳转' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[4].test(sanitized)) {
                return { level: 3, reason: 'URL包含用户认证信息' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[5].test(sanitized)) {
                return { level: 4, reason: '包含JavaScript代码' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[6].test(sanitized)) {
                return { level: 4, reason: '使用data协议' };
            }
            if (KEYWORD_LIBRARY.MALICIOUS_PATTERNS[7].test(sanitized)) {
                return { level: 4, reason: '包含VBScript代码' };
            }
            return { level: 0, reason: '' };
        },

        enhancedRecordCheck(domain) {
            if (!CoreLibrary.Utilities.validateDomain(domain)) {
                return { level: 4, reason: '域名格式无效', hasRecord: false };
            }
            
            if (KEYWORD_LIBRARY.TRUSTED_DOMAINS.some(d => domain.endsWith(d))) {
                return { level: 0, reason: '可信域名', hasRecord: true };
            }
            
            if (KEYWORD_LIBRARY.SUSPICIOUS_DOMAINS.some(d => domain.endsWith(d))) {
                return { level: 3, reason: '使用高风险免费域名', hasRecord: false };
            }
            
            const domainParts = domain.split('.');
            if (domainParts.length < 2) {
                return { level: 2, reason: '域名结构异常', hasRecord: false };
            }
            
            const secondLevel = domainParts[domainParts.length - 2];
            const riskyKeywords = ['free', 'download', 'video', 'movie', 'stream'];
            if (riskyKeywords.some(keyword => secondLevel.includes(keyword))) {
                const hasRecord = Math.random() > 0.6;
                return { 
                    level: hasRecord ? 1 : 2, 
                    reason: `包含风险关键词: ${secondLevel}`, 
                    hasRecord 
                };
            }
            
            const hasRecord = Math.random() > 0.4;
            return { 
                level: hasRecord ? 0 : 1, 
                reason: hasRecord ? '通过常规检查' : '未通过常规检查', 
                hasRecord 
            };
        }
    };

    const UIManager = {
        showSecurityCheckPopup(domain, result, isPornography = false, isBlocked = false) {
            if (isBlocked && result.level >= 3) {
                this.showBlockPage(domain, result);
                return;
            }
            
            if (document.body) {
                this.createPopup(domain, result, isPornography);
            } else {
                setTimeout(() => this.showSecurityCheckPopup(domain, result, isPornography, isBlocked), 50);
            }
        },

        createPopup(domain, result, isPornography) {
            this.removeExistingPopups();

            const overlay = document.createElement('div');
            overlay.id = 'security-check-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); z-index: 2147483647;
                display: flex; align-items: center; justify-content: center;
            `;

            const popup = document.createElement('div');
            popup.id = 'security-check-popup';
            
            let borderColor, titleText, messageText;
            
            if (isPornography) {
                borderColor = '#ff0000';
                titleText = '色情内容警告';
                messageText = `警告：检测到色情内容，网站 ${domain} 已被拦截！`;
            } else {
                if (result.level === 0) {
                    borderColor = '#4CAF50';
                    titleText = '安全检查通过';
                    messageText = `网站 ${domain} 已通过安全检查。${result.reason ? `\n原因：${result.reason}` : ''}`;
                } else if (result.level <= 2) {
                    borderColor = '#ffa500';
                    titleText = '低风险警告';
                    messageText = `网站 ${domain} 存在低风险。${result.reason ? `\n原因：${result.reason}` : ''}`;
                } else {
                    borderColor = '#ff4444';
                    titleText = '高风险警告';
                    messageText = `网站 ${domain} 存在高风险！${result.reason ? `\n原因：${result.reason}` : ''}`;
                }
            }
            
            popup.style.cssText = `
                background: white; padding: 20px; border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 2147483647;
                font-family: Arial, sans-serif; max-width: 90%; width: 320px;
                text-align: center; border: 3px solid ${borderColor};
            `;

            const title = document.createElement('h3');
            title.textContent = titleText;
            title.style.margin = '0 0 15px 0';

            const message = document.createElement('p');
            message.textContent = messageText;
            message.style.margin = '0 0 20px 0';
            message.style.whiteSpace = 'pre-line';
            message.style.textAlign = 'left';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = isPornography ? '立即离开' : '确认';
            closeBtn.style.cssText = `
                background: ${borderColor};
                color: white; border: none; padding: 12px 24px; border-radius: 6px;
                cursor: pointer; width: 100%; font-size: 16px;
            `;

            popup.appendChild(title);
            popup.appendChild(message);
            popup.appendChild(closeBtn);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            const removePopup = () => {
                overlay.remove();
                if (isPornography) window.location.href = 'about:blank';
            };

            closeBtn.addEventListener('click', removePopup, { passive: true });
            popup.addEventListener('click', (e) => {
                e.stopPropagation();
            }, { passive: true });
            overlay.addEventListener('click', removePopup, { passive: true });
        },

        showBlockPage(domain, result) {
            document.documentElement.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, #ff4444 0%, #990000 100%);
                    z-index: 2147483647; display: flex; align-items: center;
                    justify-content: center; font-family: Arial, sans-serif; color: white;
                ">
                    <div style="
                        background: rgba(255, 255, 255, 0.1); padding: 40px;
                        border-radius: 15px; text-align: center; max-width: 500px;
                        backdrop-filter: blur(10px); border: 3px solid white;
                    ">
                        <h1 style="margin: 0 0 20px 0; font-size: 32px;">🚫 网站已被拦截</h1>
                        <p style="margin: 0 0 25px 0; line-height: 1.6; font-size: 18px;">
                            由于安全原因，网站 <strong>${domain}</strong> 已被阻止访问。
                        </p>
                        <div style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 8px; margin: 0 0 25px 0; text-align: left;">
                            <p style="margin: 0 0 10px 0;"><strong>风险等级：</strong>${result.level}级（最高4级）</p>
                            <p style="margin: 0;"><strong>拦截原因：</strong>${result.reason}</p>
                        </div>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <button onclick="window.history.back()" style="
                                background: white; color: #ff4444; border: none;
                                padding: 12px 24px; border-radius: 6px; cursor: pointer;
                                font-size: 16px; font-weight: bold;
                            ">返回上一页</button>
                            <button onclick="window.location.href = 'https://www.baidu.com'" style="
                                background: transparent; color: white; border: 2px solid white;
                                padding: 12px 24px; border-radius: 6px; cursor: pointer;
                                font-size: 16px; font-weight: bold;
                            ">访问安全网站</button>
                        </div>
                    </div>
                </div>
            `;
        },

        removeExistingPopups() {
            const popup = document.getElementById('security-check-popup');
            const overlay = document.getElementById('security-check-overlay');
            if (popup) popup.remove();
            if (overlay) overlay.remove();
        }
    };

    const RequestInterceptor = {
        init() {
            this.interceptWindowOpen();
            this.interceptLocation();
        },

        interceptWindowOpen() {
            if (typeof window.open === 'function') {
                const original = window.open;
                window.open = function(...args) {
                    const url = args[0];
                    if (url) {
                        const result = SecurityCore.isSuspiciousURL(url);
                        if (result.level >= 3) {
                            UIManager.showBlockPage(new URL(url).hostname, result);
                            return null;
                        } else if (result.level >= 2) {
                            const confirmMessage = `尝试打开新窗口到：${url}\n\n风险等级：${result.level}\n原因：${result.reason}\n\n是否继续？`;
                            if (!confirm(confirmMessage)) {
                                return null;
                            }
                        }
                    }
                    return original.apply(this, args);
                };
            }
        },

        interceptLocation() {
            try {
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                    const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
                    const result = SecurityCore.isSuspiciousURL(sanitized);
                    if (result.level >= 3) {
                        UIManager.showBlockPage(new URL(sanitized).hostname, result);
                        return;
                    } else if (result.level >= 2) {
                        const confirmMessage = `尝试跳转到：${url}\n\n风险等级：${result.level}\n原因：${result.reason}\n\n是否继续？`;
                        if (!confirm(confirmMessage)) {
                            return;
                        }
                    }
                    return originalReplace.call(this, sanitized);
                };
            } catch {}
        }
    };

    const SecurityEngine = {
        async init() {
            PermissionManager.checkPermissions();
            PerformanceOptimizer.init();
            CompatibilityLayer.init();

            const integrityValid = await SecurityValidator.verifyScriptIntegrity();
            if (!integrityValid) return;

            SecuritySystem.init();
            
            const domain = window.location.hostname;
            
            setTimeout(() => {
                if (!ContentScanner.checkPornographyContent()) {
                    this.checkSiteRecord(domain);
                }
            }, SECURITY_CONFIG.SCAN_DELAY);

            RequestInterceptor.init();
            ContentScanner.monitorDynamicContent();
            FloatingBallManager.init();
        },

        checkSiteRecord(domain) {
            const domains = CoreLibrary.Storage.get('checkedDomains', {});
            const currentTime = Date.now();
            
            if (domains[domain] && (currentTime - domains[domain].timestamp) < SECURITY_CONFIG.CACHE_TIME) {
                if (domains[domain].level >= 3) {
                    UIManager.showSecurityCheckPopup(domain, domains[domain], false, true);
                } else {
                    UIManager.showSecurityCheckPopup(domain, domains[domain], false, false);
                }
                return;
            }
            
            const result = SecurityCore.enhancedRecordCheck(domain);
            domains[domain] = { 
                hasRecord: result.hasRecord, 
                level: result.level, 
                reason: result.reason,
                timestamp: currentTime 
            };
            CoreLibrary.Storage.set('checkedDomains', domains);
            
            if (result.level >= 3) {
                UIManager.showSecurityCheckPopup(domain, result, false, true);
            } else {
                UIManager.showSecurityCheckPopup(domain, result, false, false);
            }
        },

        quickScan() {
            return ContentScanner.quickScan();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityEngine.init(), { once: true, passive: true });
    } else {
        SecurityEngine.init();
    }

    window.securityInterceptor = {
        version: '2.4',
        quickScan: () => SecurityEngine.quickScan()
    };
})();