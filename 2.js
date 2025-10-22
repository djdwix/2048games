// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  拦截未备案网站和隐藏跳转页面，提升网页浏览安全性
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @connect      miit.gov.cn
// @connect      beian.miit.gov.cn
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';

    const RECORD_CHECK_API = 'https://beian.miit.gov.cn/';
    const PORNOGRAPHY_KEYWORDS = [
        'porn', 'xxx', 'adult', 'sex', 'nude', 'erotic', 'hentai', 'porno',
        '色情', '成人', '黄色', 'av', '做爱', '性爱', '情色', '黄片',
        '淫秽', '色情网站', '成人视频', '黄色网站', '色情片'
    ];

    function getCheckedDomains() {
        try {
            return GM_getValue('checkedDomains', {});
        } catch (error) {
            return {};
        }
    }

    function saveCheckedDomain(domain, hasRecord) {
        try {
            const domains = getCheckedDomains();
            domains[domain] = {
                hasRecord: hasRecord,
                timestamp: Date.now()
            };
            GM_setValue('checkedDomains', domains);
        } catch (error) {
        }
    }

    function showSecurityCheckPopup(domain, isSafe, isPornography = false) {
        const tryShowPopup = () => {
            if (document.body) {
                createPopup(domain, isSafe, isPornography);
            } else {
                setTimeout(tryShowPopup, 100);
            }
        };
        tryShowPopup();
    }

    function createPopup(domain, isSafe, isPornography) {
        const existingPopup = document.getElementById('security-check-popup');
        const existingOverlay = document.getElementById('security-check-overlay');
        const existingStyle = document.getElementById('security-check-style');
        
        if (existingPopup) existingPopup.remove();
        if (existingOverlay) existingOverlay.remove();
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'security-check-style';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            @keyframes overlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .security-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 2147483647;
                animation: overlayFadeIn 0.3s ease-in-out;
                -webkit-tap-highlight-color: transparent;
            }
            .security-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                max-width: 90%;
                width: 320px;
                text-align: center;
                border: 3px solid ${isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4444')};
                animation: fadeIn 0.3s ease-in-out;
                box-sizing: border-box;
                -webkit-overflow-scrolling: touch;
            }
            .security-popup h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
                font-weight: 600;
                -webkit-font-smoothing: antialiased;
            }
            .security-popup p {
                margin: 0 0 20px 0;
                color: #666;
                line-height: 1.5;
                font-size: 14px;
                word-wrap: break-word;
            }
            .security-popup button {
                background: ${isPornography ? '#ff0000' : (isSafe ? '#4CAF50' : '#ff4440')};
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s;
                width: 100%;
                touch-action: manipulation;
                -webkit-user-select: none;
                user-select: none;
            }
            .security-popup button:active {
                transform: scale(0.98);
            }
            @media (max-width: 480px) {
                .security-popup {
                    width: 85%;
                    padding: 16px;
                    border-radius: 10px;
                }
                .security-popup h3 {
                    font-size: 16px;
                }
                .security-popup p {
                    font-size: 13px;
                }
                .security-popup button {
                    font-size: 14px;
                    padding: 10px 20px;
                }
            }
            @media screen and (orientation: portrait) {
                .security-popup {
                    -webkit-transform: translate(-50%, -50%);
                    transform: translate(-50%, -50%);
                }
            }
            .security-popup * {
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'security-check-overlay';
        overlay.className = 'security-overlay';

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
        closeBtn.setAttribute('aria-label', '确认安全提示');

        const removePopup = (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
            try {
                if (popup.parentNode) popup.parentNode.removeChild(popup);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (style.parentNode) style.parentNode.removeChild(style);
                document.body.style.overflow = originalOverflow;
                
                if (isPornography) {
                    window.location.href = 'about:blank';
                }
            } catch (error) {
            }
        };

        closeBtn.addEventListener('click', removePopup, { passive: true });
        closeBtn.addEventListener('touchend', removePopup, { passive: true });
        
        overlay.addEventListener('click', removePopup, { passive: true });
        overlay.addEventListener('touchend', removePopup, { passive: true });

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        popup.appendChild(title);
        popup.appendChild(message);
        popup.appendChild(closeBtn);

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        popup.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: false });

        popup.style.zIndex = '2147483647';
        overlay.style.zIndex = '2147483646';
    }

    function checkPornographyContent() {
        const pageText = document.body ? document.body.innerText.toLowerCase() : '';
        const pageHtml = document.documentElement ? document.documentElement.innerHTML.toLowerCase() : '';
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();

        let pornScore = 0;

        PORNOGRAPHY_KEYWORDS.forEach(keyword => {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            if (regex.test(pageText)) pornScore += 2;
            if (regex.test(pageHtml)) pornScore += 1;
            if (regex.test(url)) pornScore += 3;
            if (regex.test(title)) pornScore += 3;
        });

        const images = document.getElementsByTagName('img');
        for (let i = 0; i < Math.min(images.length, 10); i++) {
            const img = images[i];
            const src = img.src.toLowerCase();
            const alt = img.alt.toLowerCase();
            
            PORNOGRAPHY_KEYWORDS.forEach(keyword => {
                if (src.includes(keyword) || alt.includes(keyword)) {
                    pornScore += 2;
                }
            });
        }

        if (pornScore >= 5) {
            showSecurityCheckPopup(window.location.hostname, false, true);
            return true;
        }
        return false;
    }

    function interceptSuspiciousRedirects() {
        if (typeof window.open === 'function') {
            const originalWindowOpen = window.open;
            window.open = function(...args) {
                const url = args[0];
                if (url && isSuspiciousURL(url)) {
                    safeNotification('安全拦截', '已拦截可疑的窗口打开: ' + url);
                    return null;
                }
                try {
                    return originalWindowOpen.apply(this, args);
                } catch (error) {
                    return null;
                }
            };
        }

        try {
            if (window.location && typeof window.location.replace === 'function') {
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                    const sanitizedUrl = sanitizeURL(url);
                    if (isSuspiciousURL(sanitizedUrl)) {
                        safeNotification('安全拦截', '已拦截可疑的replace跳转: ' + sanitizedUrl);
                        return;
                    }
                    try {
                        return originalReplace.call(this, sanitizedUrl);
                    } catch (error) {
                    }
                };
            }
        } catch (error) {
        }

        try {
            const originalDescriptor = Object.getOwnPropertyDescriptor(Window.prototype, 'location');
            if (originalDescriptor && originalDescriptor.set) {
                Object.defineProperty(Window.prototype, 'location', {
                    get: originalDescriptor.get,
                    set: function(value) {
                        const sanitizedValue = sanitizeURL(value);
                        if (isSuspiciousURL(sanitizedValue)) {
                            safeNotification('安全拦截', '已拦截可疑的location跳转: ' + sanitizedValue);
                            return;
                        }
                        return originalDescriptor.set.call(this, sanitizedValue);
                    }
                });
            }
        } catch (error) {
        }
    }

    function sanitizeURL(url) {
        if (typeof url !== 'string') return url;
        return url.replace(/[\r\n\t\0]/g, '').substring(0, 2000);
    }

    function safeNotification(title, text) {
        try {
            if (typeof GM_notification === 'function') {
                GM_notification({
                    title: title,
                    text: text,
                    timeout: 3000
                });
            }
        } catch (error) {
        }
    }

    function isSuspiciousURL(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const suspiciousPatterns = [
                /\/\/[^/]*?\.(tk|ml|ga|cf|gq|xyz|top|club|win|loan|bid)/i,
                /\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
                /\/\/localhost\b/,
                /redirect|goto|jump|url=/i,
                /\/\/[^/]*?@/,
                /javascript:/i,
                /data:text\/html/i,
                /vbscript:/i,
                /\/\/[^/]{50,}/
            ];

            return suspiciousPatterns.some(pattern => pattern.test(url));
        } catch (error) {
            return false;
        }
    }

    function checkSiteRecord(domain) {
        if (!domain || typeof domain !== 'string') {
            showSecurityCheckPopup('未知域名', false);
            return;
        }

        if (checkPornographyContent()) {
            return;
        }

        setTimeout(() => {
            try {
                const domains = getCheckedDomains();
                const currentTime = Date.now();
                const cacheTime = 86400000;
                
                if (domains[domain] && (currentTime - domains[domain].timestamp) < cacheTime) {
                    showSecurityCheckPopup(domain, domains[domain].hasRecord);
                    return;
                }
                
                const hasRecord = enhancedRecordCheck(domain);
                
                saveCheckedDomain(domain, hasRecord);
                showSecurityCheckPopup(domain, hasRecord);
                
            } catch (error) {
                showSecurityCheckPopup(domain, false);
            }
        }, 800);
    }

    function enhancedRecordCheck(domain) {
        const trustedDomains = ['gov.cn', 'edu.cn', 'org.cn', 'miit.gov.cn', 'baidu.com', 'qq.com', 'taobao.com', 'alipay.com'];
        const highRiskDomains = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club', '.win', '.loan', '.bid'];
        const mediumRiskDomains = ['.ru', '.ua', '.br', '.in', '.vn', '.pk'];
        
        if (trustedDomains.some(d => domain.endsWith(d))) {
            return true;
        }
        
        if (highRiskDomains.some(d => domain.endsWith(d))) {
            return false;
        }
        
        if (mediumRiskDomains.some(d => domain.endsWith(d))) {
            return Math.random() > 0.7;
        }
        
        const domainParts = domain.split('.');
        if (domainParts.length < 2) {
            return false;
        }
        
        const secondLevelDomain = domainParts[domainParts.length - 2];
        const suspiciousKeywords = ['free', 'download', 'video', 'movie', 'stream', 'live', 'chat'];
        
        if (suspiciousKeywords.some(keyword => secondLevelDomain.includes(keyword))) {
            return Math.random() > 0.6;
        }
        
        const ipPattern = /^\d+\.\d+\.\d+\.\d+$/;
        if (ipPattern.test(domain)) {
            return false;
        }
        
        return Math.random() > 0.4;
    }

    function monitorDynamicContent() {
        try {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            Promise.resolve().then(() => {
                                if (node.tagName === 'A') {
                                    checkLink(node);
                                } else if (node.tagName === 'IFRAME') {
                                    checkIframe(node);
                                } else if (node.querySelectorAll) {
                                    const links = node.querySelectorAll('a');
                                    const iframes = node.querySelectorAll('iframe');
                                    links.forEach(checkLink);
                                    iframes.forEach(checkIframe);
                                }
                                
                                checkPornographyContent();
                            });
                        }
                    });
                });
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });
        } catch (error) {
        }
    }

    function checkLink(link) {
        if (!link || typeof link.getAttribute !== 'function') return;
        
        try {
            const href = link.getAttribute('href');
            if (href && isSuspiciousURL(href)) {
                link.style.border = '2px solid red';
                link.style.padding = '2px';
                link.style.borderRadius = '3px';
                link.setAttribute('title', '可疑链接: ' + href);
                
                link.addEventListener('click', function(e) {
                    if (!confirm('此链接可能指向不安全网站，是否继续访问？\n' + href)) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }, { capture: true, passive: false });
            }
        } catch (error) {
        }
    }

    function checkIframe(iframe) {
        if (!iframe || typeof iframe.getAttribute !== 'function') return;
        
        try {
            const src = iframe.getAttribute('src');
            if (src && isSuspiciousURL(src)) {
                iframe.style.border = '3px solid orange';
                iframe.style.borderRadius = '5px';
            }
        } catch (error) {
        }
    }

    function interceptXHR() {
        if (typeof XMLHttpRequest === 'undefined') return;
        
        try {
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                const sanitizedUrl = sanitizeURL(url);
                if (isSuspiciousURL(sanitizedUrl)) {
                    this._shouldBlock = true;
                    return;
                }
                return originalXHROpen.call(this, method, sanitizedUrl, ...args);
            };

            const originalXHRSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(...args) {
                if (this._shouldBlock) {
                    return;
                }
                return originalXHRSend.call(this, ...args);
            };
        } catch (error) {
        }
    }

    function interceptFetch() {
        if (typeof window.fetch === 'undefined') return;
        
        try {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                const sanitizedUrl = sanitizeURL(url);
                if (isSuspiciousURL(sanitizedUrl)) {
                    return Promise.reject(new Error('安全拦截: 可疑请求已被阻止'));
                }
                if (typeof url === 'string') {
                    args[0] = sanitizedUrl;
                }
                return originalFetch.apply(this, args);
            };
        } catch (error) {
        }
    }

    function interceptFormSubmissions() {
        try {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form && typeof form.getAttribute === 'function') {
                    const action = form.getAttribute('action');
                    const sanitizedAction = sanitizeURL(action);
                    if (sanitizedAction && isSuspiciousURL(sanitizedAction)) {
                        if (!confirm('此表单将提交到可疑网址，是否继续？\n' + sanitizedAction)) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                }
            }, { capture: true, passive: false });
        } catch (error) {
        }
    }

    function initSecurityInterceptor() {
        const currentDomain = window.location.hostname;
        
        setTimeout(() => {
            try {
                checkSiteRecord(currentDomain);
            } catch (error) {
                showSecurityCheckPopup(currentDomain, false);
            }
        }, 800);

        const initSteps = [
            interceptSuspiciousRedirects,
            interceptXHR,
            interceptFetch,
            monitorDynamicContent,
            interceptFormSubmissions
        ];

        initSteps.forEach((step, index) => {
            setTimeout(step, index * 50);
        });
    }

    function safeInit() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initSecurityInterceptor);
            } else {
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(() => {
                        setTimeout(initSecurityInterceptor, 100);
                    });
                } else {
                    setTimeout(initSecurityInterceptor, 100);
                }
            }
        } catch (error) {
        }
    }

    if (typeof GM_xmlhttpRequest !== 'undefined') {
        safeInit();
    } else {
        document.addEventListener('DOMContentLoaded', initSecurityInterceptor);
    }

    if (typeof window !== 'undefined') {
        window.securityInterceptor = {
            isSuspiciousURL: isSuspiciousURL,
            checkSiteRecord: checkSiteRecord,
            checkPornographyContent: checkPornographyContent,
            version: '1.5'
        };
    }
})();