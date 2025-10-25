// ==UserScript==
// @name         网页艺术字体替换器
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  将网页字体实时替换为艺术字体，支持自定义字体源
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/cn-font-replacer@1.2.1/dist/fontReplacer.min.js
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置艺术字体
    const fontConfig = {
        // 默认字体映射
        fontMap: {
            'serif': '"Hiragino Sans GB", "Source Han Serif", "YouYuan", "SimSun", serif',
            'sans-serif': '"PangMenZhengDao", "Source Han Sans", "Microsoft YaHei", "SimHei", sans-serif',
            'monospace': '"Fira Code", "Consolas", "Monaco", monospace'
        },
        
        // 艺术字体列表（可扩展）
        artFonts: [
            'PangMenZhengDao',  // 庞门正道标题体
            'ZCOOL KuaiLe',     // 站酷快乐体
            'Ma Shan Zheng',    // 马善政毛笔体
            'Zhi Mang Xing',    // 稚芒行书
            'Liu Jian Mao Cao'  // 刘剑毛草书
        ],
        
        // 排除的网站（这些网站不应用字体替换）
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
        
        // 性能优化配置
        performance: {
            throttleDelay: 50,
            batchSize: 100,
            maxElements: 5000
        },
        
        // 缓存配置
        cacheEnabled: true,
        cacheVersion: '1.4'
    };
    
    // 安全域名验证
    function isSafeDomain(url) {
        try {
            const domain = new URL(url).hostname;
            const safeDomains = [
                'fonts.googleapis.com',
                'cdn.jsdelivr.net',
                'github.com',
                'fonts.gstatic.com'
            ];
            return safeDomains.some(safe => domain.includes(safe)) && 
                   !domain.includes('malicious') && 
                   !domain.includes('phishing');
        } catch {
            return false;
        }
    }
    
    // 安全的字体加载
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
    
    // 性能优化的实时字体监听器
    function createFontObserver() {
        let observer;
        let timeoutId;
        let processedElements = new WeakSet();
        
        try {
            observer = new MutationObserver(function(mutations) {
                // 使用防抖优化性能
                clearTimeout(timeoutId);
                timeoutId = setTimeout(function() {
                    const elementsToProcess = new Set();
                    
                    for (let mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
                                    elementsToProcess.add(node);
                                    // 限制处理元素数量
                                    if (elementsToProcess.size >= fontConfig.performance.batchSize) break;
                                }
                            });
                        }
                    }
                    
                    // 批量处理元素
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
    
    // 批量处理元素
    function processElementsBatch(elements) {
        let processedCount = 0;
        
        for (let element of elements) {
            if (processedCount >= fontConfig.performance.batchSize) break;
            
            if (applyFontToElement(element)) {
                processedCount++;
            }
            
            // 限制总处理元素数量
            if (processedCount >= fontConfig.performance.maxElements) break;
        }
    }
    
    // 应用字体到单个元素（优化版）
    function applyFontToElement(element) {
        if (!element || !element.style || element.dataset.fontReplaced === 'true') {
            return false;
        }
        
        try {
            const tagName = element.tagName.toLowerCase();
            const computedStyle = window.getComputedStyle(element);
            const currentFontFamily = computedStyle.fontFamily;
            
            // 跳过不可见元素
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                return false;
            }
            
            // 根据元素类型应用不同的字体
            if (['code', 'pre', 'kbd', 'samp'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['monospace'];
            } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
                element.style.fontWeight = '700';
            } else if (['blockquote', 'cite'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['serif'];
                element.style.fontStyle = 'italic';
            } else if (['input', 'textarea', 'button', 'select'].includes(tagName)) {
                // 表单元素特殊处理
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
            } else {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'];
            }
            
            element.dataset.fontReplaced = 'true';
            return true;
            
        } catch (error) {
            console.debug('应用字体到元素时出错:', error);
            return false;
        }
    }
    
    // 初始化字体替换
    function initFontReplacement() {
        // 检查当前网站是否在排除列表中
        const currentHost = window.location.hostname;
        if (fontConfig.excludeSites.some(site => currentHost.includes(site))) {
            console.log('当前网站在排除列表中，跳过字体替换');
            return;
        }
        
        // 安全检查
        if (!isPageSafe()) {
            console.warn('页面安全检查未通过，跳过字体替换');
            return;
        }
        
        // 添加艺术字体CSS
        addArtFontCSS();
        
        // 应用字体替换（原有方法）
        applyFontReplacement();
        
        // 启动实时字体监听器（新方法）
        startRealTimeFontObserver();
        
        // 注册菜单命令用于临时禁用
        registerMenuCommands();
    }
    
    // 页面安全检查
    function isPageSafe() {
        try {
            // 检查页面是否被篡改
            if (document.documentElement.hasAttribute('data-tampered')) {
                return false;
            }
            
            // 检查是否在iframe中
            if (window.self !== window.top) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // 启动实时字体监听器
    function startRealTimeFontObserver() {
        const observer = createFontObserver();
        if (observer) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: false, // 禁用字符数据监听以提高性能
                attributes: false
            });
            
            // 存储观察器引用以便清理
            window._fontObserver = observer;
        }
        
        // 延迟初始应用以提高页面加载速度
        setTimeout(() => {
            try {
                // 分批处理现有元素
                const allElements = document.querySelectorAll('*');
                const totalElements = Math.min(allElements.length, fontConfig.performance.maxElements);
                
                for (let i = 0; i < totalElements; i += fontConfig.performance.batchSize) {
                    setTimeout(() => {
                        const batch = Array.from(allElements).slice(i, i + fontConfig.performance.batchSize);
                        processElementsBatch(batch);
                    }, i * 10);
                }
            } catch (error) {
                console.warn('初始字体应用失败:', error);
            }
        }, 1000);
    }
    
    // 添加艺术字体CSS定义
    function addArtFontCSS() {
        const fontCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&family=Liu+Jian+Mao+Cao&family=Zhi+Mang+Xing&display=swap&display=block');
        
        @font-face {
            font-family: 'PangMenZhengDao';
            src: url('https://cdn.jsdelivr.net/gh/wordshub/free-font/assets/PangMenZhengDaoBiaoTiTi-1.ttf') format('truetype');
            font-display: swap;
            font-feature-settings: "kern" off;
        }
        
        /* 使用更高效的选择器 */
        body, div, p, span, a, li, td, th {
            font-family: ${fontConfig.fontMap['sans-serif']} !important;
        }
        
        /* 特殊元素处理 */
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
    
    // 应用字体替换到页面元素（原有方法）
    function applyFontReplacement() {
        // 使用更新后的 cn-font-replacer 进行高级字体替换
        if (typeof FontReplacer !== 'undefined') {
            try {
                // 初始化字体替换器
                const fontReplacer = new FontReplacer({
                    performanceMode: true,
                    safeMode: true
                });
                fontReplacer.applyFont(document.body, 'art-font-replacement');
            } catch (error) {
                console.warn('高级字体替换失败，使用基础方法:', error);
                applyBasicFontReplacement();
            }
        } else {
            applyBasicFontReplacement();
        }
    }
    
    // 基础字体替换方法
    function applyBasicFontReplacement() {
        if (document.getElementById('art-font-replacement')) {
            return; // 避免重复添加
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
    
    // 监听DOM变化以实时应用字体（处理动态内容）
    function observeDOMChanges() {
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                // 延迟执行以避免频繁更新
                setTimeout(applyFontReplacement, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 注册油猴菜单命令
    function registerMenuCommands() {
        // 切换字体替换开关
        GM_registerMenuCommand('切换艺术字体', function() {
            const disabled = GM_getValue('fontReplacementDisabled', false);
            GM_setValue('fontReplacementDisabled', !disabled);
            
            if (!disabled) {
                document.getElementById('art-font-replacement')?.remove();
                // 停止实时监听器
                if (window._fontObserver) {
                    window._fontObserver.disconnect();
                }
                alert('艺术字体替换已禁用，刷新页面生效');
            } else {
                alert('艺术字体替换已启用，刷新页面生效');
            }
        });
        
        // 临时恢复默认字体
        GM_registerMenuCommand('临时恢复默认字体', function() {
            const originalStyle = document.getElementById('art-font-replacement');
            if (originalStyle) {
                originalStyle.disabled = true;
                setTimeout(() => {
                    if (originalStyle) {
                        originalStyle.disabled = false;
                    }
                }, 10000); // 10秒后恢复
                alert('已临时恢复默认字体，10秒后恢复艺术字体');
            }
        });
    }
    
    // 检查是否被禁用
    if (!GM_getValue('fontReplacementDisabled', false)) {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initFontReplacement);
        } else {
            // 延迟初始化以提高页面加载性能
            setTimeout(initFontReplacement, 100);
        }
    }
    
    // 清理函数
    window.addEventListener('beforeunload', function() {
        // 清理可能的资源泄露
        if (window._fontObserver) {
            window._fontObserver.disconnect();
        }
        // 清理全局变量
        delete window._fontObserver;
    });
})();