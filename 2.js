// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  拦截未备案网站和隐藏跳转页面，提升网页浏览安全性
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      *
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/2.js
// ==/UserScript==

(function() {
    'use strict';

    // 备案信息查询接口（示例）
    const RECORD_CHECK_API = 'https://api.example.com/check-site-record';

    // 获取已检查的域名缓存
    function getCheckedDomains() {
        try {
            return GM_getValue('checkedDomains', {});
        } catch (error) {
            console.warn('GM_getValue失败，使用默认值:', error);
            return {};
        }
    }

    // 保存检查过的域名
    function saveCheckedDomain(domain, hasRecord) {
        try {
            const domains = getCheckedDomains();
            domains[domain] = {
                hasRecord: hasRecord,
                timestamp: Date.now()
            };
            GM_setValue('checkedDomains', domains);
        } catch (error) {
            console.warn('GM_setValue失败:', error);
        }
    }

    // 显示安全检查弹窗
    function showSecurityCheckPopup(domain, isSafe) {
        // 等待DOM准备就绪
        const tryShowPopup = () => {
            if (document.body) {
                createPopup(domain, isSafe);
            } else {
                setTimeout(tryShowPopup, 100);
            }
        };

        tryShowPopup();
    }

    function createPopup(domain, isSafe) {
        // 移除已存在的弹窗
        const existingPopup = document.getElementById('security-check-popup');
        const existingOverlay = document.getElementById('security-check-overlay');
        const existingStyle = document.getElementById('security-check-style');
        
        if (existingPopup) existingPopup.remove();
        if (existingOverlay) existingOverlay.remove();
        if (existingStyle) existingStyle.remove();

        // 创建样式
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
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 90%;
                width: 320px;
                text-align: center;
                border: 3px solid ${isSafe ? '#4CAF50' : '#ff4444'};
                animation: fadeIn 0.3s ease-in-out;
                box-sizing: border-box;
            }
            .security-popup h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
                font-weight: 600;
            }
            .security-popup p {
                margin: 0 0 20px 0;
                color: #666;
                line-height: 1.5;
                font-size: 14px;
            }
            .security-popup button {
                background: ${isSafe ? '#4CAF50' : '#ff4444'};
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
            }
            .security-popup button:active {
                transform: scale(0.98);
            }
            @media (max-width: 480px) {
                .security-popup {
                    width: 85%;
                    padding: 16px;
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
        `;
        document.head.appendChild(style);

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'security-check-overlay';
        overlay.className = 'security-overlay';

        // 创建弹窗
        const popup = document.createElement('div');
        popup.id = 'security-check-popup';
        popup.className = 'security-popup';

        const title = document.createElement('h3');
        title.textContent = '网页安全检查';

        const message = document.createElement('p');
        message.textContent = isSafe ? 
            `网站 ${domain} 已通过安全检查，可以正常访问。` : 
            `警告：网站 ${domain} 可能存在安全风险，请谨慎访问！`;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '确认';
        closeBtn.setAttribute('aria-label', '确认安全提示');

        // 添加触摸事件支持
        closeBtn.addEventListener('click', removePopup);
        closeBtn.addEventListener('touchend', removePopup, { passive: true });

        function removePopup(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (popup.parentNode) popup.parentNode.removeChild(popup);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (style.parentNode) style.parentNode.removeChild(style);
        }

        // 点击遮罩层也可以关闭
        overlay.addEventListener('click', removePopup);
        overlay.addEventListener('touchend', removePopup, { passive: true });

        popup.appendChild(title);
        popup.appendChild(message);
        popup.appendChild(closeBtn);

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // 阻止背景滚动（移动端）
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // 恢复滚动
        const restoreScroll = () => {
            document.body.style.overflow = originalOverflow;
        };

        closeBtn.addEventListener('click', restoreScroll);
        overlay.addEventListener('click', restoreScroll);
    }

    // 拦截可疑跳转 - 兼容性修复
    function interceptSuspiciousRedirects() {
        // 安全地拦截window.open
        if (typeof window.open === 'function') {
            const originalWindowOpen = window.open;
            window.open = function(...args) {
                console.log('检测到窗口打开请求:', args[0]);
                if (isSuspiciousURL(args[0])) {
                    safeNotification('安全拦截', '已拦截可疑的窗口打开: ' + args[0]);
                    return null;
                }
                try {
                    return originalWindowOpen.apply(this, args);
                } catch (error) {
                    console.warn('window.open调用失败:', error);
                    return null;
                }
            };
        }

        // 安全地拦截location跳转
        try {
            if (window.location && typeof window.location.replace === 'function') {
                const originalReplace = window.location.replace;
                window.location.replace = function(url) {
                    if (isSuspiciousURL(url)) {
                        safeNotification('安全拦截', '已拦截可疑的replace跳转: ' + url);
                        return;
                    }
                    try {
                        return originalReplace.call(this, url);
                    } catch (error) {
                        console.warn('location.replace调用失败:', error);
                    }
                };
            }
        } catch (error) {
            console.warn('location拦截初始化失败:', error);
        }
    }

    // 安全的通知函数
    function safeNotification(title, text) {
        try {
            if (typeof GM_notification === 'function') {
                GM_notification({
                    title: title,
                    text: text,
                    timeout: 3000
                });
            } else {
                console.log(title + ': ' + text);
            }
        } catch (error) {
            console.log(title + ': ' + text);
        }
    }

    // 检查URL是否可疑
    function isSuspiciousURL(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const suspiciousPatterns = [
                /\/\/[^/]*?\.(tk|ml|ga|cf|gq)/i,
                /\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
                /\/\/localhost\b/,
                /redirect|goto|jump|url=/i,
                /\/\/[^/]*?@/,
                /javascript:/i,
                /data:text\/html/i,
                /vbscript:/i
            ];

            return suspiciousPatterns.some(pattern => pattern.test(url));
        } catch (error) {
            console.warn('URL检查失败:', error);
            return false;
        }
    }

    // 检查网站备案信息
    function checkSiteRecord(domain) {
        if (!domain || typeof domain !== 'string') {
            showSecurityCheckPopup('未知域名', false);
            return;
        }

        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${RECORD_CHECK_API}?domain=${encodeURIComponent(domain)}`,
                timeout: 5000,
                onload: function(response) {
                    let isSafe = false;
                    if (response.status === 200) {
                        try {
                            const result = JSON.parse(response.responseText);
                            isSafe = !!result.hasRecord;
                            saveCheckedDomain(domain, result.hasRecord);
                        } catch (e) {
                            console.error('备案信息解析失败:', e);
                            isSafe = false;
                        }
                    } else {
                        isSafe = false;
                    }
                    
                    showSecurityCheckPopup(domain, isSafe);
                },
                onerror: function() {
                    console.warn('备案信息查询失败: ' + domain);
                    showSecurityCheckPopup(domain, false);
                },
                ontimeout: function() {
                    console.warn('备案信息查询超时: ' + domain);
                    showSecurityCheckPopup(domain, false);
                }
            });
        } catch (error) {
            console.error('备案检查请求失败:', error);
            showSecurityCheckPopup(domain, false);
        }
    }

    // 显示警告信息
    function showWarning(message) {
        safeNotification('安全警告', message);
    }

    // 监控动态创建的链接和iframe
    function monitorDynamicContent() {
        try {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'A') {
                                setTimeout(() => checkLink(node), 0);
                            } else if (node.tagName === 'IFRAME') {
                                setTimeout(() => checkIframe(node), 0);
                            } else if (node.querySelectorAll) {
                                const links = node.querySelectorAll('a');
                                const iframes = node.querySelectorAll('iframe');
                                links.forEach(link => setTimeout(() => checkLink(link), 0));
                                iframes.forEach(iframe => setTimeout(() => checkIframe(iframe), 0));
                            }
                        }
                    });
                });
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            console.warn('动态内容监控初始化失败:', error);
        }
    }

    // 检查链接安全性
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
                }, { capture: true });
            }
        } catch (error) {
            console.warn('链接检查失败:', error);
        }
    }

    // 检查iframe安全性
    function checkIframe(iframe) {
        if (!iframe || typeof iframe.getAttribute !== 'function') return;
        
        try {
            const src = iframe.getAttribute('src');
            if (src && isSuspiciousURL(src)) {
                iframe.style.border = '3px solid orange';
                iframe.style.borderRadius = '5px';
                console.log('检测到可疑iframe: ', src);
            }
        } catch (error) {
            console.warn('iframe检查失败:', error);
        }
    }

    // 拦截XMLHttpRequest请求
    function interceptXHR() {
        if (typeof XMLHttpRequest === 'undefined') return;
        
        try {
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (isSuspiciousURL(url)) {
                    console.log('拦截可疑XHR请求: ', url);
                    this._shouldBlock = true;
                    return;
                }
                return originalXHROpen.call(this, method, url, ...args);
            };

            const originalXHRSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(...args) {
                if (this._shouldBlock) {
                    console.log('已阻止发送可疑XHR请求');
                    return;
                }
                return originalXHRSend.call(this, ...args);
            };
        } catch (error) {
            console.warn('XHR拦截初始化失败:', error);
        }
    }

    // 拦截Fetch请求
    function interceptFetch() {
        if (typeof window.fetch === 'undefined') return;
        
        try {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];
                if (isSuspiciousURL(url)) {
                    console.log('拦截可疑Fetch请求: ', url);
                    return Promise.reject(new Error('安全拦截: 可疑请求已被阻止'));
                }
                return originalFetch.apply(this, args);
            };
        } catch (error) {
            console.warn('Fetch拦截初始化失败:', error);
        }
    }

    // 拦截表单提交
    function interceptFormSubmissions() {
        try {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form && typeof form.getAttribute === 'function') {
                    const action = form.getAttribute('action');
                    if (action && isSuspiciousURL(action)) {
                        if (!confirm('此表单将提交到可疑网址，是否继续？\n' + action)) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                }
            }, { capture: true });
        } catch (error) {
            console.warn('表单拦截初始化失败:', error);
        }
    }

    // 初始化安全拦截
    function initSecurityInterceptor() {
        const currentDomain = window.location.hostname;
        
        // 添加延迟避免阻塞页面加载
        setTimeout(() => {
            try {
                checkSiteRecord(currentDomain);
            } catch (error) {
                console.error('安全检查初始化失败:', error);
                showSecurityCheckPopup(currentDomain, false);
            }
        }, 800);

        // 逐步初始化各模块，避免阻塞
        setTimeout(interceptSuspiciousRedirects, 0);
        setTimeout(interceptXHR, 10);
        setTimeout(interceptFetch, 20);
        setTimeout(monitorDynamicContent, 30);
        setTimeout(interceptFormSubmissions, 40);

        console.log('网页安全拦截器已启动 - 监控域名: ' + currentDomain);
    }

    // 安全的初始化函数
    function safeInit() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initSecurityInterceptor);
            } else {
                setTimeout(initSecurityInterceptor, 100);
            }
        } catch (error) {
            console.error('安全拦截器初始化失败:', error);
        }
    }

    // 启动脚本
    safeInit();

    // 导出函数供调试使用
    if (typeof window !== 'undefined') {
        window.securityInterceptor = {
            isSuspiciousURL: isSuspiciousURL,
            checkSiteRecord: checkSiteRecord,
            version: '1.2'
        };
    }
})();