from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
import json
import os
import hashlib
import random
from datetime import datetime, timedelta
import secrets
import base64
import requests
import re
import string

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = 'd7a3f4c6e5b81290de4f3c2a1b0987654321fedcba0987654321abcdef567890'
CORS(app)

DATA_FILE = 'data/gamedata.json'
HISTORY_FILE = 'data/history.json'
ANTI_FILE = 'data/Anti.json'

LOTTERY_TYPES = {
    "standard": {
        "name": "经典刮刮乐",
        "price": 12,
        "description": "基础彩票，适合新手体验",
        "icon": "🎫",
        "prizes": [
            {"name": "特等奖", "amount": 1250000, "probability": 0.0100, "color": "#FFD700"},
            {"name": "一等奖", "amount": 125000, "probability": 0.0170, "color": "#FF6B6B"},
            {"name": "二等奖", "amount": 12500, "probability": 0.0240, "color": "#4ECDC4"},
            {"name": "三等奖", "amount": 1250, "probability": 0.0310, "color": "#95E77E"},
            {"name": "幸运奖", "amount": 125, "probability": 0.0380, "color": "#7EC8E3"},
            {"name": "鼓励奖", "amount": 62.5, "probability": 0.0400, "color": "#FFA07A"},
            {"name": "参与奖", "amount": 25, "probability": 0.11, "color": "#DDA0DD"},
            {"name": "未中奖", "amount": 0, "probability": 0.73, "color": "#CCCCCC"}
        ]
    },
    "premium": {
        "name": "豪华大乐透",
        "price": 65,
        "description": "高投入高回报，中奖概率提升",
        "icon": "💰",
        "prizes": [
            {"name": "头等奖", "amount": 6250000, "probability": 0.0100, "color": "#FFD700"},
            {"name": "超级奖", "amount": 625000, "probability": 0.0152, "color": "#FF6B6B"},
            {"name": "大奖", "amount": 62500, "probability": 0.0187, "color": "#4ECDC4"},
            {"name": "中奖", "amount": 6250, "probability": 0.0225, "color": "#95E77E"},
            {"name": "小奖", "amount": 625, "probability": 0.0336, "color": "#7EC8E3"},
            {"name": "幸运奖", "amount": 125, "probability": 0.07, "color": "#FFA07A"},
            {"name": "未中奖", "amount": 0, "probability": 0.83, "color": "#CCCCCC"}
        ]
    },
    "quick": {
        "name": "急速3D",
        "price": 28,
        "description": "快速开奖，中小奖机会多",
        "icon": "⚡",
        "prizes": [
            {"name": "豹子奖", "amount": 62500, "probability": 0.0100, "color": "#FFD700"},
            {"name": "顺子奖", "amount": 12500, "probability": 0.0283, "color": "#FF6B6B"},
            {"name": "对子奖", "amount": 1250, "probability": 0.0417, "color": "#4ECDC4"},
            {"name": "数字奖", "amount": 250, "probability": 0.0595, "color": "#95E77E"},
            {"name": "幸运奖", "amount": 62.5, "probability": 0.0805, "color": "#7EC8E3"},
            {"name": "参与奖", "amount": 30, "probability": 0.11, "color": "#FFA07A"},
            {"name": "未中奖", "amount": 0, "probability": 0.67, "color": "#CCCCCC"}
        ]
    },
    "new": {
        "name": "幸运21点",
        "price": 21,
        "description": "新上线彩票，中奖概率21%",
        "icon": "🎲",
        "prizes": [
            {"name": "头奖", "amount": 50000, "probability": 0.0100, "color": "#FFD700"},
            {"name": "二等奖", "amount": 5000, "probability": 0.0142, "color": "#FF6B6B"},
            {"name": "三等奖", "amount": 1000, "probability": 0.0175, "color": "#4ECDC4"},
            {"name": "四等奖", "amount": 500, "probability": 0.0208, "color": "#95E77E"},
            {"name": "五等奖", "amount": 250, "probability": 0.0240, "color": "#7EC8E3"},
            {"name": "六等奖", "amount": 100, "probability": 0.0275, "color": "#FFA07A"},
            {"name": "幸运奖", "amount": 50, "probability": 0.0310, "color": "#DDA0DD"},
            {"name": "参与奖", "amount": 25, "probability": 0.065, "color": "#9370DB"},
            {"name": "未中奖", "amount": 0, "probability": 0.79, "color": "#CCCCCC"}
        ]
    },
    "god": {
        "name": "神豪彩票",
        "base_price": 200,
        "premium_price": 3000,
        "description": "至尊享受，必中大奖！前2张200元，之后8,000元/张，终身限购10张",
        "icon": "👑",
        "max_discount_purchases": 2,
        "max_total_purchases": 10,
        "prizes": [
             {"name": "神豪特等奖", "amount": 500000000, "probability": 0.0100, "color": "#FF4500"},
             {"name": "神豪一等奖", "amount": 200000000, "probability": 0.0105, "color": "#FF6347"},
             {"name": "神豪二等奖", "amount": 60000000, "probability": 0.0110, "color": "#FF8C00"},
             {"name": "神豪三等奖", "amount": 20000000, "probability": 0.0118, "color": "#FFD700"},
             {"name": "神豪四等奖", "amount": 5000000, "probability": 0.0125, "color": "#FF69B4"},
             {"name": "神豪五等奖", "amount": 1000000, "probability": 0.0135, "color": "#DA70D6"},
             {"name": "神豪六等奖", "amount": 500000, "probability": 0.0148, "color": "#9370DB"},
             {"name": "神豪七等奖", "amount": 300000, "probability": 0.0160, "color": "#6495ED"},
             {"name": "神豪八等奖", "amount": 150000, "probability": 0.0175, "color": "#00BFFF"},
             {"name": "神豪九等奖", "amount": 80000, "probability": 0.0195, "color": "#00CED1"},
             {"name": "神豪十等奖", "amount": 60000, "probability": 0.0220, "color": "#32CD32"},
             {"name": "神豪十一等奖", "amount": 40000, "probability": 0.0250, "color": "#9ACD32"},
             {"name": "神豪十二等奖", "amount": 32000, "probability": 0.0285, "color": "#FFD700"},
             {"name": "神豪十三等奖", "amount": 28000, "probability": 0.0473, "color": "#FFB6C1"},
             {"name": "神豪十四等奖", "amount": 22000, "probability": 0.0518, "color": "#87CEEB"},
             {"name": "神豪十五等奖", "amount": 18000, "probability": 0.0568, "color": "#98FB98"},
             {"name": "神豪十六等奖", "amount": 12000, "probability": 0.0623, "color": "#D3D3D3"},
             {"name": "神豪十七等奖", "amount": 8000, "probability": 0.0692, "color": "#F0E68C"},
             {"name": "神豪十八等奖", "amount": 5000, "probability": 0.5, "color": "#E6E6FA"}
        ]
    },
    "lucky_king": {
        "name": "欧皇奖",
        "price": 5000,
        "description": "欧皇专属，超高价值！必中万元大奖，0.5%概率获得500万特等奖",
        "icon": "👑🌟",
        "max_total_purchases": 5,
        "prizes": [
            {"name": "欧皇特等奖", "amount": 5000000, "probability": 0.005, "color": "#FFD700"},
            {"name": "欧皇一等奖", "amount": 10000, "probability": 0.995, "color": "#FF6B6B"}
        ]
    }
}

