// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.1
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
        return GM_getValue('checkedDomains', {});
    }

    // 保存检查过的域名
    function saveCheckedDomain(domain, hasRecord) {
        const domains = getCheckedDomains();
        domains[domain] = {
            hasRecord: hasRecord,
            timestamp: Date.now()
        };
        GM_setValue('checkedDomains', domains);
    }

    // 显示安全检查弹窗
    function showSecurityCheckPopup(domain, isSafe) {
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000000;
            font-family: Arial, sans-serif;
            max-width: 400px;
            text-align: center;
            border: 3px solid ${isSafe ? '#4CAF50' : '#ff4444'};
            animation: fadeIn 0.3s ease-in-out;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
            .security-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 999999;
            }
        `;
        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.className = 'security-overlay';
        overlay.style.animation = 'fadeIn 0.3s ease-in-out';

        const title = document.createElement('h3');
        title.textContent = '网页安全检查';
        title.style.cssText = 'margin: 0 0 15px 0; color: #333;';

        const message = document.createElement('p');
        message.textContent = isSafe ? 
            `网站 ${domain} 已通过安全检查，可以正常访问。` : 
            `警告：网站 ${domain} 可能存在安全风险，请谨慎访问！`;
        message.style.cssText = 'margin: 0 0 20px 0; color: #666; line-height: 1.5;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '确认';
        closeBtn.style.cssText = `
            background: ${isSafe ? '#4CAF50' : '#ff4444'};
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        `;

        closeBtn.onmouseover = function() {
            this.style.background = isSafe ? '#45a049' : '#cc0000';
        };
        closeBtn.onmouseout = function() {
            this.style.background = isSafe ? '#4CAF50' : '#ff4444';
        };

        closeBtn.onclick = function() {
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            document.head.removeChild(style);
        };

        popup.appendChild(title);
        popup.appendChild(message);
        popup.appendChild(closeBtn);

        document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(overlay);
            document.body.appendChild(popup);
        });
    }

    // 拦截可疑跳转
    function interceptSuspiciousRedirects() {
        const originalWindowOpen = window.open;
        window.open = function(...args) {
            console.log('检测到窗口打开请求:', args[0]);
            if (isSuspiciousURL(args[0])) {
                GM_notification({
                    title: '安全拦截',
                    text: '已拦截可疑的窗口打开: ' + args[0],
                    timeout: 3000
                });
                return null;
            }
            return originalWindowOpen.apply(this, args);
        };

        // 安全地拦截location.href跳转
        try {
            const originalDescriptor = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
            if (originalDescriptor) {
                Object.defineProperty(window.Location.prototype, 'href', {
                    get: function() {
                        return originalDescriptor.get.call(this);
                    },
                    set: function(value) {
                        if (isSuspiciousURL(value)) {
                            GM_notification({
                                title: '安全拦截',
                                text: '已拦截可疑的页面跳转: ' + value,
                                timeout: 3000
                            });
                            return;
                        }
                        originalDescriptor.set.call(this, value);
                    }
                });
            }
        } catch (error) {
            console.warn('Location拦截失败:', error);
        }

        // 拦截replace方法
        const originalReplace = window.location.replace;
        window.location.replace = function(url) {
            if (isSuspiciousURL(url)) {
                GM_notification({
                    title: '安全拦截',
                    text: '已拦截可疑的replace跳转: ' + url,
                    timeout: 3000
                });
                return;
            }
            return originalReplace.call(this, url);
        };
    }

    // 检查URL是否可疑
    function isSuspiciousURL(url) {
        if (!url || typeof url !== 'string') return false;

        const suspiciousPatterns = [
            /\/\/[^/]*?\.(tk|ml|ga|cf|gq)/i,
            /\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,
            /\/\/localhost/,
            /redirect|goto|jump|url=/i,
            /\/\/[^/]*?@/,
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(url));
    }

    // 检查网站备案信息
    function checkSiteRecord(domain) {
        const domains = getCheckedDomains();
        const currentTime = Date.now();
        const cacheTime = 86400000; // 24小时缓存

        // 无论是否缓存，都进行检查并弹窗提示
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${RECORD_CHECK_API}?domain=${encodeURIComponent(domain)}`,
            timeout: 5000,
            onload: function(response) {
                let isSafe = false;
                if (response.status === 200) {
                    try {
                        const result = JSON.parse(response.responseText);
                        isSafe = result.hasRecord;
                        saveCheckedDomain(domain, result.hasRecord);
                    } catch (e) {
                        console.error('备案信息解析失败:', e);
                        isSafe = false;
                    }
                } else {
                    isSafe = false;
                }
                
                // 无论是否安全都显示弹窗
                showSecurityCheckPopup(domain, isSafe);
            },
            onerror: function() {
                console.warn('备案信息查询失败: ' + domain);
                // 查询失败时也显示弹窗
                showSecurityCheckPopup(domain, false);
            }
        });
    }

    // 显示警告信息
    function showWarning(message) {
        if (typeof GM_notification !== 'undefined') {
            GM_notification({
                title: '安全警告',
                text: message,
                timeout: 5000
            });
        }

        // 在页面顶部添加警告横幅
        const warningBanner = document.createElement('div');
        warningBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #ff4444;
            color: white;
            padding: 12px;
            text-align: center;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            border-bottom: 2px solid #cc0000;
            animation: slideDown 0.3s ease-out;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);

        warningBanner.textContent = '⚠ ' + message;
        document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(warningBanner);
        });
    }

    // 监控动态创建的链接和iframe
    function monitorDynamicContent() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
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
                    }
                });
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }

    // 检查链接安全性
    function checkLink(link) {
        const href = link.getAttribute('href');
        if (href && isSuspiciousURL(href)) {
            link.style.border = '2px solid red';
            link.style.padding = '2px';
            link.style.borderRadius = '3px';
            link.title = '可疑链接: ' + href;
            
            const originalClick = link.onclick;
            link.addEventListener('click', function(e) {
                if (!confirm('此链接可能指向不安全网站，是否继续访问？\n' + href)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
                if (originalClick) {
                    return originalClick.call(this, e);
                }
            }, true);
        }
    }

    // 检查iframe安全性
    function checkIframe(iframe) {
        const src = iframe.getAttribute('src');
        if (src && isSuspiciousURL(src)) {
            iframe.style.border = '3px solid orange';
            iframe.style.borderRadius = '5px';
            console.log('检测到可疑iframe: ', src);
        }
    }

    // 拦截XMLHttpRequest请求
    function interceptXHR() {
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
    }

    // 拦截Fetch请求
    function interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (isSuspiciousURL(url)) {
                console.log('拦截可疑Fetch请求: ', url);
                return Promise.reject(new Error('安全拦截: 可疑请求已被阻止'));
            }
            return originalFetch.apply(this, args);
        };
    }

    // 拦截表单提交
    function interceptFormSubmissions() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            const action = form.getAttribute('action');
            if (action && isSuspiciousURL(action)) {
                if (!confirm('此表单将提交到可疑网址，是否继续？\n' + action)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }, true);
    }

    // 初始化安全拦截
    function initSecurityInterceptor() {
        const currentDomain = window.location.hostname;
        
        // 每次访问都进行检查并弹窗
        setTimeout(() => {
            checkSiteRecord(currentDomain);
        }, 500);

        interceptSuspiciousRedirects();
        interceptXHR();
        interceptFetch();
        monitorDynamicContent();
        interceptFormSubmissions();

        console.log('网页安全拦截器已启动 - 监控域名: ' + currentDomain);
    }

    // 根据运行时机执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSecurityInterceptor);
    } else {
        initSecurityInterceptor();
    }

    // 导出函数供调试使用
    window.securityInterceptor = {
        isSuspiciousURL: isSuspiciousURL,
        checkSiteRecord: checkSiteRecord
    };
})();