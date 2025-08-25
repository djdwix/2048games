// ==UserScript==
// @name         页面安全验证计时器（增强版）
// @namespace    http://tampermonkey.net/
// @version      4.6
// @description  带多接口IP获取+修复延迟bug+精简弹窗+定位权限+验证信息统计
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// ==/UserScript==
GM_addStyle(`
  /* 倒计时样式（保留科幻风格） */
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
  /* 核心更新3：减小网络状态弹窗 */
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
    max-width: 280px; /* 原380px→280px，大幅减小宽度 */
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 12px; /* 原16px→12px，减小圆角 */
    padding: 15px 10px; /* 原25px 20px→15px 10px，缩减内边距 */
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
    margin-bottom: 12px; /* 原20px→12px，缩减间距 */
    padding-bottom: 8px; /* 原10px→8px，缩减下划线间距 */
    border-bottom: 1px solid rgba(76, 201, 240, 0.3);
  }
  .net-modal-title {
    font-size: 18px; /* 原20px→18px，减小标题字体 */
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    display: flex;
    align-items: center;
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.5);
  }
  .net-modal-title span {
    margin-right: 6px; /* 原8px→6px，缩减图标间距 */
    font-size: 20px; /* 原24px→20px，减小图标尺寸 */
  }
  .net-modal-close {
    background: transparent;
    border: 1px solid rgba(76, 201, 240, 0.5);
    color: #4cc9f0;
    font-size: 18px; /* 原22px→18px，减小关闭按钮 */
    cursor: pointer;
    padding: 0 6px; /* 原0 8px→0 6px，缩减按钮内边距 */
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
    margin: 0 0 12px; /* 原20px→12px，缩减列表底部间距 */
  }
  .net-info-item {
    padding: 8px 0; /* 原12px 0→8px 0，缩减列表项内边距 */
    border-bottom: 1px dashed rgba(76, 201, 240, 0.2);
    font-size: 14px; /* 原15px→14px，减小列表项字体 */
  }
  .net-info-label {
    color: #94a3b8;
    display: block;
    margin-bottom: 2px; /* 原4px→2px，缩减标签与值间距 */
    font-size: 12px; /* 原13px→12px，减小标签字体 */
  }
  .net-info-value {
    color: #e0f2fe;
    font-weight: 500;
  }
  .net-info-value.dynamic {
    color: #4cc9f0;
    text-shadow: 0 0 3px rgba(76, 201, 240, 0.4);
  }
  /* 科幻化验证弹窗样式（保留前序设计） */
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
  /* 新增：验证信息界面样式 */
  .info-btn {
    position: fixed;
    top: 12px;
    right: 120px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(76, 201, 240, 0.5);
    border-radius: 8px;
    padding: 8px 15px;
    font-size: 16px;
    font-weight: 600;
    color: #4cc9f0;
    box-shadow: 0 2px 8px rgba(76, 201, 240, 0.2);
    z-index: 9999;
    user-select: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .info-btn:hover {
    box-shadow: 0 0 12px rgba(76, 201, 240, 0.4);
  }
  .info-btn:active {
    transform: scale(0.95);
    box-shadow: 0 0 8px rgba(76, 201, 240, 0.1);
  }
  .info-modal {
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
    z-index: 10002;
    padding: 0 15px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  .info-modal.active {
    opacity: 1;
    visibility: visible;
  }
  .info-modal-box {
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
  .info-modal.active .info-modal-box {
    transform: scale(1) translateY(0);
    box-shadow: 0 0 20px rgba(76, 201, 240, 0.4);
  }
  .info-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(76, 201, 240, 0.3);
  }
  .info-modal-title {
    font-size: 18px;
    font-weight: bold;
    color: #4cc9f0;
    margin: 0;
    display: flex;
    align-items: center;
    text-shadow: 0 0 5px rgba(76, 201, 240, 0.5);
  }
  .info-modal-title span {
    margin-right: 6px;
    font-size: 20px;
  }
  .info-modal-close {
    background: transparent;
    border: 1px solid rgba(76, 201, 240, 0.5);
    color: #4cc9f0;
    font-size: 18px;
    cursor: pointer;
    padding: 0 6px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  .info-modal-close:hover {
    background: rgba(76, 201, 240, 0.1);
    box-shadow: 0 0 6px rgba(76, 201, 240, 0.3);
  }
  .info-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
  }
  .info-item {
    padding: 12px 0;
    border-bottom: 1px dashed rgba(76, 201, 240, 0.2);
    font-size: 15px;
  }
  .info-label {
    color: #94a3b8;
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
  }
  .info-value {
    color: #e0f2fe;
    font-weight: 500;
    text-shadow: 0 0 3px rgba(76, 201, 240, 0.3);
  }
`);
// 常量定义（核心更新：1.二次验证阈值10s 2.新增验证统计存储键 3.定位相关）
const STORAGE_KEY = 'safeTimerEndTime';
const TOTAL_TIME = 15 * 60;
const UPDATE_URL = 'https://github.com/djdwix/2048games/blob/main/1.js';
const STRENGTHEN_COUNT = 2;
const FAST_VERIFY_THRESHOLD = 10000; // 核心更新2：5s→10s
const LOCAL_DELAY_INTERVAL = 3000;
const LOCAL_TEST_TIMES = 50; 
// 新增：验证统计存储键
const LAST_VERIFY_TIME_KEY = 'lastVerifyTime';
const VERIFY_TOTAL_COUNT_KEY = 'verifyTotalCount';
// 核心更新1：AI网络自行查找IP的多接口配置（含响应解析规则）
const IP_API_LIST = [
  {
    url: 'https://api.ipify.org?format=text', 
    parser: (text) => text.trim() 
  },
  {
    url: 'https://ipinfo.io/ip', 
    parser: (text) => text.trim()
  },
  {
    url: 'https://icanhazip.com', 
    parser: (text) => text.trim()
  },
  {
    url: 'https://httpbin.org/ip', 
    parser: (json) => json.origin.split(',')[0].trim() 
  },
  {
    url: 'https://api.myip.com', 
    parser: (json) => json.ip
  }
];
// 工具函数：格式化北京时间（精确到分）
function formatBeijingTime(timestamp) {
  if (!timestamp) return '未记录';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}
