// ==UserScript==
// @name         页面安全验证计时器（增强版V4.8）
// @namespace    http://tampermonkey.net/
// @version      4.81
// @description  本地与网页延迟检测+日志功能+点击导出日志+多接口IP/定位+验证重启倒计时
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @downloadURL  https://github.com/djdwix/2048games/blob/main/3.user.js
// @updateURL    https://github.com/djdwix/2048games/blob/main/3.user.js
// ==/UserScript==

GM_addStyle(`
  /* 倒计时样式（保留科幻风格，增加点击提示） */
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
    cursor: pointer; /* 提示可点击 */
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
`);

// 常量定义（新增日志相关配置）
const STORAGE_KEY = 'safeTimerEndTime';
const LOG_STORAGE_KEY = 'safeTimerLogs'; // 日志存储键
const LOG_MAX_LENGTH = 100; // 日志最大条数（防存储溢出）
const TOTAL_TIME = 15 * 60; // 倒计时总时长（15分钟）
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2; // 加强验证次数
const FAST_VERIFY_THRESHOLD = 10000; // 快速验证阈值（10s）
const LOCAL_DELAY_INTERVAL = 5000; // 延迟检测间隔（5s，避免频繁请求）
const DELAY_TEST_TIMEOUT = 5000; // 延迟检测超时时间（5s）

// IP与定位接口配置（保留原多接口容错）
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

