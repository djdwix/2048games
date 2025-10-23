// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.7
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
        FLOATING_BALL: true
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

    const SecurityUtils = {
        sanitizeInput(input) {
            if (typeof input !== 'string') return '';
            return input.replace(/[\r\n\t\0<>"'`\\]/g, '').substring(0, 500);
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
                    transition: all 0.3s ease;
                    touch-action: none;
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

            let isDragging = false;
            let startX, startY, initialX, initialY;

            ball.addEventListener('mousedown', this.startDrag);
            ball.addEventListener('touchstart', this.startDrag, { passive: false });

            ball.addEventListener('click', (e) => {
                if (!isDragging) {
                    this.startScan();
                }
            });

            document.addEventListener('mousemove', this.drag);
            document.addEventListener('touchmove', this.drag, { passive: false });
            
            document.addEventListener('mouseup', this.stopDrag);
            document.addEventListener('touchend', this.stopDrag);
        },

        startDrag(e) {
            const ball = document.getElementById('security-floating-ball');
            if (!ball) return;

            isDragging = true;
            ball.style.cursor = 'grabbing';
            ball.style.transition = 'none';

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            startX = clientX - ball.offsetLeft;
            startY = clientY - ball.offsetTop;
            initialX = ball.offsetLeft;
            initialY = ball.offsetTop;

            e.preventDefault();
        },

        drag(e) {
            if (!isDragging) return;

            const ball = document.getElementById('security-floating-ball');
            if (!ball) return;

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            let newX = clientX - startX;
            let newY = clientY - startY;

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
            isDragging = false;
            const ball = document.getElementById('security-floating-ball');
            if (ball) {
                ball.style.cursor = 'move';
                ball.style.transition = 'all 0.3s ease';
            }
        },

        startScan() {
            const ball = document.getElementById('security-floating-ball');
            if (ball) {
                ball.classList.add('scanning');
                ball.innerHTML = '⏳';
            }

            setTimeout(() => {
                SecurityEngine.quickScan();
                if (ball) {
                    ball.classList.remove('scanning');
                    ball.innerHTML = '✅';
                    setTimeout(() => {
                        ball.innerHTML = '🔍';
                    }, 2000);
                }
            }, 500);
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
            const domain = window.location.hostname;
            const hasPornography = this.checkPornographyContent();
            if (!hasPornography) {
                const hasRecord = SecurityCore.enhancedRecordCheck(domain);
                UIManager.showSecurityCheckPopup(domain, hasRecord, false);
            }
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
            const domain = window.location.hostname;
            
            setTimeout(() => {
                if (!ContentScanner.checkPornographyContent()) {
                    this.checkSiteRecord(domain);
                }
            }, SECURITY_CONFIG.SCAN_DELAY);

            RequestInterceptor.init();
            ContentScanner.monitorDynamicContent();
            FloatingBall.init();
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
            ContentScanner.quickScan();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityEngine.init());
    } else {
        setTimeout(() => SecurityEngine.init(), 100);
    }

    window.securityInterceptor = {
        version: '1.7',
        config: SECURITY_CONFIG,
        quickScan: () => SecurityEngine.quickScan()
    };
})();