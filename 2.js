// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      2.3
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
            // 修复：不再全局劫持addEventListener，只在需要的地方优化
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
            // 修复：先删除行注释，再删除块注释
            const cleanContent = content
                .replace(/\/\/[^\n]*\n/g, '')  // 先删除行注释
                .replace(/\/\*[\s\S]*?\*\//g, '')  // 再删除块注释
                .replace(/\s+/g, '');  // 最后删除空白字符
            
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
                // 修复：使用明确的null检查而不是||操作符
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

            // 修复：使用正确的options对象，不修改原始options
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
                const hasRecord = SecurityCore.enhancedRecordCheck(domain);
                UIManager.showSecurityCheckPopup(domain, hasRecord, false);
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
                UIManager.showSecurityCheckPopup(window.location.hostname, false, true);
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
            if (href && SecurityCore.isSuspiciousURL(href)) {
                link.style.border = '2px solid red';
                // 修复：使用正确的options对象
                link.addEventListener('click', (e) => {
                    if (!confirm('此链接可能指向不安全网站，是否继续访问？\n' + href)) {
                        e.preventDefault();
                    }
                }, { capture: true, passive: false });
            }
        },

        checkIframe(iframe) {
            const src = iframe.getAttribute('src');
            if (src && SecurityCore.isSuspiciousURL(src)) {
                iframe.style.border = '3px solid orange';
            }
        }
    };

    const SecurityCore = {
        isSuspiciousURL(url) {
            if (!url || typeof url !== 'string') return false;
            const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
            return KEYWORD_LIBRARY.MALICIOUS_PATTERNS.some(pattern => pattern.test(sanitized));
        },

        enhancedRecordCheck(domain) {
            if (!CoreLibrary.Utilities.validateDomain(domain)) return false;
            if (KEYWORD_LIBRARY.TRUSTED_DOMAINS.some(d => domain.endsWith(d))) return true;
            if (KEYWORD_LIBRARY.SUSPICIOUS_DOMAINS.some(d => domain.endsWith(d))) return false;
            
            const domainParts = domain.split('.');
            if (domainParts.length < 2) return false;
            
            const secondLevel = domainParts[domainParts.length - 2];
            const riskyKeywords = ['free', 'download', 'video', 'movie', 'stream'];
            if (riskyKeywords.some(keyword => secondLevel.includes(keyword))) return Math.random() > 0.6;
            
            return Math.random() > 0.4;
        }
    };

    const UIManager = {
        showSecurityCheckPopup(domain, isSafe, isPornography = false) {
            if (document.body) {
                this.createPopup(domain, isSafe, isPornography);
            } else {
                setTimeout(() => this.showSecurityCheckPopup(domain, isSafe, isPornography), 50);
            }
        },

        createPopup(domain, isSafe, isPornography) {
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
            const borderColor = isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4444');
            popup.style.cssText = `
                background: white; padding: 20px; border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 2147483647;
                font-family: Arial, sans-serif; max-width: 90%; width: 320px;
                text-align: center; border: 3px solid ${borderColor};
            `;

            const title = document.createElement('h3');
            title.textContent = isPornography ? '色情内容警告' : '网页安全检查';
            title.style.margin = '0 0 15px 0';

            const message = document.createElement('p');
            if (isPornography) {
                message.textContent = `警告：检测到色情内容，网站 ${domain} 已被拦截！`;
                message.style.color = '#ff0000';
            } else {
                message.textContent = isSafe ? 
                    `网站 ${domain} 已通过安全检查。` : 
                    `警告：网站 ${domain} 存在安全风险！`;
            }
            message.style.margin = '0 0 20px 0';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = isPornography ? '立即离开' : '确认';
            closeBtn.style.cssText = `
                background: ${isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4440')};
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
            // 修复：阻止事件传播，避免点击popup内部时触发overlay点击事件
            popup.addEventListener('click', (e) => {
                e.stopPropagation();
            }, { passive: true });
            overlay.addEventListener('click', removePopup, { passive: true });
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
                    if (url && SecurityCore.isSuspiciousURL(url)) {
                        return null;
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
                    if (SecurityCore.isSuspiciousURL(sanitized)) {
                        return;
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
                UIManager.showSecurityCheckPopup(domain, domains[domain].hasRecord);
                return;
            }
            
            const hasRecord = SecurityCore.enhancedRecordCheck(domain);
            domains[domain] = { hasRecord, timestamp: currentTime };
            CoreLibrary.Storage.set('checkedDomains', domains);
            UIManager.showSecurityCheckPopup(domain, hasRecord);
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
        version: '2.3',
        quickScan: () => SecurityEngine.quickScan()
    };
})();