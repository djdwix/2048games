// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  带本地延迟检测+IP显示+后台计时同步的安全计时器
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// ==/UserScript==
GM_addStyle(`
  /* 倒计时样式（左上角） */
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
  /* 网络状态显示（右上角） */
  .net-status {
    position: fixed;
    top: 12px;
    right: 12px;
    background: rgba(255,255,255,0.95);
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 9999;
    user-select: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .net-status.online {
    color: #4cd964;
  }
  .net-status.offline {
    color: #ff3b30;
  }
  .net-status:active {
    transform: scale(0.95);
  }
  /* 网络状态弹窗 */
  .net-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.6);
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
    max-width: 380px;
    background: white;
    border-radius: 16px;
    padding: 25px 20px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    transform: scale(0.95);
    transition: transform 0.3s ease;
  }
  .net-modal.active .net-modal-box {
    transform: scale(1);
  }
  .net-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f0f0;
  }
  .net-modal-title {
    font-size: 20px;
    font-weight: bold;
    color: #1a1a1a;
    margin: 0;
    display: flex;
    align-items: center;
  }
  .net-modal-title span {
    margin-right: 8px;
  }
  .net-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: #888;
    padding: 0 5px;
  }
  .net-info-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
  }
  .net-info-item {
    padding: 12px 0;
    border-bottom: 1px dashed #f0f0f0;
    font-size: 15px;
  }
  .net-info-label {
    color: #666;
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .net-info-value {
    color: #1a1a1a;
    font-weight: 500;
  }
  .net-info-value.dynamic {
    color: #4285f4;
  }
  /* 验证弹窗样式 */
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
  .verify-code.uncopyable {
    cursor: default;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
    border-color: #dee2e6;
    pointer-events: none;
  }
  .verify-input-wrap {
    margin: 15px 0 5px;
  }
  .verify-input {
    width: 100%;
    padding: 12px 0;
    border: 1px solid #e1e5eb;
    border-radius: 8px;
    font-size: 16px;
    text-align: center;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .verify-input:focus {
    border-color: #4285f4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }
  .verify-error {
    display: none;
    color: #ff3b30;
    text-align: center;
    font-size: 13px;
    margin-top: -10px;
    margin-bottom: 15px;
  }
  .copy-tip {
    font-size: 13px;
    color: #888;
    text-align: center;
    margin: 0 0 25px;
    font-style: italic;
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
`);
// 常量定义（更新：移除远程ping相关常量，新增本地延迟检测参数）
const STORAGE_KEY = 'safeTimerEndTime';
const TOTAL_TIME = 15 * 60;
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 5000;
const LOCAL_DELAY_INTERVAL = 3000; // 本地延迟检测间隔（3秒）
const LOCAL_TEST_TIMES = 10; // 本地延迟检测：单次测试执行次数（取平均值更稳定）

