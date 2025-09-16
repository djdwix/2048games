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
    box-shadow: 极速 0 0 10px rgba(76, 201, 240, 0.4), inset 0 0 8px rgba(76, 201, 240, 0.2);
  }
  .verify-error {
    display: none;
    color: #f72585;
    text-align: center;
    font-size: 13px;
    margin-top: -10px;
    margin-bottom: 15px;
    font-weight: 600;
    text-shadow: 极速 0 0 3px rgba(247, 37, 133, 0.4);
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
 极速 .modal-btn {
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
    box-shadow: 0 极速 12px rgba(67, 97, 238, 0.5);
  }
  .confirm-btn:hover {
    box-shadow: 0 0 18px rgba(67, 97, 238, 极速 0.7);
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
    text-shadow: 0 0 5px rgba(76, 201, 极速 240, 0.7);
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
    max极速 -width: 380px;
    background: linear-gradient(135deg, #1a103d 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.6);
    border-radius: 16极速 px;
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
    margin: 极速 0 0 5px;
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

// 常量定义（新增定位缓存、缓存超时销毁配置）
const STORAGE_KEY = 'safeTimerEndTime';
const LOG_STORAGE_KEY = 'safeTimerLogs';
const LOG_MAX_LENGTH = 3000; // 日志缓存条数更新为3000
const TOTAL_TIME = 12 * 60; // 更新为12分钟
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 3000; // 3秒快速验证阈值
const LOCAL_DELAY_INTERVAL = 5000; // 5秒延迟检测间隔
const DELAY_TEST_TIMEOUT = 5000; // 5秒延迟检测超时
const BACKGROUND_CHECK_INTERVAL = 3000; // 后台倒计时同步间隔（3秒）
const DESTROY_AFTER_END = 15 * 60; // 倒计时结束后15分钟自动销毁（更新）
const IP_API_LIST = [
  { url: 'https://api.ipify.org?format=text', parser: (text) => text.trim() },
  { url: 'https://ipinfo.io/ip', parser: (text) => text.trim() },
  { url: 'https://icanhaz极速 ip.com', parser: (text) => text.trim() },
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

// 1. 日志核心功能（更新版本标识，取消收集限制）
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
    domain: window.location.hostname // 添加当前域名
  };

  let logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
  logs.push(logItem);

  // 取消收集限制，但保留最大条数限制（3000）
  if (logs.length > LOG_MAX_LENGTH) {
    logs = logs.slice(logs.length - LOG_MAX_LENGTH);
  }

  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  console.log(`${logPrefix}[${timeStr}] ${content}`);
}

// 2. 后台运行核心模块（更新：自动销毁时间更改为倒计时结束+15分钟）
class BackgroundRunner {
  constructor() {
    this.backgroundTimer = null; // 后台定时器
    this.isForeground = document.visibilityState === 'visible'; // 标记是否前台
    this.destroyTimer = null; // 自动销毁定时器
    this.initBackgroundSync(); // 初始化后台同步
    this.bindVisibilityEvents(); // 绑定页面可见性事件
    log('后台运行模块初始化完成', true);
  }

  // 初始化后台倒计时同步（支持缓存超时销毁）
  initBackgroundSync() {
    this.backgroundTimer = setInterval(() => {
      const storedEndTime = localStorage.getItem(STORAGE_KEY);
      if (!stored极速 EndTime) return;

      const endTime = parseInt(storedEndTime);
      const now = Date.now();
      const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

      // 检查是否需要自动销毁（倒计时结束+15分钟）
      const destroyTime = endTime + (DESTROY_AFTER_END * 1000);
      if (now >= destroyTime) {
        this.destroyStorage();
        return;
      }

      // 缓存超时：自动销毁存储并触发验证
      if (remainingTime <= 0) {
        this.destroyStorage();
        return;
      }

      // 后台同步日志（每30秒记录一次）
      if (remainingTime % 30 === 0) {
        log(`后台倒计时同步：剩余${remainingTime}秒（缓存时间）`, true);
      }
    }, BACKGROUND_CHECK_INTERVAL);
  }

  // 销毁存储
  destroyStorage() {
    clearInterval(this.backgroundTimer);
    localStorage.removeItem(STORAGE_KEY);
    log(`后台检测到缓存超时，自动销毁缓存，触发验证流程`, true);

    if (this.isForeground) {
      showInitialVerify();
    }
  }

  // 绑定页面可见性变化事件
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

  // 销毁后台定时器
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

// 3. 网络状态管理（保留原逻辑）
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
    // 新增：按网站域名生成定位缓存键（确保单站单次申请）
    this.GEO_STORAGE_KEY = `geo_${window.location.hostname}`;
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect();
    this.fetchUserIPWithAI();
    this.fetchLocation(); // 优先读取缓存
    log('网络监测模块初始化完成，初始状态：' + (this.isOnline ? '在线' : '离线'));
  }

  initElements() {
    // 避免重复创建网络状态元素
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
      this.modal极速 El = document.createElement('div');
      this.modalEl.className = 'net-modal';
      this.modalEl.innerHTML = `
        <div class="net-modal-box">
          <div class="net-modal-header">
            <h3 class="net-modal-title"><span>${this.isOnline ? '🌐' : '❌'}</span>网络状态</h3>
            <button class="net-modal-close">×</button>
          </div>
          <ul class="net-info-list">
            <li class="net-info-item">
              <span class极速 ="net-info-label">连接状态</span>
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
              <span class="net-info-label">当前定位（经纬度）</span>
              <span class="net-info-value dynamic" id="location-info-value">${this.locationInfo}</span>
            </li>
            <li class="net-info-item">
              <span class="net-info-label">当前位置（县区级）</span>
              <span class="net-info-value dynamic" id="current-area-value">${this.currentArea}</span>
            </极速 li>
            <li class="net极速 -info-item">
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

    // 避免重复绑定网络类型变化事件
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
      const backgroundRunner = window.backgroundRunner;
      if (backgroundRunner) backgroundRunner.stopLocalDelayDetect();
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
      this.localDelay = error.message === 'TimeoutError' ? '超时(>5s)' : `检测失败(${error.message.slice(0, 20)}...)`;
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      log(`本地-网页延迟检测：${this.localDelay}（原因：${error.message}）`);
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
        this.userIP = '获取失败';
        this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
        log('IP获取失败：所有API尝试失败');
        return;
      }

      const api = IP_API_LIST[apiIndex];
      fetch(api.url, { cache: 'no-store' })
        .then(response => {
          if (api.url.includes('json') || response.headers.get('content-type').includes('json')) {
            return response.json();
          } else {
            return response.text();
          }
        })
        .then(data => {
          this.userIP = api.parser(data);
          this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
          log(`IP获取成功：${this.userIP}（API：${api.url}）`);
          this.fetchLocationByIP(this.userIP);
        })
        .catch(error => {
          log(`IP获取失败（API ${apiIndex + 1}）：${error.message}`);
          tryNextApi(apiIndex + 1);
        });
    };

    tryNextApi();
  }

  fetchLocationByIP(ip) {
    if (!this.isOnline) return;

    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.ipLocationList.length) {
        log('IP定位失败：所有API尝试失败');
        return;
      }

      const apiUrl = GEO_API_CONFIG.ipLocationList[apiIndex](ip);
      fetch(apiUrl, { cache: 'no-store' })
        .then(response => response.json())
        .then(data => {
          let area = '';
          if (apiUrl.includes('ipinfo.io')) {
            area = `${data.region || data.regionName || ''} ${data.city || ''}`.trim();
          } else if (apiUrl.includes('ip-api.com')) {
            area = `${data.regionName || ''} ${data.city || ''}`.trim();
          } else if (apiUrl.includes('freegeoip.app')) {
            area = `${data.region_name || ''} ${data.city || ''}`.trim();
          } else if (apiUrl.includes('bigdatacloud.net')) {
            area = `${data.location?.region?.name || ''} ${data.location?.city || ''}`.trim();
          }

          if (area) {
            this.currentArea = area;
            this.modalEl.querySelector('#current-area-value').textContent = area;
            log(`IP定位成功：${area}（API：${apiUrl}）`);
          } else {
            log(`IP定位失败：无法解析位置信息（API ${apiIndex + 1}）`);
            tryNextApi(apiIndex + 1);
          }
        })
        .catch(error => {
          log(`IP定位失败（API ${apiIndex + 1}）：${error.message}`);
          tryNextApi(apiIndex + 1);
        });
    };

    tryNextApi();
  }

  // 获取地理位置（新增：缓存机制）
  fetchLocation() {
    if (!this.isOnline) return;

    // 检查是否有缓存的定位信息（按网站域名）
    const cachedGeo = localStorage.getItem(this.GEO_STORAGE_KEY);
    if (cachedGeo) {
      try {
        const geoData = JSON.parse(cachedGeo);
        const now = Date.now();
        // 缓存有效期为1小时
        if (now - geoData.timestamp < 3600000) {
          this.locationInfo = geoData.locationInfo;
          this.currentArea = geoData.currentArea;
          this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
          this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
          log(`使用缓存定位信息：${this.locationInfo}，区域：${this.currentArea}`);
          return;
        }
      } catch (e) {
        log('解析缓存定位信息失败：' + e.message);
      }
    }

    if (!navigator.geolocation) {
      this.locationInfo = '浏览器不支持定位';
      this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
      log('定位失败：浏览器不支持');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        this.locationInfo = `${lat}, ${lon}`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        log(`获取经纬度成功：${this.locationInfo}`);

        // 反向地理编码获取位置信息
        this.reverseGeocode(lat, lon);
      },
      error => {
        this.locationInfo = `定位失败：${error.message}`;
        this.modalEl.querySelector('#location-info-value').textContent = this.locationInfo;
        log(`定位失败：${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  }

  // 反向地理编码（新增：缓存机制）
  reverseGeocode(lat, lon) {
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= GEO_API_CONFIG.reverseGeocodeList.length) {
        this.currentArea = '反向地理编码失败';
        this.modalEl.querySelector('#current-area-value').textContent = this.currentArea;
        log('反向地理编码失败：所有API尝试失败');
        return;
      }

      const apiUrl = GEO_API_CONFIG.reverseGeocodeList[apiIndex](lat, lon);
      fetch(apiUrl, { cache: 'no-store' })
        .then(response => response.json())
        .then(data => {
          let area = '';
          if (apiUrl.includes('nominatim.openstreetmap.org')) {
            area = data.display_name.split(',').slice(0, 3).join(',').trim();
          } else if (apiUrl.includes('geocode.xyz')) {
            area = `${data.region || ''} ${data.city || ''}`.trim();
          } else if (apiUrl.includes('bigdatacloud.net')) {
            area = `${data.localityInfo?.administrative?.[1]?.name || ''} ${data.localityInfo?.administrative?.[2]?.name || ''}`.trim();
          }

          if (area) {
            this.currentArea = area;
            this.modalEl.querySelector('#current-area-value').textContent = area;
            log(`反向地理编码成功：${area}（API：${apiUrl}）`);

            // 缓存定位信息（按网站域名）
            const geoData = {
              locationInfo: this.locationInfo,
              currentArea: this.currentArea,
              timestamp: Date.now()
            };
            localStorage.setItem(this.GEO_STORAGE_KEY, JSON.stringify(geoData));
          } else {
            log(`反向地理编码失败：无法解析位置信息（API ${apiIndex + 1}）`);
            tryNextApi(apiIndex + 1);
          }
        })
        .catch(error => {
          log(`反向地理编码失败（API ${apiIndex + 1}）：${error.message}`);
          tryNextApi(apiIndex + 1);
        });
    };

    tryNextApi();
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
    let browser = '未知';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    return browser;
  }

  getScreenSize() {
    return `${window.screen.width}×${window.screen.height}`;
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

// 4. 验证码生成（修复：确保包含字母和数字）
function generateVerifyCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // 移除易混淆字符
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 5. 验证弹窗核心（保留原逻辑）
function showVerifyModal(verifyCode, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'verify-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-icon">🔒</div>
        <h3 class="modal-title">安全验证</h3>
      </div>
      <p class="modal-desc">请复制下方验证码完成验证，验证成功后倒计时将重新开始</p>
      <div class="verify-code" id="verify-code">${verifyCode}</div>
      <p class="copy-tip">点击上方验证码可复制</p>
      <div class="verify-input-wrap">
        <input type="text" class="verify-input" id="verify-input" placeholder="请粘贴验证码" autocomplete="off">
        <p class="verify-error" id="verify-error">验证码错误，请重新输入</p>
      </div>
      <div class="modal-btns">
        <button class="modal-btn cancel-btn" id="verify-cancel">取消</button>
        <button class="modal-btn confirm-btn" id="verify-confirm">确认</button>
      </div>
      <div class="update-link-wrap">
        <a class="update-link" href="${UPDATE_URL}" target="_blank">检查更新</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const verifyInput = modal.querySelector('#verify-input');
  const verifyError = modal.querySelector('#verify-error');
  const verifyCodeEl = modal.querySelector('#verify-code');

  // 复制验证码功能
  verifyCodeEl.addEventListener('click', () => {
    navigator.clipboard.writeText(verifyCode).then(() => {
      const tip = document.createElement('div');
      tip.className = 'copy-success';
      tip.textContent = '验证码已复制';
      document.body.appendChild(tip);
      setTimeout(() => {
        if (tip.parentNode) tip.parentNode.removeChild(tip);
      }, 1500);
    }).catch(err => {
      console.error('复制失败:', err);
    });
  });

  // 确认按钮事件
  modal.querySelector('#verify-confirm').addEventListener('click', () => {
    if (verifyInput.value.trim() === verifyCode) {
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 400);
      onConfirm();
    } else {
      verifyError.style.display = 'block';
      verifyInput.value = '';
    }
  });

  // 取消按钮事件
  modal.querySelector('#verify-cancel').addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, 400);
    onCancel();
  });

  // 输入框回车事件
  verifyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#verify-confirm').click();
    }
  });

  setTimeout(() => {
    modal.classList.add('active');
    verifyInput.focus();
  }, 100);
}

