const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 8080;
const HOST = '0.0.0.0';
const saltRounds = 10;

// 加密配置
const ENCRYPTION_KEY = '65b4b217e80c9d27d65082695e05da097d5a87acccc67a0f4872df949971bdb4';
const IV_LENGTH = 16; // 16字节IV

// 加密函数
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 解密函数
function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}



// 维护模式检查函数（适配UTC+8北京时间）
function isMaintenanceTime() {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 21 && hours < 22; // 北京时间 21:00-22:00
}

// 维护中间件
app.use((req, res, next) => {
    if (isMaintenanceTime()) {
        console.log(`维护中，拒绝请求: ${req.path}`);
        return res.status(503)
            .set('Retry-After', 3600)
            .set('Cache-Control', 'no-cache')
            .sendFile(path.join(__dirname, 'public', '404.html'));
    }
    next();
});

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// 创建data目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// 用户数据存储文件路径
const DATA_FILE = path.join(DATA_DIR, 'gameData.json');

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ 
        users: {}, 
        loginAttempts: {}, 
        phoneVerification: {},
        registerVerification: {} 
    }, null, 2));
}

// 生成6位数验证码
function generateCaptcha() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 获取游戏数据
function getGameData() {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('读取数据文件失败:', error);
        const defaultData = { 
            users: {}, 
            loginAttempts: {}, 
            phoneVerification: {},
            registerVerification: {} 
        };
        saveGameData(defaultData);
        return defaultData;
    }
}

// 保存游戏数据
function saveGameData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('保存数据文件失败:', error);
        throw error;
    }
}

// 获取更新日志
app.get('/api/changelog', (req, res) => {
    try {
        const changelog = fs.readFileSync(path.join(__dirname, 'public', 'changelog.json'), 'utf8');
        res.json(JSON.parse(changelog));
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: '无法获取更新日志'
        });
    }
});


// 获取隐私政策
app.get('/api/privacy-policy', (req, res) => {
    try {
        const privacyPolicy = fs.readFileSync(path.join(__dirname, 'public', 'privacy-policy.json'), 'utf8');
        res.json(JSON.parse(privacyPolicy));
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: '无法获取隐私政策'
        });
    }
});

// 注册接口
app.post('/api/register', async (req, res) => {
    const { username, password, idCard, captcha } = req.body;
    
    if (!username || !password || !idCard || !captcha) {
        return res.status(400).json({ 
            success: false,
            message: '请填写完整信息' 
        });
    }
    
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
        return res.status(400).json({ 
            success: false,
            message: '请输入有效的18位身份证号' 
        });
    }
    
    const gameData = getGameData();
    
    // 初始化注册验证码存储
    if (!gameData.registerVerification) {
        gameData.registerVerification = {};
    }
    
    const verification = gameData.registerVerification[username];
    
    if (!verification || verification.captcha !== captcha) {
        return res.status(400).json({ 
            success: false,
            message: '验证码错误' 
        });
    }
    
    // 检查验证码是否过期
    if (verification.expires < Date.now()) {
        return res.status(400).json({ 
            success: false,
            message: '验证码已过期，请重新获取' 
        });
    }
    
    if (gameData.users[username]) {
        return res.status(400).json({ 
            success: false,
            message: '用户名已存在' 
        });
    }
    
    try {
        // 加密敏感数据
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const encryptedIdCard = encrypt(idCard);
        
        gameData.users[username] = { 
            password: hashedPassword, 
            idCard: encryptedIdCard,
            bestScore: 0,
            phone: null,
            phoneVerified: false
        };
        
        // 清除验证码
        delete gameData.registerVerification[username];
        
        saveGameData(gameData);
        
        res.json({ 
            success: true,
            message: '注册成功' 
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ 
            success: false,
            message: '注册失败，请重试' 
        });
    }
});