// 1. 日志核心功能（新增）
function log(content) {
  const timeStr = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(/\//g, '-'); // 格式：YYYY-MM-DD HH:MM:SS
  const logItem = { time: timeStr, content: content };
  
  // 读取现有日志并限制长度
  let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
  logs.push(logItem);
  if (logs.length > LOG_MAX_LENGTH) logs = logs.slice(logs.length - LOG_MAX_LENGTH);
  
  // 保存日志
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  console.log(`[安全计时器][${timeStr}] ${content}`); // 同时输出到控制台
}

// 网络状态管理（更新：延迟检测改为“本地-网页”延迟，新增日志记录）
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
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect();
    this.fetchUserIPWithAI(); 
    this.fetchLocation(); 
    log('网络监测模块初始化完成，初始状态：' + (this.isOnline ? '在线' : '离线'));
  }

  initElements() {
    // 网络状态按钮
    this.statusEl = document.createElement('div');
    this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
    this.statusEl.textContent = this.isOnline ? '在线' : '离线';
    document.body.appendChild(this.statusEl);

    // 网络状态弹窗
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
            <span class="net-info-label">本地-网页延迟</span> <!-- 更新延迟显示文案 -->
            <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">当前IP</span>
            <span class="net-info-value dynamic" id="user-ip-value">${this.userIP}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">当前定位（经纬度）</span>
            <span class="net-info-value dynamic" id="location-info-value">${this.locationInfo}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">当前位置（县区级）</span>
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
    this.modalEl.querySelector('.net-modal-close').addEventListener('click', () => {
      this.modalEl.classList.remove('active');
    });
  }

  bindEvents() {
    this.statusEl.addEventListener('click', () => this.modalEl.classList.toggle('active'));
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        const type = this.getNetworkType();
        this.modalEl.querySelector('#net-type-value').textContent = type;
        log(`网络类型变化：${type}`);
      });
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
      initTimer(); // 修复：网络恢复时同步倒计时
    } else {
      this.stopLocalDelayDetect();
      this.setOfflineInfo();
    }
  }

  // 2. 核心更新：本地-网页延迟检测（替换原localStorage检测）
  calculateLocalDelay() {
    if (!window.location.origin) {
      this.localDelay = '无效域名';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}`);
      return;
    }

    // 构造测试请求（加随机参数防缓存）
    const testUrl = `${window.location.origin}/?delayTest=${Date.now()}`;
    const startTime = performance.now();
    let timeoutTimer;

    // 超时处理
    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('TimeoutError')), DELAY_TEST_TIMEOUT);
    });

    // 发送请求检测延迟
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
      this.localDelay = error.message === 'TimeoutError' ? '超时(>5s)' : '检测失败';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}（原因：${error.message}）`);
    });
  }

  startLocalDelayDetect() {
    if (!this.isOnline) return;
    this.stopLocalDelayDetect(); // 避免重复定时器
    this.calculateLocalDelay(); // 立即检测一次
    this.delayTimer = setInterval(() => this.calculateLocalDelay(), LOCAL_DELAY_INTERVAL);
  }

  stopLocalDelayDetect() {
    if (this.delayTimer) {
      clearInterval(this.delayTimer);
      this.delayTimer = null;
    }
  }

  // IP获取（保留多接口容错，新增日志）
  fetchUserIPWithAI() {
    if (!this.isOnline) return;
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= IP_API_LIST.length) {
        this.userIP = '查找失败';
        this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
        log(`IP获取失败：所有接口尝试完毕`);
        if (this.locationInfo.startsWith('获取失败')) {
          this.currentArea = '定位无效（IP未获取）';
          this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
        }
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
          if (ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
            this.userIP = ip;
            this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
            log(`IP获取成功：${ip}`);
            if (this.locationInfo.startsWith('获取失败')) this.fetchIPBasedLocation(ip);
          } else throw new Error('IP格式无效');
        })
        .catch(() => tryNextApi(apiIndex + 1));
    };
    tryNextApi();
  }

  // 定位相关（保留多接口，新增日志）
  fetchReverseGeocode(lat, lon) {
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.reverseGeocodeList.length) {
        log(`逆地理编码失败：所有接口尝试完毕，触发IP定位兜底`);
        this.fetchIPBasedLocation(this.userIP);
        return;
      }

      const apiUrl = GEO_API_CONFIG.reverseGeocodeList[apiIndex](lat, lon);
      fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 8000 })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          let area = data.address?.county || data.address?.district || data.region || 
                    data.localityInfo?.administrative[2]?.name || '';
          if (area) {
            this.currentArea = `定位获取：${area}`;
            this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
            log(`逆地理编码成功：${this.currentArea}`);
          } else throw new Error('未解析到县区级位置');
        })
        .catch(error => {
          log(`逆地理编码接口${apiIndex + 1}失败：${error.message}`);
          tryNextApi(apiIndex + 1);
        });
    };
    tryNextApi();
  }

  fetchIPBasedLocation(ip) {
    if (!ip || ip.startsWith('查找失败')) {
      this.currentArea = '定位无效（IP未获取）';
      this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
      log(`IP定位失败：${this.currentArea}`);
      return;
    }

    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.ipLocationList.length) {
        this.currentArea = '定位无效（所有IP接口失败）';
        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
        log(`IP定位失败：${this.currentArea}`);
        return;
      }

      const apiUrl = GEO_API_CONFIG.ipLocationList[apiIndex](ip);
      fetch(apiUrl, { method: 'GET', mode: 'cors', cache: 'no-store', timeout: 6000 })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          let area = `${data.region || data.regionName || data.region_name || ''} ${data.city || ''}`.trim() || 
                    data.localityInfo?.administrative[2]?.name || '暂无法解析';
          this.currentArea = `IP定位：${area}`;
          this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
          log(`IP定位成功：${this.currentArea}`);
        })
        .catch(error => {
          log(`IP定位接口${apiIndex + 1}失败：${error.message}`);
          tryNextApi(apiIndex + 1);
        });
    };
    tryNextApi();
  }

  fetchLocation() {
    if (!this.isOnline) return;
    if (!navigator.geolocation) {
      this.locationInfo = '浏览器不支持定位';
      this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
      this.fetchIPBasedLocation(this.userIP);
      log(`定位初始化：${this.locationInfo}`);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => { 
        const { latitude, longitude } = position.coords;
        this.locationInfo = `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        this.fetchReverseGeocode(latitude, longitude);
        log(`定位成功：${this.locationInfo}`);
      },
      (error) => { 
        const errorMsgMap = { 1: '用户拒绝权限', 2: '位置不可用', 3: '请求超时', 0: '未知错误' };
        this.locationInfo = `获取失败（${errorMsgMap[error.code] || errorMsgMap[0]}`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        this.fetchIPBasedLocation(this.userIP);
        log(`定位失败：${this.locationInfo}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // 辅助函数（保留原逻辑）
  getNetworkType() {
    if (!navigator.connection) return '未知';
    const types = { 'bluetooth': '蓝牙', 'cellular': '蜂窝网络', 'ethernet': '以太网', 'none': '无', 'wifi': 'WiFi', 'wimax': 'WiMAX', 'other': '其他', 'unknown': '未知' };
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
    return `${screen.width}×${screen.height}px`;
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
    this.localDelay = '离线（无法检测）';
    this.userIP = '离线（无法获取）';
    this.locationInfo = '离线（无法获取）';
    this.currentArea = '离线（无法获取）';
    this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
    this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
    this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
    this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
  }
}

// 3. 倒计时初始化（新增：点击导出日志功能，修复重复创建bug）
function initTimer() {
  // 先清理旧元素（修复重复创建bug）
  const oldTimerEl = document.querySelector('.safe-timer');
  if (oldTimerEl) oldTimerEl.remove();

  const timerEl = document.createElement('div');
  timerEl.className = 'safe-timer';
  document.body.appendChild(timerEl);

  // 初始化结束时间
  let endTime;
  const storedEndTime = localStorage.getItem(STORAGE_KEY);
  if (storedEndTime) {
    endTime = parseInt(storedEndTime);
    if (endTime <= Date.now()) {
      endTime = Date.now() + TOTAL_TIME * 1000;
      localStorage.setItem(STORAGE_KEY, endTime);
      log(`倒计时重置：存储的结束时间已过期，重新设置为${new Date(endTime).toLocaleString()}`);
    } else {
      log(`倒计时初始化：从存储中读取结束时间：${new Date(endTime).toLocaleString()}`);
    }
  } else {
    endTime = Date.now() + TOTAL_TIME * 1000;
    localStorage.setItem(STORAGE_KEY, endTime);
    log(`倒计时初始化：首次启动，设置结束时间：${new Date(endTime).toLocaleString()}`);
  }

  // 时间格式化
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }

  // 动态颜色
  function getTimeColor(remainingTime) {
    const ratio = Math.max(0, Math.min(1, remainingTime / TOTAL_TIME));
    const hue = Math.floor(ratio * 180) + 180; // 红→青渐变
    return `hsl(${hue}, 70%, 60%)`;
  }

  // 更新倒计时
  function updateTimer() {
    const now = Date.now();
    const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));
    
    if (remainingTime <= 0) {
      clearInterval(timer);
      timerEl.remove();
      localStorage.removeItem(STORAGE_KEY);
      log(`倒计时结束：触发初始安全验证`);
      showInitialVerify();
      return;
    }

    timerEl.textContent = `倒计时: ${formatTime(remainingTime)}（点击导出日志）`;
    timerEl.style.color = getTimeColor(remainingTime);
  }

  // 4. 核心功能：点击倒计时器导出日志（新增）
  timerEl.addEventListener('click', () => {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    if (logs.length === 0) {
      alert('暂无日志可导出');
      log('日志导出操作：用户点击导出，但无日志数据');
      return;
    }

    // 格式化日志文本
    let logText = `页面安全验证计时器日志（版本V4.8）\n`;
    logText += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    logText += `===============================\n\n`;
    logs.forEach((item, index) => {
      logText += `${index + 1}. [${item.time}] ${item.content}\n`;
    });

    // 创建下载链接
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `safe-timer-log-${new Date().toLocaleString('zh-CN').replace(/[\s\/:]/g, '-')}.txt`;
    a.download = fileName;
    a.href = url;
    document.body.appendChild(a);
    a.click();

    // 清理临时元素
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log(`日志导出成功：文件名=${fileName}，共${logs.length}条记录`);
  });

  // 多标签页同步（修复：同步时记录日志）
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue) {
        endTime = parseInt(e.newValue);
        log(`多标签页同步：倒计时结束时间更新为${new Date(endTime).toLocaleString()}`);
        if (endTime <= Date.now()) {
          clearInterval(timer);
          timerEl.remove();
          localStorage.removeItem(STORAGE_KEY);
          log(`多标签页同步：倒计时已过期，触发初始验证`);
          showInitialVerify();
        }
      } else {
        clearInterval(timer);
        timerEl.remove();
        log(`多标签页同步：倒计时已清除，触发初始验证`);
        showInitialVerify();
      }
      updateTimer();
    }
  });

  updateTimer();
  const timer = setInterval(updateTimer, 1000);
}