// 工具函数：更新验证统计（次数+时间）
function updateVerifyStats() {
  // 更新总次数
  const currentCount = parseInt(localStorage.getItem(VERIFY_TOTAL_COUNT_KEY) || '0') + 1;
  localStorage.setItem(VERIFY_TOTAL_COUNT_KEY, currentCount);
  // 更新上次验证时间（北京时间戳）
  localStorage.setItem(LAST_VERIFY_TIME_KEY, Date.now().toString());
}
// 网络状态+定位管理（核心更新：1.询问定位权限 2.整合验证信息界面）
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.localDelay = '检测中...';
    this.userIP = '查找中...';
    this.userLocation = '待授权...'; // 新增：定位信息
    this.statusEl = null;
    this.modalEl = null;
    this.infoBtn = null; // 新增：信息按钮
    this.infoModal = null; // 新增：信息弹窗
    this.delayTimer = null;
    this.initElements();
    this.bindEvents();
    this.startLocalDelayDetect();
    this.fetchUserIPWithAI();
    this.initLocationPermission(); // 核心更新1：询问定位权限
    this.updateInfoModalData(); // 初始化验证信息
  }
  initElements() {
    // 网络状态元素
    this.statusEl = document.createElement('div');
    this.statusEl.className = `net-status ${this.isOnline ? 'online' : 'offline'}`;
    this.statusEl.textContent = this.isOnline ? '在线' : '离线';
    document.body.appendChild(this.statusEl);
    // 网络状态弹窗（新增：定位信息项）
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'net-modal';
    this.modalEl.innerHTML = `
      <div class="net-modal-box">
        <div class="net-modal-header">
          <h3 class="net-modal-title">
            <span>${this.isOnline ? '🌐' : '❌'}</span>网络状态
          </h3>
          <button class="net-modal-close">×</button>
        </div>
        <ul class="net-info-list">
          <li class="net-info-item">
            <span class="net-info-label">连接状态</span>
            <span class="net-info-value" id="net-status-value">${this.isOnline ? '在线' : '离线'}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">本地延迟</span>
            <span class="net-info-value dynamic" id="local-delay-value">${this.localDelay}</span>
          </li>
          <li class="net-info-item">
            <span class="net-info-label">当前IP</span>
            <span class="net-info-value dynamic" id="user-ip-value">${this.userIP}</span>
          </li>
          <li class="net-info-item"> <!-- 新增：定位信息项 -->
            <span class="net-info-label">定位信息</span>
            <span class="net-info-value dynamic" id="user-location-value">${this.userLocation}</span>
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
    // 新增：验证信息按钮
    this.infoBtn = document.createElement('div');
    this.infoBtn.className = 'info-btn';
    this.infoBtn.textContent = '验证信息';
    document.body.appendChild(this.infoBtn);
    // 新增：验证信息弹窗
    this.infoModal = document.createElement('div');
    this.infoModal.className = 'info-modal';
    this.infoModal.innerHTML = `
      <div class="info-modal-box">
        <div class="info-modal-header">
          <h3 class="info-modal-title">
            <span>📊</span>验证统计
          </h3>
          <button class="info-modal-close">×</button>
        </div>
        <ul class="info-list">
          <li class="info-item">
            <span class="info-label">上次验证时间（北京时间）</span>
            <span class="info-value" id="last-verify-time">${formatBeijingTime(localStorage.getItem(LAST_VERIFY_TIME_KEY))}</span>
          </li>
          <li class="info-item">
            <span class="info-label">累计验证次数</span>
            <span class="info-value" id="verify-total-count">${localStorage.getItem(VERIFY_TOTAL_COUNT_KEY) || '0'}</span>
          </li>
        </ul>
      </div>
    `;
    document.body.appendChild(this.infoModal);
    this.infoModal.querySelector('.info-modal-close').addEventListener('click', () => {
      this.infoModal.classList.remove('active');
    });
  }
  bindEvents() {
    // 网络状态点击
    this.statusEl.addEventListener('click', () => {
      this.modalEl.classList.toggle('active');
    });
    // 新增：验证信息按钮点击
    this.infoBtn.addEventListener('click', () => {
      this.updateInfoModalData();
      this.infoModal.classList.toggle('active');
    });
    // 网络状态变化
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
      this.fetchUserIPWithAI();
    } else {
      this.localDelay = '离线（无法检测）';
      this.userIP = '离线（无法获取）';
      this.modalEl.querySelector('#local-delay-value').textContent = this.localDelay;
      this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
      clearInterval(this.delayTimer);
    }
  }
  // 核心更新2：修复网络延迟一直0ms的bug
  calculateLocalDelay() {
    const startTime = performance.now();
    for (let i = 0; i < LOCAL_TEST_TIMES; i++) {
      const randomKey = `delayTest_${i}_${Math.random().toString(36).slice(2, 10)}`;
      const testData = JSON.stringify({
        timestamp: Date.now(),
        random: Math.random() * 1000000,
        index: i
      });
      localStorage.setItem(randomKey, testData);
      const storedData = localStorage.getItem(randomKey);
      if (storedData) JSON.parse(storedData);
      localStorage.removeItem(randomKey);
    }
    const totalTime = performance.now() - startTime;
    const avgDelay = Math.max(1, Math.round(totalTime / LOCAL_TEST_TIMES));
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
  // 核心更新1：AI网络自行查找IP（多接口轮询+容错）
  fetchUserIPWithAI() {
    if (!this.isOnline) return;
    const tryNextApi = (apiIndex = 0) => {
      if (apiIndex >= IP_API_LIST.length) {
        this.userIP = '查找失败（请检查网络）';
        this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
        return;
      }
      const { url, parser } = IP_API_LIST[apiIndex];
      fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        timeout: 5000
      })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.headers.get('content-type')?.includes('application/json') 
          ? response.json() 
          : response.text();
      })
      .then(data => {
        const ip = parser(data);
        const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
        if (ip && ipRegex.test(ip)) {
          this.userIP = ip;
          this.modalEl.querySelector('#user-ip-value').textContent = this.userIP;
        } else {
          throw new Error('IP格式无效');
        }
      })
      .catch(error => {
        tryNextApi(apiIndex + 1);
      });
    };
    tryNextApi();
  }
  // 核心更新1：询问浏览器定位权限并获取定位
  initLocationPermission() {
    if (!navigator.geolocation) {
      this.userLocation = '浏览器不支持';
      this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
      return;
    }
    // 询问定位权限
    navigator.geolocation.requestPermission()
      .then(permissionStatus => {
        if (permissionStatus === 'granted') {
          // 权限允许：获取定位
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              this.userLocation = `纬度: ${latitude.toFixed(2)}, 经度: ${longitude.toFixed(2)}`;
              this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
            },
            (error) => {
              // 获取定位失败
              const errorMsg = {
                1: '用户拒绝定位',
                2: '位置不可用',
                3: '请求超时'
              }[error.code] || `获取失败（${error.code}）`;
              this.userLocation = errorMsg;
              this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000
            }
          );
        } else if (permissionStatus === 'denied') {
          this.userLocation = '用户拒绝授权';
          this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
        } else {
          this.userLocation = '权限暂未决定';
          this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
        }
      })
      .catch(error => {
        this.userLocation = '权限请求失败';
        this.modalEl.querySelector('#user-location-value').textContent = this.userLocation;
      });
  }
  // 新增：更新验证信息弹窗数据
  updateInfoModalData() {
    const lastTime = formatBeijingTime(localStorage.getItem(LAST_VERIFY_TIME_KEY));
    const totalCount = localStorage.getItem(VERIFY_TOTAL_COUNT_KEY) || '0';
    this.infoModal.querySelector('#last-verify-time').textContent = lastTime;
    this.infoModal.querySelector('#verify-total-count').textContent = totalCount;
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
    return `${screen.width}×${screen.height}px`;
  }
}
// 倒计时及验证功能（保留前序动态验证码逻辑）
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
    const hue = Math.floor(ratio * 180) + 180; 
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
function generateCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}
// 加强验证（保留动态验证码逻辑，新增：验证成功更新统计）
function showStrengthenVerify(remainingTimes, networkMonitor) {
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
  modal.querySelector('.confirm-btn').addEventListener('click', () => {
    const inputCode = verifyInput.value.trim();
    if (inputCode !== code) {
      verifyError.style.display = 'block';
      code = generateCode();
      verifyCodeEl.textContent = code;
      verifyInput.value = '';
      verifyInput.focus();
      return;
    }
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      remainingTimes--;
      // 最后一次加强验证成功：更新统计
      if (remainingTimes === 0) {
        updateVerifyStats();
        networkMonitor.updateInfoModalData();
        // 重置倒计时
        const endTime = Date.now() + TOTAL_TIME * 1000;
        localStorage.setItem(STORAGE_KEY, endTime);
        initTimer();
      }
      if (remainingTimes > 0) {
        showStrengthenVerify(remainingTimes, networkMonitor);
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
// 初始验证（保留动态验证码逻辑，新增：验证成功更新统计）
function showInitialVerify(networkMonitor) {
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
      <div class="verify-e