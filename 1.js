// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  带本地存储+二次验证+脚本校验的安全计时器
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

GM_addStyle(`
  /* 基础样式保持不变，新增二次验证相关样式 */
  .safe-timer {
    position: fixed;
    top: 12px;
    left: 12px;
    background: rgba(255,255,255,0.95);
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 9999;
    user-select: none;
    transition: color 0.3s ease;
  }

  .verify-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 0 15px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  .verify-modal.active {
    opacity: 1;
    visibility: visible;
  }

  .modal-box {
    width: 100%;
    max-width: 380px;
    background: white;
    border-radius: 16px;
    padding: 30px 20px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    transform: scale(0.95);
    transition: transform 0.3s ease;
  }
  .verify-modal.active .modal-box {
    transform: scale(1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
  .modal-icon {
    font-size: 24px;
    margin-right: 10px;
    color: #4285f4;
  }
  .modal-title {
    font-size: 22px;
    font-weight: bold;
    color: #1a1a1a;
    margin: 0;
  }

  .modal-desc {
    font-size: 15px;
    color: #666;
    text-align: center;
    margin: 0 0 25px;
    line-height: 1.5;
    padding: 0 10px;
  }

  .verify-code {
    width: 100%;
    padding: 15px 0;
    background: linear-gradient(135deg, #f5f7fa 0%, #eef1f5 100%);
    border: 1px solid #e1e5eb;
    border-radius: 12px;
    font-size: 24px;
    font-weight: bold;
    color: #2c3e50;
    text-align: center;
    letter-spacing: 4px;
    margin: 0 0 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }
  .verify-code:active {
    transform: scale(0.98);
    background: linear-gradient(135deg, #eef1f5 0%, #f5f7fa 100%);
    border-color: #d1d8e0;
  }
  /* 不可复制验证码样式 */
  .verify-code.uncopyable {
    background: linear-gradient(135deg, #f0f2f5 0%, #e4e6eb 100%);
    cursor: default;
    border-color: #d1d8e0;
  }
  .verify-code.uncopyable:active {
    transform: none;
  }

  .copy-tip {
    font-size: 13px;
    color: #888;
    text-align: center;
    margin: 0 0 25px;
    font-style: italic;
  }

  /* 输入框样式（新增） */
  .code-input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    margin: 0 0 20px;
    box-sizing: border-box;
  }
  .code-input:focus {
    outline: none;
    border-color: #4285f4;
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
    transition: all 0.2s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  .modal-btn:active {
    transform: translateY(2px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .confirm-btn {
    background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
    color: white;
  }

  .cancel-btn {
    background: linear-gradient(135deg, #ea4335 0%, #d93025 100%);
    color: white;
  }

  .copy-success {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 15px;
    z-index: 10001;
    opacity: 0;
    animation: fadeInOut 1.5s ease;
  }
  @keyframes fadeInOut {
    0% { opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }

  .update-link-wrap {
    text-align: center;
    padding-top: 10px;
    border-top: 1px dashed #eee;
  }
  .update-link {
    font-size: 13px;
    color: #4285f4;
    text-decoration: none;
    cursor: pointer;
  }
  .update-link:hover, .update-link:active {
    text-decoration: underline;
    color: #3367d6;
  }

  /* 错误提示样式（新增） */
  .error-tip {
    color: #ea4335;
    font-size: 14px;
    text-align: center;
    margin: 10px 0;
    height: 16px;
  }
`);

// 常量定义
const STORAGE_KEY = 'safeTimerRemaining';
const TOTAL_TIME = 15 * 60; // 15分钟总时长
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
// 脚本校验地址（转换为raw地址以获取纯文本内容）
const SCRIPT_VERIFY_URL = UPDATE_URL.replace('blob/', 'raw/');
let firstVerifyStartTime = 0; // 首次验证开始时间

// 创建倒计时元素
function createTimer() {
  const timerEl = document.createElement('div');
  timerEl.className = 'safe-timer';
  document.body.appendChild(timerEl);
  return timerEl;
}

// 格式化时间
function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// 时间颜色计算
function getTimeColor(remainingTime) {
  const ratio = Math.max(0, Math.min(1, remainingTime / TOTAL_TIME));
  const hue = Math.floor(ratio * 120);
  return `hsl(${hue}, 70%, 50%)`;
}

