class VirtualPhoneGenerator {
    constructor() {
        this.apiBase = 'http://localhost:5000/api';
        this.tcAppId = '1314462072';
        this.initElements();
        this.bindEvents();
        this.loadStats();
        this.loadIPInfo();
        this.loadClientStats();
        
        this.currentPhoneNumber = null;
        this.currentSecurityCode = null;
        this.hasGeneratedCode = false;
        this.currentCarrier = null;
        this.cooldownTimer = null;
        this.cooldownEndTime = null;
        
        this.preventCopy();
        this.setupSecurityCodeProtection();
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
        
        this.cooldownDisplay = document.createElement('div');
        this.cooldownDisplay.className = 'cooldown-display';
        this.cooldownDisplay.style.display = 'none';
        this.cooldownDisplay.style.marginTop = '10px';
        this.cooldownDisplay.style.fontSize = '0.9rem';
        this.cooldownDisplay.style.color = '#dc3545';
        this.generateBtn.parentNode.appendChild(this.cooldownDisplay);
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateNumber());
        this.generateCodeBtn.addEventListener('click', () => this.generateSecurityCode());
        this.verifyBtn.addEventListener('click', () => this.initTencentCaptcha());
        this.copyMaskedBtn.addEventListener('click', () => this.showVerifyPrompt());
        
