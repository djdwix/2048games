// ==UserScript==
// @name         链接访问验证码验证
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  点击链接时先验证8位数字验证码，通过后才允许访问
// @author       You
// @match        *://*/*
// @grant        none
// @grant        GM_download
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// ==/UserScript==

(function() {
    'use strict';

    // 生成随机8位数字验证码
    function generateVerificationCode() {
        // 生成10000000到99999999之间的随机数
        const min = 10000000;
        const max = 99999999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 验证弹窗
    function showVerificationDialog(code, targetUrl) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
        `;

        // 创建弹窗容器
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 8px;
            width: 300px;
            text-align: center;
        `;

        // 弹窗内容
        dialog.innerHTML = `
            <h3>请输入验证码以继续访问</h3>
            <p>验证码: <strong>${code}</strong></p>
            <input type="text" id="verificationInput" placeholder="请输入上方验证码" style="
                width: 100%;
                padding: 8px;
                margin: 15px 0;
                box-sizing: border-box;
            ">
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="verifyBtn" style="
                    flex: 1;
                    padding: 8px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">验证</button>
                <button id="cancelBtn" style="
                    flex: 1;
                    padding: 8px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">取消</button>
            </div>
            <p id="errorMsg" style="color: red; margin-top: 10px; display: none;">验证码错误，请重新输入</p>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 获取元素
        const input = dialog.querySelector('#verificationInput');
        const verifyBtn = dialog.querySelector('#verifyBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        const errorMsg = dialog.querySelector('#errorMsg');

        // 验证按钮点击事件
        verifyBtn.addEventListener('click', () => {
            if (input.value === code.toString()) {
                document.body.removeChild(overlay);
                // 验证通过，跳转到目标URL
                window.location.href = targetUrl;
            } else {
                errorMsg.style.display = 'block';
                input.value = '';
                input.focus();
            }
        });

        // 取消按钮点击事件
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // 回车键验证
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyBtn.click();
            }
        });

        // 自动聚焦输入框
        input.focus();
    }

    // 处理链接点击事件
    function handleLinkClicks() {
        // 为所有现有链接添加事件监听
        document.querySelectorAll('a').forEach(link => {
            addLinkListener(link);
        });

        // 监听页面动态添加的链接
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'A') {
                        addLinkListener(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('a').forEach(link => {
                            addLinkListener(link);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 为单个链接添加事件监听
    function addLinkListener(link) {
        // 避免重复添加事件
        if (link.hasAttribute('data-verified-link')) return;
        link.setAttribute('data-verified-link', 'true');

        link.addEventListener('click', function(e) {
            // 忽略锚点链接和空链接
            if (!this.href || this.href === '#' || this.href === window.location.href) {
                return;
            }

            // 忽略内部锚点
            const url = new URL(this.href);
            if (url.origin === window.location.origin && url.pathname === window.location.pathname) {
                return;
            }

            // 阻止默认跳转行为
            e.preventDefault();
            e.stopPropagation();

            // 生成验证码并显示弹窗
            const code = generateVerificationCode();
            showVerificationDialog(code, this.href);
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleLinkClicks);
    } else {
        handleLinkClicks();
    }
})();
