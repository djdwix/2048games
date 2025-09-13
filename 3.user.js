// ==UserScript==
// @name         页面安全验证计时器（增强版V4.84）
// @namespace    http://tampermonkey.net/
// @version      4.84
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时【支持后台运行+定位缓存+缓存超时销毁】
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// ==/UserScript==

GM_addStyle(`
  /* 倒计时样式（保留科幻风格，隐藏点击提示文字，保留点击功能） */
  .safe-timer {
    position: fixed;
    top: 12px;
    left: 12px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: 600;
    color: #e0f2fe;
    box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
    z-index: 9999;
    user-select: none;
    transition: color 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer; /* 保留点击指针提示，暗示可交互 */
  }
  .safe-timer:hover {
    box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
  }
  /* 网络状态显示（右上角） */
  .net-status {
    position: fixed;
    top: 12px;
    right: 12px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
    z-index: 9999;
    user-select: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .net-status.online {
    color: #4cc9f0;
  }
  .net-status.offline {
    color: #f72585;
  }
  .net-status:active {
    transform: scale(0.95);
    box-shadow: 0 0 8px rgba(76, 201, 240, 0.1);
  }
  /* 网络状态弹窗（已精简） */
  .net-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 15, 30, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    padding: 0 15px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  .net-modal.active {
    opacity: 1;
    visibility: visible;
  }
  .net-modal-box {
    width: 100%;
    max-width: 280px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 12px;
    padding: 15px 10px;
    box-shadow: 0 0 15px rgba(76, 201, 240, 0.3);
    transform: scale(0.9) translateY(10px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .net-modal.active .net-modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 20px rgba(76, 201, 240, 0.4);
  }
  .net-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(76, 201, 240, 0.3);
  }
  .net-modal-title {
    font-size: 18px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    display: flex;
    align-items: center;
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.5);
  }
  .net-modal-title span {
    margin-right: 6px;
    font-size: 20px;
  }
  .net-modal-close {
    background: transparent;
    border: 1px solid rgba(76, 201, 240, 0.5);
    color: #4cc9f0;
    font-size: 18px;
    cursor: pointer;
    padding: 0 6px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  .net-modal-close:hover {
    background: rgba(76, 201, 240, 0.1);
    box-shadow: 0 0 6px rgba(76, 201, 240, 0.3);
  }
  .net-info-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
  }
  .net-info-item {
    padding: 8px 0;
    border-bottom: 1px dashed rgba(76, 201, 240, 0.2);
    font-size: 14px;
  }
  .net-info-label {
    color: #94a3b8;
    display: block;
    margin-bottom: 2px;
    font-size: 12px;
  }
  .net-info-value {
    color: #e0f2fe;
    font-weight: 500;
  }
  .net-info-value.dynamic {
    color: #4cc9f0;
    text-shadow: 0 0 3px rgba(76, 201, 240, 0.4);
  }
  /* 科幻化验证弹窗样式 */
  .verify-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 15, 30, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 0 15px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  }
  .verify-modal.active {
    opacity: 1;
    visibility: visible;
  }
  .modal-box {
    width: 100%;
    max-width: 380px;
    background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.6);
    border-radius: 16px;
    padding: 30px 20px;
    box-shadow: 0 0 25px rgba(76, 201, 240, 0.3), inset 0 0 15px rgba(76, 201, 240, 0.1);
    transform: scale(0.9) translateY(15px);
    transition: transform 0.4s ease, box-shadow 0.4s ease;
  }
  .verify-modal.active .modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    gap: 12px;
  }
  .modal-icon {
    font-size: 28px;
    color: #4cc9f0;
    text-shadow: 0 0 8px rgba(76, 201, 240, 0.6);
  }
  .modal-title {
    font-size: 22px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
    letter-spacing: 0.5px;
  }
  .modal-desc {
    font-size: 15px;
    color: #e0e7ff;
    text-align: center;
    margin: 0 0 25px;
    line-height: 1.6;
    padding: 0 10px;
    opacity: 0.9;
  }
  .verify-code {
    width: 100%;
    padding: 15px 0;
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    border: 1px solid rgba(76, 201, 240, 0.6);
    border-radius: 12px;
    font-size: 24px;
    font-weight: bold;
    color: #4cc9f0;
    text-align: center;
    letter-spacing: 6px;
    margin: 0 0 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    box-shadow: 0 0 12px rgba(76, 201, 240, 0.2), inset 0 0 8px rgba(76, 201, 240, 0.4);
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.7);
  }
  .verify-code:active {
    transform: scale(0.98);
    background: linear-gradient(135deg, #2a5298 0%, #1e3c72 100%);
    border-color: rgba(76, 201, 240, 0.4);
    box-shadow: 0 0 8px rgba(76, 201, 240, 0.15), inset 0 0 6px rgba(76, 201, 240, 0.3);
  }
  .verify-code.uncopyable {
    cursor: default;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-color: rgba(76, 201, 240, 0.3);
    pointer-events: none;
    box-shadow: inset 0 0 6px rgba(76, 201, 240, 0.2);
  }
  .verify-input-wrap {
    margin: 15px 0 5px;
  }
  .verify-input {
    width: 100%;
    padding: 12px 0;
    background: #1e293b;
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 8px;
    font-size: 16px;
    text-align: center;
    outline: none;
    transition: all 0.3s ease;
    color: #f8fafc;
    box-shadow: inset 0 0 6px rgba(76, 201, 240, 0.1);
  }
  .verify-input:focus {
    border-color: #4cc9f0;
    box-shadow: 0 0 10px rgba(76, 201, 240, 0.4), inset 0 0 8px rgba(76, 201, 240, 0.2);
  }
  .verify-error {
    display: none;
    color: #f72585;
    text-align: center;
    font-size: 13px;
    margin-top: -10px;
    margin-bottom: 15px;
    font-weight: 600;
    text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
  }
  .copy-tip {
    font-size: 13px;
    color: #b5c8ff;
    text-align: center;
    margin: 0 0 25px;
    font-style: italic;
    opacity: 0.8;
  }
  .modal-btns {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    margin-bottom: 20px;
  }
  .modal-btn {
    flex: 1;
    padding: 13px 0;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .modal-btn:active {
    transform: translateY(2px);
    box-shadow: 0 0 8px rgba(0,0,0,0.2);
  }
  .confirm-btn {
    background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
    box-shadow: 0 0 12px rgba(67, 97, 238, 0.5);
  }
  .confirm-btn:hover {
    box-shadow: 0 0 18px rgba(67, 97, 238, 0.7);
  }
  .cancel-btn {
    background: linear-gradient(135deg, #f72585 0%, #7209b7 100%);
    box-shadow: 0 0 12px rgba(247, 37, 133, 0.5);
  }
  .cancel-btn:hover {
    box-shadow: 0 0 18px rgba(247, 37, 133, 0.7);
  }
  .copy-success {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(76, 201, 240, 0.6);
    color: #4cc9f0;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 15px;
    z-index: 10001;
    opacity: 0;
    box-shadow: 0 0 15px rgba(76, 201, 240, 0.4);
    animation: fadeInOut 1.5s ease;
  }
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  }
  .update-link-wrap {
    text-align: center;
    padding-top: 10px;
    border-top: 1px dashed rgba(76, 201, 240, 0.3);
  }
  .update-link {
    font-size: 13px;
    color: #4cc9f0;
    text-decoration: none;
    cursor: pointer;
    text-shadow: 0 0 3px rgba(76, 201, 240, 0.5);
  }
  .update-link:hover, .update-link:active {
    text-decoration: underline;
    color: #7dd3fc;
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.7);
  }
  /* 进度条验证样式 */
  .progress-verify-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(10, 15, 30, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 0 15px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  }
  .progress-verify-modal.active {
    opacity: 1;
    visibility: visible;
  }
  .progress-modal-box {
    width: 100%;
    max-width: 380px;
    background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.6);
    border-radius: 16px;
    padding: 30px 20px;
    box-shadow: 0 0 25px rgba(76, 201, 240, 0.3), inset 0 0 15px rgba(76, 201, 240, 0.1);
    transform: scale(0.9) translateY(15px);
    transition: transform 0.4s ease, box-shadow 0.4s ease;
  }
  .progress-verify-modal.active .progress-modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
  }
  .progress-title {
    font-size: 22px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0 0 15px;
    text-align: center;
    text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
    letter-spacing: 0.5px;
  }
  .progress-desc {
    font-size: 15px;
    color: #e0e7ff;
    text-align: center;
    margin: 0 0 25px;
    line-height: 1.6;
    padding: 0 10px;
    opacity: 0.9;
  }
  .progress-bar-container {
    width: 100%;
    height: 20px;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 10px;
    overflow: hidden;
    margin: 0 0 30px;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4361ee 0%, #4cc9f0 50%, #4361ee 100%);
    border-radius: 10px;
    width: 0%;
    transition: width 0.1s linear;
    box-shadow: 0 0 10px rgba(76, 201, 240, 0.5);
  }
  .progress-status {
    font-size: 14px;
    color: #94a3b8;
    text-align: center;
    margin: 0 0 5px;
  }
`);

