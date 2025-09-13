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
  .progress-modal {
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
  .progress-modal.active {
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
  .progress-modal.active .progress-modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 35px rgba(76, 201, 240, 0.4), inset 0 0 20px rgba(76, 201, 240, 0.15);
  }
  .progress-modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    gap: 12px;
  }
  .progress-modal-icon {
    font-size: 28px;
    color: #4cc9f0;
    text-shadow: 0 0 8px rgba(76, 201, 240, 0.6);
  }
  .progress-modal-title {
    font-size: 22px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    text-shadow: 0 0 6px rgba(76, 201, 240, 0.5);
    letter-spacing: 0.5px;
  }
  .progress-modal-desc {
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
    background: #1e293b;
    border-radius: 10px;
    overflow: hidden;
    margin: 20px 0;
    box-shadow: inset 0 0 6px rgba(76, 201, 240, 0.1);
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #4361ee 0%, #4cc9f0 50%, #3a0ca3 100%);
    border-radius: 10px;
    transition: width 0.3s ease;
    box-shadow: 0 0 8px rgba(76, 201, 240, 0.5);
  }
  .progress-text {
    text-align: center;
    font-size: 14px;
    color: #e0e7ff;
    margin-bottom: 20px;
  }
  .progress-time {
    font-weight: bold;
    color: #4cc9f0;
  }
