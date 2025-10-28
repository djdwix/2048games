// ==UserScript==
// @name         页面安全验证计时器（增强版V4.86）
// @namespace    http://tampermonkey.net/
// @version      4.86
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时【支持后台运行+定位缓存+缓存超时销毁】
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerBackgroundScript
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/3.user.js
// ==/UserScript==

GM_addStyle(`
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
    cursor: pointer;
  }
  .safe-timer:hover {
    box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
  }
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
  .progress-error {
    display: none;
    color: #f72585;
    text-align: center;
    font-size: 13px;
    margin-top: 15px;
    font-weight: 600;
    text-shadow: 0 0 3px rgba(247, 37, 133, 0.4);
  }
`);

const STORAGE_KEY = 'safeTimerEndTime';
const LOG_STORAGE_KEY = 'safeTimerLogs';
const LOG_MAX_LENGTH = 3000;
const TOTAL_TIME = 12 * 60;
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 3000;
const LOCAL_DELAY_INTERVAL = 5000;
const DELAY_TEST_TIMEOUT = 5000;
const BACKGROUND_CHECK_INTERVAL = 3000;
const DESTROY_AFTER_END = 8 * 60;
const IP_API_LIST = [
  { url: 'https://api.ipify.org?format=text', parser: (text) => text.trim() },
  { url: 'https://ipinfo.io/ip', parser: (text) => text.trim() },
  { url: 'https://icanhazip.com', parser: (text) => text.trim() },
  { url: 'https://httpbin.org/ip', parser: (json) => json.origin.split(',')[0].trim() },
  { url: 'https://api.myip.com', parser: (json) => json.ip }
];
const GEO_API_CONFIG = {
  reverseGeocodeList: [
    (lat, lon) => `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`,
    (lat, lon) => `https://geocode.xyz/${lat},${lon}?geoit=json&auth=free`,
    (lat, lon) => `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`
  ],
  ipLocationList: [
    (ip) => `https://ipinfo.io/${ip}/json`,
    (ip) => `https://ip-api.com/json/${ip}?fields=regionName,city`,
    (ip) => `https://freegeoip.app/json/${ip}`,
    (ip) => `https://bigdatacloud.net/data/ip-geolocation-full?ip=${ip}&localityLanguage=zh`
  ]
};

function log(content, isBackground = false) {
  const timeStr = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-');
  const logPrefix = isBackground ? '[安全计时器-后台]' : '[安全计时器]';
  const logItem = { 
    time: timeStr, 
    content: content, 
    source: isBackground ? '后台' : '前台',
    domain: window.location.hostname
  };

  let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
  logs.push(logItem);

  if (logs.length > LOG_MAX_LENGTH) {
    logs = logs.slice(logs.length - LOG_MAX_LENGTH);
  }

  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  console.log(`${logPrefix}[${timeStr}] ${content}`);
}

class BackgroundRunner {
  constructor() {
    this.backgroundTimer = null;
    this.isForeground = document.visibilityState === 'visible';
    this.destroyTimer = null;
    this.initBackgroundSync();
    this.bindVisibilityEvents();
    log('后台运行模块初始化完成', true);
  }

  initBackgroundSync() {
    this.backgroundTimer = setInterval(() => {
      const storedEndTime = localStorage.getItem(STORAGE_KEY);
      if (!storedEndTime) return;

      const endTime = parseInt(storedEndTime);
      const now = Date.now();
      const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

      const destroyTime = endTime + (DESTROY_AFTER_END * 1000);
      if (now >= destroyTime) {
        this.destroyStorage();
        return;
      }

      if (remainingTime <= 0) {
        this.destroyStorage();
        return;
      }

      if (remainingTime % 30 === 0) {
        log(`后台倒计时同步：剩余${remainingTime}秒`, true);
      }
    }, BACKGROUND_CHECK_INTERVAL);
  }