// 网络状态管理（核心更新：本地延迟检测+IP显示）
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.localDelay = '未知'; // 改为“本地延迟”
    this.userIP = '获取中...'; // 新增：IP地址
    this.statusEl = null;
    this.modalEl = null;
    this.delayTimer = null; // 本地延迟检测定时器
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect(); // 启动本地延迟检测
    this.fetchUserIP(); // 新增：获取IP地址
  }
  // 创建状态元素和弹窗（更新：新增IP地址显示项）
  initElements() {
    // 右上角状态显示（文本不变，仍显示在线/离线）
    this.statusEl = document.createElement('div');
    this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
    this.statusEl.textContent = this.isOnline ? '在线' : '离线';
    document.body.appendChild(this.statusEl);
    // 网络信息弹窗（新增IP地址列表项，修改延迟标签为“本地交互延迟”）
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'net-modal';
    this.modalEl.innerHTML = `
      <div class="net-modal-box">
        <div class="net-modal-header">
          <h3 class="net-modal-title">
            <span>${this.isOnline ? '🌐' : '❌'}</span>网络与本地状态详情
          </h3>
          <button class="net-modal-close">×</button>
        </div>
        <ul class="net-info-list">
          <li class="net-info-item">
            <span class="net-info-label">连接状态</span>
            <span class="net-info-value" id="net-status-value">${this.isOnline ? '在线' : '离线'}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">本地交互延迟</span> <!-- 标签改为“本地交互延迟” -->
            <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
          </li>
          <li class="net-info-item"> <!-- 新增：IP地址显示项 -->
            <span class="net-info-label">当前IP地址</span>
            <span class="net-info-value dynamic" id="user-ip-value">${this.userIP}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">网络类型</span>
            <span class="net-info-value" id="net-type-value">${this.getNetworkType()}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">浏览器信息</span>
            <span class="net-info-value" id="browser-info-value">${this.getBrowserInfo()}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">屏幕尺寸</span>
            <span class="net-info-value" id="screen-size-value">${this.getScreenSize()}</span>
          </li>
        </ul>
      </div>
    `;
    document.body.appendChild(this.modalEl);
    // 绑定关闭按钮事件
    this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
      this.modalEl.classList.remove('active');
    });
  }
  // 绑定事件监听（保留原有逻辑）
  bindEvents() {
    // 点击状态显示切换弹窗
    this.statusEl.addEventListener('click', () => {
      this.modalEl.classList.toggle('active');
    });
    // 监听在线/离线事件
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
    // 监听网络类型变化
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.modalEl.querySelector('#net-type-value').textContent = this.getNetworkType();
      });
    }
  }
  // 更新网络状态（保留原有逻辑）
  updateStatus(online) {
    this.isOnline = online;
    this.statusEl.className = `net-status ${online ? 'online' : 'offline'}`;
    this.statusEl.textContent = online ? '在线' : '离线';
    this.modalEl.querySelector('#net-status-value').textContent = online ? '在线' : '离线';
    this.modalEl.querySelector('.net-modal-title span').textContent = online ? '🌐' : '❌';
    
    // 在线时重启本地延迟检测，离线时停止
    if (online) {
      this.startLocalDelayDetect();
    } else {
      this.localDelay = '离线（无法检测）';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      clearInterval(this.delayTimer);
    }
  }
  // 核心更新1：本地延迟检测（替换原远程ping）
  // 原理：通过多次执行本地存储读写（无网络请求），计算平均耗时，反映网页与本地环境的交互延迟
  calculateLocalDelay() {
    const startTime = performance.now(); // 高精度计时（比Date.now()更准）
    // 执行多次本地操作（如读写localStorage），减少偶然误差
    for (let i = 0; i < LOCAL_TEST_TIMES; i++) {
      localStorage.setItem(`localDelayTest_${i}`, 'test');
      localStorage.getItem(`localDelayTest_${i}`);
      localStorage.removeItem(`localDelayTest_${i}`);
    }
    const totalTime = performance.now() - startTime;
    const avgDelay = Math.round(totalTime / LOCAL_TEST_TIMES); // 计算单次平均耗时
    this.localDelay = `${avgDelay}ms`;
    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
  }
  // 启动本地延迟检测（替换原startPing）
  startLocalDelayDetect() {
    if (!this.isOnline) return;
    clearInterval(this.delayTimer); // 清除旧定时器，避免重复
    this.calculateLocalDelay(); // 立即检测一次
    // 定时重复检测
    this.delayTimer = setInterval(() => {
      if (this.isOnline) this.calculateLocalDelay();
    }, LOCAL_DELAY_INTERVAL);
  }
  // 核心更新2：从http://cip.cc/获取IP地址
  fetchUserIP() {
    fetch('http://cip.cc/', {
      method: 'GET',
      mode: 'cors', // 允许跨域（cip.cc支持CORS）
      cache: 'no-store'
    })
    .then(response => {
      if (!response.ok) throw new Error('IP请求失败');
      return response.text(); // cip.cc返回文本格式，需解析
    })
    .then(text => {
      // 解析文本内容：提取“IP : xxx.xxx.xxx.xxx”中的IP
      const ipMatch = text.match(/IP\s*:\s*([\d\.]+)/);
      if (ipMatch && ipMatch[1]) {
        this.userIP = ipMatch[1];
      } else {
        this.userIP = '解析失败';
      }
      this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    })
    .catch(error => {
      this.userIP = '获取失败（检查网络）';
      this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    });
  }
  // 获取网络类型（保留原有逻辑）
  getNetworkType() {
    if (!navigator.connection) return '未知';
    const types = {
      'bluetooth': '蓝牙',
      'cellular': '蜂窝网络',
      'ethernet': '以太网',
      'none': '无',
      'wifi': 'WiFi',
      'wimax': 'WiMAX',
      'other': '其他',
      'unknown': '未知'
    };
    return types[navigator.connection.type] || navigator.connection.type;
  }
  // 获取浏览器信息（保留原有逻辑）
  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile') && ua.includes('Chrome')) return 'Chrome移动版';
    if (ua.includes('Safari') && ua.includes('Mobile')) return 'Safari移动版';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return '未知浏览器';
  }
  // 获取屏幕尺寸（保留原有逻辑）
  getScreenSize() {
    return `${screen.width}×${screen.height}px (${window.innerWidth}×${window.innerHeight}px)`;
  }
}