def encrypt_data(data):
    try:
        data_str = json.dumps(data, ensure_ascii=False)
        encoded = base64.b64encode(data_str.encode('utf-8')).decode('utf-8')
        return f"ENC:{encoded}"
    except Exception as e:
        print(f"加密数据失败: {e}")
        return None

def decrypt_data(encrypted_data):
    try:
        if not encrypted_data or not encrypted_data.startswith("ENC:"):
            return None
        
        encoded = encrypted_data[4:]
        decoded = base64.b64decode(encoded).decode('utf-8')
        return json.loads(decoded)
    except Exception as e:
        print(f"解密数据失败: {e}")
        return None

def load_data():
    if not os.path.exists(DATA_FILE):
        return {}
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            raw_data = f.read().strip()
            
            if not raw_data:
                return {}
            
            if raw_data.startswith("ENC:"):
                data = decrypt_data(raw_data)
                if data is None:
                    return {}
            else:
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError:
                    data = decrypt_data(raw_data)
                    if data is None:
                        return {}
            
            for username, user_data in data.items():
                if 'god_lottery_purchases' not in user_data:
                    user_data['god_lottery_purchases'] = 0
                if 'id_verified' not in user_data:
                    user_data['id_verified'] = False
                if 'id_verified_at' not in user_data:
                    user_data['id_verified_at'] = None
                if 'public_welfare_fund' not in user_data:
                    user_data['public_welfare_fund'] = 0.00
                if 'welfare_bonus_given' not in user_data:
                    user_data['welfare_bonus_given'] = 0
                if 'lucky_king_purchases' not in user_data:
                    user_data['lucky_king_purchases'] = 0
                if 'email' not in user_data:
                    user_data['email'] = ''
            
            return data
    except Exception as e:
        print(f"加载数据文件失败: {e}")
        return {}

def save_data(data):
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        
        encrypted_data = encrypt_data(data)
        if encrypted_data is None:
            return False
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            f.write(encrypted_data)
        return True
    except Exception as e:
        print(f"保存数据文件失败: {e}")
        return False

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return {}
    
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        try:
            raw_data = f.read().strip()
            
            if not raw_data:
                return {}
            
            if raw_data.startswith("ENC:"):
                data = decrypt_data(raw_data)
                if data is None:
                    return {}
            else:
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError as e:
                    print(f"历史记录JSON解码错误: {e}")
                    return {}
            
            return data
        except Exception as e:
            print(f"加载历史记录失败: {e}")
            return {}

def save_history(history_data):
    try:
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        
        encrypted_data = encrypt_data(history_data)
        if encrypted_data is None:
            return False
        
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write(encrypted_data)
        return True
    except Exception as e:
        print(f"保存历史记录失败: {e}")
        return False