        this.securityCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.initTencentCaptcha();
            }
        });

        this.securityCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    setupSecurityCodeProtection() {
        const securityCodeElement = this.securityCode;
        
        // 存储真实的安全码值
        let realSecurityCode = '';
        let isCodeGenerated = false;
        
        // 重写 textContent 的 setter 和 getter
        const originalTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
        
        Object.defineProperty(securityCodeElement, 'textContent', {
            get: function() {
                if (!isCodeGenerated) {
                    return originalTextContent.get.call(this);
                }
                return '******';
            },
            set: function(value) {
                originalTextContent.set.call(this, value);
                
                if (value === '点击钥匙图标生成' || value === '已使用') {
                    isCodeGenerated = false;
                    realSecurityCode = '';
                } else if (value && value.length === 6 && /^[A-Z0-9]{6}$/.test(value)) {
                    realSecurityCode = value;
                    isCodeGenerated = true;
                    originalTextContent.set.call(this, '******');
                }
            },
            configurable: true
        });
        
        // 重写 innerText 的 setter 和 getter
        Object.defineProperty(securityCodeElement, 'innerText', {
            get: function() {
                return this.textContent;
            },
            set: function(value) {
                this.textContent = value;
            },
            configurable: true
        });
        
        // 重写 innerHTML 的 setter 和 getter
        Object.defineProperty(securityCodeElement, 'innerHTML', {
            get: function() {
                return this.textContent;
            },
            set: function(value) {
                this.textContent = value;
            },
            configurable: true
        });
        
        // 阻止复制、剪切等操作
        securityCodeElement.addEventListener('copy', (e) => {
            e.preventDefault();
            return false;
        });
        
        securityCodeElement.addEventListener('cut', (e) => {
            e.preventDefault();
            return false;
        });
        
        securityCodeElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // 保护元素的子节点
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.TEXT_NODE && isCodeGenerated) {
                            node.textContent = '******';
                        }
                    }
                } else if (mutation.type === 'characterData') {
                    if (isCodeGenerated && mutation.target.textContent !== '******') {
                        mutation.target.textContent = '******';
                    }
                }
            }
        });
        
        observer.observe(securityCodeElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
        
        // 添加数据属性来存储安全码的真实值
        this.securityCode.setRealValue = function(value) {
            realSecurityCode = value;
            isCodeGenerated = true;
            this.textContent = value;
        };
        
        this.securityCode.markAsUsed = function() {
            realSecurityCode = '';
            isCodeGenerated = false;
            this.textContent = '已使用';
        };
    }

    async loadIPInfo() {
        try {
            const response = await fetch(`${this.apiBase}/ip-info`);
            const data = await response.json();
            
            if (data.success) {
                this.serverIp.textContent = data.server_ip;
                this.clientIp.textContent = data.client_ip;
            }
        } catch (error) {
            console.error('加载IP信息失败:', error);
            this.serverIp.textContent = '获取失败';
            this.clientIp.textContent = '获取失败';
        }
    }

    async loadClientStats() {
        try {
            const response = await fetch(`${this.apiBase}/client-info`);
            const data = await response.json();
            
            if (data.success) {
                this.clientTotalCount.textContent = data.stats.total_generated;
                this.clientUsedCount.textContent = data.stats.total_used;
                this.clientAvailableCount.textContent = data.stats.available;
            }
        } catch (error) {
            console.error('加载客户端统计数据失败:', error);
        }
    }

    preventCopy() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x')) {
                const selected = window.getSelection();
                if (selected && selected.toString().includes('******')) {
                    e.preventDefault();
                }
            }
        });
    }

    async generateNumber() {
        try {
            this.generateBtn.disabled = true;
            this.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';

            const response = await fetch(`${this.apiBase}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                this.displayGeneratedNumber(data.phone_number, data.masked_phone, data.carrier);
                this.showToast('手机号生成成功！', 'success');
                this.cooldownDisplay.style.display = 'none';
                if (this.cooldownTimer) {
                    clearInterval(this.cooldownTimer);
                    this.cooldownTimer = null;
                }
                this.loadClientStats();
            } else {
                if (response.status === 429 && data.cooldown) {
                    this.startCooldown(data.cooldown);
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
        this.maskedPhone.textContent = maskedPhone;
        this.currentPhoneNumber = phoneNumber;
        this.currentSecurityCode = null;
        this.hasGeneratedCode = false;
        this.currentCarrier = carrier;
        
        this.carrierName.textContent = carrier || '未知';
        this.securityCode.textContent = '点击钥匙图标生成';
        this.securityCodeInput.value = '';
        this.verifyContainer.classList.add('hidden');
        this.resultContainer.classList.remove('hidden');
        
        this.copyMaskedBtn.innerHTML = '<i class="far fa-copy"></i>';
        this.copyMaskedBtn.title = '复制完整号码';
        this.copyMaskedBtn.disabled = false;
        this.copyMaskedBtn.classList.remove('btn-copy-success');
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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_number: this.currentPhoneNumber }),
            });

            const data = await response.json();

            if (data.success) {
                this.currentSecurityCode = data.security_code;
                this.securityCode.setRealValue(data.security_code);
                this.hasGeneratedCode = true;
                
                this.showToast('安全码生成成功！', 'success');
                
                this.verifyContainer.classList.remove('hidden');
            } else {
                this.showToast(`生成安全码失败: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`生成安全码失败: ${error.message}`, 'error');
        } finally {
            this.generateCodeBtn.disabled = false;
            this.generateCodeBtn.innerHTML = '<i class="fas fa-key"></i>';
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

        this.verifyContainer.classList.remove('hidden');
        this.securityCodeInput.focus();
    }

    initTencentCaptcha() {
        if (!this.currentPhoneNumber) {
            this.showToast('手机号不存在', 'error');
            return;
        }

        const code = this.securityCodeInput.value.trim().toUpperCase();
        
        if (!code || code.length !== 6) {
            this.showToast('请输入6位安全码', 'error');
            return;
        }

        const captcha = new TencentCaptcha(this.tcAppId, (res) => {
            if (res.ret === 0) {
                this.verifyAndCopy(code, res.ticket, res.randstr);
            } else {
                this.showToast('验证失败，请重试', 'error');
                this.verifyBtn.disabled = false;
                this.verifyBtn.innerHTML = '<i class="fas fa-check"></i> 验证并复制完整号码';
            }
        });

        captcha.show();
        
        this.verifyBtn.disabled = true;
        this.verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 验证中...';
    }

    async verifyAndCopy(code, ticket, randstr) {
        try {
            const response = await fetch(`${this.apiBase}/verify-copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                this.securityCodeInput.value = '';
                this.verifyContainer.classList.add('hidden');
                
                this.copyMaskedBtn.disabled = true;
                this.copyMaskedBtn.innerHTML = '<i class="fas fa-check" style="color: #28a745;"></i>';
                this.copyMaskedBtn.title = '已使用';
                this.copyMaskedBtn.classList.add('btn-copy-success');
                
                this.markSecurityCodeAsUsed();
                this.loadClientStats();
            } else {
                this.showToast(`验证失败: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`验证失败: ${error.message}`, 'error');
        } finally {
            this.verifyBtn.disabled = false;
            this.verifyBtn.innerHTML = '<i class="fas fa-check"></i> 验证并复制完整号码';
            this.loadStats();
        }
    }

    markSecurityCodeAsUsed() {
        if (this.securityCode && this.securityCode.markAsUsed) {
            this.securityCode.markAsUsed();
            this.securityCode.style.color = '#6c757d';
            this.securityCode.style.opacity = '0.7';
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
            
            if (data.success) {
                this.totalCount.textContent = data.stats.total;
                this.usedCount.textContent = data.stats.used;
                this.availableCount.textContent = data.stats.available;
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = 'toast';
        
        if (type === 'success') {
            this.toast.style.background = '#28a745';
        } else if (type === 'error') {
            this.toast.style.background = '#dc3545';
        } else {
            this.toast.style.background = '#333';
        }
        
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VirtualPhoneGenerator();
});