// 验证码生成（保留原逻辑）
function generateCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

// 加强验证（新增日志记录）
function showStrengthenVerify(remainingTimes) {
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
  log(`加强验证启动：第${STRENGTHEN_COUNT - remainingTimes + 1}轮，验证码已生成`);

  const verifyInput = modal.querySelector('.verify-input');
  const verifyError = modal.querySelector('.verify-error');
  const verifyCodeEl = modal.querySelector('.verify-code');

  // 确认验证
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (!inputCode) {
      verifyError.textContent = '请输入6位验证码';
      verifyError.style.display = 'block';
      log(`加强验证失败（第${STRENGTHEN_COUNT - remainingTimes + 1}轮）：用户未输入验证码`);
      verifyInput.focus();
      return;
    }
    if (inputCode !== code) {
      verifyError.textContent = '验证码错误，已自动刷新，请重新输入';
      verifyError.style.display = 'block';
      code = generateCode();
      verifyCodeEl.textContent = code;
      verifyInput.value = '';
      verifyInput.focus();
      log(`加强验证失败（第${STRENGTHEN_COUNT - remainingTimes + 1}轮）：验证码错误，已刷新`);
      return;
    }

    // 验证成功
    modal.classList.remove('active');
    log(`加强验证成功（第${STRENGTHEN_COUNT - remainingTimes + 1}轮）：验证码匹配`);
    setTimeout(() => {
      modal.remove();
      remainingTimes--;
      if (remainingTimes > 0) {
        showStrengthenVerify(remainingTimes);
      } else {
        // 修复：加强验证完成后重启倒计时
        localStorage.setItem(STORAGE_KEY, Date.now() + TOTAL_TIME * 1000);
        initTimer();
        log(`所有加强验证完成：倒计时已重启`);
      }
    }, 300);
  });

  // 拒绝验证
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    log(`用户拒绝加强验证：尝试关闭页面`);
    setTimeout(() => {
      if (document.body.contains(modal)) {
        alert('请手动关闭页面');
        log(`用户拒绝加强验证：自动关闭失败，提示手动关闭`);
      }
    }, 300);
  });
}