// 二次验证流程（不可复制，需输入）
function showSecondaryVerify(remainingTimes) {
  if (remainingTimes <= 0) {
    alert('验证通过');
    return;
  }

  // 生成6位不可复制验证码
  const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString();

  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🔍</span>
        <h3 class="modal-title">二次验证（${remainingTimes}/2）</h3>
      </div>
      <p class="modal-desc">请手动输入下方验证码（不可复制）</p>
      <div class="verify-code uncopyable">${verifyCode}</div>
      <p class="copy-tip">验证码不可复制，请仔细核对后输入</p>
      <input type="text" class="code-input" placeholder="请输入6位验证码" maxlength="6">
      <div class="error-tip"></div>
      <div class="modal-btns">
        <button class="modal-btn confirm-btn">确认</button>
        <button class="modal-btn cancel-btn">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);

  const inputEl = modal.querySelector('.code-input');
  const errorEl = modal.querySelector('.error-tip');
  const confirmBtn = modal.querySelector('.confirm-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');

  // 自动聚焦输入框
  setTimeout(() => inputEl.focus(), 300);

  // 确认验证
  confirmBtn.addEventListener('click', () => {
    const input = inputEl.value.trim();
    if (input !== verifyCode) {
      errorEl.textContent = '验证码错误，请重新输入';
      inputEl.value = '';
      inputEl.focus();
      return;
    }
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      showSecondaryVerify(remainingTimes - 1); // 继续下一次验证
    }, 300);
  });

  // 取消验证（关闭页面）
  cancelBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });

  // 支持回车确认
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
  });
}

// 首次验证弹窗
function showVerifyModal() {
  const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString();
  firstVerifyStartTime = Date.now(); // 记录验证开始时间

  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🔒</span>
        <h3 class="modal-title">安全验证</h3>
      </div>
      <p class="modal-desc">为确认您的访问安全，请完成以下验证</p>
      <div class="verify-code">${verifyCode}</div>
      <p class="copy-tip">点击验证码即可复制</p>
      <div class="modal-btns">
        <button class="modal-btn confirm-btn">确认验证</button>
        <button class="modal-btn cancel-btn">拒绝</button>
      </div>
      <div class="update-link-wrap">
        <a href="${UPDATE_URL}" target="_blank" class="update-link">检查脚本更新</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);

  // 验证码复制
  modal.querySelector('.verify-code').addEventListener('click', () => {
    navigator.clipboard.writeText(verifyCode).then(() => {
      const tip = document.createElement('div');
      tip.className = 'copy-success';
      tip.textContent = '验证码已复制成功';
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 1500);
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  });

  // 确认按钮
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const verifyDuration = Date.now() - firstVerifyStartTime;
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);

    // 5秒内完成验证需二次校验
    if (verifyDuration <= 5000) {
      setTimeout(() => {
        alert('检测到验证速度较快，需进行二次验证');
        showSecondaryVerify(2); // 发起2次二次验证
      }, 500);
    }
  });

  // 拒绝按钮
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });
}

// 脚本完整性校验
function verifyScriptIntegrity() {
  // 获取本地脚本内容（去除注释和空白以兼容格式差异）
  const localScript = GM_info.script.source
    .replace(/\/\/.*$/gm, '') // 去除单行注释
    .replace(/\/\*[\s\S]*?\*\//g, '') // 去除多行注释
    .replace(/\s+/g, ''); // 去除所有空白

  // 请求远程脚本
  GM_xmlhttpRequest({
    method: 'GET',
    url: SCRIPT_VERIFY_URL,
    onload: (response) => {
      if (response.status !== 200) {
        console.warn('脚本校验失败：无法获取远程脚本');
        return;
      }

      // 处理远程脚本内容（同规则清洗）
      const remoteScript = response.responseText
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, '');

      // 对比校验
      if (localScript !== remoteScript) {
        alert('⚠️ 警告：脚本内容与官方版本不一致！可能已被篡改，建议重新安装。');
      }
    },
    onerror: (err) => {
      console.warn('脚本校验请求失败：', err);
    }
  });
}

// 初始化
(function() {
  'use strict';

  // 优先执行脚本完整性校验
  verifyScriptIntegrity();

  const timerEl = createTimer();
  let remainingTime = parseInt(localStorage.getItem(STORAGE_KEY)) || TOTAL_TIME;
  if (isNaN(remainingTime) || remainingTime > TOTAL_TIME || remainingTime < 0) {
    remainingTime = TOTAL_TIME;
  }

  const timer = setInterval(() => {
    if (remainingTime <= 0) {
      clearInterval(timer);
      timerEl.remove();
      localStorage.removeItem(STORAGE_KEY);
      showVerifyModal();
      return;
    }

    timerEl.textContent = `倒计时: ${formatTime(remainingTime)}`;
    timerEl.style.color = getTimeColor(remainingTime);
    localStorage.setItem(STORAGE_KEY, remainingTime);
    remainingTime--;
  }, 1000);

  timerEl.textContent = `倒计时: ${formatTime(remainingTime)}`;
  timerEl.style.color = getTimeColor(remainingTime);
})();