// 发送注册验证码
app.post('/api/send-register-code', (req, res) => {
    const { username, idCard } = req.body;
    
    if (!username || !idCard) {
        return res.status(400).json({ 
            success: false,
            message: '用户名和身份证号不能为空' 
        });
    }
    
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
        return res.status(400).json({ 
            success: false,
            message: '请输入有效的18位身份证号' 
        });
    }
    
    const gameData = getGameData();
    
    // 初始化注册验证码存储
    if (!gameData.registerVerification) {
        gameData.registerVerification = {};
    }
    
    const verificationCode = generateCaptcha();
    gameData.registerVerification[username] = {
        idCard,
        captcha: verificationCode,
        expires: Date.now() + 300000 // 5分钟后过期
    };
    
    saveGameData(gameData);
    
    // 实际项目中这里应该调用短信服务发送验证码
    console.log(`发送注册验证码给用户 ${username}: ${verificationCode}`);
    
    res.json({ 
        success: true,
        message: '验证码已发送',
        captcha: verificationCode
    });
});

// 获取新注册验证码
app.post('/api/new-register-captcha', (req, res) => {
    const { username } = req.body;
    
    const gameData = getGameData();
    
    if (!gameData.registerVerification) {
        gameData.registerVerification = {};
    }
    
    if (!gameData.registerVerification[username]) {
        return res.status(400).json({ 
            success: false,
            message: '请先获取验证码' 
        });
    }
    
    gameData.registerVerification[username].captcha = generateCaptcha();
    saveGameData(gameData);
    
    res.json({
        success: true,
        captcha: gameData.registerVerification[username].captcha
    });
});

// 发送手机验证码
app.post('/api/send-phone-code', (req, res) => {
    const { username, phone } = req.body;
    
    if (!username || !phone) {
        return res.status(400).json({ 
            success: false,
            message: '用户名和手机号不能为空' 
        });
    }
    
    const gameData = getGameData();
    
    if (!gameData.users[username]) {
        return res.status(404).json({ 
            success: false,
            message: '用户不存在' 
        });
    }
    
    // 初始化手机验证码存储
    if (!gameData.phoneVerification) {
        gameData.phoneVerification = {};
    }
    
    const verificationCode = generateCaptcha();
    gameData.phoneVerification[username] = {
        phone,
        code: verificationCode,
        expires: Date.now() + 300000 // 5分钟后过期
    };
    
    saveGameData(gameData);
    
    // 实际项目中这里应该调用短信服务发送验证码
    console.log(`发送验证码到手机 ${phone}: ${verificationCode}`);
    
    res.json({ 
        success: true,
        message: '验证码已发送'
    });
});

// 验证手机号
app.post('/api/verify-phone', (req, res) => {
    const { username, code } = req.body;
    
    if (!username || !code) {
        return res.status(400).json({ 
            success: false,
            message: '用户名和验证码不能为空' 
        });
    }
    
    const gameData = getGameData();
    
    if (!gameData.users[username]) {
        return res.status(404).json({ 
            success: false,
            message: '用户不存在' 
        });
    }
    
    if (!gameData.phoneVerification || !gameData.phoneVerification[username]) {
        return res.status(400).json({ 
            success: false,
            message: '请先获取验证码' 
        });
    }
    
    const verification = gameData.phoneVerification[username];
    
    // 检查验证码是否过期
    if (verification.expires < Date.now()) {
        return res.status(400).json({ 
            success: false,
            message: '验证码已过期，请重新获取' 
        });
    }
    
    // 检查验证码是否正确
    if (verification.code !== code) {
        return res.status(400).json({ 
            success: false,
            message: '验证码错误' 
        });
    }
    
    // 验证成功，绑定手机号
    gameData.users[username].phone = verification.phone;
    gameData.users[username].phoneVerified = true;
    delete gameData.phoneVerification[username];
    
    saveGameData(gameData);
    
    res.json({ 
        success: true,
        message: '手机号绑定成功'
    });
});

// 修改密码接口
app.post('/api/change-password', async (req, res) => {
    const { username, code, newPassword } = req.body;
    
    if (!username || !code || !newPassword) {
        return res.status(400).json({ 
            success: false,
            message: '请填写完整信息' 
        });
    }
    
    const gameData = getGameData();
    
    if (!gameData.users[username]) {
        return res.status(404).json({ 
            success: false,
            message: '用户不存在' 
        });
    }
    
    if (!gameData.phoneVerification || !gameData.phoneVerification[username]) {
        return res.status(400).json({ 
            success: false,
            message: '请先获取验证码' 
        });
    }
    
    const verification = gameData.phoneVerification[username];
    
    // 检查验证码是否过期
    if (verification.expires < Date.now()) {
        return res.status(400).json({ 
            success: false,
            message: '验证码已过期，请重新获取' 
        });
    }
    
    // 检查验证码是否正确
    if (verification.code !== code) {
        return res.status(400).json({ 
            success: false,
            message: '验证码错误' 
        });
    }
    
    try {
        // 更新密码
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        gameData.users[username].password = hashedPassword;
        
        // 清除验证码
        delete gameData.phoneVerification[username];
        
        saveGameData(gameData);
        
        res.json({ 
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ 
            success: false,
            message: '修改密码失败，请重试' 
        });
    }
});

