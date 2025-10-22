// ==UserScript==
// @name         网页安全拦截器
// @namespace    http://tampermonkey.net/
// @version      1.0
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

        // 拦截location.href跳转
        const originalDescriptor = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
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
        if (domains[domain] && (Date.now() - domains[domain].timestamp) < 86400000) {
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${RECORD_CHECK_API}?domain=${encodeURIComponent(domain)}`,
            timeout: 5000,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const result = JSON.parse(response.responseText);
                        saveCheckedDomain(domain, result.hasRecord);
                        if (!result.hasRecord) {
                            showWarning('该网站未备案，请注意安全风险: ' + domain);
                        }
                    } catch (e) {
                        console.error('备案信息解析失败:', e);
                    }
                }
            },
            onerror: function() {
                console.warn('备案信息查询失败: ' + domain);
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
            padding: 10px;
            text-align: center;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            border-bottom: 2px solid #cc0000;
        `;
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
            });
        }
    }

    // 检查iframe安全性
    function checkIframe(iframe) {
        const src = iframe.getAttribute('src');
        if (src && isSuspiciousURL(src)) {
            iframe.style.border = '3px solid orange';
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
        
        // 延迟执行备案检查
        setTimeout(() => {
            checkSiteRecord(currentDomain);
        }, 1000);

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