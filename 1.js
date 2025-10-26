// ==UserScript==
// @name         网页艺术字体替换器
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  将网页字体实时替换为艺术字体，支持自定义字体源
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://unpkg.com/cn-font-replacer@1.0.0/dist/fontReplacer.min.js
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
            throttleDelay: 20,
            batchSize: 30,
            maxElements: 2000
        },
        
        cacheEnabled: true,
        cacheVersion: '1.7'
    };
    
    function isSafeDomain(url) {
        try {
            const domain = new URL(url).hostname;
            const safeDomains = [
                'fonts.googleapis.com',
                'fonts.gstatic.com',
                'unpkg.com',
                'cdnjs.cloudflare.com'
            ];
            return safeDomains.some(safe => domain.includes(safe)) && 
                   !domain.includes('malicious') && 
                   !domain.includes('phishing') &&
                   !domain.includes('untrusted') &&
                   !domain.includes('danger');
        } catch {
            return false;
        }
    }
    
    function loadFontSafely(fontUrl) {
        if (!isSafeDomain(fontUrl)) {
            return null;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        link.crossOrigin = 'anonymous';
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
                            for (let node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
                                    elementsToProcess.add(node);
                                    if (elementsToProcess.size >= fontConfig.performance.batchSize) break;
                                }
                            }
                        }
                    }
                    
                    if (elementsToProcess.size > 0) {
                        processElementsBatch(Array.from(elementsToProcess));
                    }
                }, fontConfig.performance.throttleDelay);
            });
        } catch (error) {
            return null;
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
            } else if (['blockquote', 'cite'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['serif'];
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
            
            if (window.location.hostname.includes('internal') || window.location.hostname.includes('local')) {
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
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_ELEMENT,
                    null,
                    false
                );
                
                let elements = [];
                let node;
                while ((node = walker.nextNode()) && elements.length < fontConfig.performance.maxElements) {
                    elements.push(node);
                    if (elements.length % fontConfig.performance.batchSize === 0) {
                        setTimeout(() => processElementsBatch(elements.splice(0)), 0);
                    }
                }
                if (elements.length > 0) {
                    processElementsBatch(elements);
                }
            } catch (error) {
            }
        }, 300);
    }
    
    function addArtFontCSS() {
        const fontCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&display=swap');
        
        @font-face {
            font-family: 'PangMenZhengDao';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/fonts/1.0.0/PangMenZhengDao.woff2') format('woff2');
            font-display: swap;
        }
        
        @font-face {
            font-family: 'Zhi Mang Xing';
            src: url('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap');
            font-display: swap;
        }
        
        @font-face {
            font-family: 'Liu Jian Mao Cao';
            src: url('https://fonts.googleapis.com/css2?family=Liu+Jian+Mao+Cao&display=swap');
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
        }
        
        blockquote, cite {
            font-family: ${fontConfig.fontMap['serif']} !important;
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
                    safeMode: true
                });
                fontReplacer.applyFont(document.body);
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
        style.textContent = `body,div,p,span,a,li,td,th,input,textarea,button,select{font-family:${fontConfig.fontMap['sans-serif']}!important}`;
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
            }
        });
    }
    
    if (!GM_getValue('fontReplacementDisabled', false)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initFontReplacement);
        } else {
            setTimeout(initFontReplacement, 10);
        }
    }
    
    window.addEventListener('beforeunload', function() {
        if (window._fontObserver) {
            window._fontObserver.disconnect();
        }
    });
})();