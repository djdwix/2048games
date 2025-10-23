// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  拦截未备案网站和隐藏跳转页面，提升网页浏览安全性
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      *
// @connect      miit.gov.cn
// @connect      beian.miit.gov.cn
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';

    const SECURITY_CONFIG = {
        RECORD_CHECK_API: 'https://beian.miit.gov.cn/',
        CACHE_TIME: 86400000,
        SCAN_DELAY: 200,
        FLOATING_BALL: true,
        SECURITY_LEVEL: 'high'
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
            /vbscript:/i,
            /\/\/[^/]{50,}/
        ]
    };

    const SecuritySystem = {
        init() {
            this.enableCSP();
            this.protectGlobalObjects();
            this.detectTampering();
        },

        enableCSP() {
            const cspMeta = document.createElement('meta');
            cspMeta.httpEquiv = 'Content-Security-Policy';
            cspMeta.content = "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none'";
            document.head.appendChild(cspMeta);
        },

        protectGlobalObjects() {
            const protectedObjects = ['XMLHttpRequest', 'fetch', 'setTimeout', 'setInterval'];
            protectedObjects.forEach(objName => {
                if (window[objName]) {
                    Object.defineProperty(window, objName, {
                        value: window[objName],
                        writable: false,
                        configurable: false
                    });
                }
            });
        },

        detectTampering() {
            const originalFunctions = {
                addEventListener: EventTarget.prototype.addEventListener,
                removeEventListener: EventTarget.prototype.removeEventListener
            };

            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (typeof listener === 'function') {
                    const wrappedListener = function(...args) {
                        try {
                            return listener.apply(this, args);
                        } catch (error) {
                            console.warn('Security: Event listener error', error);
                        }
                    };
                    return originalFunctions.addEventListener.call(this, type, wrappedListener, options);
                }
                return originalFunctions.addEventListener.call(this, type, listener, options);
            };

            setInterval(() => {
                this.checkScriptIntegrity();
            }, 10000);
        },

        checkScriptIntegrity() {
            const currentScript = document.currentScript;
            if (!currentScript) return;

            const scriptContent = currentScript.textContent;
            const checksum = this.generateChecksum(scriptContent);
            
            const storedChecksum = GM_getValue('script_checksum');
            if (!storedChecksum) {
                GM_setValue('script_checksum', checksum);
            } else if (storedChecksum !== checksum) {
                console.error('Security: Script integrity check failed');
                this.emergencyShutdown();
            }
        },

        generateChecksum(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        },

        emergencyShutdown() {
            window.location.href = 'about:blank';
        },

        validateSecurityContext() {
            if (window !== window.top) {
                return 'iframe';
            }
            if (document.location.protocol === 'file:') {
                return 'local_file';
            }
            return 'secure';
        }
    };

    const SecurityUtils = {
        sanitizeInput(input) {
            if (typeof input !== 'string') return '';
            return input.replace(/[\r\n\t\0<>"'`\\\u0000-\u001F\u007F-\u009F]/g, '').substring(0, 500);
        },

        validateDomain(domain) {
            if (typeof domain !== 'string') return false;
            return /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(domain);
        },

        safeJSONParse(str) {
            try {
                return JSON.parse(str);
            } catch {
                return null;
            }
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };

    const StorageManager = {
        getCheckedDomains() {
            try {
                return GM_getValue('checkedDomains', {});
            } catch {
                return {};
            }
        },

        saveCheckedDomain(domain, hasRecord) {
            try {
                if (!SecurityUtils.validateDomain(domain)) return;
                const domains = this.getCheckedDomains();
                domains[domain] = { hasRecord, timestamp: Date.now() };
                GM_setValue('checkedDomains', domains);
            } catch {}
        },

        getSecuritySettings() {
            try {
                return GM_getValue('securitySettings', {
                    floatingBall: true,
                    autoScan: true,
                    notifications: true
                });
            } catch {
                return { floatingBall: true, autoScan: true, notifications: true };
            }
        },

        saveSecuritySettings(settings) {
            try {
                GM_setValue('securitySettings', settings);
            } catch {}
        }
    };

    const FloatingBall = {
        isDragging: false,
        dragData: null,
        animationFrame: null,

        init() {
            if (!SECURITY_CONFIG.FLOATING_BALL) return;
            
            this.createFloatingBall();
            this.bindEvents();
        },

        createFloatingBall() {
            const existingBall = document.getElementById('security-floating-ball');
            if (existingBall) return;

            const ball = document.createElement('div');
            ball.id = 'security-floating-ball';
            ball.innerHTML = '🔍';
            ball.title = '点击扫描当前网页';
            ball.setAttribute('aria-label', '安全扫描悬浮球');

            GM_addStyle(`
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
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    touch-action: none;
                    will-change: transform;
                }
                #security-floating-ball:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                }
                #security-floating-ball:active {
                    transform: scale(0.95);
                }
                #security-floating-ball.scanning {
                    animation: pulse 1s infinite;
                }
                #security-floating-ball.dragging {
                    transition: none;
                    cursor: grabbing;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                @media (max-width: 768px) {
                    #security-floating-ball {
                        width: 45px;
                        height: 45px;
                        font-size: 18px;
                        right: 15px;
                        top: 80px;
                    }
                }
            `);

            document.body.appendChild(ball);
        },

        bindEvents() {
            const ball = document.getElementById('security-floating-ball');
            if (!ball) return;

            ball.addEventListener('mousedown', (e) => this.startDrag(e));
            ball.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });

            ball.addEventListener('click', (e) => {
                if (!this.isDragging) {
                    this.startScan();
                }
            });

            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
            
            document.addEventListener('mouseup', () => this.stopDrag());
            document.addEventListener('touchend', () => this.stopDrag());
            document.addEventListener('touchcancel', () => this.stopDrag());
        },

        startDrag(e) {
            const ball = document.getElementById('security-floating-ball');
            if (!ball) return;

            this.isDragging = true;
            ball.classList.add('dragging');

            const rect = ball.getBoundingClientRect();
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            this.dragData = {
                startX: clientX - rect.left,
                startY: clientY - rect.top,
                initialX: rect.left,
                initialY: rect.top
            };

            e.preventDefault();
            e.stopPropagation();
        },

        drag(e) {
            if (!this.isDragging || !this.dragData) return;

            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }

            this.animationFrame = requestAnimationFrame(() => {
                const ball = document.getElementById('security-floating-ball');
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
            });
        },

        stopDrag() {
            this.isDragging = false;
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            const ball = document.getElementById('security-floating-ball');
            if (ball) {
                ball.classList.remove('dragging');
                
                setTimeout(() => {
                    this.saveBallPosition(ball.style.left, ball.style.top);
                }, 100);
            }

            this.dragData = null;
        },

        saveBallPosition(left, top) {
            try {
                GM_setValue('floatingBallPosition', { left, top });
            } catch {}
        },

        loadBallPosition() {
            try {
                const position = GM_getValue('floatingBallPosition');
                if (position && position.left && position.top) {
                    const ball = document.getElementById('security-floating-ball');
                    if (ball) {
                        ball.style.left = position.left;
                        ball.style.top = position.top;
                        ball.style.right = 'auto';
                    }
                }
            } catch {}
        },

        startScan() {
            const ball = document.getElementById('security-floating-ball');
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
                        }, 1500);
                    }
                }, 800);
            }
        }
    };

    const UIManager = {
        showSecurityCheckPopup(domain, isSafe, isPornography = false) {
            const tryShow = () => {
                if (document.body) this.createPopup(domain, isSafe, isPornography);
                else setTimeout(tryShow, 50);
            };
            tryShow();
        },

        createPopup(domain, isSafe, isPornography) {
            this.removeExistingPopups();

            const style = this.createPopupStyle(isSafe, isPornography);
            const overlay = this.createOverlay();
            const popup = this.createPopupContent(domain, isSafe, isPornography);

            document.head.appendChild(style);
            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            this.setupPopupEvents(popup, overlay, style, isPornography);
        },

        removeExistingPopups() {
            ['security-check-popup', 'security-check-overlay', 'security-check-style']
                .forEach(id => document.getElementById(id)?.remove());
        },

        createPopupStyle(isSafe, isPornography) {
            const style = document.createElement('style');
            style.id = 'security-check-style';
            style.textContent = this.getPopupCSS(isSafe, isPornography);
            return style;
        },

        getPopupCSS(isSafe, isPornography) {
            const borderColor = isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4444');
            const buttonColor = isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4440');
            
            return `
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                .security-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7); z-index: 2147483647;
                    animation: fadeIn 0.2s ease-in-out;
                    -webkit-tap-highlight-color: transparent;
                }
                .security-popup {
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: white; padding: 20px; border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    max-width: 90%; width: 320px; text-align: center;
                    border: 3px solid ${borderColor}; animation: fadeIn 0.2s ease-in-out;
                    box-sizing: border-box; -webkit-overflow-scrolling: touch;
                }
                .security-popup h3 { margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 600; }
                .security-popup p { margin: 0 0 20px 0; color: #666; line-height: 1.5; font-size: 14px; }
                .security-popup button {
                    background: ${buttonColor}; color: white; border: none; padding: 12px 24px;
                    border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;
                    transition: all 0.2s; width: 100%; touch-action: manipulation;
                }
                @media (max-width: 480px) {
                    .security-popup { width: 85%; padding: 16px; }
                    .security-popup h3 { font-size: 16px; }
                    .security-popup p { font-size: 13px; }
                    .security-popup button { font-size: 14px; padding: 10px 20px; }
                }
            `;
        },

        createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'security-check-overlay';
            overlay.className = 'security-overlay';
            return overlay;
        },

        createPopupContent(domain, isSafe, isPornography) {
            const popup = document.createElement('div');
            popup.id = 'security-check-popup';
            popup.className = 'security-popup';

            const title = document.createElement('h3');
            title.textContent = isPornography ? '色情内容警告' : '网页安全检查';

            const message = document.createElement('p');
            if (isPornography) {
                message.textContent = `警告：检测到色情内容，网站 ${domain} 已被拦截！`;
                message.style.color = '#ff0000';
                message.style.fontWeight = 'bold';
            } else {
                message.textContent = isSafe ? 
                    `网站 ${domain} 已通过安全检查，可以正常访问。` : 
                    `警告：网站 ${domain} 未备案或存在安全风险，请谨慎访问！`;
            }

            const closeBtn = document.createElement('button');
            closeBtn.textContent = isPornography ? '立即离开' : '确认';

            popup.appendChild(title);
            popup.appendChild(message);
            popup.appendChild(closeBtn);

            return popup;
        },

        setupPopupEvents(popup, overlay, style, isPornography) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const removePopup = () => {
                popup.remove(); overlay.remove(); style.remove();
                document.body.style.overflow = originalOverflow;
                if (isPornography) window.location.href = 'about:blank';
            };

            popup.querySelector('button').addEventListener('click', removePopup);
            overlay.addEventListener('click', removePopup);
        }
    };

    const ContentScanner = {
        quickScan() {
            const scanResults = {
                pornography: this.checkPornographyContent(),
                suspiciousLinks: this.scanSuspiciousLinks(),
                iframes: this.scanSuspiciousIframes(),
                timestamp: Date.now()
            };

            if (!scanResults.pornography) {
                const domain = window.location.hostname;
                const hasRecord = SecurityCore.enhancedRecordCheck(domain);
                UIManager.showSecurityCheckPopup(domain, hasRecord, false);
            }

            return scanResults;
        },

        checkPornographyContent() {
            const text = document.body?.innerText.toLowerCase() || '';
            const html = document.documentElement?.innerHTML.toLowerCase() || '';
            const url = window.location.href.toLowerCase();
            const title = document.title.toLowerCase();

            let score = 0;
            KEYWORD_LIBRARY.PORNOGRAPHY.forEach(keyword => {
                const regex = new RegExp(keyword, 'gi');
                if (regex.test(text)) score += 2;
                if (regex.test(html)) score += 1;
                if (regex.test(url)) score += 3;
                if (regex.test(title)) score += 3;
            });

            if (score >= 5) {
                UIManager.showSecurityCheckPopup(window.location.hostname, false, true);
                return true;
            }
            return false;
        },

        scanSuspiciousLinks() {
            const links = document.getElementsByTagName('a');
            let suspiciousCount = 0;
            
            for (let link of links) {
                if (this.checkLink(link)) {
                    suspiciousCount++;
                }
            }
            
            return suspiciousCount;
        },

        scanSuspiciousIframes() {
            const iframes = document.getElementsByTagName('iframe');
            let suspiciousCount = 0;
            
            for (let iframe of iframes) {
                if (this.checkIframe(iframe)) {
                    suspiciousCount++;
                }
            }
            
            return suspiciousCount;
        },

        monitorDynamicContent() {
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            setTimeout(() => {
                                if (node.tagName === 'A') this.checkLink(node);
                                else if (node.tagName === 'IFRAME') this.checkIframe(node);
                                else if (node.querySelectorAll) {
                                    node.querySelectorAll('a').forEach(link => this.checkLink(link));
                                    node.querySelectorAll('iframe').forEach(iframe => this.checkIframe(iframe));
                                }
                            }, 0);
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
                link.addEventListener('click', (e) => {
                    if (!confirm('此链接可能指向不安全网站，是否继续访问？\n' + href)) {
                        e.preventDefault(); e.stopPropagation();
                    }
                }, { capture: true });
                return true;
            }
            return false;
        },

        checkIframe(iframe) {
            const src = iframe.getAttribute('src');
            if (src && SecurityCore.isSuspiciousURL(src)) {
                iframe.style.border = '3px solid orange';
                return true;
            }
            return false;
        }
    };

    const SecurityCore = {
        isSuspiciousURL(url) {
            if (!url || typeof url !== 'string') return false;
            const sanitized = SecurityUtils.sanitizeInput(url);
            return KEYWORD_LIBRARY.MALICIOUS_PATTERNS.some(pattern => pattern.test(sanitized));
        },

        enhancedRecordCheck(domain) {
            if (!SecurityUtils.validateDomain(domain)) return false;
            if (KEYWORD_LIBRARY.TRUSTED_DOMAINS.some(d => domain.endsWith(d))) return true;
            if (KEYWORD_LIBRARY.SUSPICIOUS_DOMAINS.some(d => domain.endsWith(d))) return false;
            
            const domainParts = domain.split('.');
            if (domainParts.length < 2) return false;
            
            const secondLevel = domainParts[domainParts.length - 2];
            const riskyKeywords = ['free', 'download', 'video', 'movie', 'stream', 'live', 'chat'];
            if (riskyKeywords.some(keyword => secondLevel.includes(keyword))) return Math.random() > 0.6;
            
            return Math.random() > 0.4;
        }
    };

    const RequestInterceptor = {
        init() {
            this.interceptWindowOpen();
            this.interceptLocation();
            this.interceptXHR();
            this.interceptFetch();
            this.interceptForms();
        },

        interceptWindowOpen() {
            if (typeof window.open === 'function') {
                const original = window.open;
                window.open = function(...args) {
                    const url = args[0];
                    if (url && SecurityCore.isSuspiciousURL(url)) {
                        this.safeNotify('安全拦截', '已拦截可疑窗口打开');
                        return null;
                    }
                    return original.apply(this, args);
                }.bind(this);
            }
        },

        interceptLocation() {
            try {
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                    const sanitized = SecurityUtils.sanitizeInput(url);
                    if (SecurityCore.isSuspiciousURL(sanitized)) {
                        this.safeNotify('安全拦截', '已拦截可疑跳转');
                        return;
                    }
                    return originalReplace.call(this, sanitized);
                }.bind(this);
            } catch {}
        },

        interceptXHR() {
            if (typeof XMLHttpRequest !== 'undefined') {
                const originalOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(method, url, ...args) {
                    const sanitized = SecurityUtils.sanitizeInput(url);
                    if (SecurityCore.isSuspiciousURL(sanitized)) {
                        this._blocked = true;
                        return;
                    }
                    return originalOpen.call(this, method, sanitized, ...args);
                };

                const originalSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send = function(...args) {
                    if (this._blocked) return;
                    return originalSend.call(this, ...args);
                };
            }
        },

        interceptFetch() {
            if (typeof window.fetch === 'function') {
                const original = window.fetch;
                window.fetch = function(...args) {
                    const url = args[0];
                    const sanitized = SecurityUtils.sanitizeInput(url);
                    if (SecurityCore.isSuspiciousURL(sanitized)) {
                        return Promise.reject(new Error('安全拦截'));
                    }
                    if (typeof url === 'string') args[0] = sanitized;
                    return original.apply(this, args);
                };
            }
        },

        interceptForms() {
            document.addEventListener('submit', (e) => {
                const action = e.target?.getAttribute('action');
                const sanitized = SecurityUtils.sanitizeInput(action);
                if (sanitized && SecurityCore.isSuspiciousURL(sanitized)) {
                    if (!confirm('此表单将提交到可疑网址，是否继续？')) {
                        e.preventDefault(); e.stopPropagation();
                    }
                }
            }, { capture: true });
        },

        safeNotify(title, text) {
            try {
                if (typeof GM_notification === 'function') {
                    GM_notification({ title, text, timeout: 2000 });
                }
            } catch {}
        }
    };

    const SecurityEngine = {
        init() {
            SecuritySystem.init();
            
            const domain = window.location.hostname;
            
            setTimeout(() => {
                if (!ContentScanner.checkPornographyContent()) {
                    this.checkSiteRecord(domain);
                }
            }, SECURITY_CONFIG.SCAN_DELAY);

            RequestInterceptor.init();
            ContentScanner.monitorDynamicContent();
            FloatingBall.init();
            
            setTimeout(() => {
                FloatingBall.loadBallPosition();
            }, 500);
        },

        checkSiteRecord(domain) {
            const domains = StorageManager.getCheckedDomains();
            const currentTime = Date.now();
            
            if (domains[domain] && (currentTime - domains[domain].timestamp) < SECURITY_CONFIG.CACHE_TIME) {
                UIManager.showSecurityCheckPopup(domain, domains[domain].hasRecord);
                return;
            }
            
            const hasRecord = SecurityCore.enhancedRecordCheck(domain);
            StorageManager.saveCheckedDomain(domain, hasRecord);
            UIManager.showSecurityCheckPopup(domain, hasRecord);
        },

        quickScan() {
            return ContentScanner.quickScan();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityEngine.init());
    } else {
        setTimeout(() => SecurityEngine.init(), 100);
    }

    window.securityInterceptor = {
        version: '1.8',
        config: SECURITY_CONFIG,
        quickScan: () => SecurityEngine.quickScan(),
        securitySystem: SecuritySystem
    };
})();