// 6. 进度条验证弹窗（更新：错误概率从15%改为18%）
function showProgressVerify(onSuccess, onError) {
  const modal = document.createElement('div');
  modal.className = 'progress-verify-modal';
  modal.innerHTML = `
    <div class="progress-modal-box">
      <h3 class="progress-title">安全验证</h3>
      <p class="progress-desc">请等待进度条加载完成，验证过程将自动进行</p>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progress-bar"></div>
      </div>
      <p class="progress-status" id="progress-status">0%</p>
      <p class="progress-error" id="progress-error">验证失败，请重试</p>
      <div class="update-link-wrap">
        <a class="update-link" href="${UPDATE_URL}" target="_blank">检查更新</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const progressBar = modal.querySelector('#progress-bar');
  const progressStatus = modal.querySelector('#progress-status');
  const progressError = modal.querySelector('#progress-error');

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      progressBar.style.width = `${progress}%`;
      progressStatus.textContent = `${progress}%`;

      // 更新：错误概率从15%改为18%
      if (Math.random() < 0.18) { // 18%概率失败
        setTimeout(() => {
          progressError.style.display = 'block';
          setTimeout(() => {
            modal.classList.remove('active');
            setTimeout(() => {
              if (modal.parentNode) modal.parentNode.removeChild(modal);
              onError();
            }, 400);
          }, 1500);
        }, 500);
      } else {
        setTimeout(() => {
          modal.classList.remove('active');
          setTimeout(() => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            onSuccess();
          }, 400);
        }, 500);
      }
    } else {
      progressBar.style.width = `${progress}%`;
      progressStatus.textContent = `${Math.round(progress)}%`;
    }
  }, 100);

  setTimeout(() => {
    modal.classList.add('active');
  }, 100);
}

// 7. 初始验证弹窗（保留原逻辑）
function showInitialVerify() {
  const verifyCode = generateVerifyCode();
  showVerifyModal(
    verifyCode,
    () => {
      log('验证成功，重新开始倒计时');
      startTimer();
    },
    () => {
      log('用户取消验证，显示进度条验证');
      showProgressVerify(
        () => {
          log('进度条验证成功，重新开始倒计时');
          startTimer();
        },
        () => {
          log('进度条验证失败，重新显示初始验证');
          showInitialVerify();
        }
      );
    }
  );
}

// 8. 倒计时核心（更新：自动销毁时间增加15分钟）
function startTimer() {
  const endTime = Date.now() + TOTAL_TIME * 1000;
  localStorage.setItem(STORAGE_KEY, endTime.toString());
  initTimer();
}

function initTimer() {
  const storedEndTime = localStorage.getItem(STORAGE_KEY);
  if (!storedEndTime) {
    log('未找到有效倒计时，显示初始验证');
    showInitialVerify();
    return;
  }

  const endTime = parseInt(storedEndTime);
  const now = Date.now();
  const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));

  if (remainingTime <= 0) {
    log('倒计时已结束，显示初始验证');
    showInitialVerify();
    return;
  }

  // 创建或更新倒计时显示
  let timerEl = document.querySelector('.safe-timer');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.className = 'safe-timer';
    document.body.appendChild(timerEl);
  }

  // 更新倒计时显示
  const updateTimerDisplay = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 倒计时结束处理
    if (remaining <= 0) {
      clearInterval(timerInterval);
      log('倒计时结束，显示初始验证');
      showInitialVerify();
    }
  };

  // 立即更新一次
  updateTimerDisplay();

  // 设置定时器每秒更新
  const timerInterval = setInterval(updateTimerDisplay, 1000);

  // 点击倒计时显示日志
  timerEl.onclick = () => {
    const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    const logText = logs.map(log => `[${log.time}][${log.source}] ${log.content}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safe-timer-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log('用户导出日志文件');
  };
}

// 9. 初始化函数（保留原逻辑）
function init() {
  log(`安全计时器初始化（版本4.86）`);
  
  // 初始化后台运行模块
  window.backgroundRunner = new BackgroundRunner();
  
  // 初始化网络监测
  window.networkMonitor = new NetworkMonitor();
  
  // 初始化倒计时
  initTimer();
  
  // 页面关闭前保存状态
  window.addEventListener('beforeunload', () => {
    log('页面关闭，保存倒计时状态');
  });
  
  // 页面加载完成后显示版本信息
  window.addEventListener('load', () => {
    log(`页面加载完成，安全计时器已启动（版本4.86）`);
  });
}

// 10. 启动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}