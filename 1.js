// ==UserScript==
// @name         增强版下载验证码拦截器
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  增强检测多种下载行为并弹出6位数验证码验证
// @author       You
// @match        *://*/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置选项
    const CONFIG = {
        enableBlobDetection: true,
        enableFetchDetection: true,
        enableFormDetection: true,
        enableIframeDetection: true,
        logLevel: 'info' // 'none', 'info', 'debug'
    };

    // 1. 日志系统
    function log(level, message, data = null) {
        if (CONFIG.logLevel === 'none') return;
        if (CONFIG.logLevel === 'info' && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[下载拦截器 ${timestamp}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    // 2. 生成6位随机数字验证码
    function generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // 3. 验证码管理
    let activeVerification = null;

    // 4. 增强弹窗（添加倒计时和多次尝试限制）
    function showVerificationModal(expectedCode) {
        return new Promise((resolve) => {
            if (activeVerification) {
                log('debug', '已有激活的验证，拒绝新请求');
                resolve(false);
                return;
            }

            activeVerification = {
                expectedCode,
                attempts: 0,
                maxAttempts: 3,
                timeout: 120 // 秒
            };

            // 创建模态框背景
            const modal = document.createElement('div');
            modal.id = 'download-verification-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                font-family: 'Segoe UI', Arial, sans-serif;
                backdrop-filter: blur(3px);
            `;

            // 创建弹窗内容
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 2px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                text-align: center;
                min-width: 380px;
                max-width: 90vw;
            `;

            const innerContent = document.createElement('div');
            innerContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 10px;
            `;

            // 标题
            const title = document.createElement('h2');
            title.textContent = '🔒 下载验证';
            title.style.cssText = `
                margin: 0 0 10px 0;
                color: #2c3e50;
                font-weight: 600;
            `;

            // 副标题
            const subtitle = document.createElement('p');
            subtitle.textContent = '请输入6位数验证码以确认下载';
            subtitle.style.cssText = `
                color: #7f8c8d;
                margin: 0 0 20px 0;
                font-size: 14px;
            `;

            // 验证码显示区域
            const codeDisplay = document.createElement('div');
            codeDisplay.textContent = expectedCode;
            codeDisplay.style.cssText = `
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #2c3e50;
                background: #f8f9fa;
                padding: 20px;
                margin: 20px 0;
                border-radius: 8px;
                border: 3px dashed #3498db;
                font-family: 'Courier New', monospace;
                user-select: none;
            `;

            // 倒计时显示
            const timerDisplay = document.createElement('div');
            timerDisplay.id = 'verification-timer';
            timerDisplay.style.cssText = `
                color: #e74c3c;
                font-size: 13px;
                margin: -10px 0 15px 0;
                font-weight: 500;
            `;

            // 输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '输入6位验证码...';
            input.inputMode = 'numeric';
            input.pattern = '[0-9]{6}';
            input.maxLength = 6;
            input.style.cssText = `
                width: 100%;
                padding: 16px;
                font-size: 18px;
                margin: 10px 0;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                text-align: center;
                letter-spacing: 4px;
                box-sizing: border-box;
                transition: all 0.3s;
                font-family: 'Courier New', monospace;
            `;
            input.focus();

            // 错误提示
            const errorDisplay = document.createElement('div');
            errorDisplay.id = 'verification-error';
            errorDisplay.style.cssText = `
                color: #e74c3c;
                font-size: 13px;
                margin: 5px 0;
                min-height: 20px;
                font-weight: 500;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 15px;
                margin-top: 25px;
            `;

            // 取消按钮
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消下载';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 14px;
                background: #f1f2f6;
                color: #747d8c;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            `;

            // 确认按钮
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确认下载';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 14px;
                background: linear-gradient(135deg, #2ecc71, #1abc9c);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            `;

            // 悬停效果
            [cancelBtn, confirmBtn].forEach(btn => {
                btn.onmouseenter = () => btn.style.opacity = '0.9';
                btn.onmouseleave = () => btn.style.opacity = '1';
                btn.onmousedown = () => btn.style.transform = 'scale(0.98)';
                btn.onmouseup = () => btn.style.transform = 'scale(1)';
            });

            // 组装元素
            innerContent.appendChild(title);
            innerContent.appendChild(subtitle);
            innerContent.appendChild(codeDisplay);
            innerContent.appendChild(timerDisplay);
            innerContent.appendChild(input);
            innerContent.appendChild(errorDisplay);
            innerContent.appendChild(buttonContainer);
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            modalContent.appendChild(innerContent);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // 倒计时功能
            let timeLeft = activeVerification.timeout;
            const timerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = `验证码将在 ${timeLeft} 秒后失效`;
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    cancel();
                }
            }, 1000);

            // 输入验证
            function validateInput() {
                const enteredCode = input.value.trim();
                errorDisplay.textContent = '';
                input.style.borderColor = '#e0e0e0';
                
                if (!/^\d{6}$/.test(enteredCode)) {
                    input.style.borderColor = '#e74c3c';
                    return false;
                }
                return true;
            }

            // 确认验证
            async function confirm() {
                if (!validateInput()) {
                    errorDisplay.textContent = '请输入6位数字验证码';
                    input.focus();
                    return;
                }

                const enteredCode = input.value.trim();
                activeVerification.attempts++;

                if (enteredCode === expectedCode) {
                    clearInterval(timerInterval);
                    document.body.removeChild(modal);
                    activeVerification = null;
                    resolve(true);
                } else {
                    if (activeVerification.attempts >= activeVerification.maxAttempts) {
                        errorDisplay.textContent = '尝试次数过多，验证码已失效';
                        errorDisplay.style.color = '#e74c3c';
                        setTimeout(cancel, 2000);
                    } else {
                        errorDisplay.textContent = `验证码错误，还剩${activeVerification.maxAttempts - activeVerification.attempts}次尝试`;
                        errorDisplay.style.color = '#e67e22';
                        input.value = '';
                        input.focus();
                        input.style.borderColor = '#e67e22';
                    }
                }
            }

            // 取消验证
            function cancel() {
                clearInterval(timerInterval);
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                activeVerification = null;
                resolve(false);
            }

            // 事件绑定
            confirmBtn.addEventListener('click', confirm);
            cancelBtn.addEventListener('click', cancel);
            
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '').slice(0, 6);
                validateInput();
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') confirm();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cancel();
            });

            // 初始显示
            timerDisplay.textContent = `验证码将在 ${timeLeft} 秒后失效`;
        });
    }

    // 5. 增强下载检测系统
    function enhanceDownloadDetection() {
        const detectedDownloads = new Set();
        
        // A. 拦截带有下载属性的链接点击（基础方法）
        document.addEventListener('click', function(e) {
            let link = e.target.closest('a');
            while (link) {
                if (link.hasAttribute('download') || 
                    /\.(pdf|zip|rar|7z|exe|msi|dmg|pkg|apk|deb|rpm|tar\.gz|tgz|bz2|xz|iso|img|mp4|avi|mkv|mov|wmv|flv|mp3|wav|flac|aac|xlsx?|docx?|pptx?|csv|txt|log|json|xml|html|htm|epub|mobi|azw|torrent)$/i.test(link.href)) {
                    
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    log('info', '检测到下载链接点击', { href: link.href, downloadAttr: link.getAttribute('download') });
                    
                    const url = link.href;
                    const filename = link.getAttribute('download') || 
                                   decodeURIComponent(url.split('/').pop().split('?')[0]) || 
                                   'download';
                    
                    if (!detectedDownloads.has(url)) {
                        detectedDownloads.add(url);
                        handleDownloadAttempt(url, filename, 'link_click');
                    }
                    return;
                }
                link = link.parentElement.closest('a');
            }
        }, true);

        // B. 拦截通过 window.open 触发的下载
        const originalWindowOpen = window.open;
        window.open = function(...args) {
            const url = args[0];
            if (url && isDownloadUrl(url)) {
                log('info', '检测到 window.open 下载尝试', { url });
                
                if (!detectedDownloads.has(url)) {
                    detectedDownloads.add(url);
                    handleDownloadAttempt(url, url.split('/').pop(), 'window_open').then(allow => {
                        if (allow) {
                            return originalWindowOpen.apply(this, args);
                        }
                    });
                    return null;
                }
            }
            return originalWindowOpen.apply(this, args);
        };

        // C. 拦截表单提交的下载
        if (CONFIG.enableFormDetection) {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    // 检查表单是否有文件下载的迹象
                    const hasFileInput = form.querySelector('input[type="file"]');
                    const action = form.action || '';
                    
                    if (hasFileInput || isDownloadUrl(action)) {
                        log('info', '检测到表单提交可能包含下载', { action });
                        e.preventDefault();
                        
                        // 收集表单数据
                        const formData = new FormData(form);
                        const params = new URLSearchParams();
                        for (let [key, value] of formData) {
                            params.append(key, value);
                        }
                        
                        const url = action || window.location.href;
                        handleDownloadAttempt(url, 'form_submission', 'form_submit', {
                            method: form.method,
                            data: params.toString()
                        }).then(allow => {
                            if (allow) {
                                form.submit();
                            }
                        });
                    }
                }
            }, true);
        }

        // D. 拦截 Fetch API 请求（高级方法）
        if (CONFIG.enableFetchDetection) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const [resource, options = {}] = args;
                const url = typeof resource === 'string' ? resource : resource.url;
                
                // 检查是否是下载请求
                if (isDownloadRequest(resource, options)) {
                    log('debug', '检测到 Fetch 下载请求', { url, options });
                    
                    return new Promise(async (resolve, reject) => {
                        const filename = getFilenameFromOptions(options) || 
                                       url.split('/').pop().split('?')[0] || 
                                       'download';
                        
                        const allowDownload = await handleDownloadAttempt(
                            url, filename, 'fetch_request', { options }
                        );
                        
                        if (allowDownload) {
                            originalFetch.apply(this, args)
                                .then(resolve)
                                .catch(reject);
                        } else {
                            reject(new Error('下载被用户取消'));
                        }
                    });
                }
                
                return originalFetch.apply(this, args);
            };
        }

        // E. 拦截 Blob URL 创建和下载
        if (CONFIG.enableBlobDetection) {
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                const url = originalCreateObjectURL.call(this, blob);
                
                // 检查是否是常见文件类型的 Blob
                if (blob instanceof Blob) {
                    const blobType = blob.type;
                    const commonDownloadTypes = [
                        'application/pdf',
                        'application/zip',
                        'application/x-rar-compressed',
                        'application/x-msdownload', // exe
                        'application/vnd.android.package-archive', // apk
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument',
                        'application/octet-stream'
                    ];
                    
                    if (commonDownloadTypes.some(type => blobType.includes(type))) {
                        log('info', '检测到文件类型 Blob 创建', { type: blob.type, size: blob.size });
                        
                        // 存储 Blob 引用以便后续使用
                        if (!window.__interceptedBlobs) window.__interceptedBlobs = new Map();
                        window.__interceptedBlobs.set(url, blob);
                    }
                }
                
                return url;
            };

            // 监控使用 Blob URL 的链接点击
            document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href && link.href.startsWith('blob:')) {
                    const blob = window.__interceptedBlobs?.get(link.href);
                    if (blob) {
                        e.preventDefault();
                        log('info', '检测到 Blob URL 下载点击', { type: blob.type, size: blob.size });
                        
                        handleDownloadAttempt(link.href, `blob_${Date.now()}.${getExtensionFromMime(blob.type)}`, 'blob_download', { blob })
                            .then(allow => {
                                if (allow && window.__interceptedBlobs) {
                                    window.__interceptedBlobs.delete(link.href);
                                }
                            });
                    }
                }
            }, true);
        }

        // F. 监听 beforeunload 和 unload 事件
        window.addEventListener('beforeunload', function(e) {
            // 检查当前是否有未完成的下载操作
            const hasPendingDownloads = document.querySelectorAll('a[download], iframe[src*="download"]').length > 0;
            if (hasPendingDownloads) {
                log('info', '检测到页面卸载时的下载行为');
                // 可以在这里添加更多检测逻辑
            }
        });

        // G. 监控 iframe 中的下载
        if (CONFIG.enableIframeDetection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'IFRAME') {
                            try {
                                const iframe = node;
                                iframe.addEventListener('load', () => {
                                    try {
                                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                                        // 监控 iframe 内部的点击
                                        iframeDoc.addEventListener('click', (e) => {
                                            const link = e.target.closest('a');
                                            if (link && (link.hasAttribute('download') || isDownloadUrl(link.href))) {
                                                log('info', '检测到 iframe 内的下载点击', { href: link.href });
                                                e.stopImmediatePropagation();
                                            }
                                        }, true);
                                    } catch (err) {
                                        // 跨域 iframe 无法访问
                                    }
                                });
                            } catch (err) {
                                log('debug', '无法访问 iframe 内容（可能跨域）');
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        // H. 监控网络请求中的下载
        if (window.PerformanceObserver) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                            const url = entry.name;
                            if (isDownloadUrl(url) && entry.encodedBodySize > 1024 * 1024) { // 大于1MB
                                log('debug', '检测到大文件网络请求', { url, size: entry.encodedBodySize });
                            }
                        }
                    });
                });
                observer.observe({ entryTypes: ['resource'] });
            } catch (err) {
                log('debug', 'PerformanceObserver 不支持');
            }
        }

        log('info', '增强版下载检测系统已激活');
    }

    // 6. 辅助函数
    function isDownloadUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        const downloadPatterns = [
            /download/i,
            /\.(pdf|zip|rar|7z|exe|msi|dmg|pkg|apk|deb|rpm|tar\.gz|tgz|bz2|xz|iso|img)$/i,
            /\.(mp4|avi|mkv|mov|wmv|flv|webm|mpg|mpeg)$/i,
            /\.(mp3|wav|flac|aac|ogg|m4a)$/i,
            /\.(xlsx?|docx?|pptx?|csv|txt|log|json|xml)$/i,
            /attachment/i,
            /force[_-]?download/i,
            /save[_-]?file/i
        ];
        
        return downloadPatterns.some(pattern => pattern.test(url));
    }

    function isDownloadRequest(resource, options) {
        const url = typeof resource === 'string' ? resource : resource.url;
        
        // 检查 URL
        if (isDownloadUrl(url)) return true;
        
        // 检查响应头要求
        if (options.headers) {
            const headers = options.headers;
            if (headers instanceof Headers) {
                if (headers.has('Content-Disposition') && 
                    headers.get('Content-Disposition').includes('attachment')) {
                    return true;
                }
            } else if (typeof headers === 'object') {
                if (headers['Content-Disposition']?.includes('attachment')) {
                    return true;
                }
            }
        }
        
        return false;
    }

    function getFilenameFromOptions(options) {
        if (!options || !options.headers) return null;
        
        try {
            const headers = options.headers;
            let contentDisposition = '';
            
            if (headers instanceof Headers) {
                contentDisposition = headers.get('Content-Disposition') || '';
            } else if (typeof headers === 'object') {
                contentDisposition = headers['Content-Disposition'] || '';
            }
            
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                return decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
            }
        } catch (err) {
            log('debug', '解析文件名失败', err);
        }
        
        return null;
    }

    function getExtensionFromMime(mimeType) {
        const mimeMap = {
            'application/pdf': 'pdf',
            'application/zip': 'zip',
            'application/x-rar-compressed': 'rar',
            'application/x-msdownload': 'exe',
            'application/vnd.android.package-archive': 'apk',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/octet-stream': 'bin'
        };
        
        for (const [mime, ext] of Object.entries(mimeMap)) {
            if (mimeType.includes(mime)) return ext;
        }
        
        // 从 MIME 类型提取通用部分
        const parts = mimeType.split('/');
        if (parts.length === 2) {
            const subtype = parts[1];
            if (subtype.includes('.')) {
                return subtype.split('.').pop();
            }
            return subtype.split('-').pop();
        }
        
        return 'file';
    }

    // 7. 处理下载尝试（增强版）
    async function handleDownloadAttempt(url, filename, source, metadata = {}) {
        // 避免重复处理同一URL
        const requestId = `${url}_${Date.now()}`;
        log('info', `下载尝试被拦截 [${source}]`, { url, filename, metadata });
        
        // 生成验证码
        const verificationCode = generateVerificationCode();
        
        // 显示验证弹窗
        const isVerified = await showVerificationModal(verificationCode);
        
        if (isVerified) {
            log('info', '验证成功，开始下载', { url, filename });
            
            // 根据不同来源处理下载
            switch (source) {
                case 'blob_download':
                    if (metadata.blob) {
                        const blobUrl = URL.createObjectURL(metadata.blob);
                        triggerDownload(blobUrl, filename);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                    }
                    break;
                    
                case 'fetch_request':
                    // 对于 Fetch 请求，已在上游处理
                    break;
                    
                default:
                    // 标准链接下载
                    triggerDownload(url, filename);
            }
            
            return true;
        } else {
            log('info', '验证失败或取消，下载已阻止', { url, filename });
            showNotification('下载已取消', 'error');
            return false;
        }
    }

    function triggerDownload(url, filename) {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('下载已开始', 'success');
        } catch (err) {
            log('debug', '触发下载失败', err);
            showNotification('下载失败，请重试', 'error');
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000001;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            animation-fill-mode: forwards;
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        }
        
        // 添加动画样式
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    // 8. 初始化
    function initialize() {
        // 等待页面完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enhanceDownloadDetection);
        } else {
            enhanceDownloadDetection();
        }
        
        // 监控动态加载的内容
        const observer = new MutationObserver(() => {
            // 可以在这里重新绑定事件，但大部分事件使用事件委托，不需要
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        log('info', '增强版下载验证码拦截器已初始化');
    }

    initialize();
})();