// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  带本地存储的15分钟倒计时，结束后显示美化弹窗，支持验证码复制与验证交互
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
  /* 倒计时样式（左上角固定） */
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
    transition: color 0.3s ease; /* 颜色过渡动画 */
  }

  /* 弹窗背景（带动画） */
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

  /* 弹窗内容容器（美化升级） */
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

  /* 弹窗标题（带图标） */
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

  /* 弹窗说明文字 */
  .modal-desc {
    font-size: 15px;
    color: #666;
    text-align: center;
    margin: 0 0 25px;
    line-height: 1.5;
    padding: 0 10px;
  }

  /* 验证码样式（强化视觉） */
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

  /* 复制提示 */
  .copy-tip {
    font-size: 13px;
    color: #888;
    text-align: center;
    margin: 0 0 25px;
    font-style: italic;
  }

  /* 按钮容器 */
  .modal-btns {
    display: flex;
    gap: 15px;
    margin-top: 10px;
  }

  /* 按钮样式（美化升级） */
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

  /* 确认按钮（蓝色系） */
  .confirm-btn {
    background: linear-gradient(135deg, #4285f4 0%, #3367d6 100%);
    color: white;
  }

  /* 拒绝按钮（红色系） */
  .cancel-btn {
    background: linear-gradient(135deg, #ea4335 0%, #d93025 100%);
    color: white;
  }

  /* 复制成功提示（美化） */
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
`);

// 本地存储相关常量
const STORAGE_KEY = 'safeTimerRemaining';
const TOTAL_TIME = 15 * 60; // 总时长15分钟（秒）

// 创建倒计时元素
function createTimer() {
  const timerEl = document.createElement('div');
  timerEl.className = 'safe-timer';
  document.body.appendChild(timerEl);
  return timerEl;
}

// 格式化倒计时时间（分:秒）
function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// 根据剩余时间计算颜色（分级渐变）
function getTimeColor(remainingTime) {
  // 计算剩余比例（0-1）
  const ratio = Math.max(0, Math.min(1, remainingTime / TOTAL_TIME));
  // 色相从绿色（120）过渡到红色（0），饱和度和亮度固定
  const hue = Math.floor(ratio * 120);
  return `hsl(${hue}, 70%, 50%)`;
}

// 显示安全验证弹窗（美化版）
function showVerifyModal() {
  // 生成6位随机验证码
  const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString();

  // 创建弹窗元素
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
    </div>
  `;
  document.body.appendChild(modal);

  // 弹窗显示动画
  setTimeout(() => modal.classList.add('active'), 10);

  // 验证码复制功能
  const codeEl = modal.querySelector('.verify-code');
  codeEl.addEventListener('click', () => {
    navigator.clipboard.writeText(verifyCode).then(() => {
      // 显示复制成功提示（带动画）
      const tip = document.createElement('div');
      tip.className = 'copy-success';
      tip.textContent = '验证码已复制成功';
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 1500);
    }).catch(() => {
      alert('复制失败，请手动复制验证码');
    });
  });

  // 确认按钮：关闭弹窗
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });

  // 拒绝按钮：关闭页面
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    // 关闭前清除本地存储
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    // 浏览器不支持close()时的兼容处理
    setTimeout(() => {
      if (document.body.contains(modal)) {
        alert('请手动关闭当前页面');
      }
    }, 300);
  });
}

// 初始化功能
(function() {
  'use strict';

  const timerEl = createTimer();
  // 从本地存储读取剩余时间（若无则用初始值）
  let remainingTime = parseInt(localStorage.getItem(STORAGE_KEY)) || TOTAL_TIME;
  // 修正异常值（若存储的时间超过总时长或为负数，重置为初始值）
  if (isNaN(remainingTime) || remainingTime > TOTAL_TIME || remainingTime < 0) {
    remainingTime = TOTAL_TIME;
  }

  // 更新倒计时（含本地存储和颜色更新）
  const timer = setInterval(() => {
    if (remainingTime <= 0) {
      clearInterval(timer);
      timerEl.remove();
      localStorage.removeItem(STORAGE_KEY); // 倒计时结束清除存储
      showVerifyModal();
      return;
    }

    // 更新显示和颜色
    timerEl.textContent = `倒计时: ${formatTime(remainingTime)}`;
    timerEl.style.color = getTimeColor(remainingTime);

    // 存储当前剩余时间（每秒更新一次）
    localStorage.setItem(STORAGE_KEY, remainingTime);
    remainingTime--;
  }, 1000);

  // 初始渲染
  timerEl.textContent = `倒计时: ${formatTime(remainingTime)}`;
  timerEl.style.color = getTimeColor(remainingTime);
})();