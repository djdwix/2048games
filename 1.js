// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  带本地延迟检测+IP显示+后台计时同步+动态验证码+科幻弹窗的安全计时器
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
  /* 网络状态弹窗（同步科幻风格） */
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
    max-width: 380px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 16px;
    padding: 25px 20px;
    box-shadow: 0 0 20px rgba(76, 201, 240, 0.3);
    transform: scale(0.9) translateY(10px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .net-modal.active .net-modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 30px rgba(76, 201, 240, 0.4);
  }
  .net-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(76, 201, 240, 0.3);
  }
  .net-modal-title {
    font-size: 20px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    display: flex;
    align-items: center;
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.5);
  }
  .net-modal-title span {
    margin-right: 8px;
    font-size: 24px;
  }
  .net-modal-close {
    background: transparent;
    border: 1px solid rgba(76, 201, 240, 0.5);
    color: #4cc9f0;
    font-size: 22px;
    cursor: pointer;
    padding: 0 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  .net-modal-close:hover {
    background: rgba(76, 201, 240, 0.1);
    box-shadow: 0 0 8px rgba(76, 201, 240, 0.3);
  }
  .net-info-list {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
  }
  .net-info-item {
    padding: 12px 0;
    border-bottom: 1px dashed rgba(76, 201, 240, 0.2);
    font-size: 15px;
  }
  .net-info-label {
    color: #94a3b8;
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .net-info-value {
    color: #e0f2fe;
    font-weight: 500;
  }
  .net-info-value.dynamic {
    color: #4cc9f0;
    text-shadow: 0 0 3px rgba(76, 201, 240, 0.4);
  }
  /* 科幻化验证弹窗样式（核心更新） */
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
  /* 科幻化验证码样式 */
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
  /* 科幻化输入框 */
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
  /* 科幻化错误提示 */
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
  /* 科幻化按钮组 */
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
  /* 确认按钮科幻风格 */
  .confirm-btn {
    background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
    box-shadow: 0 0 12px rgba(67, 97, 238, 0.5);
  }
  .confirm-btn:hover {
    box-shadow: 0 0 18px rgba(67, 97, 238, 0.7);
  }
  /* 取消按钮科幻风格 */
  .cancel-btn {
    background: linear-gradient(135deg, #f72585 0%, #7209b7 100%);
    box-shadow: 0 0 12px rgba(247, 37, 133, 0.5);
  }
  .cancel-btn:hover {
    box-shadow: 0 0 18px rgba(247, 37, 133, 0.7);
  }
  /* 复制成功提示科幻化 */
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
  /* 脚本更新链接科幻化 */
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
`);
// 常量定义（核心更新：删除所有脚本校验相关常量）
const STORAGE_KEY = 'safeTimerEndTime';
const TOTAL_TIME = 15 * 60;
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 5000;
const LOCAL_DELAY_INTERVAL = 3000;
const LOCAL_TEST_TIMES = 10;
// 网络状态管理（保留功能，同步科幻风格）
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.localDelay = '未知';
    this.userIP = '获取中...';
    this.statusEl = null;
    this.modalEl = null;
    this.delayTimer = null;
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect();
    this.fetchUserIP();
  }
  initElements() {
    this.statusEl = document.createElement('div');
    this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
    this.statusEl.textContent = this.isOnline ? '在线' : '离线';
    document.body.appendChild(this.statusEl);
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
            <span class="net-info-label">本地交互延迟</span>
            <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
          </li>
          <li class="net-info-item">
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
    this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
      this.modalEl.classList.remove('active');
    });
  }
  bindEvents() {
    this.statusEl.addEventListener('click', () => {
      this.modalEl.classList.toggle('active');
    });
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.modalEl.querySelector('#net-type-value').textContent = this.getNetworkType();
      });
    }
  }
  updateStatus(online) {
    this.isOnline = online;
    this.statusEl.className = `net-status ${online ? 'online' : 'offline'}`;
    this.statusEl.textContent = online ? '在线' : '离线';
    this.modalEl.querySelector('#net-status-value').textContent = online ? '在线' : '离线';
    this.modalEl.querySelector('.net-modal-title span').textContent = online ? '🌐' : '❌';
    if (online) {
      this.startLocalDelayDetect();
    } else {
      this.localDelay = '离线（无法检测）';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      clearInterval(this.delayTimer);
    }
  }
  calculateLocalDelay() {
    const startTime = performance.now();
    for (let i = 0; i < LOCAL_TEST_TIMES; i++) {
      localStorage.setItem(`localDelayTest_${i}`, 'test');
      localStorage.getItem(`localDelayTest_${i}`);
      localStorage.removeItem(`localDelayTest_${i}`);
    }
    const totalTime = performance.now() - startTime;
    const avgDelay = Math.round(totalTime / LOCAL_TEST_TIMES);
    this.localDelay = `${avgDelay}ms`;
    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
  }
  startLocalDelayDetect() {
    if (!this.isOnline) return;
    clearInterval(this.delayTimer);
    this.calculateLocalDelay();
    this.delayTimer = setInterval(() => {
      if (this.isOnline) this.calculateLocalDelay();
    }, LOCAL_DELAY_INTERVAL);
  }
  fetchUserIP() {
    fetch('http://cip.cc/', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    })
    .then(response => {
      if (!response.ok) throw new Error('IP请求失败');
      return response.text();
    })
    .then(text => {
      const ipMatch = text.match(/IP\s*:\s*([\d\.]+)/);
      this.userIP = ipMatch && ipMatch[1] ? ipMatch[1] : '解析失败';
      this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    })
    .catch(error => {
      this.userIP = '获取失败（检查网络）';
      this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    });
  }
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
  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile') && ua.includes('Chrome')) return 'Chrome移动版';
    if (ua.includes('Safari') && ua.includes('Mobile')) return 'Safari移动版';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return '未知浏览器';
  }
  getScreenSize() {
    return `${screen.width}×${screen.height}px (${window.innerWidth}×${window.innerHeight}px)`;
  }
}
// 倒计时及验证功能（保留核心，更新验证码逻辑）
function initTimer() {
  const timerEl = document.createElement('div');
  timerEl.className = 'safe-timer';
  document.body.appendChild(timerEl);
  let endTime;
  const storedEndTime = localStorage.getItem(STORAGE_KEY);
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
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }
  function getTimeColor(remainingTime) {
    const ratio = Math.max(0, Math.min(1, remainingTime / TOTAL_TIME));
    const hue = Math.floor(ratio * 180) + 180; // 科幻蓝紫渐变（180-360色调）
    return `hsl(${hue}, 70%, 60%)`;
  }
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
// 生成随机6位验证码
function generateCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}
// 加强验证（核心更新：验证码错误自动更新）
function showStrengthenVerify(remainingTimes) {
  // 用let声明code，支持后续更新
  let code = generateCode();
  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🛡️</span>
        <h3 class="modal-title">加强验证（${STRENGTHEN_COUNT - remainingTimes + 1}/${STRENGTHEN_COUNT}）</h3>
      </div>
      <p class="modal-desc">检测到快速验证行为，请完成剩余安全校验</p>
      <div class="verify-code uncopyable">${code}</div>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" placeholder="请输入6位验证码" maxlength="6" autocomplete="off">
      </div>
      <div class="verify-error">验证码错误，已自动刷新，请重新输入</div>
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
  const verifyCodeEl = modal.querySelector('.verify-code');
  
  // 确认按钮事件（核心更新：错误时自动更新验证码）
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (inputCode !== code) {
      verifyError.style.display = 'block';
      // 自动生成新验证码并更新显示
      code = generateCode();
      verifyCodeEl.textContent = code;
      // 清空输入框并聚焦
      verifyInput.value = '';
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
  // 取消按钮事件
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });
}
// 初始验证（核心更新：验证码错误自动更新）
function showInitialVerify() {
  const startTime = Date.now();
  // 用let声明code，支持后续更新
  let code = generateCode();
  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-icon">🛡️</span>
        <h3 class="modal-title">安全验证</h3>
      </div>
      <p class="modal-desc">为确认您的访问安全，请完成以下身份校验</p>
      <div class="verify-code">${code}</div>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" placeholder="请输入6位验证码" maxlength="6" autocomplete="off">
      </div>
      <div class="verify-error">验证码错误，已自动刷新，请重新输入</div>
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
  const verifyInput = modal.querySelector('.verify-input');
  const verifyError = modal.querySelector('.verify-error');
  const verifyCodeEl = modal.querySelector('.verify-code');
  
  // 验证码复制功能
  verifyCodeEl.addEventListener('click', () => {
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
  
  // 确认按钮事件（核心更新：错误时自动更新验证码）
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (!inputCode || inputCode !== code) {
      verifyError.style.display = 'block';
      // 自动生成新验证码并更新显示
      code = generateCode();
      verifyCodeEl.textContent = code;
      // 清空输入框并聚焦
      verifyInput.value = '';
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
  
  // 取消按钮事件
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    setTimeout(() => {
      if (document.body.contains(modal)) alert('请手动关闭页面');
    }, 300);
  });
}
// 初始化所有功能（核心更新：删除脚本校验初始化）
(function() {
  'use strict';
  new NetworkMonitor(); // 网络监测
  initTimer(); // 倒计时同步
})();