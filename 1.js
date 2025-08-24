// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  带本地延迟检测+IP显示+后台计时同步+脚本在线校验的安全计时器
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
  /* 新增：脚本校验警告样式 */
  .script-warn {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: bold;
    text-align: center;
    z-index: 99999; /* 最高层级，确保可见 */
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease;
  }
  .script-warn.error {
    background: #ff3b30;
    color: white;
  }
  .script-warn.success {
    background: #4cd964;
    color: white;
  }
  .script-warn button {
    margin-left: 20px;
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: rgba(255,255,255,0.3);
    color: white;
    font-weight: 600;
  }
`);
// 常量定义（核心更新：删除旧校验地址，添加新脚本在线校验地址）
const STORAGE_KEY = 'safeTimerEndTime';
const TOTAL_TIME = 15 * 60;
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 5000;
const LOCAL_DELAY_INTERVAL = 3000;
const LOCAL_TEST_TIMES = 10;
const SCRIPT_CHECK_URL = 'http://localhost:3000/'; // 核心更新：新脚本在线校验地址
const CHECK_TIMEOUT = 10000; // 校验超时时间（10秒）
// 网络状态管理（保留前序功能）
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
// 倒计时及验证功能（保留前序功能）
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
    const hue = Math.floor(ratio * 120);
    return `hsl(${hue}, 70%, 50%)`;
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
function generateCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}
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
// 核心更新1：脚本文本清理函数（用于消除格式/注释差异，确保比较准确性）
function cleanScriptText(text) {
  if (!text) return '';
  // 1. 移除多行注释 /* ... */（含跨行）
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // 2. 移除单行注释 // ...（到行尾）
  text = text.replace(/\/\/.*$/gm, '');
  // 3. 移除所有空白字符（空格、换行、制表符等）
  text = text.replace(/\s+/g, '');
  return text;
}
// 核心更新2：显示校验警告（错误/成功提示）
function showScriptWarn(message, isError = true) {
  // 避免重复创建警告
  if (document.querySelector('.script-warn')) return;
  const warnEl = document.createElement('div');
  warnEl.className = `script-warn ${isError ? 'error' : 'success'}`;
  warnEl.innerHTML = `
    ${message}
    <button>关闭</button>
  `;
  document.body.appendChild(warnEl);
  // 关闭按钮事件
  warnEl.querySelector('button').addEventListener('click', () => {
    warnEl.remove();
  });
  // 错误警告30秒后自动隐藏（避免长期遮挡）
  if (isError) {
    setTimeout(() => {
      if (document.body.contains(warnEl)) warnEl.remove();
    }, 30000);
  }
}
// 核心更新3：脚本在线校验逻辑（对比本地与在线版本，新增校验成功文本）
function checkScriptConsistency() {
  // 1. 获取本地脚本内容
  const localScript = document.currentScript?.textContent || '';
  if (!localScript) {
    showScriptWarn('脚本校验失败：无法读取本地脚本内容');
    return;
  }
  const cleanedLocal = cleanScriptText(localScript);
  // 2. 构建超时Promise（避免无限等待）
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('获取在线内容超时')), CHECK_TIMEOUT);
  });
  // 3. 获取并解析在线校验内容（提取表格中的脚本代码）
  const fetchPromise = fetch(SCRIPT_CHECK_URL, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store'
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
    return response.text();
  })
  .then(onlineHtml => {
    // 解析HTML，提取表格中第二列（脚本内容，第一列为行号）
    const parser = new DOMParser();
    const doc = parser.parseFromString(onlineHtml, 'text/html');
    const rows = doc.querySelectorAll('table tr');
    if (rows.length === 0) throw new Error('未找到在线脚本表格');
    let onlineScript = '';
    rows.forEach(row => {
      const contentTd = row.querySelector('td:nth-child(2)');
      if (contentTd) onlineScript += contentTd.textContent.trim() + '\n';
    });
    if (!onlineScript) throw new Error('无法提取在线脚本内容');
    const cleanedOnline = cleanScriptText(onlineScript);
    // 4. 对比清理后的内容（核心更新：新增校验成功文本显示）
    if (cleanedLocal !== cleanedOnline) {
      showScriptWarn(`⚠️ 警告：当前脚本与在线校验版本不一致！\n校验地址：${SCRIPT_CHECK_URL}\n可能存在安全风险，请重新获取官方脚本。`);
    } else {
      // 核心更新：校验成功时显示文本，明确提示校验通过
      showScriptWarn(`✅ 脚本校验成功：与在线校验地址（${SCRIPT_CHECK_URL}）版本一致，可安全使用`, false);
    }
  });
  // 5. 处理超时/网络错误
  Promise.race([fetchPromise, timeoutPromise])
  .catch(error => {
    showScriptWarn(`脚本校验失败：${error.message}\n请检查网络或校验地址（${SCRIPT_CHECK_URL}）有效性`);
  });
}
// 初始化所有功能（保留前序功能，执行脚本校验）
(function() {
  'use strict';
  new NetworkMonitor(); // 网络监测
  initTimer(); // 倒计时同步
  checkScriptConsistency(); // 脚本在线校验
})();