def load_anti():
    if not os.path.exists(ANTI_FILE):
        return {}
    
    try:
        with open(ANTI_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载防伪码文件失败: {e}")
        return {}

def save_anti(anti_data):
    try:
        os.makedirs(os.path.dirname(ANTI_FILE), exist_ok=True)
        
        with open(ANTI_FILE, 'w', encoding='utf-8') as f:
            json.dump(anti_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存防伪码文件失败: {e}")
        return False

def generate_anti_code(lottery_type):
    anti_prefix = {
        "god": "1561",
        "new": "1825", 
        "standard": "0185",
        "premium": "1691",
        "quick": "0985",
        "lucky_king": "1024"
    }
    
    prefix = anti_prefix.get(lottery_type, "0000")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    anti_code = prefix + random_part
    
    anti_data = load_anti()
    
    while anti_code in anti_data:
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        anti_code = prefix + random_part
    
    return anti_code

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def calculate_tax(amount):
    if amount > 4000:
        taxable_amount = amount - 4000
        tax_rate = 0.22
        welfare_rate = 0.02
        income_tax_rate = 0.20
        
        tax = taxable_amount * tax_rate
        welfare_fund = taxable_amount * welfare_rate
        income_tax = taxable_amount * income_tax_rate
        
        net_amount = amount - tax
        return net_amount, tax, welfare_fund, income_tax
    return amount, 0, 0, 0

def format_amount(amount):
    if amount is None:
        return "0元"
    
    try:
        amount = float(amount)
        if amount >= 100000:
            return f"{amount/10000:.2f}万元"
        else:
            return f"{amount:.2f}元"
    except:
        return f"{amount}元"

def verify_tencent_captcha(ticket, randstr, user_ip=None):
    try:
        url = "https://ssl.captcha.qq.com/ticket/verify"
        params = {
            'aid': '1314462072',
            'AppSecretKey': 'VpywwjKhz86rOiohNp46vXaQ3TfdT7Xk',
            'Ticket': ticket,
            'Randstr': randstr,
            'UserIP': user_ip or request.remote_addr
        }
        
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        return data.get('response', '') == '1'
    except Exception as e:
        print(f"验证腾讯云验证码失败: {e}")
        return False

def get_god_lottery_price(god_purchases):
    if god_purchases < LOTTERY_TYPES["god"]["max_discount_purchases"]:
        return LOTTERY_TYPES["god"]["base_price"]
    else:
        return LOTTERY_TYPES["god"]["premium_price"]

def can_buy_god_lottery(god_purchases):
    return god_purchases < LOTTERY_TYPES["god"]["max_total_purchases"]

def can_buy_lucky_king(lucky_king_purchases):
    return lucky_king_purchases < LOTTERY_TYPES["lucky_king"]["max_total_purchases"]

def draw_lottery(lottery_type):
    lottery = LOTTERY_TYPES.get(lottery_type, LOTTERY_TYPES["standard"])
    prizes = lottery["prizes"]
    
    total_prob = sum(prize['probability'] for prize in prizes)
    if abs(total_prob - 1.0) > 0.0001:
        print(f"警告: {lottery_type}彩票概率总和为{total_prob}, 不是1.0")
    
    rand = random.random()
    cumulative = 0
    
    for prize in prizes:
        cumulative += prize['probability']
        if rand <= cumulative:
            return prize, lottery
    
    return prizes[-1], lottery

def get_user_default_data():
    return {
        'password_hash': '',
        'email': '',
        'balance': 200.00,
        'total_tickets_bought': 0,
        'total_winnings': 0,
        'total_tax_paid': 0.00,
        'god_lottery_purchases': 0,
        'id_verified': False,
        'id_verified_at': None,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'last_login': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'lottery_stats': {
            'standard': {'bought': 0, 'winnings': 0},
            'premium': {'bought': 0, 'winnings': 0},
            'quick': {'bought': 0, 'winnings': 0},
            'new': {'bought': 0, 'winnings': 0},
            'god': {'bought': 0, 'winnings': 0},
            'lucky_king': {'bought': 0, 'winnings': 0}
        },
        'public_welfare_fund': 0.00,
        'welfare_bonus_given': 0,
        'lucky_king_purchases': 0
    }

def check_welfare_bonus(user, username):
    welfare_fund = user.get('public_welfare_fund', 0.00)
    welfare_bonus_given = user.get('welfare_bonus_given', 0)
    
    bonus_count = int(welfare_fund // 50000) - welfare_bonus_given
    
    if bonus_count > 0:
        max_total_purchases = LOTTERY_TYPES["god"]["max_total_purchases"] + bonus_count
        LOTTERY_TYPES["god"]["max_total_purchases"] = max_total_purchases
        
        user['welfare_bonus_given'] += bonus_count
        
        users = load_data()
        users[username] = user
        save_data(users)
        
        return True, bonus_count, max_total_purchases
    
    return False, 0, LOTTERY_TYPES["god"]["max_total_purchases"]

@app.route('/')
def index():
    if 'username' not in session:
        return redirect('/login.html')
    return app.send_static_file('index.html')

@app.route('/login.html')
def login_page():
    if 'username' in session:
        return redirect('/')
    return app.send_static_file('login.html')

@app.route('/game.html')
def game_page():
    if 'username' not in session:
        return redirect('/login.html')
    return app.send_static_file('game.html')

@app.route('/identity_verification.html')
def identity_verification_page():
    if 'username' not in session:
        return redirect('/login.html')
    return app.send_static_file('identity_verification.html')

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': '请求数据为空'})
            
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        email = data.get('email', '').strip()
        captcha_ticket = data.get('captcha_ticket', '')
        captcha_randstr = data.get('captcha_randstr', '')
        
        if not username or not password or not email:
            return jsonify({'success': False, 'message': '用户名、邮箱和密码不能为空'})
        
        if not captcha_ticket or not captcha_randstr:
            return jsonify({'success': False, 'message': '请完成安全验证'})
        
        if len(username) < 3:
            return jsonify({'success': False, 'message': '用户名至少3个字符'})
        
        if len(password) < 6:
            return jsonify({'success': False, 'message': '密码至少6个字符'})
        
        if not any(c.isdigit() for c in password) or not any(c.isalpha() for c in password):
            return jsonify({'success': False, 'message': '密码需包含数字和字母'})
        
        if not is_valid_email(email):
            return jsonify({'success': False, 'message': '邮箱格式不正确'})
        
        users = load_data()
        
        if username in users:
            return jsonify({'success': False, 'message': '用户名已存在'})
        
        for user_data in users.values():
            if user_data.get('email') == email:
                return jsonify({'success': False, 'message': '该邮箱已被注册'})
        
        user_data = get_user_default_data()
        user_data['password_hash'] = hash_password(password)
        user_data['email'] = email
        users[username] = user_data
        
        if not save_data(users):
            return jsonify({'success': False, 'message': '保存用户数据失败'})
        
        history_data = load_history()
        history_data[username] = []
        save_history(history_data)
        
        session['username'] = username
        
        return jsonify({
            'success': True,
            'message': '注册成功',
            'balance': users[username]['balance']
        })
    except Exception as e:
        print(f"注册过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': '请求数据为空'})
            
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        captcha_ticket = data.get('captcha_ticket', '')
        captcha_randstr = data.get('captcha_randstr', '')
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'})
        
        users = load_data()
        
        if username in users and users[username]['password_hash'] != hash_password(password):
            if not captcha_ticket or not captcha_randstr:
                return jsonify({'success': False, 'message': '密码错误，请完成安全验证', 'need_captcha': True})
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户名不存在'})
        
        if users[username]['password_hash'] != hash_password(password):
            return jsonify({'success': False, 'message': '密码错误', 'need_captcha': True})
        
        users[username]['last_login'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if not save_data(users):
            print(f"警告: 保存用户{username}的最后登录时间失败")
        
        session['username'] = username
        
        response_data = {
            'success': True,
            'message': '登录成功',
            'balance': users[username]['balance'],
            'id_verified': users[username].get('id_verified', False),
            'email': users[username].get('email', '')
        }
        
        return jsonify(response_data)
    except Exception as e:
        print(f"登录过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.pop('username', None)
        return jsonify({'success': True, 'message': '已登出'})
    except Exception as e:
        print(f"登出过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '登出失败'})

@app.route('/api/delete_account', methods=['POST'])
def delete_account():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': '请求数据为空'})
            
        username = session.get('username')
        if not username:
            return jsonify({'success': False, 'message': '请先登录'})
        
        password = data.get('password', '').strip()
        confirmation = data.get('confirmation', '').strip()
        
        if not password:
            return jsonify({'success': False, 'message': '请输入密码'})
        
        if not confirmation:
            return jsonify({'success': False, 'message': '请输入确认声明'})
        
        if confirmation != '本人自愿注销此账号,所造成的后果均由我本人承担':
            return jsonify({'success': False, 'message': '确认声明不正确'})
        
        users = load_data()
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        if users[username]['password_hash'] != hash_password(password):
            return jsonify({'success': False, 'message': '密码错误'})
        
        if not users[username].get('id_verified', False):
            return jsonify({'success': False, 'message': '账号注销需要先完成身份认证'})
        
        created_at_str = users[username].get('created_at', '')
        if created_at_str:
            try:
                created_at = datetime.strptime(created_at_str, '%Y-%m-%d %H:%M:%S')
                now = datetime.now()
                time_diff = now - created_at
                
                if time_diff < timedelta(hours=2):
                    hours_needed = 2 - time_diff.seconds // 3600
                    minutes_needed = 60 - (time_diff.seconds % 3600) // 60
                    
                    if hours_needed > 0:
                        return jsonify({
                            'success': False, 
                            'message': f'注册时间未满2小时，还需等待{hours_needed}小时{minutes_needed}分钟'
                        })
                    else:
                        return jsonify({
                            'success': False, 
                            'message': f'注册时间未满2小时，还需等待{minutes_needed}分钟'
                        })
            except ValueError as e:
                print(f"解析注册时间失败: {e}")
        
        if username in users:
            del users[username]
        
        if not save_data(users):
            return jsonify({'success': False, 'message': '删除用户数据失败'})
        
        history_data = load_history()
        if username in history_data:
            del history_data[username]
        
        if not save_history(history_data):
            print(f"警告: 删除用户{username}的历史记录失败")
        
        session.pop('username', None)
        
        return jsonify({
            'success': True,
            'message': '账号已成功注销，所有数据已被删除'
        })
    except Exception as e:
        print(f"删除账号过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/verify_identity', methods=['POST'])
def verify_identity():
    try:
        username = session.get('username')
        if not username:
            return jsonify({'success': False, 'message': '请先登录'})
        
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': '请求数据为空'})
            
        id_number = data.get('id_number', '').strip()
        gender_input = data.get('gender', '').strip()
        
        if not id_number:
            return jsonify({'success': False, 'message': '请输入身份证号码'})
        
        if not gender_input:
            return jsonify({'success': False, 'message': '请选择性别'})
        
        if gender_input not in ['男', '女']:
            return jsonify({'success': False, 'message': '性别必须为"男"或"女"'})
        
        if len(id_number) != 18:
            return jsonify({'success': False, 'message': '身份证号码必须是18位'})
        
        if not id_number[:-1].isdigit():
            return jsonify({'success': False, 'message': '身份证号码前17位必须是数字'})
        
        last_char = id_number[-1].upper()
        if not (last_char.isdigit() or last_char == 'X'):
            return jsonify({'success': False, 'message': '身份证号码最后一位必须是数字或X'})
        
        gender_digit = int(id_number[16])
        actual_gender = '男' if gender_digit % 2 == 1 else '女'
        if actual_gender != gender_input:
            return jsonify({'success': False, 'message': f'性别验证失败，身份证显示性别为{actual_gender}'})
        
        birth_date_str = id_number[6:14]
        try:
            birth_year = int(birth_date_str[0:4])
            birth_month = int(birth_date_str[4:6])
            birth_day = int(birth_date_str[6:8])
            
            if birth_month < 1 or birth_month > 12:
                return jsonify({'success': False, 'message': '身份证号码中的月份无效'})
            
            if birth_day < 1 or birth_day > 31:
                return jsonify({'success': False, 'message': '身份证号码中的日期无效'})
            
            current_year = datetime.now().year
            age = current_year - birth_year
            
            if age < 16:
                return jsonify({'success': False, 'message': '未满16岁，无法进行身份认证'})
            
            if age > 75:
                return jsonify({'success': False, 'message': '年龄超过75岁，无法进行身份认证'})
            
            current_date = datetime.now()
            birth_date = datetime(birth_year, birth_month, birth_day)
            
            if (current_date.month, current_date.day) < (birth_month, birth_day):
                age -= 1
            
            if age < 16:
                return jsonify({'success': False, 'message': '未满16岁，无法进行身份认证'})
            
            if age > 75:
                return jsonify({'success': False, 'message': '年龄超过75岁，无法进行身份认证'})
            
        except ValueError:
            return jsonify({'success': False, 'message': '身份证号码中的出生日期无效'})
        
        users = load_data()
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        users[username]['id_verified'] = True
        users[username]['id_verified_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if not save_data(users):
            return jsonify({'success': False, 'message': '保存身份认证信息失败'})
        
        return jsonify({
            'success': True,
            'message': '身份认证成功！已满16岁，可以购买彩票',
            'id_verified': True,
            'verified_at': users[username]['id_verified_at']
        })
    except Exception as e:
        print(f"身份认证过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/check_identity_status', methods=['GET'])
def check_identity_status():
    try:
        username = session.get('username')
        if not username:
            return jsonify({'success': False, 'message': '未登录'})
        
        users = load_data()
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        user = users[username]
        
        return jsonify({
            'success': True,
            'authenticated': True,
            'id_verified': user.get('id_verified', False),
            'verified_at': user.get('id_verified_at', None)
        })
    except Exception as e:
        print(f"检查身份认证状态时发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    try:
        username = session.get('username')
        users = load_data()
        
        if username and username in users:
            response_data = {
                'authenticated': True,
                'username': username,
                'balance': users[username].get('balance', 200.00),
                'id_verified': users[username].get('id_verified', False),
                'email': users[username].get('email', '')
            }
            
            return jsonify(response_data)
        
        return jsonify({'authenticated': False})
    except Exception as e:
        print(f"检查认证状态时发生错误: {e}")
        return jsonify({'authenticated': False})

@app.route('/api/buy_ticket', methods=['POST'])
def buy_ticket():
    try:
        username = session.get('username')
        if not username:
            return jsonify({'success': False, 'message': '请先登录'})
        
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': '请求数据为空'})
            
        lottery_type = data.get('type', 'standard')
        
        if lottery_type not in LOTTERY_TYPES:
            return jsonify({'success': False, 'message': '无效的彩票类型'})
        
        users = load_data()
        history_data = load_history()
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        user = users[username]
        
        if not user.get('id_verified', False):
            return jsonify({
                'success': False, 
                'message': '购买彩票需要先完成身份认证',
                'needs_identity_verification': True
            })
        
        lottery = LOTTERY_TYPES[lottery_type]
        
        if lottery_type == 'god':
            god_purchases = user.get('god_lottery_purchases', 0)
            
            if not can_buy_god_lottery(god_purchases):
                return jsonify({
                    'success': False, 
                    'message': '神豪彩票终身限购10张，您已达到购买上限！'
                })
            
            ticket_price = get_god_lottery_price(god_purchases)
        elif lottery_type == 'lucky_king':
            lucky_king_purchases = user.get('lucky_king_purchases', 0)
            
            if not can_buy_lucky_king(lucky_king_purchases):
                return jsonify({
                    'success': False, 
                    'message': '欧皇奖终身限购5张，您已达到购买上限！'
                })
            
            ticket_price = lottery['price']
        else:
            ticket_price = lottery['price']
        
        if user.get('balance', 0) < ticket_price:
            return jsonify({'success': False, 'message': f'余额不足，需要{ticket_price}元'})
        
        if 'total_tickets_bought' not in user:
            user['total_tickets_bought'] = 0
        if 'total_winnings' not in user:
            user['total_winnings'] = 0
        if 'total_tax_paid' not in user:
            user['total_tax_paid'] = 0.00
        if 'lottery_stats' not in user:
            user['lottery_stats'] = {
                'standard': {'bought': 0, 'winnings': 0},
                'premium': {'bought': 0, 'winnings': 0},
                'quick': {'bought': 0, 'winnings': 0},
                'new': {'bought': 0, 'winnings': 0},
                'god': {'bought': 0, 'winnings': 0},
                'lucky_king': {'bought': 0, 'winnings': 0}
            }
        
        if lottery_type not in user['lottery_stats']:
            user['lottery_stats'][lottery_type] = {'bought': 0, 'winnings': 0}
        
        prize, lottery_info = draw_lottery(lottery_type)
        
        winnings = prize['amount']
        net_winnings, tax, welfare_fund, income_tax = calculate_tax(winnings)
        
        user['public_welfare_fund'] = user.get('public_welfare_fund', 0.00) + welfare_fund
        
        bonus_granted, bonus_count, new_max_purchases = check_welfare_bonus(user, username)
        
        user['balance'] -= ticket_price
        user['balance'] = round(user['balance'], 2)
        user['total_tickets_bought'] = user.get('total_tickets_bought', 0) + 1
        
        user['lottery_stats'][lottery_type]['bought'] = user['lottery_stats'][lottery_type].get('bought', 0) + 1
        
        if lottery_type == 'god':
            user['god_lottery_purchases'] = user.get('god_lottery_purchases', 0) + 1
        elif lottery_type == 'lucky_king':
            user['lucky_king_purchases'] = user.get('lucky_king_purchases', 0) + 1
        
        user['balance'] += net_winnings
        user['balance'] = round(user['balance'], 2)
        user['total_winnings'] = user.get('total_winnings', 0) + winnings
        user['total_tax_paid'] = user.get('total_tax_paid', 0) + tax
        user['lottery_stats'][lottery_type]['winnings'] = user['lottery_stats'][lottery_type].get('winnings', 0) + winnings
        
        if username not in history_data:
            history_data[username] = []
        
        # 仅在中奖时生成防伪码
        anti_code = None
        if winnings > 0:
            anti_code = generate_anti_code(lottery_type)
            
            anti_data = load_anti()
            anti_data[anti_code] = {
                'username': username,
                'lottery_type': lottery_type,
                'lottery_name': lottery_info['name'],
                'prize_name': prize['name'],
                'prize_amount': winnings,
                'net_amount': net_winnings,
                'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            save_anti(anti_data)
        
        history_entry = {
            'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'lottery_type': lottery_type,
            'lottery_name': lottery_info['name'],
            'ticket_cost': ticket_price,
            'prize_name': prize['name'],
            'prize_amount': winnings,
            'net_amount': net_winnings,
            'tax': tax,
            'welfare_fund': welfare_fund,
            'income_tax': income_tax,
            'color': prize['color'],
            'tax_applied': tax > 0,
            'god_lottery': lottery_type == 'god',
            'god_price_tier': 'premium' if lottery_type == 'god' and user.get('god_lottery_purchases', 0) > LOTTERY_TYPES["god"]["max_discount_purchases"] else 'normal' if lottery_type == 'god' else None,
            'god_remaining': new_max_purchases - user.get('god_lottery_purchases', 0) if lottery_type == 'god' else None,
            'lucky_king_lottery': lottery_type == 'lucky_king',
            'lucky_king_remaining': LOTTERY_TYPES["lucky_king"]["max_total_purchases"] - user.get('lucky_king_purchases', 0) if lottery_type == 'lucky_king' else None,
            'anti_code': anti_code  # 可能为None
        }
        history_data[username].insert(0, history_entry)
        
        if len(history_data[username]) > 20:
            history_data[username] = history_data[username][:20]
        
        users[username] = user
        if not save_data(users):
            return jsonify({'success': False, 'message': '保存用户数据失败'})
        
        if not save_history(history_data):
            print(f"警告: 保存用户{username}的历史记录失败")
        
        lucky_king_remaining = LOTTERY_TYPES["lucky_king"]["max_total_purchases"] - user.get('lucky_king_purchases', 0) if lottery_type == 'lucky_king' else None
        
        response_data = {
            'success': True,
            'message': f'购买成功！抽中：{prize["name"]}',
            'lottery_name': lottery_info['name'],
            'prize': prize['name'],
            'amount': winnings,
            'net_amount': net_winnings,
            'tax': tax,
            'welfare_fund': welfare_fund,
            'income_tax': income_tax,
            'tax_applied': tax > 0,
            'color': prize['color'],
            'balance': user['balance'],
            'ticket_price': ticket_price,
            'god_lottery': lottery_type == 'god',
            'god_purchases_count': user.get('god_lottery_purchases', 0),
            'is_premium_price': lottery_type == 'god' and user.get('god_lottery_purchases', 0) > LOTTERY_TYPES["god"]["max_discount_purchases"],
            'god_remaining': new_max_purchases - user.get('god_lottery_purchases', 0) if lottery_type == 'god' else None,
            'public_welfare_fund': user.get('public_welfare_fund', 0.00),
            'lucky_king_lottery': lottery_type == 'lucky_king',
            'lucky_king_purchases_count': user.get('lucky_king_purchases', 0),
            'lucky_king_remaining': lucky_king_remaining,
            'anti_code': anti_code  # 可能为None
        }
        
        if bonus_granted:
            response_data['welfare_bonus'] = True
            response_data['welfare_bonus_count'] = bonus_count
            response_data['god_max_purchases'] = new_max_purchases
        
        if tax > 0:
            tax_explanation = f'（奖金{winnings}元，超过4000元部分{(winnings-4000):.2f}元，缴纳22%税费：{tax}元（其中公益金{welfare_fund:.2f}元，个人所得税{income_tax:.2f}元），实得：{net_winnings}元）'
            response_data['message'] += tax_explanation
        else:
            tax_explanation = f'（奖金{winnings}元，未超过4000元，无需缴税）'
            response_data['message'] += tax_explanation
        
        if lottery_type == 'god':
            remaining_purchases = new_max_purchases - user.get('god_lottery_purchases', 0)
            if user.get('god_lottery_purchases', 0) <= LOTTERY_TYPES["god"]["max_discount_purchases"]:
                price_info = f'（神豪彩票第{user.get("god_lottery_purchases", 0)}张，价格：{ticket_price}元，优惠剩余{max(0, LOTTERY_TYPES["god"]["max_discount_purchases"] - user.get("god_lottery_purchases", 0))}张，终身剩余{remaining_purchases}张）'
            else:
                price_info = f'（神豪彩票第{user.get("god_lottery_purchases", 0)}张，高级价格：{ticket_price}元，终身剩余{remaining_purchases}张）'
            response_data['message'] += price_info
        elif lottery_type == 'lucky_king':
            remaining_purchases = lucky_king_remaining
            price_info = f'（欧皇奖第{user.get("lucky_king_purchases", 0)}张，价格：{ticket_price}元，终身剩余{remaining_purchases}张）'
            response_data['message'] += price_info
        
        if bonus_granted:
            bonus_message = f'\n🎉 公益贡献奖励：您的公益金累计{format_amount(user.get("public_welfare_fund", 0))}，获得{bonus_count}次神豪彩票购买次数奖励！现在最多可购买{new_max_purchases}张神豪彩票！'
            response_data['message'] += bonus_message
        
        if anti_code:
            anti_message = f'\n🔒 防伪码：{anti_code}（请妥善保管，用于彩票验证）'
            response_data['message'] += anti_message
        
        return jsonify(response_data)
    except Exception as e:
        print(f"购买彩票过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/user_info', methods=['GET'])
def get_user_info():
    try:
        username = session.get('username')
        if not username:
            return jsonify({'success': False, 'message': '未登录'})
        
        users = load_data()
        history_data = load_history()
        
        if username not in users:
            return jsonify({'success': False, 'message': '用户不存在'})
        
        user = users[username]
        
        if 'balance' not in user:
            user['balance'] = 200.00
        if 'total_tickets_bought' not in user:
            user['total_tickets_bought'] = 0
        if 'total_winnings' not in user:
            user['total_winnings'] = 0
        if 'total_tax_paid' not in user:
            user['total_tax_paid'] = 0.00
        if 'god_lottery_purchases' not in user:
            user['god_lottery_purchases'] = 0
        if 'id_verified' not in user:
            user['id_verified'] = False
        if 'id_verified_at' not in user:
            user['id_verified_at'] = None
        if 'lottery_stats' not in user:
            user['lottery_stats'] = {
                'standard': {'bought': 0, 'winnings': 0},
                'premium': {'bought': 0, 'winnings': 0},
                'quick': {'bought': 0, 'winnings': 0},
                'new': {'bought': 0, 'winnings': 0},
                'god': {'bought': 0, 'winnings': 0},
                'lucky_king': {'bought': 0, 'winnings': 0}
            }
        if 'created_at' not in user:
            user['created_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if 'last_login' not in user:
            user['last_login'] = datetime.now().strftime('%Y-%m-d %H:%M:%S')
        if 'public_welfare_fund' not in user:
            user['public_welfare_fund'] = 0.00
        if 'welfare_bonus_given' not in user:
            user['welfare_bonus_given'] = 0
        if 'lucky_king_purchases' not in user:
            user['lucky_king_purchases'] = 0
        if 'email' not in user:
            user['email'] = ''
        
        user_history = history_data.get(username, [])
        
        bonus_granted, bonus_count, new_max_purchases = check_welfare_bonus(user, username)
        
        god_remaining = new_max_purchases - user.get('god_lottery_purchases', 0)
        god_discount_remaining = max(0, LOTTERY_TYPES["god"]["max_discount_purchases"] - user.get('god_lottery_purchases', 0))
        lucky_king_remaining = LOTTERY_TYPES["lucky_king"]["max_total_purchases"] - user.get('lucky_king_purchases', 0)
        
        response_data = {
            'success': True,
            'username': username,
            'balance': user.get('balance', 200.00),
            'total_tickets_bought': user.get('total_tickets_bought', 0),
            'total_winnings': user.get('total_winnings', 0),
            'total_tax_paid': user.get('total_tax_paid', 0.00),
            'god_lottery_purchases': user.get('god_lottery_purchases', 0),
            'id_verified': user.get('id_verified', False),
            'id_verified_at': user.get('id_verified_at'),
            'god_remaining': god_remaining,
            'god_discount_remaining': god_discount_remaining,
            'created_at': user.get('created_at', ''),
            'last_login': user.get('last_login', ''),
            'lottery_stats': user.get('lottery_stats', {}),
            'history': user_history[:20],
            'public_welfare_fund': user.get('public_welfare_fund', 0.00),
            'welfare_bonus_given': user.get('welfare_bonus_given', 0),
            'god_max_purchases': new_max_purchases,
            'lucky_king_purchases': user.get('lucky_king_purchases', 0),
            'lucky_king_remaining': lucky_king_remaining,
            'email': user.get('email', '')
        }
        
        response_data['balance_formatted'] = format_amount(user.get('balance', 200.00))
        response_data['total_winnings_formatted'] = format_amount(user.get('total_winnings', 0))
        response_data['total_tax_paid_formatted'] = format_amount(user.get('total_tax_paid', 0.00))
        response_data['public_welfare_fund_formatted'] = format_amount(user.get('public_welfare_fund', 0.00))
        
        if bonus_granted:
            response_data['welfare_bonus'] = True
            response_data['welfare_bonus_count'] = bonus_count
        
        return jsonify(response_data)
    except Exception as e:
        print(f"获取用户信息过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误'})

@app.route('/api/lottery_types', methods=['GET'])
def get_lottery_types():
    try:
        lottery_types_copy = {}
        for key, value in LOTTERY_TYPES.items():
            if key == "god":
                god_lottery = value.copy()
                god_lottery["price"] = 200
                god_lottery["premium_price"] = 3000
                god_lottery["max_discount_purchases"] = 2
                god_lottery["max_total_purchases"] = god_lottery.get("max_total_purchases", 10)
                lottery_types_copy[key] = god_lottery
            elif key == "lucky_king":
                lucky_king_lottery = value.copy()
                lucky_king_lottery["price"] = 5000
                lucky_king_lottery["max_total_purchases"] = 5
                lottery_types_copy[key] = lucky_king_lottery
            else:
                lottery_types_copy[key] = value.copy()
        
        return jsonify({
            'success': True,
            'lottery_types': lottery_types_copy
        })
    except Exception as e:
        print(f"获取彩票类型信息过程中发生错误: {e}")
        return jsonify({'success': False, 'message': '服务器内部错误', 'lottery_types': {}})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': '彩票系统运行正常'})

@app.route('/api/verify_anti_code', methods=['GET'])
def verify_anti_code():
    try:
        anti_code = request.args.get('code', '')
        
        if not anti_code or len(anti_code) != 12:
            return jsonify({'success': False, 'message': '防伪码格式不正确'})
        
        anti_data = load_anti()
        
        if anti_code not in anti_data:
            return jsonify({'success': False, 'message': '防伪码不存在或已失效'})
        
        lottery_info = anti_data[anti_code]
        
        return jsonify({
            'success': True,
            'message': '防伪码验证成功',
            'anti_code': anti_code,
            'lottery_type': lottery_info['lottery_type'],
            'lottery_name': lottery_info['lottery_name'],
            'prize_name': lottery_info['prize_name'],
            'prize_amount': lottery_info['prize_amount'],
            'net_amount': lottery_info['net_amount'],
            'time': lottery_info['time'],
            'username': lottery_info['username'][:3] + '*' * (len(lottery_info['username']) - 3) if len(lottery_info['username']) > 3 else lottery_info['username']
        })
    except Exception as e:
        print(f"验证防伪码失败: {e}")
        return jsonify({'success': False, 'message': '验证失败'})

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        if filename == 'changelog.json':
            return send_from_directory(app.static_folder, filename, mimetype='application/json')
        return send_from_directory(app.static_folder, filename)
    except Exception as e:
        print(f"提供静态文件{filename}时发生错误: {e}")
        return jsonify({'success': False, 'message': '文件不存在'}), 404

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    os.makedirs('public', exist_ok=True)
    
    public_files = ['index.html', 'login.html', 'game.html', 'style.css', 'account_management.html', 'identity_verification.html', 'changelog.json', 'anti_verify.html']
    missing_files = []
    
    print("彩票模拟系统启动中...")
    print("=" * 50)
    
    for file in public_files:
        filepath = os.path.join('public', file)
        if os.path.exists(filepath):
            print(f"✅ {file} - 存在")
        else:
            print(f"❌ {file} - 缺少")
            missing_files.append(file)
    
    if missing_files:
        print("\n⚠️  警告: 缺少以下文件:")
        for file in missing_files:
            print(f"   - {file}")
        print("\n请确保所有HTML和CSS文件都在public目录下")
    else:
        print("\n✅ 所有必要文件都存在！")
    
    print("=" * 50)
    print("\n系统更新说明:")
    print("1. ✅ 腾讯云滑块验证已集成")
    print("2. ✅ 税率计算: 超过4000元部分缴纳22%税费")
    print("3. ✅ 公益系统: 2%转为公益金，满5万赠送神豪彩票购买次数")
    print("4. ✅ 金额格式化: ≥10万时显示为万元")
    print("5. ✅ 身份认证: 购买所有彩票都需要认证（16-75岁）")
    print("6. ✅ 邮箱功能: 注册时绑定邮箱，确保唯一性")
    print("7. ✅ 新增彩票防伪码系统: 12位唯一验证码（仅中奖时生成）")
    
    print("\n彩票类型:")
    for key, lottery in LOTTERY_TYPES.items():
        if key == "god":
            print(f"神豪彩票 - 前2张200元，之后3000元/张 (必中奖，终身限购{lottery['max_total_purchases']}张)")
        elif key == "lucky_king":
            print(f"欧皇奖 - 5000元/张 (必中奖，99.5%得1万，0.5%得500万，终身限购5张)")
        else:
            print(f"{lottery['name']} - {lottery['price']}元/张")
    
    print("\n防伪码前缀:")
    print("神豪彩票: 1561 | 幸运21点: 1825 | 经典刮刮乐: 0185")
    print("豪华大乐透: 1691 | 急速3D: 0985 | 欧皇奖: 1024")
    print("注意: 防伪码仅在中奖时生成，未中奖彩票无防伪码")
    
    print("\n访问地址:")
    print("1. http://localhost:5000")
    print("2. http://127.0.0.1:5000")
    print("3. 从其他设备访问: http://<你的IP地址>:5000")
    print("4. 防伪码验证: http://localhost:5000/anti_verify.html")
    print("\n按 Ctrl+C 停止服务器\n")
    print("=" * 50)
    
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1', 't')
    app.run(debug=debug_mode, port=5000, host='0.0.0.0')