class VirtualPhoneGenerator {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.tcAppId = '1314462072';
        this.currentPhoneNumber = null;
        this.currentSecurityCode = null;
        this.hasGeneratedCode = false;
        this.currentCarrier = null;
        this.cooldownTimer = null;
        this.cooldownEndTime = null;
        this.currentAgreementVersion = '6.3';
        this.quotaInfo = null;
        this.quotaUpdateInterval = null;
        this.securityCodeTimer = null;
        this.securityCodeExpiryTime = null;
        this.maintenanceCheckInterval = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userCanDelete = false;
        this.deleteEligibleTime = 0;
        this.currentDeleteCode = null;
        this.deleteCodeTimer = null;
        this.pointsBalance = 0;
        this.tempQuota = 0;
        
        this.initElements();
        this.bindEvents();
        this.checkAgreement();
        this.preventSecurityCodeCopy();
        this.setupQuotaMonitor();
        this.startMaintenanceCheck();
        this.checkLoginStatus();
    }

    startMaintenanceCheck() {
        this.maintenanceCheckInterval = setInterval(() => {
            this.checkMaintenanceStatus();
        }, 30000);
    }

    async checkMaintenanceStatus() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();
            if (data.success && data.health && data.health.maintenance_mode === true) {
                window.location.href = '/404.html';
            }
        } catch (error) {
        }
    }

    async checkLoginStatus() {
        try {
            const response = await fetch(`${this.apiBase}/user/info`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.isLoggedIn = true;
                this.currentUser = data.username;
                this.userCanDelete = data.can_delete || false;
                this.deleteEligibleTime = data.delete_eligible_in || 0;
                this.pointsBalance = data.points || 0;
                this.tempQuota = data.temp_quota || 0;
                this.updateUserSection();
                this.loadQuotaInfo();
            } else {
                this.isLoggedIn = false;
                this.currentUser = null;
                this.userCanDelete = false;
                this.pointsBalance = 0;
                this.tempQuota = 0;
                this.updateUserSection();
            }
        } catch (error) {
            this.isLoggedIn = false;
            this.currentUser = null;
            this.userCanDelete = false;
            this.pointsBalance = 0;
            this.tempQuota = 0;
            this.updateUserSection();
        }
    }

    updateUserSection() {
        const userSection = document.getElementById('userSection');
        if (!userSection) return;
        if (this.isLoggedIn && this.currentUser) {
            const tempQuotaHtml = this.tempQuota > 0 ? 
                `<span style="margin-left: 10px; background: #17a2b8; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem;">
                    <i class="fas fa-bolt"></i> +${this.tempQuota} 临时
                </span>` : '';
            const deleteButton = this.userCanDelete 
                ? `<button id="deleteAccountBtn" class="delete-btn"><i class="fas fa-trash-alt"></i> 注销账号</button>`
                : `<button id="deleteAccountBtn" class="delete-btn disabled" disabled><i class="fas fa-trash-alt"></i> 注销账号 (${this.formatTimeRemaining(this.deleteEligibleTime)})</button>`;
            userSection.innerHTML = `
                <div class="user-header">
                    <div class="user-info">
                        <span class="username-display">
                            <i class="fas fa-user-circle"></i> ${this.currentUser}
                            <span style="margin-left: 10px; background: #ffc107; color: #333; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem;">
                                <i class="fas fa-star"></i> ${this.pointsBalance.toFixed(2)} 积分
                            </span>
                            ${tempQuotaHtml}
                        </span>
                        <div class="user-actions">
                            <a href="/points-shop" class="btn btn-secondary" style="padding: 8px 16px; text-decoration: none; background: #28a745;">
                                <i class="fas fa-shopping-cart"></i> 积分商城
                            </a>
                            <button id="logoutBtn" class="logout-btn">
                                <i class="fas fa-sign-out-alt"></i> 退出登录
                            </button>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
            const deleteBtn = document.getElementById('deleteAccountBtn');
            if (deleteBtn && this.userCanDelete) {
                deleteBtn.addEventListener('click', () => this.showDeleteModal());
            }
        } else {
            userSection.innerHTML = `
                <div class="login-prompt">
                    <span><i class="fas fa-info-circle"></i> 请登录以使用完整功能（每生成一个手机号可获得积分）</span>
                    <a href="/login"><i class="fas fa-sign-in-alt"></i> 登录/注册</a>
                </div>
            `;
        }
        const currentUserElement = document.getElementById('current-user');
        if (currentUserElement) {
            currentUserElement.textContent = this.currentUser || '未登录';
        }
    }

    formatTimeRemaining(seconds) {
        if (seconds <= 0) return '可注销';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes}分${remainingSeconds}秒后可注销`;
        }
        return `${remainingSeconds}秒后可注销`;
    }

    showDeleteModal() {
        if (!this.isLoggedIn) {
            this.showToast('请先登录', 'error');
            return;
        }
        if (!this.userCanDelete) {
            this.showToast(`账号注册时间不足2小时，请在${this.formatTimeRemaining(this.deleteEligibleTime)}后再试`, 'error');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'agreement-modal active';
        modal.id = 'deleteModal';
        modal.innerHTML = `
            <div class="agreement-content" style="max-width: 450px;">
                <div class="agreement-header" style="background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);">
                    <h2><i class="fas fa-exclamation-triangle"></i> 账号注销</h2>
                    <p>请输入动态密钥并验证密码确认注销</p>
                </div>
                <div class="agreement-body">
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #721c24;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>警告：</strong>账号注销后所有数据（包括积分和卡密）将永久删除且无法恢复！
                    </div>
                    <div style="background: #e8f4ff; border: 1px solid #cfe2ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <h4 style="margin: 0; color: #084298;"><i class="fas fa-key"></i> 动态注销密钥</h4>
                            <div style="font-size: 0.9rem; color: #666;">
                                <i class="fas fa-clock"></i> <span id="deleteCodeTimer">0:30</span>
                            </div>
                        </div>
                        <div style="font-family: 'Courier New', monospace; font-size: 2.5rem; font-weight: bold; text-align: center; color: #667eea; background: white; padding: 15px; border-radius: 8px; border: 2px dashed #667eea; letter-spacing: 8px;" id="deleteCodeDisplay">
                            ......
                        </div>
                        <div style="font-size: 0.85rem; color: #666; text-align: center; margin-top: 10px;">
                            <i class="fas fa-info-circle"></i> 密钥有效期30秒，过期后自动刷新
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="deleteCodeInput"><i class="fas fa-key"></i> 输入动态密钥</label>
                        <input type="text" id="deleteCodeInput" class="form-control" placeholder="请输入6位动态密钥" maxlength="6" style="text-align: center; font-size: 1.2rem; letter-spacing: 4px;">
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label for="deletePassword"><i class="fas fa-lock"></i> 输入用户密码</label>
                        <input type="password" id="deletePassword" class="form-control" placeholder="请输入您的登录密码">
                    </div>
                    <div class="agreement-buttons">
                        <button id="cancelDeleteBtn" class="btn-decline">
                            <i class="fas fa-times"></i> 取消
                        </button>
                        <button id="confirmDeleteBtn" class="btn-agree" style="background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%);" disabled>
                            <i class="fas fa-trash-alt"></i> 确认注销
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            modal.remove();
            this.stopDeleteCodeTimer();
        });
        const deleteCodeInput = document.getElementById('deleteCodeInput');
        const deletePassword = document.getElementById('deletePassword');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        const checkInputs = () => {
            confirmBtn.disabled = !(deleteCodeInput.value.length === 6 && 
                                   deleteCodeInput.value === this.currentDeleteCode && 
                                   deletePassword.value.length >= 8);
        };
        
        deleteCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length > 6) {
                e.target.value = e.target.value.slice(0, 6);
            }
            checkInputs();
        });
        
        deletePassword.addEventListener('input', checkInputs);
        
        deleteCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                this.deleteAccount(deleteCodeInput.value, deletePassword.value);
            }
        });
        
        deletePassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                this.deleteAccount(deleteCodeInput.value, deletePassword.value);
            }
        });
        
        confirmBtn.addEventListener('click', () => {
            this.deleteAccount(deleteCodeInput.value, deletePassword.value);
        });
        this.loadDeleteCode();
    }

    async loadDeleteCode() {
        try {
            const response = await fetch(`${this.apiBase}/user/delete-code`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.currentDeleteCode = data.code;
                const deleteCodeDisplay = document.getElementById('deleteCodeDisplay');
                if (deleteCodeDisplay) {
                    deleteCodeDisplay.textContent = data.code;
                }
                this.startDeleteCodeTimer(data.expires_in || 30);
            } else {
                this.showToast(data.error || '获取注销码失败', 'error');
                const modal = document.getElementById('deleteModal');
                if (modal) modal.remove();
            }
        } catch (error) {
            this.showToast('获取注销码失败', 'error');
            const modal = document.getElementById('deleteModal');
            if (modal) modal.remove();
        }
    }

    startDeleteCodeTimer(seconds) {
        this.stopDeleteCodeTimer();
        const timerElement = document.getElementById('deleteCodeTimer');
        if (!timerElement) return;
        const updateTimer = () => {
            const remainingSeconds = seconds % 60;
            timerElement.textContent = `0:${remainingSeconds.toString().padStart(2, '0')}`;
            if (seconds <= 10) {
                timerElement.style.color = '#dc3545';
            } else if (seconds <= 20) {
                timerElement.style.color = '#ffc107';
            } else {
                timerElement.style.color = '#28a745';
            }
        };
        updateTimer();
        this.deleteCodeTimer = setInterval(() => {
            seconds--;
            updateTimer();
            if (seconds <= 0) {
                this.stopDeleteCodeTimer();
                this.loadDeleteCode();
            }
        }, 1000);
    }

    stopDeleteCodeTimer() {
        if (this.deleteCodeTimer) {
            clearInterval(this.deleteCodeTimer);
            this.deleteCodeTimer = null;
        }
    }

    async deleteAccount(deleteCode, password) {
        try {
            const deleteBtn = document.getElementById('confirmDeleteBtn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注销中...';
            }
            const response = await fetch(`${this.apiBase}/user/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    delete_code: deleteCode,
                    password: password
                }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.showToast('账号已成功注销', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showToast(data.error || '注销失败', 'error');
                const modal = document.getElementById('deleteModal');
                if (modal) modal.remove();
            }
        } catch (error) {
            this.showToast('注销失败: ' + error.message, 'error');
            const modal = document.getElementById('deleteModal');
            if (modal) modal.remove();
        }
    }

    async logout() {
        try {
            const response = await fetch(`${this.apiBase}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.showToast('已退出登录', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            this.showToast('退出失败', 'error');
        }
    }

    setupQuotaMonitor() {
        this.quotaUpdateInterval = setInterval(() => {
            if (this.isLoggedIn) {
                this.loadQuotaInfo();
                this.checkLoginStatus();
            }
        }, 60000);
        if (this.isLoggedIn) {
            this.loadQuotaInfo();
        }
    }

    async loadQuotaInfo() {
        if (!this.isLoggedIn) return;
        try {
            const response = await fetch(`${this.apiBase}/quota`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.quotaInfo = data.quota;
                this.tempQuota = data.quota.temp_quota || 0;
                this.updateQuotaDisplay();
            }
        } catch (error) {
        }
    }

    updateQuotaDisplay() {
        if (!this.quotaInfo) return;
        const quotaDisplay = document.getElementById('quota-display');
        if (!quotaDisplay) return;
        const used = this.quotaInfo.used;
        const remaining = this.quotaInfo.remaining;
        const baseLimit = this.quotaInfo.base_limit;
        const tempQuota = this.quotaInfo.temp_quota;
        const totalLimit = this.quotaInfo.total_limit;
        const percentage = Math.round((used / totalLimit) * 100);
        let statusClass = 'quota-normal';
        let statusText = '正常';
        if (percentage >= 90) {
            statusClass = 'quota-danger';
            statusText = '即将用尽';
        } else if (percentage >= 70) {
            statusClass = 'quota-warning';
            statusText = '使用较多';
        } else if (used === 0) {
            statusClass = 'quota-success';
            statusText = '未使用';
        }
        const tempQuotaHtml = tempQuota > 0 ? 
            `<span style="background: #17a2b8; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-left: 5px;">临时+${tempQuota}</span>` : '';
        quotaDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; background: #f8f9fa; padding: 8px 12px; border-radius: 6px;">
                <i class="fas fa-tachometer-alt" style="color: #667eea;"></i>
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; color: #666;">${this.currentUser} 配额: ${used}/${totalLimit} ${tempQuotaHtml}</div>
                    <div style="height: 4px; background: #e9ecef; border-radius: 2px; margin: 4px 0;">
                        <div style="height: 100%; width: ${percentage}%; background: #667eea; border-radius: 2px;"></div>
                    </div>
                </div>
                <span style="font-size: 0.8rem; padding: 2px 6px; border-radius: 10px; background: ${statusClass === 'quota-danger' ? '#dc3545' : statusClass === 'quota-warning' ? '#ffc107' : '#28a745'}; color: white;">
                    ${statusText}
                </span>
            </div>
        `;
    }

    checkAgreement() {
        const agreementData = localStorage.getItem('virtualPhoneAgreement');
        if (agreementData) {
            try {
                const data = JSON.parse(agreementData);
                if (data.version === this.currentAgreementVersion && data.accepted === true) {
                    this.initializeApp();
                    return;
                }
                this.showAgreementModal(true);
            } catch (error) {
                this.showAgreementModal(false);
            }
        } else {
            this.showAgreementModal(false);
        }
    }

    showAgreementModal(isUpdate = false) {
        const modal = document.getElementById('agreementModal');
        const agreeTermsCheckbox = document.getElementById('modal-agree-terms');
        const readPrivacyCheckbox = document.getElementById('modal-read-privacy');
        const agreeBtn = document.getElementById('modalAgreeBtn');
        const declineBtn = document.getElementById('modalDeclineBtn');
        const currentVersionBadge = document.getElementById('currentVersionBadge');
        const agreementVersion = document.getElementById('agreementVersion');
        const updateContent = document.getElementById('updateContent');
        modal.classList.add('active');
        currentVersionBadge.textContent = `版本 ${this.currentAgreementVersion}`;
        agreementVersion.textContent = this.currentAgreementVersion;
        updateContent.innerHTML = `
            <h4><i class="fas fa-sync-alt"></i> 版本 6.3 更新</h4>
            <ul>
                <li><strong>移除自定义号段功能：</strong>简化生成流程</li>
                <li><strong>调整临时配额卡：</strong>18积分，使用后获得15个临时配额</li>
                <li><strong>修改赠送服务费：</strong>统一为1.28积分</li>
                <li><strong>调整赠送次数：</strong>每天仅可赠送他人卡密16次</li>
                <li><strong>完善积分逻辑：</strong>优化积分计算和检测逻辑</li>
                <li><strong>修复已知bug：</strong>优化系统性能和稳定性</li>
                <li><strong>移除所有非必要注释：</strong>代码精简优化</li>
            </ul>
        `;
        if (isUpdate) {
            updateContent.style.display = 'block';
            modal.querySelector('.agreement-header h2').textContent = '用户协议更新确认';
            modal.querySelector('.agreement-header p').textContent = '检测到用户协议有重要更新，请仔细阅读更新内容';
        } else {
            updateContent.style.display = 'block';
            modal.querySelector('.agreement-header h2').textContent = '用户协议确认';
            modal.querySelector('.agreement-header p').textContent = '请仔细阅读并同意以下条款以继续使用本服务';
        }
        const updateAgreeButton = () => {
            agreeBtn.disabled = !(agreeTermsCheckbox.checked && readPrivacyCheckbox.checked);
        };
        agreeTermsCheckbox.addEventListener('change', updateAgreeButton);
        readPrivacyCheckbox.addEventListener('change', updateAgreeButton);
        agreeBtn.addEventListener('click', () => {
            if (agreeTermsCheckbox.checked && readPrivacyCheckbox.checked) {
                this.saveAgreement();
                modal.classList.remove('active');
                this.initializeApp();
            }
        });
        declineBtn.addEventListener('click', () => {
            if (confirm('您需要同意用户协议才能使用本服务。确定要离开吗？')) {
                window.location.href = 'about:blank';
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modal.classList.contains('active')) {
                    e.preventDefault();
                    if (confirm('您需要同意用户协议才能使用本服务。确定要离开吗？')) {
                        window.location.href = 'about:blank';
                    }
                }
            }
        });
        agreeTermsCheckbox.checked = false;
        readPrivacyCheckbox.checked = false;
        updateAgreeButton();
    }

    saveAgreement() {
        const today = new Date().toISOString().split('T')[0];
        const agreementData = {
            accepted: true,
            version: this.currentAgreementVersion,
            date: today,
            privacyRead: true,
            lastUpdate: today
        };
        try {
            localStorage.setItem('virtualPhoneAgreement', JSON.stringify(agreementData));
        } catch (error) {
            this.showToast('保存用户协议设置失败', 'error');
        }
    }

    initializeApp() {
        this.loadStats();
        this.loadIPInfo();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.loadStats();
                this.checkLoginStatus();
                this.loadQuotaInfo();
                this.checkMaintenanceStatus();
            }
        });
        setInterval(() => {
            this.loadStats();
            if (this.isLoggedIn) {
                this.checkLoginStatus();
            }
        }, 30000);
    }

    initElements() {
        this.generateBtn = document.getElementById('generate-btn');
        this.resultContainer = document.getElementById('result-container');
        this.maskedPhone = document.getElementById('masked-phone');
        this.securityCode = document.getElementById('security-code');
        this.generateCodeBtn = document.getElementById('generate-code-btn');
        this.verifyContainer = document.getElementById('verify-container');
        this.securityCodeInput = document.getElementById('security-code-input');
        this.verifyBtn = document.getElementById('verify-btn');
        this.copyMaskedBtn = document.getElementById('copy-masked');
        this.toast = document.getElementById('toast');
        this.totalCount = document.getElementById('total-count');
        this.usedCount = document.getElementById('used-count');
        this.availableCount = document.getElementById('available-count');
        this.serverIp = document.getElementById('server-ip');
        this.clientIp = document.getElementById('client-ip');
        this.carrierName = document.getElementById('carrier-name');
        this.clientTotalCount = document.getElementById('client-total-count');
        this.clientUsedCount = document.getElementById('client-used-count');
        this.clientAvailableCount = document.getElementById('client-available-count');
        this.purposeInput = document.getElementById('purpose-input');
        this.securityCodeTimer = document.getElementById('security-code-timer');
        this.codeExpiryInfo = document.getElementById('code-expiry-info');
        this.cooldownDisplay = document.createElement('div');
        this.cooldownDisplay.className = 'cooldown-display';
        this.cooldownDisplay.style.display = 'none';
        const card = document.querySelector('.card');
        if (card) {
            const quotaDisplay = document.createElement('div');
            quotaDisplay.id = 'quota-display';
            quotaDisplay.style.marginBottom = '15px';
            if (card.firstChild) {
                card.insertBefore(quotaDisplay, card.firstChild);
            }
            if (this.generateBtn && this.generateBtn.parentNode) {
                this.generateBtn.parentNode.appendChild(this.cooldownDisplay);
            }
        }
        this.currentPurpose = '';
    }

    bindEvents() {
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.generateNumber());
        }
        if (this.generateCodeBtn) {
            this.generateCodeBtn.addEventListener('click', () => this.generateSecurityCode());
        }
        if (this.verifyBtn) {
            this.verifyBtn.addEventListener('click', () => this.initTencentCaptcha());
        }
        if (this.copyMaskedBtn) {
            this.copyMaskedBtn.addEventListener('click', () => this.showVerifyPrompt());
        }
        if (this.purposeInput) {
            this.purposeInput.addEventListener('input', (e) => {
                this.currentPurpose = e.target.value;
            });
        }
        if (this.securityCodeInput) {
            this.securityCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.initTencentCaptcha();
                }
            });
            this.securityCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (e.target.value.length > 6) {
                    e.target.value = e.target.value.slice(0, 6);
                }
            });
        }
    }

    preventSecurityCodeCopy() {
        if (!this.securityCode) return;
        this.securityCode.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showToast('安全码受保护，请手动输入', 'error');
            return false;
        });
        this.securityCode.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
                e.preventDefault();
                this.showToast('安全码受保护，请手动输入', 'error');
                return false;
            }
        });
        this.securityCode.style.userSelect = 'none';
        this.securityCode.style.webkitUserSelect = 'none';
        this.securityCode.style.mozUserSelect = 'none';
        this.securityCode.style.msUserSelect = 'none';
        this.securityCode.addEventListener('copy', (e) => {
            e.preventDefault();
            this.showToast('安全码受保护，请手动输入', 'error');
            return false;
        });
        this.securityCode.addEventListener('cut', (e) => {
            e.preventDefault();
            this.showToast('安全码受保护，请手动输入', 'error');
            return false;
        });
        this.securityCode.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });
        this.securityCode.setAttribute('draggable', 'false');
        this.securityCode.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });
    }

    async loadIPInfo() {
        try {
            const response = await fetch(`${this.apiBase}/ip-info`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                if (this.serverIp) this.serverIp.textContent = data.server_ip;
                if (this.clientIp) this.clientIp.textContent = data.client_ip;
                if (data.username) {
                    this.isLoggedIn = true;
                    this.currentUser = data.username;
                    this.updateUserSection();
                }
                const ipWarning = document.getElementById('ipWarning');
                if (ipWarning && data.ip_registered_count >= 3) {
                    ipWarning.style.display = 'flex';
                }
            }
        } catch (error) {
            if (this.serverIp) this.serverIp.textContent = '获取失败';
            if (this.clientIp) this.clientIp.textContent = '获取失败';
        }
    }

    async generateNumber() {
        if (!this.isLoggedIn) {
            this.showToast('请先登录', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return;
        }
        try {
            this.generateBtn.disabled = true;
            this.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
            const response = await fetch(`${this.apiBase}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purpose: this.currentPurpose
                }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.displayGeneratedNumber(data.phone_number, data.masked_phone, data.carrier);
                this.showToast(`手机号生成成功！获得 ${data.points_earned.toFixed(2)} 积分`, 'success');
                this.cooldownDisplay.style.display = 'none';
                if (this.cooldownTimer) {
                    clearInterval(this.cooldownTimer);
                    this.cooldownTimer = null;
                }
                this.loadQuotaInfo();
                this.pointsBalance = data.points_balance;
                this.tempQuota = data.temp_quota || 0;
                this.updateUserSection();
                if (data.quota_remaining <= 5) {
                    this.showToast(`注意：当前时段剩余配额仅 ${data.quota_remaining} 次`, 'warning');
                }
            } else {
                if (response.status === 429) {
                    if (data.cooldown) {
                        this.startCooldown(data.cooldown);
                        this.showToast(`请求过于频繁，请等待${data.cooldown}秒后重试`, 'error');
                    } else {
                        this.showToast(data.error, 'error');
                    }
                } else {
                    this.showToast(`生成失败: ${data.error}`, 'error');
                }
            }
        } catch (error) {
            this.showToast(`生成失败: ${error.message}`, 'error');
        } finally {
            if (!this.cooldownTimer) {
                this.generateBtn.disabled = false;
                this.generateBtn.innerHTML = '<i class="fas fa-bolt"></i> 生成虚拟手机号';
            }
            this.loadStats();
        }
    }

    startCooldown(seconds) {
        this.cooldownEndTime = Date.now() + seconds * 1000;
        this.generateBtn.disabled = true;
        this.cooldownDisplay.style.display = 'block';
        this.updateCooldownDisplay();
        this.cooldownTimer = setInterval(() => {
            this.updateCooldownDisplay();
        }, 1000);
    }

    updateCooldownDisplay() {
        if (!this.cooldownEndTime) return;
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((this.cooldownEndTime - now) / 1000));
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            this.generateBtn.innerHTML = `<i class="fas fa-clock"></i> 冷却中...`;
            this.cooldownDisplay.textContent = `请等待 ${minutes}:${seconds.toString().padStart(2, '0')} 后再试`;
        } else {
            this.cooldownDisplay.style.display = 'none';
            this.generateBtn.disabled = false;
            this.generateBtn.innerHTML = '<i class="fas fa-bolt"></i> 生成虚拟手机号';
            clearInterval(this.cooldownTimer);
            this.cooldownTimer = null;
        }
    }

    displayGeneratedNumber(phoneNumber, maskedPhone, carrier) {
        if (!this.maskedPhone || !this.securityCode) return;
        this.maskedPhone.textContent = maskedPhone;
        this.currentPhoneNumber = phoneNumber;
        this.currentSecurityCode = null;
        this.hasGeneratedCode = false;
        this.currentCarrier = carrier;
        this.stopSecurityCodeTimer();
        if (this.carrierName) this.carrierName.textContent = carrier || '未知';
        this.securityCode.textContent = '点击钥匙图标生成';
        this.securityCode.style.color = '#e74c3c';
        if (this.securityCodeInput) this.securityCodeInput.value = '';
        if (this.verifyContainer) this.verifyContainer.classList.add('hidden');
        if (this.resultContainer) this.resultContainer.classList.remove('hidden');
        if (this.securityCodeTimer) {
            this.securityCodeTimer.style.display = 'none';
            this.securityCodeTimer.textContent = '';
        }
        if (this.codeExpiryInfo) {
            this.codeExpiryInfo.style.display = 'block';
        }
        if (this.copyMaskedBtn) {
            this.copyMaskedBtn.innerHTML = '<i class="far fa-copy"></i>';
            this.copyMaskedBtn.title = '复制完整号码';
            this.copyMaskedBtn.disabled = false;
            this.copyMaskedBtn.classList.remove('btn-copy-success');
        }
    }

    async checkSecurityCodeExpiry() {
        if (!this.currentPhoneNumber || !this.isLoggedIn) return;
        try {
            const response = await fetch(`${this.apiBase}/check-code-expiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: this.currentPhoneNumber }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                if (data.is_valid && data.remaining_seconds > 0) {
                    this.currentSecurityCode = data.security_code || null;
                    this.startSecurityCodeTimer(data.remaining_seconds);
                } else if (data.is_expired && data.can_regenerate) {
                    this.securityCode.textContent = '点击钥匙图标生成';
                    this.securityCode.style.color = '#e74c3c';
                    if (this.generateCodeBtn) {
                        this.generateCodeBtn.disabled = false;
                        this.generateCodeBtn.innerHTML = '<i class="fas fa-key"></i>';
                    }
                }
            }
        } catch (error) {
        }
    }

    async generateSecurityCode() {
        if (!this.isLoggedIn) {
            this.showToast('请先登录', 'error');
            return;
        }
        if (!this.currentPhoneNumber) {
            this.showToast('请先生成手机号', 'error');
            return;
        }
        try {
            this.generateCodeBtn.disabled = true;
            this.generateCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const response = await fetch(`${this.apiBase}/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: this.currentPhoneNumber }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this.currentSecurityCode = data.security_code;
                this.securityCode.textContent = data.security_code;
                this.hasGeneratedCode = true;
                this.securityCode.style.color = '#28a745';
                const expiresAt = new Date(data.expires_at).getTime();
                const now = Date.now();
                const remainingSeconds = Math.floor((expiresAt - now) / 1000);
                if (remainingSeconds > 0) {
                    this.startSecurityCodeTimer(remainingSeconds);
                } else {
                    this.securityCode.textContent = '安全码已过期';
                    this.securityCode.style.color = '#dc3545';
                }
                this.showToast('安全码生成成功！有效期180秒', 'success');
                if (this.verifyContainer) {
                    this.verifyContainer.classList.remove('hidden');
                }
                if (this.securityCodeInput) {
                    this.securityCodeInput.focus();
                }
                if (this.codeExpiryInfo) {
                    this.codeExpiryInfo.style.display = 'none';
                }
                if (this.generateCodeBtn) {
                    this.generateCodeBtn.disabled = false;
                    this.generateCodeBtn.innerHTML = '<i class="fas fa-key"></i>';
                }
            } else {
                this.showToast(`生成安全码失败: ${data.error}`, 'error');
                if (this.generateCodeBtn) {
                    this.generateCodeBtn.disabled = false;
                    this.generateCodeBtn.innerHTML = '<i class="fas fa-key"></i>';
                }
            }
        } catch (error) {
            this.showToast(`生成安全码失败: ${error.message}`, 'error');
            if (this.generateCodeBtn) {
                this.generateCodeBtn.disabled = false;
                this.generateCodeBtn.innerHTML = '<i class="fas fa-key"></i>';
            }
        }
    }

    startSecurityCodeTimer(seconds) {
        this.stopSecurityCodeTimer();
        if (seconds <= 0) {
            this.securityCode.textContent = '安全码已过期';
            this.securityCode.style.color = '#dc3545';
            this.currentSecurityCode = null;
            this.hasGeneratedCode = false;
            if (this.securityCodeTimer) {
                this.securityCodeTimer.style.display = 'none';
                this.securityCodeTimer.textContent = '';
            }
            if (this.codeExpiryInfo) {
                this.codeExpiryInfo.style.display = 'block';
            }
            return;
        }
        this.updateSecurityCodeTimer(seconds);
        this.securityCodeTimerInterval = setInterval(() => {
            seconds--;
            this.updateSecurityCodeTimer(seconds);
            if (seconds <= 0) {
                this.stopSecurityCodeTimer();
                this.securityCode.textContent = '安全码已过期';
                this.securityCode.style.color = '#dc3545';
                this.currentSecurityCode = null;
                this.hasGeneratedCode = false;
                if (this.codeExpiryInfo) {
                    this.codeExpiryInfo.style.display = 'block';
                }
                this.showToast('安全码已过期，请重新生成', 'warning');
            }
        }, 1000);
    }

    updateSecurityCodeTimer(seconds) {
        if (!this.securityCodeTimer) return;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.securityCodeTimer.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.securityCodeTimer.style.display = 'inline-block';
        if (seconds <= 30) {
            this.securityCodeTimer.style.color = '#dc3545';
            this.securityCodeTimer.style.background = '#f8d7da';
            this.securityCodeTimer.style.borderColor = '#f5c6cb';
        } else if (seconds <= 60) {
            this.securityCodeTimer.style.color = '#ffc107';
            this.securityCodeTimer.style.background = '#fff3cd';
            this.securityCodeTimer.style.borderColor = '#ffeaa7';
        } else {
            this.securityCodeTimer.style.color = '#28a745';
            this.securityCodeTimer.style.background = '#d4edda';
            this.securityCodeTimer.style.borderColor = '#c3e6cb';
        }
    }

    stopSecurityCodeTimer() {
        if (this.securityCodeTimerInterval) {
            clearInterval(this.securityCodeTimerInterval);
            this.securityCodeTimerInterval = null;
        }
    }

    showVerifyPrompt() {
        if (!this.isLoggedIn) {
            this.showToast('请先登录', 'error');
            return;
        }
        if (!this.currentPhoneNumber) {
            this.showToast('请先生成手机号', 'error');
            return;
        }
        if (!this.hasGeneratedCode) {
            this.showToast('请先生成安全码', 'error');
            return;
        }
        if (this.verifyContainer) {
            this.verifyContainer.classList.remove('hidden');
        }
        if (this.securityCodeInput) {
            this.securityCodeInput.focus();
        }
    }

    initTencentCaptcha() {
        if (!this.isLoggedIn) {
            this.showToast('请先登录', 'error');
            return;
        }
        if (!this.currentPhoneNumber) {
            this.showToast('手机号不存在', 'error');
            return;
        }
        if (!this.securityCodeInput) return;
        const code = this.securityCodeInput.value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            this.showToast('请输入6位安全码', 'error');
            return;
        }
        if (typeof TencentCaptcha === 'undefined') {
            this.showToast('验证服务加载失败，请刷新页面', 'error');
            return;
        }
        const captcha = new TencentCaptcha(this.tcAppId, (res) => {
            if (res.ret === 0) {
                this.verifyAndCopy(code, res.ticket, res.randstr);
            } else {
                this.showToast('验证失败，请重试', 'error');
                if (this.verifyBtn) {
                    this.verifyBtn.disabled = false;
                    this.verifyBtn.innerHTML = '<i class="fas fa-check"></i> 验证并复制完整号码';
                }
            }
        });
        captcha.show();
        if (this.verifyBtn) {
            this.verifyBtn.disabled = true;
            this.verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';
        }
    }

    async verifyAndCopy(code, ticket, randstr) {
        try {
            const response = await fetch(`${this.apiBase}/verify-copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone_number: this.currentPhoneNumber,
                    security_code: code,
                    captcha_ticket: ticket,
                    captcha_randstr: randstr
                }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                await this.copyFullNumber();
                this.showToast('验证成功，已复制完整号码！', 'success');
                if (this.securityCodeInput) this.securityCodeInput.value = '';
                if (this.verifyContainer) this.verifyContainer.classList.add('hidden');
                if (this.copyMaskedBtn) {
                    this.copyMaskedBtn.disabled = true;
                    this.copyMaskedBtn.innerHTML = '<i class="fas fa-check" style="color: #28a745;"></i>';
                    this.copyMaskedBtn.title = '已使用';
                    this.copyMaskedBtn.classList.add('btn-copy-success');
                }
                this.markSecurityCodeAsUsed();
            } else {
                this.showToast(`验证失败: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`验证失败: ${error.message}`, 'error');
        } finally {
            if (this.verifyBtn) {
                this.verifyBtn.disabled = false;
                this.verifyBtn.innerHTML = '<i class="fas fa-check"></i> 验证并复制完整号码';
            }
            this.loadStats();
        }
    }

    markSecurityCodeAsUsed() {
        if (this.securityCode && this.currentSecurityCode) {
            this.securityCode.textContent = '已使用';
            this.securityCode.style.color = '#6c757d';
            this.securityCode.style.opacity = '0.7';
            this.currentSecurityCode = null;
            this.hasGeneratedCode = false;
            this.stopSecurityCodeTimer();
            if (this.securityCodeTimer) {
                this.securityCodeTimer.style.display = 'none';
            }
            if (this.codeExpiryInfo) {
                this.codeExpiryInfo.style.display = 'none';
            }
        }
    }

    async copyFullNumber() {
        if (!this.currentPhoneNumber) {
            this.showToast('没有可复制的内容', 'error');
            return;
        }
        try {
            await navigator.clipboard.writeText(this.currentPhoneNumber);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = this.currentPhoneNumber;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();
            if (data.success && this.totalCount && this.usedCount && this.availableCount) {
                this.totalCount.textContent = data.stats.total;
                this.usedCount.textContent = data.stats.used;
                this.availableCount.textContent = data.stats.available;
                if (this.isLoggedIn && data.stats.user_stats) {
                    if (this.clientTotalCount) this.clientTotalCount.textContent = data.stats.user_stats.total || 0;
                    if (this.clientUsedCount) this.clientUsedCount.textContent = data.stats.user_stats.used || 0;
                    if (this.clientAvailableCount) this.clientAvailableCount.textContent = data.stats.user_stats.available || 0;
                    this.pointsBalance = data.stats.user_stats.points || 0;
                    this.tempQuota = data.stats.user_stats.temp_quota || 0;
                    this.updateUserSection();
                }
            }
        } catch (error) {
        }
    }

    showToast(message, type = 'info') {
        if (!this.toast) return;
        this.toast.textContent = message;
        this.toast.className = 'toast';
        if (type === 'success') {
            this.toast.style.background = '#28a745';
        } else if (type === 'error') {
            this.toast.style.background = '#dc3545';
        } else if (type === 'warning') {
            this.toast.style.background = '#ffc107';
        } else {
            this.toast.style.background = '#333';
        }
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    cleanup() {
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }
        if (this.quotaUpdateInterval) {
            clearInterval(this.quotaUpdateInterval);
        }
        if (this.securityCodeTimerInterval) {
            clearInterval(this.securityCodeTimerInterval);
        }
        if (this.maintenanceCheckInterval) {
            clearInterval(this.maintenanceCheckInterval);
        }
        if (this.deleteCodeTimer) {
            clearInterval(this.deleteCodeTimer);
        }
    }
}

window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
});

window.addEventListener('beforeunload', () => {
    if (window.virtualPhoneGenerator) {
        window.virtualPhoneGenerator.cleanup();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.virtualPhoneGenerator = new VirtualPhoneGenerator();
    } catch (error) {
        alert('系统初始化失败，请刷新页面');
    }
});