(function() {
    'use strict';

    // 配置参数
    const CONFIG = {
        // 倒计时时间（秒）- 更新为12分钟
        COUNTDOWN_TIME: 12 * 60,
        // 强制验证时间（秒）- 更新为3秒内
        FORCE_VERIFY_TIME: 3,
        // 日志缓存最大条数 - 更新为3000
        MAX_LOG_ENTRIES: 3000,
        // 缓存超时时间（秒）- 同步更新为12分钟
        CACHE_TIMEOUT: 12 * 60,
        // 进度条验证时间范围（秒）- 新增
        PROGRESS_VERIFY_MIN: 5,
        PROGRESS_VERIFY_MAX: 13
    };

    // 全局变量
    let timer = null;
    let countdown = CONFIG.COUNTDOWN_TIME;
    let isOnline = true;
    let lastCheckTime = Date.now();
    let logs = [];
    let verifyCode = '';
    let isVerifying = false;
    let isForceVerify = false;
    let cacheTimer = null;
    let isProgressVerifying = false;

    // 初始化
    function init() {
        // 创建UI元素
        createTimer();
        createNetStatus();
        createVerifyModal();
        createProgressVerifyModal();
        createNetModal();

        // 加载缓存数据
        loadCache();

        // 开始倒计时
        startCountdown();

        // 开始网络检测
        startNetworkCheck();

        // 添加页面事件监听
        addPageEventListeners();

        // 添加缓存超时检查
        startCacheTimeoutCheck();

        // 添加日志
        addLog('脚本初始化完成', 'info');
    }

    // 创建倒计时UI
    function createTimer() {
        const timerEl = document.createElement('div');
        timerEl.className = 'safe-timer';
        timerEl.textContent = formatTime(countdown);
        timerEl.addEventListener('click', showNetModal);
        document.body.appendChild(timerEl);
    }

    // 创建网络状态UI
    function createNetStatus() {
        const netStatusEl = document.createElement('div');
        netStatusEl.className = 'net-status online';
        netStatusEl.textContent = '网络正常';
        netStatusEl.addEventListener('click', showNetModal);
        document.body.appendChild(netStatusEl);
    }

    // 创建验证弹窗
    function createVerifyModal() {
        const modal = document.createElement('div');
        modal.className = 'verify-modal';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <div class="modal-icon">🔒</div>
                    <h2 class="modal-title">安全验证</h2>
                </div>
                <p class="modal-desc">请复制下方验证码并完成验证，以确保您的操作安全</p>
                <div class="verify-code" id="verifyCode">生成中...</div>
                <p class="copy-tip">点击上方验证码可复制</p>
                <div class="verify-input-wrap">
                    <input type="text" class="verify-input" id="verifyInput" placeholder="请输入验证码" maxlength="6">
                    <div class="verify-error" id="verifyError">验证码错误，请重新输入</div>
                </div>
                <div class="modal-btns">
                    <button class="modal-btn cancel-btn" id="verifyCancel">取消</button>
                    <button class="modal-btn confirm-btn" id="verifyConfirm">确认</button>
                </div>
                <div class="update-link-wrap">
                    <a class="update-link" href="https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js" target="_blank">检查更新</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 添加事件监听
        const verifyCodeEl = document.getElementById('verifyCode');
        const verifyInputEl = document.getElementById('verifyInput');
        const verifyErrorEl = document.getElementById('verifyError');
        const verifyCancelEl = document.getElementById('verifyCancel');
        const verifyConfirmEl = document.getElementById('verifyConfirm');

        verifyCodeEl.addEventListener('click', function() {
            if (!this.classList.contains('uncopyable')) {
                copyToClipboard(verifyCode);
                showCopySuccess();
            }
        });

        verifyInputEl.addEventListener('input', function() {
            verifyErrorEl.style.display = 'none';
        });

        verifyInputEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyConfirmEl.click();
            }
        });

        verifyCancelEl.addEventListener('click', function() {
            hideVerifyModal();
        });

        verifyConfirmEl.addEventListener('click', function() {
            const inputValue = verifyInputEl.value.trim();
            if (inputValue === verifyCode) {
                // 验证成功
                resetCountdown();
                hideVerifyModal();
                addLog('验证成功，倒计时已重置', 'success');

                // 触发进度条验证（如果不是强制验证）
                if (!isForceVerify) {
                    setTimeout(showProgressVerify, 500);
                }
            } else {
                // 验证失败
                verifyErrorEl.style.display = 'block';
                verifyInputEl.value = '';
                addLog('验证失败：验证码错误', 'error');
            }
        });
    }

    // 创建进度条验证弹窗 - 新增
    function createProgressVerifyModal() {
        const modal = document.createElement('div');
        modal.className = 'progress-verify-modal';
        modal.innerHTML = `
            <div class="progress-modal-box">
                <h2 class="progress-title">正在验证</h2>
                <p class="progress-desc">请稍候，系统正在验证您的操作</p>
                <div class="progress-status" id="progressStatus">0%</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 显示进度条验证 - 新增
    function showProgressVerify() {
        if (isProgressVerifying) return;
        isProgressVerifying = true;

        const modal = document.querySelector('.progress-verify-modal');
        const progressBar = document.getElementById('progressBar');
        const progressStatus = document.getElementById('progressStatus');

        // 随机生成验证时间（5-13秒）
        const verifyTime = Math.floor(Math.random() * (CONFIG.PROGRESS_VERIFY_MAX - CONFIG.PROGRESS_VERIFY_MIN + 1)) + CONFIG.PROGRESS_VERIFY_MIN;
        let progress = 0;

        modal.classList.add('active');

        // 模拟进度条
        const interval = setInterval(() => {
            progress += 100 / (verifyTime * 10);
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // 验证完成
                setTimeout(() => {
                    modal.classList.remove('active');
                    isProgressVerifying = false;
                    addLog('进度条验证完成', 'success');
                }, 500);
            }
            
            progressBar.style.width = `${progress}%`;
            progressStatus.textContent = `${Math.round(progress)}%`;
        }, 100);
    }

    // 创建网络信息弹窗
    function createNetModal() {
        const modal = document.createElement('div');
        modal.className = 'net-modal';
        modal.innerHTML = `
            <div class="net-modal-box">
                <div class="net-modal-header">
                    <h3 class="net-modal-title"><span>📶</span>网络状态</h3>
                    <button class="net-modal-close" id="netModalClose">×</button>
                </div>
                <ul class="net-info-list">
                    <li class="net-info-item">
                        <span class="net-info-label">当前域名</span>
                        <span class="net-info-value" id="currentDomain">加载中...</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">网络状态</span>
                        <span class="net-info-value dynamic" id="modalNetStatus">加载中...</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">本地延迟</span>
                        <span class="net-info-value dynamic" id="localDelay">未检测</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">网页延迟</span>
                        <span class="net-info-value dynamic" id="webDelay">未检测</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">IP地址</span>
                        <span class="net-info-value dynamic" id="ipAddress">未获取</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">定位信息</span>
                        <span class="net-info-value dynamic" id="locationInfo">未获取</span>
                    </li>
                    <li class="net-info-item">
                        <span class="net-info-label">倒计时</span>
                        <span class="net-info-value dynamic" id="modalCountdown">${formatTime(countdown)}</span>
                    </li>
                </ul>
                <button class="modal-btn confirm-btn" id="exportLogs">导出日志</button>
            </div>
        `;
        document.body.appendChild(modal);

        // 添加事件监听
        document.getElementById('netModalClose').addEventListener('click', hideNetModal);
        document.getElementById('exportLogs').addEventListener('click', exportLogs);
    }

    // 显示网络信息弹窗
    function showNetModal() {
        const modal = document.querySelector('.net-modal');
        modal.classList.add('active');

        // 更新弹窗内容
        document.getElementById('currentDomain').textContent = window.location.hostname;
        document.getElementById('modalNetStatus').textContent = isOnline ? '正常' : '异常';
        document.getElementById('modalCountdown').textContent = formatTime(countdown);

        // 获取网络信息
        getNetworkInfo();
    }

    // 隐藏网络信息弹窗
    function hideNetModal() {
        const modal = document.querySelector('.net-modal');
        modal.classList.remove('active');
    }

    // 显示验证弹窗
    function showVerifyModal(isForce = false) {
        isVerifying = true;
        isForceVerify = isForce;

        const modal = document.querySelector('.verify-modal');
        const verifyCodeEl = document.getElementById('verifyCode');
        const verifyInputEl = document.getElementById('verifyInput');
        const verifyErrorEl = document.getElementById('verifyError');

        // 生成验证码
        verifyCode = generateVerifyCode();
        verifyCodeEl.textContent = verifyCode;
        verifyCodeEl.classList.remove('uncopyable');

        // 重置输入和错误提示
        verifyInputEl.value = '';
        verifyErrorEl.style.display = 'none';

        modal.classList.add('active');
        verifyInputEl.focus();

        addLog(`${isForce ? '强制' : ''}验证弹窗已显示`, 'info');
    }

    // 隐藏验证弹窗
    function hideVerifyModal() {
        const modal = document.querySelector('.verify-modal');
        modal.classList.remove('active');
        isVerifying = false;
        isForceVerify = false;

        addLog('验证弹窗已隐藏', 'info');
    }

    // 生成验证码
    function generateVerifyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        addLog('验证码已复制到剪贴板', 'info');
    }

    // 显示复制成功提示
    function showCopySuccess() {
        const tip = document.createElement('div');
        tip.className = 'copy-success';
        tip.textContent = '验证码已复制';
        document.body.appendChild(tip);

        setTimeout(() => {
            document.body.removeChild(tip);
        }, 1500);
    }

    // 开始倒计时
    function startCountdown() {
        clearInterval(timer);
        timer = setInterval(() => {
            countdown--;

            // 更新倒计时显示
            const timerEl = document.querySelector('.safe-timer');
            if (timerEl) {
                timerEl.textContent = formatTime(countdown);
            }

            // 更新弹窗中的倒计时（如果弹窗打开）
            const modalCountdownEl = document.getElementById('modalCountdown');
            if (modalCountdownEl) {
                modalCountdownEl.textContent = formatTime(countdown);
            }

            // 检查是否需要强制验证（3秒内）
            if (countdown <= CONFIG.FORCE_VERIFY_TIME && !isVerifying && !isForceVerify) {
                showVerifyModal(true);
                addLog('倒计时即将结束，强制验证已触发', 'warning');
            }

            // 检查倒计时是否结束
            if (countdown <= 0) {
                clearInterval(timer);
                handleCountdownEnd();
            }
        }, 1000);
    }

    // 处理倒计时结束
    function handleCountdownEnd() {
        addLog('倒计时结束，页面即将刷新', 'warning');
        
        // 这里可以添加页面刷新或其他操作
        // 例如：location.reload();
        
        // 重置倒计时
        resetCountdown();
    }

    // 重置倒计时
    function resetCountdown() {
        countdown = CONFIG.COUNTDOWN_TIME;
        const timerEl = document.querySelector('.safe-timer');
        if (timerEl) {
            timerEl.textContent = formatTime(countdown);
        }
        addLog('倒计时已重置', 'info');
    }

    // 格式化时间
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 开始网络检测
    function startNetworkCheck() {
        setInterval(() => {
            checkNetworkStatus();
        }, 5000); // 每5秒检测一次

        // 立即执行一次检测
        checkNetworkStatus();
    }

    // 检测网络状态
    function checkNetworkStatus() {
        const startTime = Date.now();
        const netStatusEl = document.querySelector('.net-status');

        // 使用多个检测点提高准确性
        const checkUrls = [
            'https://www.google.com/favicon.ico?t=' + Date.now(),
            'https://www.baidu.com/favicon.ico?t=' + Date.now(),
            'https://www.cloudflare.com/favicon.ico?t=' + Date.now()
        ];

        let successCount = 0;
        let totalDelay = 0;

        // 并行检测多个地址
        const checkPromises = checkUrls.map(url => {
            return new Promise((resolve) => {
                const img = new Image();
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 5000);

                img.onload = () => {
                    clearTimeout(timeout);
                    resolve(true);
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    resolve(false);
                };
                img.src = url;
            });
        });

        Promise.all(checkPromises).then(results => {
            successCount = results.filter(result => result).length;
            const newStatus = successCount >= 2;

            // 更新网络状态
            if (newStatus !== isOnline) {
                isOnline = newStatus;
                netStatusEl.textContent = isOnline ? '网络正常' : '网络异常';
                netStatusEl.className = `net-status ${isOnline ? 'online' : 'offline'}`;
                addLog(`网络状态变化: ${isOnline ? '正常' : '异常'}`, isOnline ? 'success' : 'error');
            }

            // 计算延迟（取平均值）
            const checkTime = Date.now() - startTime;
            totalDelay = Math.round(checkTime / 3); // 近似平均延迟

            // 更新本地延迟显示
            const localDelayEl = document.getElementById('localDelay');
            if (localDelayEl) {
                localDelayEl.textContent = `${totalDelay}ms`;
            }

            lastCheckTime = Date.now();
        }).catch(() => {
            // 检测失败，标记为离线
            if (isOnline) {
                isOnline = false;
                netStatusEl.textContent = '网络异常';
                netStatusEl.className = 'net-status offline';
                addLog('网络状态变化: 异常', 'error');
            }
        });
    }

    // 获取网络信息
    function getNetworkInfo() {
        // 获取网页延迟（通过加载时间计算）
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const webDelay = Math.round(navigation.loadEventEnd - navigation.requestStart);
            const webDelayEl = document.getElementById('webDelay');
            if (webDelayEl) {
                webDelayEl.textContent = `${webDelay}ms`;
            }
        }

        // 获取IP和定位信息
        getIPAndLocation();
    }

    // 获取IP和定位信息
    function getIPAndLocation() {
        // 使用多个IP API提高成功率
        const ipApis = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://ipinfo.io/json'
        ];

        let attempted = 0;

        const tryNextApi = () => {
            if (attempted >= ipApis.length) return;

            fetch(ipApis[attempted])
                .then(response => response.json())
                .then(data => {
                    // 更新IP地址
                    const ipAddressEl = document.getElementById('ipAddress');
                    if (ipAddressEl) {
                        ipAddressEl.textContent = data.ip || data.ipAddress || '未知';
                    }

                    // 更新定位信息
                    const locationInfoEl = document.getElementById('locationInfo');
                    if (locationInfoEl) {
                        let locationText = '未知';
                        if (data.city && data.country) {
                            locationText = `${data.city}, ${data.country}`;
                        } else if (data.loc) {
                            locationText = data.loc;
                        } else if (data.region && data.country) {
                            locationText = `${data.region}, ${data.country}`;
                        }
                        locationInfoEl.textContent = locationText;
                    }
                })
                .catch(() => {
                    attempted++;
                    tryNextApi();
                });

            attempted++;
        };

        tryNextApi();
    }

    // 添加日志
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleString();
        const domain = window.location.hostname;
        const logEntry = {
            timestamp,
            domain,
            message,
            type
        };

        logs.unshift(logEntry);

        // 限制日志条数（最大3000条）
        if (logs.length > CONFIG.MAX_LOG_ENTRIES) {
            logs = logs.slice(0, CONFIG.MAX_LOG_ENTRIES);
        }

        // 保存到缓存
        saveCache();
    }

    // 导出日志
    function exportLogs() {
        let logContent = '页面安全验证计时器 - 日志导出\n';
        logContent += `导出时间: ${new Date().toLocaleString()}\n`;
        logContent += `当前域名: ${window.location.hostname}\n`;
        logContent += '==========================================\n\n';

        logs.forEach(log => {
            logContent += `[${log.timestamp}] [${log.domain}] [${log.type.toUpperCase()}] ${log.message}\n`;
        });

        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security_timer_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('日志已导出', 'info');
    }

    // 保存缓存
    function saveCache() {
        const cacheData = {
            logs: logs,
            timestamp: Date.now()
        };
        localStorage.setItem('securityTimerCache', JSON.stringify(cacheData));
    }

    // 加载缓存
    function loadCache() {
        const cacheData = localStorage.getItem('securityTimerCache');
        if (cacheData) {
            try {
                const parsedData = JSON.parse(cacheData);
                logs = parsedData.logs || [];

                // 检查缓存是否超时（12分钟）
                const cacheAge = Date.now() - parsedData.timestamp;
                if (cacheAge > CONFIG.CACHE_TIMEOUT * 1000) {
                    logs = [];
                    addLog('缓存已超时，日志已清空', 'info');
                }
            } catch (e) {
                addLog('加载缓存失败: ' + e.message, 'error');
            }
        }
    }

    // 开始缓存超时检查
    function startCacheTimeoutCheck() {
        clearInterval(cacheTimer);
        cacheTimer = setInterval(() => {
            const cacheData = localStorage.getItem('securityTimerCache');
            if (cacheData) {
                try {
                    const parsedData = JSON.parse(cacheData);
                    const cacheAge = Date.now() - parsedData.timestamp;
                    
                    // 如果缓存超时（12分钟），清空日志
                    if (cacheAge > CONFIG.CACHE_TIMEOUT * 1000) {
                        logs = [];
                        saveCache();
                        addLog('缓存已超时，日志已清空', 'info');
                    }
                } catch (e) {
                    // 忽略错误
                }
            }
        }, 60000); // 每分钟检查一次
    }

    // 添加页面事件监听
    function addPageEventListeners() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                addLog('页面切换到后台', 'warning');
            } else {
                addLog('页面切换到前台', 'info');
            }
        });

        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            addLog('页面即将关闭', 'warning');
            saveCache();
        });
    }

    // 初始化脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();