  destroyStorage() {
    clearInterval(this.backgroundTimer);
    localStorage.removeItem(STORAGE_KEY);
    log(`后台检测到缓存超时，自动销毁缓存`, true);

    if (this.isForeground) {
      showInitialVerify();
    }
  }

  bindVisibilityEvents() {
    document.addEventListener('visibilitychange', () => {
      this.isForeground = document.visibilityState === 'visible';
      if (this.isForeground) {
        log('页面切换至前台，同步最新缓存倒计时状态', false);
        initTimer();
      } else {
        log('页面切换至后台，后台缓存计时器继续运行', true);
      }
    });
  }

  destroy() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      log('后台定时器已销毁', true);
    }
    if (this.destroyTimer) {
      clearTimeout(this.destroyTimer);
      log('自动销毁定时器已销毁', true);
    }
  }
}

class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.localDelay = '检测中...';
    this.userIP = '查找中...';
    this.locationInfo = '获取中...';
    this.currentArea = '获取中...';
    this.statusEl = null;
    this.modalEl = null;
    this.delayTimer = null;
    this.GEO_STORAGE_KEY = `geo_${window.location.hostname}`;
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect();
    this.fetchUserIPWithAI();
    this.fetchLocation();
    log('网络监测模块初始化完成', false);
  }

  initElements() {
    if (document.querySelector('.net-status')) {
      this.statusEl = document.querySelector('.net-status');
    } else {
      this.statusEl = document.createElement('div');
      this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
      this.statusEl.textContent = this.isOnline ? '在线' : '离线';
      document.body.appendChild(this.statusEl);
    }

    if (document.querySelector('.net-modal')) {
      this.modalEl = document.querySelector('.net-modal');
    } else {
      this.modalEl = document.createElement('div');
      this.modalEl.className = 'net-modal';
      this.modalEl.innerHTML = `
        <div class="net-modal-box">
          <div class="net-modal-header">
            <h3 class="net-modal-title"><span>${this.isOnline ? '🌐' : '❌'}</span>网络状态</h3>
            <button class="net-modal-close">×</button>
          </div>
          <ul class="net-info-list">
            <li class="net-info-item">
              <span class="net-info-label">连接状态</span>
              <span class="net-info-value" id="net-status-value">${this.isOnline ? '在线' : '离线'}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">本地-网页延迟</span>
              <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">当前IP</span>
              <span class="net-info-value dynamic" id="user-ip-value">${this.userIP}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">当前定位</span>
              <span class="net-info-value dynamic" id="location-info-value">${this.locationInfo}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">当前位置</span>
              <span class="net-info-value dynamic" id="current-area-value">${this.currentArea}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">网络类型</span>
              <span class="net-info-value" id="net-type-value">${this.getNetworkType()}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">浏览器</span>
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
    }

    this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
      this.modalEl.classList.remove('active');
    });
  }

  bindEvents() {
    this.statusEl.addEventListener('click', () => this.modalEl.classList.toggle('active'));
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));

    if (navigator.connection) {
      const handleConnectionChange = () => {
        const type = this.getNetworkType();
        this.modalEl.querySelector('#net-type-value').textContent = type;
        log(`网络类型变化：${type}`);
      };
      navigator.connection.removeEventListener('change', handleConnectionChange);
      navigator.connection.addEventListener('change', handleConnectionChange);
    }
  }

  updateStatus(online) {
    this.isOnline = online;
    const statusText = online ? '在线' : '离线';
    this.statusEl.className = `net-status ${online ? 'online' : 'offline'}`;
    this.statusEl.textContent = statusText;
    this.modalEl.querySelector('#net-status-value').textContent = statusText;
    this.modalEl.querySelector('.net-modal-title span').textContent = online ? '🌐' : '❌';
    log(`网络状态变化：${statusText}`);

    if (online) {
      this.startLocalDelayDetect();
      this.resetNetworkInfo();
      this.fetchUserIPWithAI();
      this.fetchLocation();
      initTimer();
    } else {
      this.stopLocalDelayDetect();
      this.setOfflineInfo();
    }
  }

  calculateLocalDelay() {
    if (!window.location.origin) {
      this.localDelay = '无效域名';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}`);
      return;
    }

    const testUrl = `${window.location.origin}/?delayTest=${Date.now()}`;
    const startTime = performance.now();
    let timeoutTimer;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('TimeoutError')), DELAY_TEST_TIMEOUT);
    });

    Promise.race([
      fetch(testUrl, { method: 'GET', mode: 'cors', cache: 'no-store' }),
      timeoutPromise
    ])
    .then(() => {
      clearTimeout(timeoutTimer);
      const delay = Math.round(performance.now() - startTime);
      this.localDelay = `${delay}ms`;
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}`);
    })
    .catch(error => {
      clearTimeout(timeoutTimer);
      this.localDelay = error.message === 'TimeoutError' ? '超时' : `检测失败`;
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}`);
    });
  }

  startLocalDelayDetect() {
    if (!this.isOnline) return;
    this.stopLocalDelayDetect();
    this.calculateLocalDelay();
    this.delayTimer = setInterval(() => this.calculateLocalDelay(), LOCAL_DELAY_INTERVAL);
  }

  stopLocalDelayDetect() {
    if (this.delayTimer) {
      clearInterval(this.delayTimer);
      this.delayTimer = null;
    }
  }

  fetchUserIPWithAI() {
    if (!this.isOnline) return;

    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= IP_API_LIST.length) {
        this.userIP = '查找失败';
        this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
        log(`IP获取失败`);
        return;
      }

      const { url, parser } = IP_API_LIST[apiIndex];
      fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 5000 })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.headers.get('content-type')?.includes('json') ? response.json() : response.text();
        })
        .then(data => {
          const ip = parser(data);
          const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
          const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

          if (ip && (ipv4Regex.test(ip) || ipv6Regex.test(ip))) {
            this.userIP = ip;
            this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
            log(`IP获取成功：${ip}`);
          } else throw new Error('IP格式无效');
        })
        .catch(() => tryNextApi(apiIndex + 1));
    };

    tryNextApi();
  }

  fetchReverseGeocode(lat, lon) {
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.reverseGeocodeList.length) {
        this.currentArea = '定位无效';
        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
        log(`逆地理编码失败`);
        return;
      }

      const apiUrl = GEO_API_CONFIG.reverseGeocodeList[apiIndex](lat, lon);
      fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 5000 })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          let area = '';
          if (data.address) {
            area = data.address.county || data.address.city || data.address.state || data.address.country;
          } else if (data.region) {
            area = data.region;
          } else if (data.localityInfo && data.localityInfo.administrative) {
            area = data.localityInfo.administrative[2]?.name || data.localityInfo.administrative[1]?.name || data.localityInfo.administrative[0]?.name;
          }

          if (area) {
            this.currentArea = area;
            this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
            log(`逆地理编码成功：${area}`);
          } else throw new Error('无法解析位置信息');
        })
        .catch(() => tryNextApi(apiIndex + 1));
    };

    tryNextApi();
  }

  fetchIPBasedLocation(ip) {
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.ipLocationList.length) {
        this.currentArea = '定位无效';
        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
        log(`IP定位失败`);
        return;
      }

      const apiUrl = GEO_API_CONFIG.ipLocationList[apiIndex](ip);
      fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 5000 })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          let area = '';
          if (data.city) {
            area = data.city;
          } else if (data.regionName) {
            area = data.regionName;
          }

          if (area) {
            this.currentArea = area;
            this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
            log(`IP定位成功：${area}`);
          } else throw new Error('无法解析位置信息');
        })
        .catch(() => tryNextApi(apiIndex + 1));
    };

    tryNextApi();
  }

  fetchLocation() {
    if (!this.isOnline) return;

    const cachedGeo = localStorage.getItem(this.GEO_STORAGE_KEY);
    if (cachedGeo) {
      try {
        const { lat, lon, area, timestamp } = JSON.parse(cachedGeo);
        const now = Date.now();
        const isExpired = (now - timestamp) > (24 * 60 * 60 * 1000);

        if (!isExpired) {
          this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          this.currentArea = area;
          this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
          this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
          log(`定位信息从缓存读取`);
          return;
        } else {
          localStorage.removeItem(this.GEO_STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(this.GEO_STORAGE_KEY);
      }
    }

    if (!navigator.geolocation) {
      this.locationInfo = '浏览器不支持定位';
      this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
      log(`定位失败`);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        this.locationInfo = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        log(`定位成功`);

        this.fetchReverseGeocode(lat, lon);

        setTimeout(() => {
          if (this.currentArea && this.currentArea !== '获取中...' && !this.currentArea.startsWith('定位无效')) {
            const geoData = {
              lat: lat,
              lon: lon,
              area: this.currentArea,
              timestamp: Date.now()
            };
            localStorage.setItem(this.GEO_STORAGE_KEY, JSON.stringify(geoData));
            log(`定位信息已缓存`);
          }
        }, 1000);
      },
      error => {
        this.locationInfo = `定位失败`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        log(`定位失败`);
        if (this.userIP && this.userIP !== '查找中...' && this.userIP !== '查找失败') {
          this.fetchIPBasedLocation(this.userIP);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  resetNetworkInfo() {
    this.localDelay = '检测中...';
    this.userIP = '查找中...';
    this.locationInfo = '获取中...';
    this.currentArea = '获取中...';
    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
    this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
    this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
  }

  setOfflineInfo() {
    this.localDelay = '离线';
    this.userIP = '离线';
    this.locationInfo = '离线';
    this.currentArea = '离线';
    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
    this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
    this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
  }

  getNetworkType() {
    if (navigator.connection && navigator.connection.effectiveType) {
      return navigator.connection.effectiveType;
    }
    return '未知';
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return '未知';
  }

  getScreenSize() {
    return `${screen.width} × ${screen.height}`;
  }

  destroy() {
    this.stopLocalDelayDetect();
    if (this.statusEl && this.statusEl.parentNode) {
      this.statusEl.parentNode.removeChild(this.statusEl);
    }
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
  }
}

function generateVerificationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function showCopySuccess() {
  const tip = document.createElement('div');
  tip.className = 'copy-success';
  tip.textContent = '验证码已复制到剪贴板';
  document.body.appendChild(tip);
  setTimeout(() => {
    if (tip.parentNode) tip.parentNode.removeChild(tip);
  }, 1500);
}

function showInitialVerify() {
  const code = generateVerificationCode();
  const modal = document.createElement('div');
  modal.className = 'verify-modal active';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-icon">🔒</div>
        <h2 class="modal-title">安全验证</h2>
      </div>
      <p class="modal-desc">请复制下方验证码并输入以继续访问</p>
      <div class="verify-code" id="verify-code">${code}</div>
      <p class="copy-tip">点击验证码复制</p>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" id="verify-input" placeholder="请输入验证码" maxlength="6">
        <div class="verify-error" id="verify-error">验证码错误，请重新输入</div>
      </div>
      <div class="modal-btns">
        <button class="modal-btn confirm-btn" id="confirm-verify">确认</button>
        <button class="modal-btn cancel-btn" id="cancel-verify">取消</button>
      </div>
      <div class="update-link-wrap">
        <a class="update-link" id="update-link" target="_blank">遇到问题？点击更新脚本</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const codeEl = modal.querySelector('#verify-code');
  const inputEl = modal.querySelector('#verify-input');
  const errorEl = modal.querySelector('#verify-error');
  const confirmBtn = modal.querySelector('#confirm-verify');
  const cancelBtn = modal.querySelector('#cancel-verify');
  const updateLink = modal.querySelector('#update-link');

  updateLink.href = UPDATE_URL;

  codeEl.addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => {
      showCopySuccess();
    }).catch(() => {
      codeEl.classList.add('uncopyable');
      codeEl.textContent = '复制失败，请手动输入';
      setTimeout(() => {
        codeEl.classList.remove('uncopyable');
        codeEl.textContent = code;
      }, 2000);
    });
  });

  confirmBtn.addEventListener('click', () => {
    const inputCode = inputEl.value.trim();
    if (inputCode === code) {
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 400);
      startTimer();
      log('验证成功，开始计时');
    } else {
      errorEl.style.display = 'block';
      inputEl.value = '';
      log('验证失败：验证码错误');
    }
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      showInitialVerify();
    }, 400);
    log('验证取消，重新显示验证界面');
  });

  inputEl.addEventListener('input', () => {
    errorEl.style.display = 'none';
  });

  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });

  inputEl.focus();
}

