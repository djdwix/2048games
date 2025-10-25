// ==UserScript==
// @name         网页艺术字体替换器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  将网页字体实时替换为艺术字体，支持自定义字体源
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/cn-font-replacer@1.2.2/dist/fontReplacer.min.js
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    const fontConfig = {
        fontMap: {
            'serif': '"Hiragino Sans GB", "Source Han Serif", "YouYuan", "SimSun", serif',
            'sans-serif': '"PangMenZhengDao", "Source Han Sans", "Microsoft YaHei", "SimHei", sans-serif',
            'monospace': '"Fira Code", "Consolas", "Monaco", monospace'
        },
        
        artFonts: [
            'PangMenZhengDao',
            'ZCOOL KuaiLe',
            'Ma Shan Zheng',
            'Zhi Mang Xing',
            'Liu Jian Mao Cao'
        ],
        
        excludeSites: [
            'docs.google.com',
            'office.com',
            'prezi.com',
            'online-banking',
            'login.',
            'auth.',
            'localhost',
            '127.0.0.1'
        ],
        
        performance: {
            throttleDelay: 30,
            batchSize: 50,
            maxElements: 3000
        },
        
        cacheEnabled: true,
        cacheVersion: '1.5'
    };
    
    function isSafeDomain(url) {
        try {
            const domain = new URL(url).hostname;
            const safeDomains = [
                'fonts.googleapis.com',
                'cdn.jsdelivr.net',
                'github.com',
                'fonts.gstatic.com',
                'unpkg.com'
            ];
            return safeDomains.some(safe => domain.includes(safe)) && 
                   !domain.includes('malicious') && 
                   !domain.includes('phishing') &&
                   !domain.includes('untrusted');
        } catch {
            return false;
        }
    }
    
    function loadFontSafely(fontUrl) {
        if (!isSafeDomain(fontUrl)) {
            console.warn('不安全的字体源:', fontUrl);
            return null;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.crossOrigin = 'anonymous';
        link.integrity = 'sha384-verify';
        link.referrerPolicy = 'no-referrer';
        return link;
    }
    
    function createFontObserver() {
        let observer;
        let timeoutId;
        let processedElements = new WeakSet();
        
        try {
            observer = new MutationObserver(function(mutations) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(function() {
                    const elementsToProcess = new Set();
                    
                    for (let mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
                                    elementsToProcess.add(node);
                                    if (elementsToProcess.size >= fontConfig.performance.batchSize) break;
                                }
                            });
                        }
                    }
                    
                    if (elementsToProcess.size > 0) {
                        processElementsBatch(Array.from(elementsToProcess));
                    }
                }, fontConfig.performance.throttleDelay);
            });
        } catch (error) {
            console.warn('创建字体监听器失败:', error);
        }
        return observer;
    }
    
    function processElementsBatch(elements) {
        let processedCount = 0;
        
        for (let element of elements) {
            if (processedCount >= fontConfig.performance.batchSize) break;
            
            if (applyFontToElement(element)) {
                processedCount++;
            }
            
            if (processedCount >= fontConfig.performance.maxElements) break;
        }
    }
    
    function applyFontToElement(element) {
        if (!element || !element.style || element.dataset.fontReplaced === 'true') {
            return false;
        }
        
        try {
            const tagName = element.tagName.toLowerCase();
            const computedStyle = window.getComputedStyle(element);
            
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                return false;
            }
            
            if (['code', 'pre', 'kbd', 'samp'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['monospace'];
            } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
                element.style.fontWeight = '700';
            } else if (['blockquote', 'cite'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['serif'];
                element.style.fontStyle = 'italic';
            } else if (['input', 'textarea', 'button', 'select'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
            } else {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
            }
            
            element.dataset.fontReplaced = 'true';
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    function initFontReplacement() {
        const currentHost = window.location.hostname;
        if (fontConfig.excludeSites.some(site => currentHost.includes(site))) {
            return;
        }
        
        if (!isPageSafe()) {
            return;
        }
        
        addArtFontCSS();
        
        applyFontReplacement();
        
        startRealTimeFontObserver();
        
        registerMenuCommands();
    }
    
    function isPageSafe() {
        try {
            if (document.documentElement.hasAttribute('data-tampered')) {
                return false;
            }
            
            if (window.self !== window.top) {
                return false;
            }
            
            if (window.location.protocol !== 'https:' && window.location.protocol !== 'http:') {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    function startRealTimeFontObserver() {
        const observer = createFontObserver();
        if (observer) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: false,
                attributes: false
            });
            
            window._fontObserver = observer;
        }
        
        setTimeout(() => {
            try {
                const allElements = document.querySelectorAll('body *');
                const totalElements = Math.min(allElements.length, fontConfig.performance.maxElements);
                
                for (let i = 0; i < totalElements; i += fontConfig.performance.batchSize) {
                    setTimeout(() => {
                        const batch = Array.from(allElements).slice(i, i + fontConfig.performance.batchSize);
                        processElementsBatch(batch);
                    }, i * 5);
                }
            } catch (error) {
                console.warn('初始字体应用失败:', error);
            }
        }, 500);
    }
    
    function addArtFontCSS() {
        const fontCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&family=Liu+Jian+Mao+Cao&family=Zhi+Mang+Xing&display=swap');
        
        @font-face {
            font-family: 'PangMenZhengDao';
            src: url('https://cdn.jsdelivr.net/gh/wordshub/free-font/assets/PangMenZhengDaoBiaoTiTi-1.ttf') format('truetype');
            font-display: swap;
        }
        
        @font-face {
            font-family: 'ZCOOL KuaiLe';
            src: url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap');
            font-display: swap;
        }
        
        body, div, p, span, a, li, td, th {
            font-family: ${fontConfig.fontMap['sans-serif']} !important;
        }
        
        code, pre, kbd, samp {
            font-family: ${fontConfig.fontMap['monospace']} !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
            font-family: ${fontConfig.fontMap['sans-serif']} !important;
            font-weight: 700;
        }
        
        blockquote, cite {
            font-family: ${fontConfig.fontMap['serif']} !important;
            font-style: italic;
        }
        
        input, textarea, button, select {
            font-family: ${fontConfig.fontMap['sans-serif']} !important;
        }
        `;
        
        GM_addStyle(fontCSS);
    }
    
    function applyFontReplacement() {
        if (typeof FontReplacer !== 'undefined') {
            try {
                const fontReplacer = new FontReplacer({
                    performanceMode: true,
                    safeMode: true,
                    fallback: true
                });
                fontReplacer.applyFont(document.body, 'art-font-replacement');
            } catch (error) {
                applyBasicFontReplacement();
            }
        } else {
            applyBasicFontReplacement();
        }
    }
    
    function applyBasicFontReplacement() {
        if (document.getElementById('art-font-replacement')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'art-font-replacement';
        style.textContent = `
            body, div, p, span, a, li, td, th, input, textarea, button, select {
                font-family: ${fontConfig.fontMap['sans-serif']} !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    function registerMenuCommands() {
        GM_registerMenuCommand('切换艺术字体', function() {
            const disabled = GM_getValue('fontReplacementDisabled', false);
            GM_setValue('fontReplacementDisabled', !disabled);
            
            if (!disabled) {
                document.getElementById('art-font-replacement')?.remove();
                if (window._fontObserver) {
                    window._fontObserver.disconnect();
                }
                alert('艺术字体替换已禁用，刷新页面生效');
            } else {
                alert('艺术字体替换已启用，刷新页面生效');
            }
        });
        
        GM_registerMenuCommand('临时恢复默认字体', function() {
            const originalStyle = document.getElementById('art-font-replacement');
            if (originalStyle) {
                originalStyle.disabled = true;
                setTimeout(() => {
                    if (originalStyle) {
                        originalStyle.disabled = false;
                    }
                }, 10000);
                alert('已临时恢复默认字体，10秒后恢复艺术字体');
            }
        });
    }
    
    if (!GM_getValue('fontReplacementDisabled', false)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initFontReplacement);
        } else {
            setTimeout(initFontReplacement, 50);
        }
    }
    
    window.addEventListener('beforeunload', function() {
        if (window._fontObserver) {
            window._fontObserver.disconnect();
        }
        delete window._fontObserver;
    });
})();