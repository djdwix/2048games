// ==UserScript==
// @name         网页艺术字体替换器
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  将网页字体实时替换为艺术字体，支持自定义字体源
// @author       YourName
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/cn-font-replacer@1.0.0/dist/fontReplacer.min.js
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
            'auth.'
        ],
        
        // 缓存配置
        cacheEnabled: true,
        cacheVersion: '1.3'
    };
    
    // 安全域名验证
    function isSafeDomain(url) {
        try {
            const domain = new URL(url).hostname;
            const safeDomains = [
                'fonts.googleapis.com',
                'cdn.jsdelivr.net',
                'github.com'
            ];
            return safeDomains.some(safe => domain.includes(safe));
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
        link.integrity = 'sha384-verify'; // 添加完整性检查
        return link;
    }
    
    // 实时字体监听器
    function createFontObserver() {
        let observer;
        try {
            observer = new MutationObserver(function(mutations) {
                for (let mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // 实时处理新增节点
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                applyFontToElement(node);
                                // 递归处理子节点
                                if (node.querySelectorAll) {
                                    node.querySelectorAll('*').forEach(applyFontToElement);
                                }
                            }
                        });
                    } else if (mutation.type === 'characterData') {
                        // 处理文本内容变化
                        applyFontToElement(mutation.target.parentElement);
                    }
                }
            });
        } catch (error) {
            console.warn('创建字体监听器失败:', error);
        }
        return observer;
    }
    
    // 应用字体到单个元素
    function applyFontToElement(element) {
        if (!element || !element.style) return;
        
        try {
            const tagName = element.tagName.toLowerCase();
            const computedStyle = window.getComputedStyle(element);
            const currentFontFamily = computedStyle.fontFamily;
            
            // 跳过已经处理过的元素
            if (element.dataset.fontReplaced === 'true') return;
            
            // 根据元素类型应用不同的字体
            if (['code', 'pre', 'kbd', 'samp'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['monospace'] + ' !important';
            } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'] + ' !important';
                element.style.fontWeight = '700';
            } else if (['blockquote', 'cite'].includes(tagName)) {
                element.style.fontFamily = fontConfig.fontMap['serif'] + ' !important';
                element.style.fontStyle = 'italic';
            } else {
                element.style.fontFamily = fontConfig.fontMap['sans-serif'] + ' !important';
            }
            
            element.dataset.fontReplaced = 'true';
            
        } catch (error) {
            // 安全地处理错误，避免脚本中断
            console.debug('应用字体到元素时出错:', error);
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
        
        // 添加艺术字体CSS
        addArtFontCSS();
        
        // 应用字体替换（原有方法）
        applyFontReplacement();
        
        // 启动实时字体监听器（新方法）
        startRealTimeFontObserver();
        
        // 注册菜单命令用于临时禁用
        registerMenuCommands();
    }
    
    // 启动实时字体监听器
    function startRealTimeFontObserver() {
        const observer = createFontObserver();
        if (observer) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false
            });
            
            // 存储观察器引用以便清理
            window._fontObserver = observer;
        }
        
        // 初始应用字体到所有现有元素
        setTimeout(() => {
            try {
                document.querySelectorAll('*').forEach(applyFontToElement);
            } catch (error) {
                console.warn('初始字体应用失败:', error);
            }
        }, 500);
    }
    
    // 添加艺术字体CSS定义
    function addArtFontCSS() {
        const fontCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&family=Liu+Jian+Mao+Cao&family=Zhi+Mang+Xing&display=swap');
        
        @font-face {
            font-family: 'PangMenZhengDao';
            src: url('https://cdn.jsdelivr.net/gh/wordshub/free-font/assets/PangMenZhengDaoBiaoTiTi-1.ttf') format('truetype');
            font-display: swap;
            font-feature-settings: "kern" off;
        }
        
        * {
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
        `;
        
        GM_addStyle(fontCSS);
    }
    
    // 应用字体替换到页面元素（原有方法）
    function applyFontReplacement() {
        // 使用 cn-font-replacer 进行高级字体替换
        if (typeof FontReplacer !== 'undefined') {
            try {
                // 初始化字体替换器
                const fontReplacer = new FontReplacer();
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
            initFontReplacement();
        }
    }
    
    // 清理函数
    window.addEventListener('beforeunload', function() {
        // 清理可能的资源泄露
        const observers = this._fontObservers;
        if (observers) {
            observers.forEach(observer => observer.disconnect());
        }
        if (window._fontObserver) {
            window._fontObserver.disconnect();
        }
    });
})();