function showProgressVerify() {
  const modal = document.createElement('div');
  modal.className = 'progress-verify-modal active';
  modal.innerHTML = `
    <div class="progress-modal-box">
      <h2 class="progress-title">安全验证</h2>
      <p class="progress-desc">请等待进度条完成以继续访问</p>
      <div class="progress-status" id="progress-status">0%</div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progress-bar"></div>
      </div>
      <div class="progress-error" id="progress-error">验证失败，请重试</div>
      <div class="update-link-wrap">
        <a class="update-link" id="update-link" target="_blank">遇到问题？点击更新脚本</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const progressBar = modal.querySelector('#progress-bar');
  const progressStatus = modal.querySelector('#progress-status');
  const errorEl = modal.querySelector('#progress-error');
  const updateLink = modal.querySelector('#update-link');

  updateLink.href = UPDATE_URL;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 400);
      startTimer();
      log('进度条验证成功，开始计时');
    }
    progressBar.style.width = `${progress}%`;
    progressStatus.textContent = `${Math.round(progress)}%`;
  }, 100);

  if (Math.random() < 0.1) {
    clearInterval(interval);
    errorEl.style.display = 'block';
    log('进度条验证失败');
  }
}

function startTimer() {
  const endTime = Date.now() + TOTAL_TIME * 1000;
  localStorage.setItem(STORAGE_KEY, endTime.toString());
  log(`计时开始`);
  initTimer();
}

function initTimer() {
  const storedEndTime = localStorage.getItem(STORAGE_KEY);
  if (!storedEndTime) {
    showInitialVerify();
    return;
  }

  const endTime = parseInt(storedEndTime);
  const now = Date.now();
  const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

  if (remainingTime <= 0) {
    localStorage.removeItem(STORAGE_KEY);
    showInitialVerify();
    return;
  }

  updateTimerDisplay(remainingTime);
  log(`初始化倒计时，剩余时间：${remainingTime}秒`);
}

function updateTimerDisplay(remainingSeconds) {
  let timerEl = document.querySelector('.safe-timer');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.className = 'safe-timer';
    document.body.appendChild(timerEl);

    timerEl.addEventListener('click', () => {
      const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      const logText = logs.map(log => `[${log.time}] ${log.content}`).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `安全计时器日志_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      log('日志已导出');
    });
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (remainingSeconds <= 60) {
    timerEl.style.color = '#f72585';
    timerEl.style.animation = 'pulse 1s infinite';
  } else {
    timerEl.style.color = '#e0f2fe';
    timerEl.style.animation = 'none';
  }

  if (remainingSeconds > 0) {
    setTimeout(() => {
      const newRemaining = Math.max(0, remainingSeconds - 1);
      updateTimerDisplay(newRemaining);
    }, 1000);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    showInitialVerify();
  }
}

function init() {
  log('安全计时器脚本开始初始化');

  window.backgroundRunner = new BackgroundRunner();
  window.networkMonitor = new NetworkMonitor();
  initTimer();

  log('安全计时器脚本初始化完成');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}