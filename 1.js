// ==UserScript==
// @name         全链接访问验证码验证
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  点击任何链接均需验证8位数字验证码，通过后才允许访问，修复已知兼容问题
// @author       You
// @match        *://*/*
// @grant        none
// @grant        GM_download
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// ==/UserScript==
(function() {
    'use strict';

    // 1. 生成随机8位数字验证码（优化随机数生成稳定性）
    function generateVerificationCode() {
        return Math.floor(Math.random() * 90000000) + 10000000; // 简化计算，确保8位
    }

    // 2. 验证弹窗（优化样式兼容性，增加关闭弹窗的统一逻辑）
    function showVerificationDialog(code, targetUrl) {
        // 防止重复创建弹窗
        const existingOverlay = document.querySelector('#verify-overlay');
        if (existingOverlay) existingOverlay.remove();

        // 创建遮罩层（增加唯一ID，便于管理）
        const overlay = document.createElement('div');
        overlay.id = 'verify-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        `;

        // 创建弹窗容器（优化响应式宽度）
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #fff;
            padding: 2rem;
            border-radius: 8px;
            width: 90%;
            max-width: 350px;
            text-align: center;
            box-sizing: border-box;
        `;

        // 弹窗内容（优化输入框样式，增加验证码复制提示）
        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">请验证以访问链接</h3>
            <p style="color: #666;">验证码: <strong style="color: #2196F3;">${code}</strong></p>
            <input type="text" id="verificationInput" placeholder="输入上方8位验证码" style="
                width: 100%;
                padding: 10px;
                margin: 15px 0;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
                font-size: 16px;
            ">
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="verifyBtn" style="
                    flex: 1;
                    padding: 10px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                ">验证并访问</button>
                <button id="cancelBtn" style="
                    flex: 1;
                    padding: 10px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                ">取消</button>
            </div>
            <p id="errorMsg" style="color: red; margin-top: 15px; display: none; margin-bottom: 0;">
                验证码错误，请重新输入
            </p>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 获取元素
        const input = dialog.querySelector('#verificationInput');
        const verifyBtn = dialog.querySelector('#verifyBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        const errorMsg = dialog.querySelector('#errorMsg');

        // 统一关闭弹窗函数
        function closeDialog() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        // 验证按钮逻辑（优化URL跳转方式，兼容不同协议链接）
        verifyBtn.addEventListener('click', () => {
            if (input.value.trim() === code.toString()) {
                closeDialog();
                // 兼容常规HTTP/HTTPS链接和特殊协议链接（如mailto、tel）
                if (targetUrl.startsWith('http') || targetUrl.startsWith('https')) {
                    window.location.href = targetUrl;
                } else {
                    window.open(targetUrl, '_self');
                }
            } else {
                errorMsg.style.display = 'block';
                input.value = '';
                input.focus();
            }
        });

        // 取消按钮逻辑
        cancelBtn.addEventListener('click', closeDialog);

        // 回车键验证（修复keypress兼容性，改用keydown）
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyBtn.click();
        });

        // 自动聚焦输入框
        input.focus();
    }

    // 3. 为单个链接添加监听（核心优化：移除所有忽略逻辑，所有链接均验证）
    function addLinkListener(link) {
        // 避免重复添加监听（通过自定义属性标记）
        if (link.hasAttribute('data-verify-added')) return;
        link.setAttribute('data-verify-added', 'true');

        link.addEventListener('click', function(e) {
            // 移除所有忽略条件（无论链接类型、域名，均触发验证）
            const targetUrl = this.href;
            if (targetUrl) { // 仅排除空链接（href为null/undefined的情况）
                e.preventDefault(); // 阻止默认跳转
                e.stopPropagation(); // 阻止事件冒泡，避免其他脚本干扰
                const code = generateVerificationCode();
                showVerificationDialog(code, targetUrl);
            }
        });
    }

    // 4. 处理链接监听（修复动态链接监听的性能问题）
    function handleLinkClicks() {
        // 为现有所有链接添加监听
        const addAllLinks = () => {
            document.querySelectorAll('a').forEach(addLinkListener);
        };
        addAllLinks();

        // 监听动态添加的链接（优化观察范围，减少性能消耗）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 仅处理新增节点，跳过删除/修改节点
                if (mutation.addedNodes.length === 0) return;
                mutation.addedNodes.forEach((node) => {
                    // 若节点是链接，直接添加监听；若节点是容器，查询内部链接
                    if (node.tagName === 'A') {
                        addLinkListener(node);
                    } else if (node.nodeType === 1 && node.querySelectorAll) {
                        node.querySelectorAll('a').forEach(addLinkListener);
                    }
                });
            });
        });

        // 启动观察者（观察body下的子节点变化，包含子树）
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false, // 关闭属性观察，减少触发次数
            characterData: false
        });
    }

    // 5. 页面加载初始化（兼容不同加载状态）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleLinkClicks);
    } else {
        handleLinkClicks();
    }
})();
