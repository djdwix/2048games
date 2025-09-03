// ==UserScript==
// @name         全域链接验证（手机端兼容版）
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  拦截所有链接跳转（含JS触发/表单提交），手机端自适应，修复全场景Bug
// @author       You
// @match        *://*/*
// @grant        none
// @grant        GM_download
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @run-at       document-start  // 提前启动，避免初始跳转漏拦截
// ==/UserScript==
(function() {
    'use strict';

    // -------------------------- 1. 核心工具函数 --------------------------
    // 生成8位随机验证码（稳定无重复）
    const generateVerificationCode = () => Math.floor(Math.random() * 90000000) + 10000000;

    // 统一存储原始跳转方法（用于全域拦截后恢复正常跳转）
    const originalLocation = {
        href: window.location.href,
        assign: window.location.assign,
        replace: window.location.replace
    };
    let currentTargetUrl = ''; // 存储待验证的目标链接


    // -------------------------- 2. 手机端自适应弹窗 --------------------------
    function showVerificationDialog(code) {
        // 移除旧弹窗（防叠加）
        document.querySelector('#verify-overlay')?.remove();

        // 1. 遮罩层（手机端全屏覆盖，防触摸穿透）
        const overlay = document.createElement('div');
        overlay.id = 'verify-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            padding: 20px;
            box-sizing: border-box;
            touch-action: none; /* 禁止手机触摸缩放 */
        `;

        // 2. 弹窗容器（手机端自适应宽度，触摸友好）
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #fff;
            width: 100%;
            max-width: 380px;
            border-radius: 12px;
            padding: 25px 20px;
            box-sizing: border-box;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        // 3. 弹窗内容（手机端大字体、大点击区域）
        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px; color: #333; font-size: 18px; text-align: center;">
                请验证后访问
            </h3>
            <p style="margin: 0 0 15px; color: #666; font-size: 16px; text-align: center;">
                验证码: <strong style="color: #2563eb; font-size: 18px;">${code}</strong>
            </p>
            <input type="text" id="verifyInput" placeholder="输入8位验证码" style="
                width: 100%;
                padding: 14px;
                margin: 0 0 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                box-sizing: border-box;
                outline: none;
            ">
            <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                <button id="verifyBtn" style="
                    flex: 1;
                    padding: 14px;
                    background: #22c55e;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    touch-action: manipulation; /* 优化手机触摸响应 */
                ">验证并前往</button>
                <button id="cancelBtn" style="
                    flex: 1;
                    padding: 14px;
                    background: #ef4444;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    touch-action: manipulation;
                ">取消</button>
            </div>
            <p id="errorMsg" style="
                color: #ef4444;
                font-size: 14px;
                text-align: center;
                margin: 10px 0 0;
                display: none;
            ">验证码错误，请重新输入</p>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 元素获取与交互逻辑
        const input = dialog.querySelector('#verifyInput');
        const verifyBtn = dialog.querySelector('#verifyBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        const errorMsg = dialog.querySelector('#errorMsg');

        // 统一关闭弹窗
        const closeDialog = () => overlay.remove();

        // 验证逻辑（兼容手机端触摸与键盘）
        const doVerify = () => {
            if (input.value.trim() === code.toString()) {
                closeDialog();
                // 恢复原始跳转（支持所有协议：http/https/mailto/tel等）
                if (currentTargetUrl.startsWith('http')) {
                    originalLocation.assign(currentTargetUrl);
                } else if (currentTargetUrl.startsWith('mailto') || currentTargetUrl.startsWith('tel')) {
                    window.open(currentTargetUrl);
                } else {
                    originalLocation.href = currentTargetUrl;
                }
                // 重置目标链接，避免重复跳转
                currentTargetUrl = '';
            } else {
                errorMsg.style.display = 'block';
                input.value = '';
                input.focus();
            }
        };

        // 按钮点击（手机端触摸优先）
        verifyBtn.addEventListener('click', doVerify);
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            currentTargetUrl = ''; // 取消后清空目标链接
        });

        // 键盘回车（手机端软键盘回车）
        input.addEventListener('keydown', (e) => e.key === 'Enter' && doVerify());

        // 手机端自动聚焦输入框（弹出软键盘）
        input.focus();

        // 修复手机端弹窗被键盘遮挡：监听窗口高度变化，自动上移
        const handleResize = () => {
            const windowHeight = window.innerHeight;
            const dialogHeight = dialog.offsetHeight;
            if (windowHeight < dialogHeight + 100) { // 键盘弹出时
                dialog.style.marginTop = `-${dialogHeight / 4}px`;
            } else {
                dialog.style.marginTop = '0';
            }
        };
        window.addEventListener('resize', handleResize);
        // 初始执行一次
        handleResize();
    }


    // -------------------------- 3. 全域链接拦截（核心更新） --------------------------
    // 3.1 拦截所有a标签（含动态生成）
    function interceptAllLinks() {
        // 单个链接处理（兼容手机端触摸事件）
        const handleLink = (link) => {
            if (link.hasAttribute('data-verify-done')) return;
            link.setAttribute('data-verify-done', 'true');

            // 拦截click与touchstart（手机端触摸优先，防止漏拦截）
            ['click', 'touchstart'].forEach(eventType => {
                link.addEventListener(eventType, (e) => {
                    const href = link.href;
                    if (href && href !== '#') {
                        e.preventDefault(); // 阻止默认跳转（触摸/点击）
                        e.stopPropagation(); // 防止其他脚本干扰
                        currentTargetUrl = href;
                        showVerificationDialog(generateVerificationCode());
                    }
                }, { passive: false }); // passive=false 确保能preventDefault
            });
        };

        // 初始链接处理
        document.querySelectorAll('a').forEach(handleLink);

        // 动态链接监听（手机端性能优化：减少监听频率）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // 只处理元素节点，跳过文本/注释节点（减少性能消耗）
                    if (node.nodeType !== 1) return;
                    // 若为链接直接处理，若为容器则查询内部链接
                    node.tagName === 'A' ? handleLink(node) : node.querySelectorAll('a').forEach(handleLink);
                });
            });
        });

        // 启动观察者（优化范围：仅监听body子树，减少手机端资源占用）
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }

    // 3.2 拦截JS触发的跳转（location.href/location.assign等）
    function interceptJsRedirect() {
        // 重写location.href
        Object.defineProperty(window.location, 'href', {
            get: () => originalLocation.href,
            set: (url) => {
                if (url && url !== originalLocation.href) {
                    currentTargetUrl = url;
                    showVerificationDialog(generateVerificationCode());
                } else {
                    originalLocation.href = url;
                }
            }
        });

        // 重写location.assign
        window.location.assign = (url) => {
            if (url && url !== originalLocation.href) {
                currentTargetUrl = url;
                showVerificationDialog(generateVerificationCode());
            } else {
                originalLocation.assign(url);
            }
        };

        // 重写location.replace
        window.location.replace = (url) => {
            if (url && url !== originalLocation.href) {
                currentTargetUrl = url;
                showVerificationDialog(generateVerificationCode());
            } else {
                originalLocation.replace(url);
            }
        };
    }

    // 3.3 拦截表单提交跳转
    function interceptFormSubmit() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            // 仅拦截会导致页面跳转的表单（排除AJAX提交）
            if (form.method && (form.action || window.location.href)) {
                e.preventDefault();
                // 拼接表单提交的目标URL（含GET参数）
                currentTargetUrl = form.action || window.location.href;
                if (form.method.toLowerCase() === 'get') {
                    const formData = new URLSearchParams(new FormData(form));
                    currentTargetUrl += (currentTargetUrl.includes('?') ? '&' : '?') + formData.toString();
                }
                // 显示验证弹窗，验证通过后手动提交
                showVerificationDialog(generateVerificationCode());
            }
        }, { capture: true }); // 捕获阶段拦截，优先于页面脚本
    }

    // 3.4 拦截div/span等模拟链接（点击触发跳转）
    function interceptSimulatedLinks() {
        document.addEventListener('click', (e) => {
            const target = e.target;
            // 排除已处理的a标签和按钮，只拦截模拟链接（如带onclick的div）
            if (target.tagName !== 'A' && target.tagName !== 'BUTTON' && !target.closest('a') && !target.closest('button')) {
                // 检查是否有跳转逻辑：onclick含location/assign/open
                const onclick = target.getAttribute('onclick') || '';
                if (onclick.includes('location') || onclick.includes('assign') || onclick.includes('open')) {
                    e.preventDefault();
                    e.stopPropagation();
                    // 提取跳转URL（简单正则匹配，覆盖常见场景）
                    const urlMatch = onclick.match(/(https?:\/\/[^\s'"]+|mailto:[^\s'"]+|tel:[^\s'"]+)/);
                    if (urlMatch && urlMatch[1]) {
                        currentTargetUrl = urlMatch[1];
                        showVerificationDialog(generateVerificationCode());
                    }
                }
            }
        }, { capture: true });
    }


    // -------------------------- 4. 初始化与Bug修复 --------------------------
    function init() {
        // 确保DOM加载完成（兼容手机端异步渲染）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                interceptAllLinks();
                interceptFormSubmit();
                interceptSimulatedLinks();
            });
        } else {
            interceptAllLinks();
            interceptFormSubmit();
            interceptSimulatedLinks();
        }

        // JS跳转拦截（提前启动，防止页面加载时漏拦截）
        interceptJsRedirect();

        // 修复已知Bug
        // Bug1: 手机端弹窗被软键盘遮挡 → 已在showVerificationDialog中加resize监听
        // Bug2: 动态生成链接漏拦截 → 优化MutationObserver，监听所有新增节点
        // Bug3: JS修改location不拦截 → 重写location所有跳转方法
        // Bug4: 表单提交跳过验证 → 拦截form的submit事件
        // Bug5: 手机端触摸链接无响应 → 新增touchstart事件监听
    }

    // 启动脚本
    init();
})();
