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
        this.currentAgreementVersion = '5.0';
        this.customPrefix = '';
        this.quotaInfo = null;
        this.quotaUpdateInterval = null;
        this.securityCodeTimer = null;
        this.securityCodeExpiryTime = null;
        
        this.initElements();
        this.bindEvents();
        this.checkAgreement();
        this.preventSecurityCodeCopy();
        this.setupQuotaMonitor();
    }

    setupQuotaMonitor() {
        this.quotaUpdateInterval = setInterval(() => {
            this.loadQuotaInfo();
        }, 60000);
        
        this.loadQuotaInfo();
    }

    async loadQuotaInfo() {
        try {
            const response = await fetch(`${this.apiBase}/quota`);
            const data = await response.json();
            
            if (data.success) {
                this.quotaInfo = data.quota;
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
        const percentage = Math.round((used / this.quotaInfo.limit) * 100);
        
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
        
        quotaDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; background: #f8f9fa; padding: 8px 12px; border-radius: 6px;">
                <i class="fas fa-tachometer-alt" style="color: #667eea;"></i>
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; color: #666;">配额使用: ${used}/${this.quotaInfo.limit}</div>
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
        
        if (isUpdate) {
            updateContent.style.display = 'block';
            modal.querySelector('.agreement-header h2').textContent = '用户协议更新确认';
            modal.querySelector('.agreement-header p').textContent = '检测到用户协议有重要更新，请仔细阅读更新内容';
        } else {
            updateContent.style.display = 'none';
            modal.querySelector('.agreement-header h2').textContent = '用户协议确认';
            modal.querySelector('.agreement-header p').textContent = '请仔细阅读并同意以下条款以继续使用本服务';
        }
        
        function updateAgreeButton() {
            agreeBtn.disabled = !(agreeTermsCheckbox.checked && readPrivacyCheckbox.checked);
        }
        
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
        this.loadClientStats();
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.loadStats();
                this.loadClientStats();
                this.loadQuotaInfo();
            }
        });
        
        setInterval(() => {
            this.loadStats();
            this.loadClientStats();
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
        this.customPrefixInput = document.getElementById('custom-prefix-input');
        this.generateRandomBtn = document.getElementById('generate-random-btn');
        this.purposeInput = document.getElementById('purpose-input');
        this.prefixType = document.getElementById('prefix-type');
        this.prefixInfoDisplay = document.getElementById('prefix-info-display');
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
            
            const customPrefixContainer = document.getElementById('custom-prefix-container');
            if (customPrefixContainer && customPrefixContainer.parentNode) {
                customPrefixContainer.parentNode.insertBefore(quotaDisplay, customPrefixContainer);
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
        if (this.generateRandomBtn) {
            this.generateRandomBtn.addEventListener('click', () => {
                this.customPrefix = '';
                if (this.customPrefixInput) this.customPrefixInput.value = '';
            });
        }
        
        if (this.customPrefixInput) {
            this.customPrefixInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length > 3) {
                    e.target.value = e.target.value.slice(0, 3);
                }
                this.customPrefix = e.target.value;
            });
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
            const response = await fetch(`${this.apiBase}/ip-info`);
            const data = await response.json();
            
            if (data.success && this.serverIp && this.clientIp) {
                this.serverIp.textContent = data.server_ip;
                this.clientIp.textContent = data.client_ip;
            }
        } catch (error) {
            if (this.serverIp) this.serverIp.textContent = '获取失败';
            if (this.clientIp) this.clientIp.textContent = '获取失败';
        }
    }

    async loadClientStats() {
        try {
            const response = await fetch(`${this.apiBase}/client-info`);
            
            const data = await response.json();
            
            if (data.success && this.clientTotalCount && this.clientUsedCount && this.clientAvailableCount) {
                this.clientTotalCount.textContent = data.stats.total_generated;
                this.clientUsedCount.textContent = data.stats.total_used;
                this.clientAvailableCount.textContent = data.stats.available;
            }
        } catch (error) {
        }
    }

    async generateNumber() {
        try {
            if (this.customPrefixInput && this.customPrefixInput.value.length === 3) {
                this.customPrefix = this.customPrefixInput.value;
            } else {
                this.customPrefix = '';
            }
            
            this.generateBtn.disabled = true;
            this.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';

            const response = await fetch(`${this.apiBase}/custom/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    custom_prefix: this.customPrefix,
                    purpose: this.currentPurpose
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayGeneratedNumber(data.phone_number, data.masked_phone, data.carrier, data.custom_prefix);
                this.showToast(`手机号生成成功！${data.custom_prefix === '随机' ? '随机号段' : '自定义号段'}`, 'success');
                this.cooldownDisplay.style.display = 'none';
                if (this.cooldownTimer) {
                    clearInterval(this.cooldownTimer);
                    this.cooldownTimer = null;
                }
                this.loadClientStats();
                this.loadQuotaInfo();
                
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

    displayGeneratedNumber(phoneNumber, maskedPhone, carrier, prefixType) {
        if (!this.maskedPhone || !this.securityCode) return;
        
        this.maskedPhone.textContent = maskedPhone;
        this.currentPhoneNumber = phoneNumber;
        this.currentSecurityCode = null;
        this.hasGeneratedCode = false;
        this.currentCarrier = carrier;
        
        this.stopSecurityCodeTimer();
        
        if (this.carrierName) this.carrierName.textContent = carrier || '未知';
        if (this.prefixType) this.prefixType.textContent = prefixType;
        if (this.prefixInfoDisplay) this.prefixInfoDisplay.style.display = 'block';
        
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
        if (!this.currentPhoneNumber) return;
        
        try {
            const response = await fetch(`${this.apiBase}/check-code-expiry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone_number: this.currentPhoneNumber }),
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
        if (!this.currentPhoneNumber) {
            this.showToast('请先生成手机号', 'error');
            return;
        }

        try {
            this.generateCodeBtn.disabled = true;
            this.generateCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const response = await fetch(`${this.apiBase}/generate-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone_number: this.currentPhoneNumber }),
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

        if (code !== this.currentSecurityCode) {
            this.showToast('安全码错误，请重新输入', 'error');
            this.securityCodeInput.focus();
            this.securityCodeInput.select();
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    phone_number: this.currentPhoneNumber,
                    security_code: code,
                    captcha_ticket: ticket,
                    captcha_randstr: randstr
                }),
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
                this.loadClientStats();
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