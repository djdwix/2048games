// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      2.0
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
// @connect      raw.githubusercontent.com
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
        SECURITY_LEVEL: 'high',
        SCRIPT_SOURCE: 'https://raw.githubusercontent.com/djdwix/2048games/main/2.js',
        INTEGRITY_CHECK: true
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

                GM_setValue('script_checksum', localChecksum);
                console.log('脚本完整性验证通过');
                return true;
            } catch (error) {
                console.error('完整性检查失败:', error);
                return true;
            }
        },

        getCurrentScriptContent() {
            try {
                const scripts = document.scripts;
                for (let i = scripts.length - 1; i >= 0; i--) {
                    const script = scripts[i];
                    if (script.src && script.src.includes('2.js')) {
                        return null;
                    }
                    if (script.textContent && script.textContent.includes('securityInterceptor')) {
                        return script.textContent;
                    }
                }
                return null;
            } catch (error) {
                return null;
            }
        },

        async fetchRemoteChecksum() {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: SECURITY_CONFIG.SCRIPT_SOURCE + '?t=' + Date.now(),
                    timeout: 8000,
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
                .replace(/\s+/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/[^\n]*\n/g, '');
            
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
                            <button onclick="window.close()" style="
                                background: transparent;
                                color: white;
                                border: 2px solid white;
                                padding: 12px 24px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 16px;
                            ">关闭页面</button>
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
                return input.replace(/[\r\n\t\0<>"'`\\\u0000-\u001F\u007F-\u009F]/g, '').substring(0, 1000);
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
                let inThrottle;
                return function(...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            },

            generateId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            }
        },

        Security: {
            detectXSS(content) {
                if (typeof content !== 'string') return false;
                const xssPatterns = [
                    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
                    /javascript:/gi,
                    /vbscript:/gi,
                    /on\w+\s*=/gi,
                    /expression\s*\(/gi
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
            },

            escapeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }
        },

        Storage: {
            get(key, defaultValue = null) {
                try {
                    return GM_getValue(key, defaultValue);
                } catch {
                    return defaultValue;
                }
            },

            set(key, value) {
                try {
                    GM_setValue(key, value);
                    return true;
                } catch {
                    return false;
                }
            },

            remove(key) {
                try {
                    GM_deleteValue(key);
                    return true;
                } catch {
                    return false;
                }
            },

            clear() {
                try {
                    const keys = GM_listValues();
                    keys.forEach(key => GM_deleteValue(key));
                    return true;
                } catch {
                    return false;
                }
            }
        },

        Network: {
            request(options) {
                return new Promise((resolve, reject) => {
                    const config = {
                        method: 'GET',
                        timeout: 10000,
                        ...options
                    };

                    GM_xmlhttpRequest({
                        ...config,
                        onload: function(response) {
                            resolve(response);
                        },
                        onerror: function(error) {
                            reject(error);
                        },
                        ontimeout: function() {
                            reject(new Error('Request timeout'));
                        }
                    });
                });
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
            try {
                const cspMeta = document.createElement('meta');
                cspMeta.httpEquiv = 'Content-Security-Policy';
                cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'";
                document.head.appendChild(cspMeta);
            } catch (error) {
                console.warn('CSP设置失败:', error);
            }
        },

        protectGlobalObjects() {
            const protectedObjects = ['XMLHttpRequest', 'fetch', 'setTimeout', 'setInterval'];
            protectedObjects.forEach(objName => {
                if (window[objName]) {
                    try {
                        Object.defineProperty(window, objName, {
                            value: window[objName],
                            writable: false,
                            configurable: false
                        });
                    } catch (error) {
                        console.warn(`保护 ${objName} 失败:`, error);
                    }
                }
            });
        },

        detectTampering() {
            setInterval(() => {
                this.checkScriptIntegrity();
            }, 30000);
        },

        checkScriptIntegrity() {
            const currentChecksum = SecurityValidator.generateChecksum(
                SecurityValidator.getCurrentScriptContent()
            );
            const storedChecksum = CoreLibrary.Storage.get('script_checksum');
            
            if (storedChecksum && currentChecksum !== storedChecksum) {
                SecurityValidator.showSecurityWarning('检测到脚本被篡改，已停止运行');
            }
        }
    };

    const FloatingBallManager = {
        isDragging: false,
        dragData: null,
        animationFrame: null,
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
                #security-floating-ball.hidden {
                    display: none !important;
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
            this.ballElement = ball;
            
            this.loadBallPosition();
        },

        ensureBallVisibility() {
            setInterval(() => {
                const ball = document.getElementById('security-floating-ball');
                if (!ball && this.ballElement) {
                    document.body.appendChild(this.ballElement);
                    this.loadBallPosition();
                } else if (ball && ball.classList.contains('hidden')) {
                    ball.classList.remove('hidden');
                }
            }, 2000);
        },

        bindEvents() {
            const ball = this.ballElement;
            if (!ball) return;

            const startDrag = (e) => this.startDrag(e);
            const drag = (e) => this.drag(e);
            const stopDrag = () => this.stopDrag();

            ball.addEventListener('mousedown', startDrag);
            ball.addEventListener('touchstart', startDrag, { passive: false });
            ball.addEventListener('click', (e) => {
                if (!this.isDragging) this.startScan();
            });

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
            document.addEventListener('touchcancel', stopDrag);
        },

        startDrag(e) {
            const ball = this.ballElement;
            if (!ball) return;

            this.isDragging = true;
            ball.classList.add('dragging');

            const rect = ball.getBoundingClientRect();
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            this.dragData = {
                startX: clientX - rect.left,
                startY: clientY - rect.top
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
            });
        },

        stopDrag() {
            this.isDragging = false;
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            const ball = this.ballElement;
            if (ball) {
                ball.classList.remove('dragging');
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
                        }, 1500);
                    }
                }, 800);
            }
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
            const riskyKeywords = ['free', 'download', 'video', 'movie', 'stream', 'live', 'chat'];
            if (riskyKeywords.some(keyword => secondLevel.includes(keyword))) return Math.random() > 0.6;
            
            return Math.random() > 0.4;
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
                    const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
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
                    const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
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
                    const sanitized = CoreLibrary.Utilities.sanitizeInput(url);
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
                const sanitized = CoreLibrary.Utilities.sanitizeInput(action);
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
        async init() {
            const integrityValid = await SecurityValidator.verifyScriptIntegrity();
            if (!integrityValid) {
                return;
            }

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
            CoreLibrary.Storage.set('checkedDomains', {
                ...domains,
                [domain]: { hasRecord, timestamp: currentTime }
            });
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
        version: '2.0',
        config: SECURITY_CONFIG,
        quickScan: () => SecurityEngine.quickScan(),
        coreLibrary: CoreLibrary
    };
})();