`);

(function() {
    'use strict';

    // 全局变量
    let timerInterval;
    let countdown = 0;
    let isVerifying = false;
    let isOnline = true;
    let lastCheckTime = 0;
    let lastNetworkCheck = 0;
    let logCache = [];
    let locationCache = null;
    let cacheTimestamp = 0;
    const CACHE_TIMEOUT = 5 * 60 * 1000; // 5分钟缓存超时
    const MAX_LOG_CACHE = 3000; // 最大日志缓存条数

    // 初始化
    function init() {
        createTimerElement();
        createNetStatusElement();
        startTimer();
        checkNetworkStatus();
        setInterval(checkNetworkStatus, 30000); // 每30秒检查一次网络状态
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('online', () => updateNetworkStatus(true));
        window.addEventListener('offline', () => updateNetworkStatus(false));
    }

    // 创建计时器元素
    function createTimerElement() {
        const timerEl = document.createElement('div');
        timerEl.className = 'safe-timer';
        timerEl.textContent = '安全验证: --:--';
        timerEl.addEventListener('click', exportLogs);
        document.body.appendChild(timerEl);
    }

    // 创建网络状态元素
    function createNetStatusElement() {
        const netStatusEl = document.createElement('div');
        netStatusEl.className = 'net-status online';
        netStatusEl.textContent = '网络: 正常';
        netStatusEl.addEventListener('click', showNetworkModal);
        document.body.appendChild(netStatusEl);
    }

    // 开始计时器
    function startTimer() {
        clearInterval(timerInterval);
        countdown = 0;
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            countdown++;
            updateTimerDisplay();

            // 每3秒触发强制验证（原为5秒）
            if (countdown % 3 === 0) {
                triggerVerification();
            }
        }, 1000);
    }

    // 更新计时器显示
    function updateTimerDisplay() {
        const timerEl = document.querySelector('.safe-timer');
        if (timerEl) {
            const minutes = Math.floor(countdown / 60);
            const seconds = countdown % 60;
            timerEl.textContent = `安全验证: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // 触发验证
    function triggerVerification() {
        if (isVerifying) return;

        isVerifying = true;
        const verificationCode = generateVerificationCode();
        showVerificationModal(verificationCode);
        addLog('系统', '触发安全验证', 'success');
    }

    // 生成验证码
    function generateVerificationCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // 显示验证弹窗
    function showVerificationModal(code) {
        const modalHtml = `
            <div class="verify-modal active">
                <div class="modal-box">
                    <div class="modal-header">
                        <div class="modal-icon">🔒</div>
                        <h2 class="modal-title">安全验证</h2>
                    </div>
                    <p class="modal-desc">请输入下方验证码以继续访问，验证码有效期为3分钟</p>
                    <div class="verify-code" id="verifyCode">${code}</div>
                    <p class="copy-tip">点击验证码可复制</p>
                    <div class="verify-input-wrap">
                        <input type="text" class="verify-input" id="verifyInput" placeholder="请输入验证码" maxlength="6">
                        <p class="verify-error" id="verifyError">验证码错误，请重新输入</p>
                    </div>
                    <div class="modal-btns">
                        <button class="modal-btn cancel-btn" id="cancelVerify">取消</button>
                        <button class="modal-btn confirm-btn" id="confirmVerify">确认</button>
                    </div>
                    <div class="update-link-wrap">
                        <a class="update-link" href="https://github.com/djdwix/2048games/raw/main/3.user.js" target="_blank">检查更新</a>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const verifyCodeEl = document.getElementById('verifyCode');
        const verifyInputEl = document.getElementById('verifyInput');
        const verifyErrorEl = document.getElementById('verifyError');
        const confirmBtn = document.getElementById('confirmVerify');
        const cancelBtn = document.getElementById('cancelVerify');
        const modalEl = document.querySelector('.verify-modal');

        // 复制验证码功能
        verifyCodeEl.addEventListener('click', function() {
            navigator.clipboard.writeText(code).then(() => {
                showCopySuccess();
            });
        });

        // 确认验证
        confirmBtn.addEventListener('click', function() {
            const inputValue = verifyInputEl.value.trim().toUpperCase();
            if (inputValue === code) {
                addLog('用户', '验证成功', 'success');
                startProgressBarVerification();
                modalEl.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(modalContainer);
                    isVerifying = false;
                }, 400);
            } else {
                verifyErrorEl.style.display = 'block';
                addLog('用户', '验证失败: 验证码错误', 'error');
            }
        });

        // 取消验证
        cancelBtn.addEventListener('click', function() {
            addLog('系统', '用户取消验证', 'warning');
            modalEl.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(modalContainer);
                isVerifying = false;
            }, 400);
        });

        // 回车键提交
        verifyInputEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });
    }

    // 显示进度条验证
    function startProgressBarVerification() {
        const duration = Math.floor(Math.random() * 8) + 5; // 5-13秒随机时间
        const progressModalHtml = `
            <div class="progress-modal active">
                <div class="progress-modal-box">
                    <div class="progress-modal-header">
                        <div class="progress-modal-icon">⏳</div>
                        <h2 class="progress-modal-title">进度验证</h2>
                    </div>
                    <p class="progress-modal-desc">正在进行安全验证，请稍候...</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                    </div>
                    <p class="progress-text">剩余时间: <span class="progress-time" id="progressTime">${duration}s</span></p>
                </div>
            </div>
        `;

        const progressModalContainer = document.createElement('div');
        progressModalContainer.innerHTML = progressModalHtml;
        document.body.appendChild(progressModalContainer);

        const progressBar = document.getElementById('progressBar');
        const progressTime = document.getElementById('progressTime');
        const progressModal = document.querySelector('.progress-modal');

        let timeLeft = duration;
        const interval = 100; // 更新频率100ms
        const totalSteps = duration * 10; // 总步数
        let currentStep = 0;

        const progressInterval = setInterval(() => {
            currentStep++;
            const progress = (currentStep / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;

            if (currentStep % 10 === 0) {
                timeLeft--;
                progressTime.textContent = `${timeLeft}s`;
            }

            if (currentStep >= totalSteps) {
                clearInterval(progressInterval);
                progressModal.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(progressModalContainer);
                    addLog('系统', '进度验证完成', 'success');
                    startTimer(); // 重新开始计时
                }, 400);
            }
        }, interval);
    }

    // 显示复制成功提示
    function showCopySuccess() {
        const tipEl = document.createElement('div');
        tipEl.className = 'copy-success';
        tipEl.textContent = '验证码已复制到剪贴板';
        document.body.appendChild(tipEl);

        setTimeout(() => {
            document.body.removeChild(tipEl);
        }, 1500);
    }

    // 检查网络状态
    function checkNetworkStatus() {
        const now = Date.now();
        if (now - lastNetworkCheck < 1000) return; // 防抖处理

        lastNetworkCheck = now;
        const testImage = new Image();
        testImage.onload = () => updateNetworkStatus(true);
        testImage.onerror = () => updateNetworkStatus(false);
        testImage.src = 'https://www.google.com/favicon.ico?t=' + Date.now();
    }

    // 更新网络状态
    function updateNetworkStatus(online) {
        const netStatusEl = document.querySelector('.net-status');
        if (!netStatusEl) return;

        if (online !== isOnline) {
            isOnline = online;
            netStatusEl.textContent = online ? '网络: 正常' : '网络: 异常';
            netStatusEl.className = online ? 'net-status online' : 'net-status offline';
            addLog('系统', online ? '网络连接恢复' : '网络连接异常', online ? 'success' : 'error');
        }
    }

    // 显示网络信息弹窗
    function showNetworkModal() {
        const modalHtml = `
            <div class="net-modal active">
                <div class="net-modal-box">
                    <div class="net-modal-header">
                        <h3 class="net-modal-title"><span>🌐</span>网络状态</h3>
                        <button class="net-modal-close" id="closeNetModal">×</button>
                    </div>
                    <ul class="net-info-list" id="netInfoList">
                        <li class="net-info-item">
                            <span class="net-info-label">连接状态</span>
                            <span class="net-info-value" id="netStatusValue">检测中...</span>
                        </li>
                        <li class="net-info-item">
                            <span class="net-info-label">响应延迟</span>
                            <span class="net-info-value" id="netLatencyValue">检测中...</span>
                        </li>
                        <li class="net-info-item">
                            <span class="net-info-label">IP地址</span>
                            <span class="net-info-value" id="ipAddressValue">检测中...</span>
                        </li>
                        <li class="net-info-item">
                            <span class="net-info-label">地理位置</span>
                            <span class="net-info-value" id="locationValue">检测中...</span>
                        </li>
                        <li class="net-info-item">
                            <span class="net-info-label">当前域名</span>
                            <span class="net-info-value dynamic">${window.location.hostname}</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const closeBtn = document.getElementById('closeNetModal');
        const modalEl = document.querySelector('.net-modal');

        closeBtn.addEventListener('click', function() {
            modalEl.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(modalContainer);
            }, 300);
        });

        // 获取网络信息
        fetchNetworkInfo();
    }

    // 获取网络信息
    async function fetchNetworkInfo() {
        updateNetInfo('netStatusValue', isOnline ? '正常' : '异常', isOnline);
        
        // 测试延迟
        try {
            const startTime = Date.now();
            await fetch('https://www.google.com/favicon.ico?t=' + Date.now(), {
                method: 'HEAD',
                cache: 'no-cache'
            });
            const latency = Date.now() - startTime;
            updateNetInfo('netLatencyValue', `${latency}ms`, latency < 300);
        } catch (error) {
            updateNetInfo('netLatencyValue', '超时', false);
        }

        // 获取IP和位置信息
        try {
            const now = Date.now();
            let ipData = null;

            // 检查缓存是否有效
            if (locationCache && now - cacheTimestamp < CACHE_TIMEOUT) {
                ipData = locationCache;
                updateLocationInfo(ipData);
            } else {
                // 尝试多个IP API接口
                const ipApis = [
                    'https://api.ipify.org?format=json',
                    'https://ipapi.co/json/',
                    'https://ipinfo.io/json'
                ];

                for (const api of ipApis) {
                    try {
                        const response = await fetch(api, { signal: AbortSignal.timeout(5000) });
                        if (response.ok) {
                            ipData = await response.json();
                            break;
                        }
                    } catch (error) {
                        console.log(`API ${api} 请求失败:`, error);
                        continue;
                    }
                }

                if (ipData) {
                    locationCache = ipData;
                    cacheTimestamp = now;
                    updateLocationInfo(ipData);
                } else {
                    throw new Error('所有IP API请求失败');
                }
            }
        } catch (error) {
            updateNetInfo('ipAddressValue', '获取失败', false);
            updateNetInfo('locationValue', '获取失败', false);
        }
    }

    // 更新网络信息显示
    function updateNetInfo(elementId, value, isGood) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = isGood ? 'net-info-value dynamic' : 'net-info-value';
        }
    }

    // 更新位置信息
    function updateLocationInfo(ipData) {
        // 处理不同API返回的数据结构
        let ipAddress = '';
        let location = '';

        if (ipData.ip) {
            ipAddress = ipData.ip;
        }

        if (ipData.city && ipData.region && ipData.country) {
            location = `${ipData.city}, ${ipData.region}, ${ipData.country}`;
        } else if (ipData.city) {
            location = ipData.city;
        } else if (ipData.country) {
            location = ipData.country;
        } else {
            location = '未知';
        }

        updateNetInfo('ipAddressValue', ipAddress || '未知', true);
        updateNetInfo('locationValue', location, true);
    }

    // 添加日志
    function addLog(source, message, type = 'info') {
        const timestamp = new Date().toLocaleString();
        const logEntry = {
            timestamp,
            source,
            message,
            type,
            domain: window.location.hostname
        };

        // 限制日志缓存条数
        if (logCache.length >= MAX_LOG_CACHE) {
            logCache.shift(); // 移除最旧的日志
        }

        logCache.push(logEntry);
        console.log(`[${timestamp}] [${source}] ${message}`);
    }

    // 导出日志
    function exportLogs() {
        if (logCache.length === 0) {
            alert('暂无日志记录');
            return;
        }

        const logText = logCache.map(log => 
            `[${log.timestamp}] [${log.domain}] [${log.source}] ${log.message}`
        ).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('系统', '日志导出成功', 'success');
    }

    // 页面卸载前的处理
    function handleBeforeUnload(e) {
        if (isVerifying) {
            const message = '安全验证正在进行中，确定要离开吗？';
            e.returnValue = message;
            return message;
        }
    }

    // 初始化脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();