// 初始验证（新增日志记录）
function showInitialVerify() {
  const startTime = Date.now();
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
  log(`初始验证启动：验证码已生成，等待用户输入`);

  const verifyInput = modal.querySelector('.verify-input');
  const verifyError = modal.querySelector('.verify-error');
  const verifyCodeEl = modal.querySelector('.verify-code');

  // 验证码复制
  verifyCodeEl.addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => {
      const tip = document.createElement('div');
      tip.className = 'copy-success';
      tip.textContent = '验证码已复制成功';
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 1500);
      log(`初始验证：用户复制验证码`);
    }).catch(() => {
      alert('复制失败，请手动复制');
      log(`初始验证：验证码复制失败`);
    });
  });

  // 确认验证
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (!inputCode) {
      verifyError.textContent = '请输入6位验证码';
      verifyError.style.display = 'block';
      log(`初始验证失败：用户未输入验证码`);
      verifyInput.focus();
      return;
    }
    if (inputCode !== code) {
      verifyError.textContent = '验证码错误，已自动刷新，请重新输入';
      verifyError.style.display = 'block';
      code = generateCode();
      verifyCodeEl.textContent = code;
      verifyInput.value = '';
      verifyInput.focus();
      log(`初始验证失败：验证码错误，已刷新`);
      return;
    }

    // 验证成功
    const elapsed = Date.now() - startTime;
    modal.classList.remove('active');
    log(`初始验证成功：耗时${elapsed}ms，验证码匹配`);
    setTimeout(() => {
      modal.remove();
      // 修复：验证成功后重启倒计时
      localStorage.setItem(STORAGE_KEY, Date.now() + TOTAL_TIME * 1000);
      initTimer();
      // 快速验证检测
      if (elapsed < FAST_VERIFY_THRESHOLD) { 
        log(`初始验证：耗时${elapsed}ms（<${FAST_VERIFY_THRESHOLD}ms），触发加强验证`);
        showStrengthenVerify(STRENGTHEN_COUNT);
      }
    }, 300);
  });

  // 拒绝验证
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.close();
    log(`用户拒绝初始验证：尝试关闭页面`);
    setTimeout(() => {
      if (document.body.contains(modal)) {
        alert('请手动关闭页面');
        log(`用户拒绝初始验证：自动关闭失败，提示手动关闭`);
      }
    }, 300);
  });
}

// 脚本初始化（新增日志）
(function() {
  'use strict';
  log('页面安全验证计时器（V4.8）初始化启动');
  new NetworkMonitor(); // 网络监测（含本地-网页延迟检测）
  initTimer(); // 倒计时（含点击导出日志）
})();