// 登录接口
app.post('/api/login', async (req, res) => {
    const { username, password, captcha } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false,
            message: '用户名和密码不能为空' 
        });
    }
    
    const gameData = getGameData();
    
    if (!gameData.loginAttempts) {
        gameData.loginAttempts = {};
    }
    
    if (!gameData.loginAttempts[username]) {
        gameData.loginAttempts[username] = { 
            count: 0, 
            captcha: '' 
        };
    }
    
    const attempts = gameData.loginAttempts[username];
    
    if (attempts.count >= 5) {
        if (!captcha) {
            attempts.captcha = generateCaptcha();
            saveGameData(gameData);
            return res.status(403).json({ 
                success: false,
                message: '需要验证码',
                captchaRequired: true,
                captcha: attempts.captcha
            });
        }
        
        if (captcha !== attempts.captcha) {
            return res.status(403).json({ 
                success: false,
                message: '验证码错误',
                captchaRequired: true
            });
        }
        
        attempts.count = 0;
        attempts.captcha = '';
        saveGameData(gameData);
    }
    
    const user = gameData.users[username];
    
    if (!user) {
        attempts.count++;
        saveGameData(gameData);
        return res.status(401).json({ 
            success: false,
            message: '用户名或密码错误',
            attemptsLeft: 5 - attempts.count
        });
    }
    
    try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            attempts.count++;
            saveGameData(gameData);
            return res.status(401).json({ 
                success: false,
                message: '用户名或密码错误',
                attemptsLeft: 5 - attempts.count
            });
        }
        
        attempts.count = 0;
        saveGameData(gameData);
        
        res.json({ 
            success: true,
            message: '登录成功',
            bestScore: user.bestScore || 0,
            phone: user.phone,
            phoneVerified: user.phoneVerified || false
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ 
            success: false,
            message: '登录失败，请重试' 
        });
    }
});

// 获取新验证码
app.post('/api/new-captcha', (req, res) => {
    const { username } = req.body;
    
    const gameData = getGameData();
    
    if (!gameData.loginAttempts[username]) {
        gameData.loginAttempts[username] = { 
            count: 0, 
            captcha: '' 
        };
    }
    
    gameData.loginAttempts[username].captcha = generateCaptcha();
    saveGameData(gameData);
    
    res.json({
        success: true,
        captcha: gameData.loginAttempts[username].captcha
    });
});

// 更新最高分接口
app.post('/api/update-score', (req, res) => {
    const { username, score } = req.body;
    
    const gameData = getGameData();
    
    if (!gameData.users[username]) {
        return res.status(404).json({ 
            success: false,
            message: '用户不存在' 
        });
    }
    
    gameData.users[username].bestScore = Math.max(gameData.users[username].bestScore || 0, score);
    saveGameData(gameData);
    
    res.json({ 
        success: true, 
        bestScore: gameData.users[username].bestScore 
    });
});

// 获取用户信息
app.get('/api/user-info', (req, res) => {
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({ 
            success: false,
            message: '用户名不能为空' 
        });
    }
    
    const gameData = getGameData();
    
    if (!gameData.users[username]) {
        return res.status(404).json({ 
            success: false,
            message: '用户不存在' 
        });
    }
    
    const user = gameData.users[username];
    res.json({ 
        success: true,
        username,
        bestScore: user.bestScore || 0,
        phone: user.phone || null,
        phoneVerified: user.phoneVerified || false,
        registerDate: user.registerDate || '未知' // 添加注册日期信息
    });
});



// 404处理
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('服务器内部错误');
});

app.listen(PORT, HOST, () => {
    console.log(`服务器运行在 http://${HOST}:${PORT}`);

});