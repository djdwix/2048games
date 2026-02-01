// ==UserScript==
// @name         增强版下载验证码拦截器
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  增强检测多种下载行为并弹出验证码验证
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

    const CONFIG = {
        enableBlobDetection: true,
        enableFetchDetection: true,
        enableFormDetection: true,
        enableIframeDetection: true,
        logLevel: 'info'
    };

    const state = {
        activeVerification: null,
        verifiedDownloads: new Set(),
        verificationQueue: []
    };

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

    function generateVerificationCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function showVerificationModal(expectedCode, resolve) {
        if (state.activeVerification) {
            resolve(false);
            return;
        }

        state.activeVerification = {
            expectedCode,
            attempts: 0,
            maxAttempts: 3,
            timeout: 120,
            startTime: Date.now(),
            resolve: resolve
        };

        const modal = document.createElement('div');
        modal.id = 'download-verification-modal-' + Date.now();
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

        const title = document.createElement('h2');
        title.textContent = '🔒 下载验证';
        title.style.cssText = `
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-weight: 600;
        `;

        const subtitle = document.createElement('p');
        subtitle.textContent = '请输入6位验证码（包含大写字母和数字）';
        subtitle.style.cssText = `
            color: #7f8c8d;
            margin: 0 0 20px 0;
            font-size: 14px;
        `;

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

        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'verification-timer';
        timerDisplay.style.cssText = `
            color: #e74c3c;
            font-size: 13px;
            margin: -10px 0 15px 0;
            font-weight: 500;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入验证码...';
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
            text-transform: uppercase;
        `;
        
        setTimeout(() => {
            if (input && document.body.contains(modal)) {
                input.focus();
            }
        }, 10);

        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'verification-error';
        errorDisplay.style.cssText = `
            color: #e74c3c;
            font-size: 13px;
            margin: 5px 0;
            min-height: 20px;
            font-weight: 500;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            margin-top: 25px;
        `;

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

        [cancelBtn, confirmBtn].forEach(btn => {
            btn.onmouseenter = () => btn.style.opacity = '0.9';
            btn.onmouseleave = () => btn.style.opacity = '1';
            btn.onmousedown = () => btn.style.transform = 'scale(0.98)';
            btn.onmouseup = () => btn.style.transform = 'scale(1)';
        });

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

        let timeLeft = state.activeVerification.timeout;
        let timerInterval;

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeLeft--;
                if (timerDisplay && document.body.contains(modal)) {
                    timerDisplay.textContent = `验证码将在 ${timeLeft} 秒后失效`;
                }

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    cancelVerification(false, true);
                }
            }, 1000);
        }

        startTimer();

        function validateInput() {
            const enteredCode = input.value.trim().toUpperCase();
            errorDisplay.textContent = '';
            input.style.borderColor = '#e0e0e0';

            if (!/^[A-Z2-9]{6}$/.test(enteredCode)) {
                input.style.borderColor = '#e74c3c';
                return false;
            }
            return true;
        }

        function confirmVerification() {
            if (!validateInput()) {
                errorDisplay.textContent = '请输入6位验证码（大写字母和数字）';
                input.focus();
                return;
            }

            const enteredCode = input.value.trim().toUpperCase();
            state.activeVerification.attempts++;

            if (enteredCode === expectedCode) {
                const downloadKey = btoa(encodeURIComponent(state.activeVerification.expectedCode + '_' + state.activeVerification.startTime));
                try {
                    localStorage.setItem('dl_verified_' + downloadKey, 'true');
                    localStorage.setItem('dl_verified_time', Date.now().toString());
                } catch(e) {}

                clearInterval(timerInterval);
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                const currentResolve = state.activeVerification.resolve;
                state.activeVerification = null;
                processVerificationQueue();
                currentResolve(true);
            } else {
                if (state.activeVerification.attempts >= state.activeVerification.maxAttempts) {
                    errorDisplay.textContent = '尝试次数过多，验证码已失效';
                    errorDisplay.style.color = '#e74c3c';
                    setTimeout(() => {
                        cancelVerification(false, true);
                    }, 1000);
                } else {
                    errorDisplay.textContent = `验证码错误，还剩${state.activeVerification.maxAttempts - state.activeVerification.attempts}次尝试`;
                    errorDisplay.style.color = '#e67e22';
                    input.value = '';
                    input.focus();
                    input.style.borderColor = '#e67e22';
                }
            }
        }

        function cancelVerification(shouldRegenerate = true, isFailed = false) {
            clearInterval(timerInterval);
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            const currentResolve = state.activeVerification.resolve;
            state.activeVerification = null;
            
            if (shouldRegenerate) {
                setTimeout(() => {
                    processVerificationQueue();
                }, 10);
            }
            
            currentResolve(false);
        }

        confirmBtn.addEventListener('click', confirmVerification);
        cancelBtn.addEventListener('click', () => cancelVerification(true, false));

        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^A-Za-z2-9]/g, '').slice(0, 6).toUpperCase();
            validateInput();
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmVerification();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) cancelVerification(true, false);
        });

        timerDisplay.textContent = `验证码将在 ${timeLeft} 秒后失效`;
    }

    function processVerificationQueue() {
        if (state.verificationQueue.length > 0 && !state.activeVerification) {
            const { expectedCode, resolve } = state.verificationQueue.shift();
            showVerificationModal(expectedCode, resolve);
        }
    }

    function showVerificationWithRetry(resolve) {
        const expectedCode = generateVerificationCode();
        
        if (state.activeVerification) {
            state.verificationQueue.push({ expectedCode, resolve });
        } else {
            showVerificationModal(expectedCode, resolve);
        }
    }

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
            /save[_-]?file/i,
            /\.(dmg|pkg|app|ipa)$/i,
            /\.(torrent|magnet)/i,
            /\.(psd|ai|eps|sketch|fig)$/i,
            /\.(sql|db|sqlite|mdb)$/i,
            /\.(epub|mobi|azw|azw3)$/i,
            /\.(iso|img|bin|nrg)$/i,
            /\.(ova|ovf|vmdk|vhd)$/i,
            /\.(apk|aab|xapk)$/i,
            /\.(msix|msixbundle|appx|appxbundle)$/i,
            /\.(dll|sys|drv|ocx)$/i,
            /\.(py|js|java|cpp|c|h|html|css|php|rb|go|rs|ts)$/i,
            /\.(yml|yaml|toml|ini|cfg|conf)$/i
        ];

        if (downloadPatterns.some(pattern => pattern.test(url))) return true;

        try {
            const urlObj = new URL(url, window.location.href);
            const path = urlObj.pathname.toLowerCase();
            const query = urlObj.search.toLowerCase();
            
            if (/\/download\//.test(path) || /\?.*download/.test(query)) return true;
            if (/\/file\//.test(path) || /\?.*file/.test(query)) return true;
            if (/\/save\//.test(path) || /\?.*save/.test(query)) return true;
            if (/\/export\//.test(path) || /\?.*export/.test(query)) return true;
            
            const lastSegment = path.split('/').pop();
            if (lastSegment && /^v?\d+[\.\d]*/.test(lastSegment)) {
                const extMatch = lastSegment.match(/\.(\w+)$/);
                if (extMatch && ['exe','dmg','zip','rar','7z','tar','gz'].includes(extMatch[1].toLowerCase())) {
                    return true;
                }
            }
        } catch(e) {}

        return false;
    }

    function isDownloadRequest(resource, options) {
        const url = typeof resource === 'string' ? resource : resource.url;

        if (isDownloadUrl(url)) return true;

        if (options && options.headers) {
            const headers = options.headers;
            let contentDisposition = '';
            
            try {
                if (headers instanceof Headers) {
                    contentDisposition = headers.get('Content-Disposition') || '';
                } else if (typeof headers === 'object') {
                    contentDisposition = headers['Content-Disposition'] || headers['content-disposition'] || '';
                }
                
                if (contentDisposition && (contentDisposition.includes('attachment') || contentDisposition.includes('filename'))) {
                    return true;
                }
            } catch(e) {}
        }

        if (options && options.responseType) {
            const responseTypes = ['blob', 'arraybuffer', 'stream'];
            if (responseTypes.includes(options.responseType)) return true;
        }

        return false;
    }

    function getFilenameFromResponse(response) {
        if (!response || !response.headers) return null;
        
        try {
            const contentDisposition = response.headers.get('Content-Disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    return decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
                }
            }
            
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/')) {
                const url = response.url || '';
                const fileName = url.split('/').pop().split('?')[0];
                if (fileName && fileName.includes('.')) return fileName;
            }
        } catch(e) {}
        
        return null;
    }

    function analyzeDownloadContext(url, element) {
        const context = {
            isUserInitiated: false,
            isFromTrustedDomain: false,
            hasUserInteraction: false,
            elementType: element ? element.tagName : 'unknown',
            urlPattern: 'unknown'
        };

        try {
            const currentDomain = window.location.hostname;
            const urlDomain = new URL(url, window.location.href).hostname;
            context.isFromTrustedDomain = currentDomain === urlDomain;
            
            if (element) {
                const rect = element.getBoundingClientRect();
                context.isVisible = rect.top >= 0 && rect.left >= 0 && 
                                   rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && 
                                   rect.right <= (window.innerWidth || document.documentElement.clientWidth);
                
                context.hasTextContent = element.textContent && element.textContent.trim().length > 0;
                context.hasDownloadAttr = element.hasAttribute('download');
                
                const computedStyle = window.getComputedStyle(element);
                context.isHidden = computedStyle.display === 'none' || 
                                  computedStyle.visibility === 'hidden' || 
                                  computedStyle.opacity === '0';
            }

            const urlLower = url.toLowerCase();
            if (urlLower.includes('download')) context.urlPattern = 'explicit_download';
            else if (urlLower.match(/\.(exe|dmg|msi|apk|pkg)$/)) context.urlPattern = 'executable';
            else if (urlLower.match(/\.(zip|rar|7z|tar|gz)$/)) context.urlPattern = 'archive';
            else if (urlLower.match(/\.(mp4|avi|mkv|mov)$/)) context.urlPattern = 'media';
            else if (urlLower.match(/\.(pdf|doc|docx|xls|xlsx)$/)) context.urlPattern = 'document';
            else context.urlPattern = 'other';

        } catch(e) {}

        return context;
    }

    function shouldInterceptDownload(url, element, source) {
        if (!isDownloadUrl(url)) return false;

        try {
            const downloadKey = btoa(encodeURIComponent(url));
            const lastVerified = parseInt(localStorage.getItem('dl_verified_time') || '0');
            const timeSinceLastVerify = Date.now() - lastVerified;
            
            if (timeSinceLastVerify < 30000) {
                const verifiedKey = 'dl_verified_' + downloadKey;
                if (localStorage.getItem(verifiedKey) === 'true') {
                    localStorage.removeItem(verifiedKey);
                    return false;
                }
            } else {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('dl_verified_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
        } catch(e) {}

        const context = analyzeDownloadContext(url, element);
        
        if (context.isHidden && !context.hasUserInteraction) {
            return true;
        }

        if (context.urlPattern === 'executable' || context.urlPattern === 'archive') {
            return true;
        }

        if (context.hasDownloadAttr && context.isVisible) {
            return true;
        }

        if (source === 'fetch_request' || source === 'blob_download') {
            return true;
        }

        if (url.includes('force-download') || url.includes('attachment')) {
            return true;
        }

        const userActions = ['click', 'submit', 'contextmenu'];
        if (userActions.includes(source)) {
            return true;
        }

        return true;
    }

    async function handleDownloadAttempt(url, filename, source, metadata = {}) {
        const element = metadata.element || null;
        
        if (!shouldInterceptDownload(url, element, source)) {
            return true;
        }

        log('info', `下载尝试被拦截 [${source}]`, { url, filename });

        return new Promise((resolve) => {
            showVerificationWithRetry(resolve);
        }).then((isVerified) => {
            if (isVerified) {
                log('info', '验证成功，开始下载', { url, filename });

                switch (source) {
                    case 'blob_download':
                        if (metadata.blob) {
                            const blobUrl = URL.createObjectURL(metadata.blob);
                            triggerDownload(blobUrl, filename);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                        }
                        break;

                    case 'fetch_request':
                        break;

                    default:
                        triggerDownload(url, filename);
                }

                state.verifiedDownloads.add(url);
                return true;
            } else {
                log('info', '验证失败或取消，下载已阻止', { url, filename });
                showNotification('下载已取消', 'error');
                return false;
            }
        });
    }

    function triggerDownload(url, filename) {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
            }, 100);

            showNotification('下载已开始', 'success');
        } catch (err) {
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

    function enhanceDownloadDetection() {
        const detectedDownloads = new Set();

        document.addEventListener('click', function(e) {
            let link = e.target.closest('a');
            while (link) {
                if (link.hasAttribute('download') || isDownloadUrl(link.href)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                    const url = link.href;
                    const filename = link.getAttribute('download') || 
                                   decodeURIComponent(url.split('/').pop().split('?')[0]) || 
                                   'download';

                    if (!detectedDownloads.has(url)) {
                        detectedDownloads.add(url);
                        handleDownloadAttempt(url, filename, 'click', { element: link });
                    }
                    return;
                }
                link = link.parentElement.closest('a');
            }
        }, true);

        const originalWindowOpen = window.open;
        window.open = function(...args) {
            const url = args[0];
            if (url && isDownloadUrl(url)) {
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

        if (CONFIG.enableFormDetection) {
            document.addEventListener('submit', function(e) {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    const hasFileInput = form.querySelector('input[type="file"]');
                    const action = form.action || '';

                    if (hasFileInput || isDownloadUrl(action)) {
                        e.preventDefault();

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

        if (CONFIG.enableFetchDetection) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const [resource, options = {}] = args;
                const url = typeof resource === 'string' ? resource : resource.url;

                if (isDownloadRequest(resource, options)) {
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

        if (CONFIG.enableBlobDetection) {
            const originalCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(blob) {
                const url = originalCreateObjectURL.call(this, blob);

                if (blob instanceof Blob) {
                    const blobType = blob.type;
                    const commonDownloadTypes = [
                        'application/pdf',
                        'application/zip',
                        'application/x-rar-compressed',
                        'application/x-msdownload',
                        'application/vnd.android.package-archive',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument',
                        'application/octet-stream'
                    ];

                    if (commonDownloadTypes.some(type => blobType.includes(type))) {
                        if (!window.__interceptedBlobs) window.__interceptedBlobs = new Map();
                        window.__interceptedBlobs.set(url, blob);
                    }
                }

                return url;
            };

            document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href && link.href.startsWith('blob:')) {
                    const blob = window.__interceptedBlobs?.get(link.href);
                    if (blob) {
                        e.preventDefault();
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

        window.addEventListener('beforeunload', function(e) {
            const hasPendingDownloads = document.querySelectorAll('a[download], iframe[src*="download"]').length > 0;
            if (hasPendingDownloads) {
                try {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('dl_verified_')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                } catch(e) {}
            }
        });

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
                                        iframeDoc.addEventListener('click', (e) => {
                                            const link = e.target.closest('a');
                                            if (link && (link.hasAttribute('download') || isDownloadUrl(link.href))) {
                                                e.stopImmediatePropagation();
                                            }
                                        }, true);
                                    } catch (err) {}
                                });
                            } catch (err) {}
                            }
                        });
                    });
                });
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        if (window.PerformanceObserver) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                            const url = entry.name;
                            if (isDownloadUrl(url) && entry.encodedBodySize > 1024 * 1024) {
                                log('debug', '检测到大文件网络请求', { url, size: entry.encodedBodySize });
                            }
                        }
                    });
                });
                observer.observe({ entryTypes: ['resource'] });
            } catch (err) {}
        }

        log('info', '增强版下载检测系统已激活');
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
        } catch (err) {}

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

    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enhanceDownloadDetection);
        } else {
            setTimeout(enhanceDownloadDetection, 0);
        }

        const observer = new MutationObserver(() => {});

        observer.observe(document.body, { childList: true, subtree: true });

        log('info', '增强版下载验证码拦截器已初始化');
    }

    initialize();
})();