// 倒计时及验证功能（保留前序版本修复的同步和输入验证逻辑）
function initTimer() {
  const timerEl = document.createElement('div');
  timerEl.className = 'safe-timer';
  document.body.appendChild(timerEl);
  let endTime;
  const storedEndTime = localStorage.getItem(STORAGE_KEY);
  
  // 统一时间初始化（多网页同步核心）
  if (storedEndTime) {
    endTime = parseInt(storedEndTime);
    if (endTime <= Date.now()) {
      endTime = Date.now() + TOTAL_TIME * 1000;
      localStorage.setItem(STORAGE_KEY, endTime);
    }
  } else {
    endTime = Date.now() + TOTAL_TIME * 1000;
    localStorage.setItem(STORAGE_KEY, endTime);
  }

  // 时间格式化
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

  // 更新倒计时
  function updateTimer() {
    const now = Date.now();
    const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));
    
    if (remainingTime <= 0) {
      clearInterval(timer);
      timerEl.remove();
      localStorage.removeItem(STORAGE_KEY);
      showInitialVerify();
      return;
    }

    timerEl.textContent = `倒计时: ${formatTime(remainingTime)}`;
    timerEl.style.color = getTimeColor(remainingTime);
  }

  // 多网页同步：监听localStorage变化
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue) {
        endTime = parseInt(e.newValue);
        if (endTime <= Date.now()) {
          clearInterval(timer);
          timerEl.remove();
          localStorage.removeItem(STORAGE_KEY);
          showInitialVerify();
        }
      } else {
        clearInterval(timer);
        timerEl.remove();
        showInitialVerify();
      }
      updateTimer();
    }
  });

  updateTimer();
  const timer = setInterval(updateTimer, 1000);
}

// 生成6位验证码
function generateCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

// 加强验证（保留输入验证逻辑）
function showStrengthenVerify(remainingTimes) {
  const code = generateCode();
  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🔍</span>
        <h3 class="modal-title">加强验证（${STRENGTHEN_COUNT - remainingTimes + 1}/${STRENGTHEN_COUNT}）</h3>
      </div>
      <p class="modal-desc">检测到快速验证行为，请完成剩余验证</p>
      <div class="verify-code uncopyable">${code}</div>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" placeholder="请输入6位验证码" maxlength="6" autocomplete="off">
      </div>
      <div class="verify-error">验证码错误，请重新输入</div>
      <p class="copy-tip">验证码不可复制，请手动输入</p>
      <div class="modal-btns">
        <button class="modal-btn confirm-btn">确认验证</button>
        <button class="modal-btn cancel-btn">拒绝</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('active'), 10);

  const verifyInput = modal.querySelector('.verify-input');
  const verifyError = modal.querySelector('.verify-error');

  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (inputCode !== code) {
      verifyError.style.display = 'block';
      verifyInput.focus();
      return;
    }
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      remainingTimes--;
      if (remainingTimes > 0) {
        showStrengthenVerify(remainingTimes);
      }
    }, 300);
  });

  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });
}

// 初始验证（保留输入验证逻辑）
function showInitialVerify() {
  const startTime = Date.now();
  const code = generateCode();
  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🔒</span>
        <h3 class="modal-title">安全验证</h3>
      </div>
      <p class="modal-desc">为确认您的访问安全，请完成以下验证</p>
      <div class="verify-code">${code}</div>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" placeholder="请输入6位验证码" maxlength="6" autocomplete="off">
      </div>
      <div class="verify-error">验证码错误，请重新输入</div>
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

  // 验证码复制功能
  modal.querySelector('.verify-code').addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => {
      const tip = document.createElement('div');
      tip.className = 'copy-success';
      tip.textContent = '验证码已复制成功';
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 1500);
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  });

  const verifyInput = modal.querySelector('.verify-input');
  const verifyError = modal.querySelector('.verify-error');

  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (!inputCode || inputCode !== code) {
      verifyError.style.display = 'block';
      verifyInput.focus();
      return;
    }

    const elapsed = Date.now() - startTime;
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      if (elapsed < FAST_VERIFY_THRESHOLD) {
        showStrengthenVerify(STRENGTHEN_COUNT);
      }
    }, 300);
  });

  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });
}

// 初始化所有功能
(function() {
  'use strict';
  new NetworkMonitor(); // 初始化网络监测（含本地延迟+IP显示）
  initTimer(); // 初始化倒计时（多网页同步）
})();