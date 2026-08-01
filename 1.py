#!/usr/bin/env python3

import json
import os
import sys
import base64
import hashlib
import random
import time
import shutil
import re
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import bcrypt

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
ENCRYPTION_KEY_STR = "system_encryption_key_2024_secure_v2"

def get_cipher():
    key_material = ENCRYPTION_KEY_STR.encode()
    salt = b'fixed_salt_2024'
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    fernet_key = base64.urlsafe_b64encode(kdf.derive(key_material))
    return Fernet(fernet_key)

def decrypt_data(encrypted_data):
    cipher = get_cipher()
    decrypted = cipher.decrypt(encrypted_data)
    return json.loads(decrypted.decode('utf-8'))

def encrypt_data(data):
    cipher = get_cipher()
    json_str = json.dumps(data, ensure_ascii=False, default=str)
    return cipher.encrypt(json_str.encode('utf-8'))

def load_data(file_path, default_value=None):
    if default_value is None:
        default_value = {}
    if os.path.exists(file_path):
        try:
            with open(file_path, 'rb') as f:
                encrypted_data = f.read()
                return decrypt_data(encrypted_data)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return default_value
    return default_value

def save_data(file_path, data):
    try:
        encrypted_data = encrypt_data(data)
        with open(file_path, 'wb') as f:
            f.write(encrypted_data)
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

USERS_FILE = os.path.join(DATA_DIR, 'users.enc')
USER_PL_FILE = os.path.join(DATA_DIR, 'user_pl.enc')
IDENTITY_VERIFICATIONS_FILE = os.path.join(DATA_DIR, 'identity_verifications.enc')
RESTRICTED_USERS_FILE = os.path.join(DATA_DIR, 'restricted_users.enc')
GATEWAY_CARDS_FILE = os.path.join(DATA_DIR, 'gateway_cards.enc')
POINT_CODES_FILE = os.path.join(DATA_DIR, 'point_codes.enc')
PREMIUM_POINT_CODES_FILE = os.path.join(DATA_DIR, 'premium_point_codes.enc')
BOOST_CODES_FILE = os.path.join(DATA_DIR, 'boost_codes.enc')
RESET_CODES_FILE = os.path.join(DATA_DIR, 'reset_codes.enc')
SPECIAL_POINT_CODES_FILE = os.path.join(DATA_DIR, 'special_point_codes.enc')
MAKEUP_CODES_FILE = os.path.join(DATA_DIR, 'makeup_codes.enc')
GAMBLERS_CODES_FILE = os.path.join(DATA_DIR, 'gamblers_codes.enc')
CANCELLATION_CODES_FILE = os.path.join(DATA_DIR, 'cancellation_codes.enc')
USER_COUPONS_FILE = os.path.join(DATA_DIR, 'user_coupons.enc')
ORDERS_FILE = os.path.join(DATA_DIR, 'orders.enc')
SYSTEM_POINTS_FILE = os.path.join(DATA_DIR, 'system_points.enc')
PL_RATE_FILE = os.path.join(DATA_DIR, 'pl_rate.enc')
FUND_DATA_FILE = os.path.join(DATA_DIR, 'fund_data.enc')
FUND_HISTORY_FILE = os.path.join(DATA_DIR, 'fund_history.enc')
CDK_PACKAGES_FILE = os.path.join(DATA_DIR, 'cdk_packages.enc')
MAIL_ATTACHMENTS_FILE = os.path.join(DATA_DIR, 'mail_attachments.enc')
PL_EXCHANGE_FILE = os.path.join(DATA_DIR, 'pl_exchange.enc')
PL_TRANSFERS_FILE = os.path.join(DATA_DIR, 'pl_transfers.enc')
USER_CDK_RECORDS_FILE = os.path.join(DATA_DIR, 'user_cdk_records.enc')

users = load_data(USERS_FILE, {})
user_pl = load_data(USER_PL_FILE, {})
identity_verifications = load_data(IDENTITY_VERIFICATIONS_FILE, {})
restricted_users = load_data(RESTRICTED_USERS_FILE, {})
gateway_cards = load_data(GATEWAY_CARDS_FILE, {})
point_codes = load_data(POINT_CODES_FILE, {})
premium_point_codes = load_data(PREMIUM_POINT_CODES_FILE, {})
boost_codes = load_data(BOOST_CODES_FILE, {})
reset_codes = load_data(RESET_CODES_FILE, {})
special_point_codes = load_data(SPECIAL_POINT_CODES_FILE, {})
makeup_codes = load_data(MAKEUP_CODES_FILE, {})
gamblers_codes = load_data(GAMBLERS_CODES_FILE, {})
cancellation_codes = load_data(CANCELLATION_CODES_FILE, {})
user_coupons = load_data(USER_COUPONS_FILE, {})
orders = load_data(ORDERS_FILE, {})
system_points = load_data(SYSTEM_POINTS_FILE, {}).get('total_points', 0)
pl_rate_data = load_data(PL_RATE_FILE, {})
fund_data = load_data(FUND_DATA_FILE, {})
fund_history = load_data(FUND_HISTORY_FILE, {})
cdk_packages = load_data(CDK_PACKAGES_FILE, {})
mail_attachments = load_data(MAIL_ATTACHMENTS_FILE, {})
pl_exchange_records = load_data(PL_EXCHANGE_FILE, {})
pl_transfers = load_data(PL_TRANSFERS_FILE, {})
user_cdk_records = load_data(USER_CDK_RECORDS_FILE, {})

def save_users(): save_data(USERS_FILE, users)
def save_user_pl(): save_data(USER_PL_FILE, user_pl)
def save_identity_verifications(): save_data(IDENTITY_VERIFICATIONS_FILE, identity_verifications)
def save_restricted_users(): save_data(RESTRICTED_USERS_FILE, restricted_users)
def save_gateway_cards(): save_data(GATEWAY_CARDS_FILE, gateway_cards)
def save_point_codes(): save_data(POINT_CODES_FILE, point_codes)
def save_premium_point_codes(): save_data(PREMIUM_POINT_CODES_FILE, premium_point_codes)
def save_boost_codes(): save_data(BOOST_CODES_FILE, boost_codes)
def save_reset_codes(): save_data(RESET_CODES_FILE, reset_codes)
def save_special_point_codes(): save_data(SPECIAL_POINT_CODES_FILE, special_point_codes)
def save_makeup_codes(): save_data(MAKEUP_CODES_FILE, makeup_codes)
def save_gamblers_codes(): save_data(GAMBLERS_CODES_FILE, gamblers_codes)
def save_cancellation_codes(): save_data(CANCELLATION_CODES_FILE, cancellation_codes)
def save_user_coupons(): save_data(USER_COUPONS_FILE, user_coupons)
def save_orders(): save_data(ORDERS_FILE, orders)
def save_system_points(): save_data(SYSTEM_POINTS_FILE, {'total_points': system_points})
def save_pl_rate_data(): save_data(PL_RATE_FILE, pl_rate_data)
def save_fund_data(): save_data(FUND_DATA_FILE, fund_data)
def save_fund_history(): save_data(FUND_HISTORY_FILE, fund_history)
def save_cdk_packages(): save_data(CDK_PACKAGES_FILE, cdk_packages)
def save_mail_attachments(): save_data(MAIL_ATTACHMENTS_FILE, mail_attachments)
def save_pl_exchange_records(): save_data(PL_EXCHANGE_FILE, pl_exchange_records)
def save_pl_transfers(): save_data(PL_TRANSFERS_FILE, pl_transfers)
def save_user_cdk_records(): save_data(USER_CDK_RECORDS_FILE, user_cdk_records)

def get_user_pl_balance(username):
    return user_pl.get(username, {}).get('balance', 0)

def update_user_pl_balance(username, amount):
    if username not in user_pl:
        user_pl[username] = {'balance': 0, 'total_earned': 0, 'total_spent': 0}
    user_pl[username]['balance'] = round(user_pl[username]['balance'] + amount, 4)

def find_user(username):
    if username not in users:
        print(f"用户 '{username}' 不存在")
        return None
    return users[username]

def generate_code():
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    parts = [''.join(random.choice(chars) for _ in range(4)) for _ in range(4)]
    return '-'.join(parts)

def get_card_type_label(card_type):
    labels = {'hour': '小时卡', 'day': '天卡', 'permanent': '永久卡'}
    return labels.get(card_type, card_type)

def get_code_type_label(code_type):
    labels = {
        'point': '普通积分卡', 'premium_point': '高级积分卡', 'reset': '重置密码卡',
        'boost': '积分加成卡', 'special_point': '特殊积分卡', 'makeup': '补签卡',
        'gamblers': '赌神积分卡', 'cancellation': '注销卡'
    }
    return labels.get(code_type, code_type)

def get_card_status(card_data):
    if card_data.get('used', False):
        return '已使用'
    expire_at = card_data.get('expire_at', 0)
    if expire_at > 0 and int(time.time() * 1000) > expire_at:
        return '已过期'
    return '有效'

def refresh_data():
    global users, user_pl, identity_verifications, restricted_users, gateway_cards
    global point_codes, premium_point_codes, boost_codes, reset_codes
    global special_point_codes, makeup_codes, gamblers_codes, cancellation_codes
    global user_coupons, orders, system_points, pl_rate_data, fund_data, fund_history
    global cdk_packages, mail_attachments, pl_exchange_records, pl_transfers, user_cdk_records

    users = load_data(USERS_FILE, {})
    user_pl = load_data(USER_PL_FILE, {})
    identity_verifications = load_data(IDENTITY_VERIFICATIONS_FILE, {})
    restricted_users = load_data(RESTRICTED_USERS_FILE, {})
    gateway_cards = load_data(GATEWAY_CARDS_FILE, {})
    point_codes = load_data(POINT_CODES_FILE, {})
    premium_point_codes = load_data(PREMIUM_POINT_CODES_FILE, {})
    boost_codes = load_data(BOOST_CODES_FILE, {})
    reset_codes = load_data(RESET_CODES_FILE, {})
    special_point_codes = load_data(SPECIAL_POINT_CODES_FILE, {})
    makeup_codes = load_data(MAKEUP_CODES_FILE, {})
    gamblers_codes = load_data(GAMBLERS_CODES_FILE, {})
    cancellation_codes = load_data(CANCELLATION_CODES_FILE, {})
    user_coupons = load_data(USER_COUPONS_FILE, {})
    orders = load_data(ORDERS_FILE, {})
    system_points = load_data(SYSTEM_POINTS_FILE, {}).get('total_points', 0)
    pl_rate_data = load_data(PL_RATE_FILE, {})
    fund_data = load_data(FUND_DATA_FILE, {})
    fund_history = load_data(FUND_HISTORY_FILE, {})
    cdk_packages = load_data(CDK_PACKAGES_FILE, {})
    mail_attachments = load_data(MAIL_ATTACHMENTS_FILE, {})
    pl_exchange_records = load_data(PL_EXCHANGE_FILE, {})
    pl_transfers = load_data(PL_TRANSFERS_FILE, {})
    user_cdk_records = load_data(USER_CDK_RECORDS_FILE, {})
    print("所有数据已刷新")

def validate_username(username):
    if not username or len(username) < 3 or len(username) > 20:
        return False, "用户名必须为3-20位字符"
    if not re.match(r'^[a-zA-Z0-9_\u4e00-\u9fa5]+$', username):
        return False, "用户名仅支持字母、数字、下划线、中文"
    return True, ""

def validate_email(email):
    if not email or len(email) > 100:
        return False, "邮箱格式不正确"
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return False, "邮箱格式不正确"
    return True, ""

def validate_password(password):
    if not password or len(password) < 8:
        return False, "密码至少8位"
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'[0-9]', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    type_count = sum([has_upper, has_lower, has_digit, has_special])
    if type_count < 2:
        return False, "密码需包含至少两种类型（大小写字母/数字/特殊字符）"
    return True, ""

def validate_qq(qq_number):
    if qq_number and not re.match(r'^\d{5,15}$', qq_number):
        return False, "QQ号格式不正确，请输入5-15位数字"
    return True, ""

def register_user_menu():
    print("\n" + "="*60)
    print("     注册新用户")
    print("="*60)
    print("提示: 注册用户会自动创建，并可选择初始积分和PL")
    print("-"*60)

    username = input("用户名 (3-20位，字母/数字/下划线/中文): ").strip()
    if not username:
        print("用户名不能为空")
        return

    valid, msg = validate_username(username)
    if not valid:
        print(f"{msg}")
        return

    if username in users:
        print(f"用户名 '{username}' 已被使用")
        return

    email = input("邮箱: ").strip().lower()
    if not email:
        print("邮箱不能为空")
        return

    valid, msg = validate_email(email)
    if not valid:
        print(f"{msg}")
        return

    for existing_user in users.values():
        if existing_user.get('email') == email:
            print(f"邮箱 '{email}' 已被使用")
            return

    password = input("密码 (至少8位，包含两种类型): ").strip()
    if not password:
        print("密码不能为空")
        return

    valid, msg = validate_password(password)
    if not valid:
        print(f"{msg}")
        return

    qq_number = input("QQ号 (5-15位数字，可选，直接回车跳过): ").strip()
    if qq_number:
        valid, msg = validate_qq(qq_number)
        if not valid:
            print(f"{msg}")
            return

        for u, data in users.items():
            if data.get('qq_number') == qq_number:
                print(f"该QQ号已被用户 '{u}' 绑定")
                return

    print("\n选择初始积分:")
    print("1. 0 积分")
    print("2. 10 积分")
    print("3. 50 积分")
    print("4. 100 积分")
    print("5. 自定义积分")
    choice = input("请选择 (1-5): ").strip()

    initial_points = 0
    if choice == '1':
        initial_points = 0
    elif choice == '2':
        initial_points = 10
    elif choice == '3':
        initial_points = 50
    elif choice == '4':
        initial_points = 100
    elif choice == '5':
        try:
            initial_points = float(input("请输入初始积分: "))
            if initial_points < 0:
                print("积分不能为负数")
                return
        except ValueError:
            print("请输入有效的数字")
            return
    else:
        initial_points = 0

    print("\n选择初始PL:")
    print("1. 0 PL")
    print("2. 1 PL")
    print("3. 5 PL")
    print("4. 10 PL")
    print("5. 自定义PL")
    choice = input("请选择 (1-5): ").strip()

    initial_pl = 0
    if choice == '1':
        initial_pl = 0
    elif choice == '2':
        initial_pl = 1.0
    elif choice == '3':
        initial_pl = 5.0
    elif choice == '4':
        initial_pl = 10.0
    elif choice == '5':
        try:
            initial_pl = float(input("请输入初始PL: "))
            if initial_pl < 0:
                print("PL不能为负数")
                return
        except ValueError:
            print("请输入有效的数字")
            return
    else:
        initial_pl = 0

    print("\n" + "="*50)
    print("注册信息确认:")
    print(f"  用户名: {username}")
    print(f"  邮箱: {email}")
    print(f"  密码: {'*' * len(password)}")
    print(f"  QQ号: {qq_number if qq_number else '未设置'}")
    print(f"  初始积分: {initial_points:.2f}")
    print(f"  初始PL: {initial_pl:.4f}")
    print("="*50)

    confirm = input("\n确认注册? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消注册")
        return

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    users[username] = {
        'username': username,
        'email': email,
        'password': hashed_password,
        'qq_number': qq_number,
        'totalPoints': initial_points,
        'unlimitedPoints': 0,
        'dailyEarnedPoints': 0,
        'lastEarnedDate': datetime.now().strftime('%Y-%m-%d'),
        'lastLoginDate': datetime.now().strftime('%Y-%m-%d'),
        'createdAt': datetime.now().isoformat(),
        'attendanceTotalDays': 0,
        'attendanceConsecutiveDays': 0,
        'lastAttendanceTimestamp': 0,
        'attendanceClaimedTotalCycles': {},
        'attendanceClaimedConsecutiveCycles': {},
        'cancellationCodePurchased': False,
        'coupon_usage_count': 0,
        'makeup_code_used_count': 0,
        'gamblers_code_purchase_count': 0,
        'last_gamblers_purchase_date': ''
    }

    if initial_pl > 0:
        update_user_pl_balance(username, initial_pl)
        save_user_pl()

    save_users()

    print("\n用户注册成功!")
    print(f"   用户名: {username}")
    print(f"   邮箱: {email}")
    print(f"   初始积分: {initial_points:.2f}")
    print(f"   初始PL: {initial_pl:.4f}")

    send_welcome = input("\n是否发放欢迎卡密到邮箱? (y/n): ").strip().lower()
    if send_welcome == 'y':
        send_welcome_package(username)

    verify_now = input("\n是否立即进行身份认证? (y/n): ").strip().lower()
    if verify_now == 'y':
        verify_user_now(username)

def send_welcome_package(username):
    print("\n选择欢迎卡密类型:")
    print("1. 普通积分卡 x1")
    print("2. 高级积分卡 x1")
    print("3. 重置密码卡 x1")
    print("4. 积分加成卡 x1")
    print("5. 全部发送 (每种1张)")
    print("6. 自定义数量 (每种类型发送相同数量)")
    print("0. 跳过")

    choice = input("请选择 (0-6): ").strip()

    if choice == '0':
        print("跳过发放")
        return

    type_map = {
        '1': ('point', point_codes, save_point_codes, '普通积分卡'),
        '2': ('premium_point', premium_point_codes, save_premium_point_codes, '高级积分卡'),
        '3': ('reset', reset_codes, save_reset_codes, '重置密码卡'),
        '4': ('boost', boost_codes, save_boost_codes, '积分加成卡'),
    }

    if choice == '5':
        for _, (code_type, codes, save_func, label) in type_map.items():
            code = generate_code()
            codes[code] = {
                'code': code,
                'username': username,
                'used': False,
                'recycled': False,
                'createdAt': int(time.time() * 1000),
                'type': code_type,
                'adminGranted': True,
                'source': 'welcome_package'
            }
            save_func()

            mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
            mail_attachments[mail_id] = {
                'id': mail_id,
                'username': username,
                'type': code_type,
                'code': code,
                'codes': [code],
                'created_at': int(time.time() * 1000),
                'expires_at': int(time.time() * 1000) + 28800000,
                'title': f'欢迎卡密-{label}',
                'description': f'欢迎注册，获得{label}1张',
                'claimed': False,
                'claimed_at': 0,
                'source': 'welcome_package',
                'quantity': 1,
                'is_batch': False
            }
            save_mail_attachments()
            print(f"  已发放 {label} 到邮箱: {code}")
        print("\n欢迎卡密已全部发放到邮箱")
        return

    if choice == '6':
        try:
            count = int(input("请输入要发放的数量 (每种类型): "))
            if count < 1 or count > 10:
                print("数量必须在1-10之间")
                return
        except ValueError:
            print("请输入有效的数字")
            return

        for code_type, codes, save_func, label in type_map.values():
            codes_list = []
            for _ in range(count):
                code = generate_code()
                codes[code] = {
                    'code': code,
                    'username': username,
                    'used': False,
                    'recycled': False,
                    'createdAt': int(time.time() * 1000),
                    'type': code_type,
                    'adminGranted': True,
                    'source': 'welcome_package'
                }
                codes_list.append(code)
            save_func()

            codes_str = '\n'.join(codes_list)
            mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
            mail_attachments[mail_id] = {
                'id': mail_id,
                'username': username,
                'type': code_type,
                'code': codes_list[0] if codes_list else '',
                'codes': codes_list,
                'created_at': int(time.time() * 1000),
                'expires_at': int(time.time() * 1000) + 28800000,
                'title': f'欢迎卡密-{label} x{count}',
                'description': f'欢迎注册，获得{label} {count}张\n\n卡密列表:\n{codes_str}',
                'claimed': False,
                'claimed_at': 0,
                'source': 'welcome_package',
                'quantity': count,
                'is_batch': True
            }
            save_mail_attachments()
            print(f"  已发放 {count} 张 {label} 到邮箱")
        print("\n欢迎卡密已全部发放到邮箱")
        return

    if choice in type_map:
        code_type, codes, save_func, label = type_map[choice]
        code = generate_code()
        codes[code] = {
            'code': code,
            'username': username,
            'used': False,
            'recycled': False,
            'createdAt': int(time.time() * 1000),
            'type': code_type,
            'adminGranted': True,
            'source': 'welcome_package'
        }
        save_func()

        mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
        mail_attachments[mail_id] = {
            'id': mail_id,
            'username': username,
            'type': code_type,
            'code': code,
            'codes': [code],
            'created_at': int(time.time() * 1000),
            'expires_at': int(time.time() * 1000) + 28800000,
            'title': f'欢迎卡密-{label}',
            'description': f'欢迎注册，获得{label}1张',
            'claimed': False,
            'claimed_at': 0,
            'source': 'welcome_package',
            'quantity': 1,
            'is_batch': False
        }
        save_mail_attachments()
        print(f"已发放 {label} 到邮箱: {code}")
    else:
        print("无效选择")

def verify_user_now(username):
    print("\n" + "-"*40)
    print("身份认证")
    print("-"*40)

    if identity_verifications.get(username, {}).get('verified', False):
        print(f"用户 '{username}' 已经认证")
        return

    real_name = input("真实姓名: ").strip()
    if not real_name:
        print("真实姓名不能为空")
        return

    id_number = input("身份证号 (18位): ").strip()
    if not id_number:
        print("身份证号不能为空")
        return

    if len(id_number) != 18:
        print("身份证号必须为18位")
        return

    gender = input("性别 (男/女): ").strip()
    if gender not in ['男', '女']:
        print("性别必须是男/女")
        return

    try:
        birth_year = int(id_number[6:10])
        birth_month = int(id_number[10:12])
        birth_day = int(id_number[12:14])
        age = datetime.now().year - birth_year
        if (datetime.now().month, datetime.now().day) < (birth_month, birth_day):
            age -= 1
    except:
        print("身份证号格式错误")
        return

    if age < 18 or age > 65:
        print(f"年龄需在18-65岁之间，当前 {age} 岁")
        return

    gender_digit = int(id_number[16])
    actual_gender = '男' if gender_digit % 2 == 1 else '女'
    if actual_gender != gender:
        print(f"性别与身份证号不符，实际性别为 {actual_gender}")
        return

    id_hash = hashlib.sha256(id_number.encode()).hexdigest()
    id_masked = id_number[:3] + '*****' + id_number[14:]

    identity_verifications[username] = {
        'username': username,
        'real_name': real_name,
        'id_number_hash': id_hash,
        'id_number_masked': id_masked,
        'gender': gender,
        'verified': True,
        'verified_at': datetime.now().isoformat()
    }
    save_identity_verifications()

    pl_reward = round(random.uniform(0.5, 3.0), 4)
    update_user_pl_balance(username, pl_reward)
    save_user_pl()

    print(f"认证成功!")
    print(f"   姓名: {real_name}")
    print(f"   身份证: {id_masked}")
    print(f"   年龄: {age} 岁")
    print(f"   获得PL奖励: {pl_reward:.4f}")

def list_users():
    print("\n" + "="*90)
    print(f"{'用户名':<18} {'积分':<10} {'PL余额':<12} {'认证':<6} {'通行证':<6} {'签到':<8}")
    print("-"*90)
    for username, data in users.items():
        points = data.get('totalPoints', 0)
        pl = get_user_pl_balance(username)
        verified = identity_verifications.get(username, {}).get('verified', False)
        status = "已认证" if verified else "未认证"
        has_card = "有" if username in gateway_cards else "无"
        attendance = data.get('attendanceTotalDays', 0)
        print(f"{username:<18} {points:<10.2f} {pl:<12.4f} {status:<6} {has_card:<6} {attendance:<8}")
    print("="*90)
    print(f"总用户数: {len(users)}")

def show_user_detail(username):
    user = find_user(username)
    if not user:
        return

    pl = get_user_pl_balance(username)
    verified = identity_verifications.get(username, {}).get('verified', False)
    card = gateway_cards.get(username)
    fund = fund_data.get(username, {})

    print("\n" + "="*60)
    print(f"用户详情: {username}")
    print("-"*60)
    print(f"邮箱: {user.get('email', '未设置')}")
    print(f"QQ号: {user.get('qq_number', '未设置')}")
    print(f"总积分: {user.get('totalPoints', 0):.2f}")
    print(f"PL余额: {pl:.4f}")
    print(f"理财余额: {fund.get('balance', 0):.2f}")
    print(f"认证状态: {'已认证' if verified else '未认证'}")
    print(f"累计签到: {user.get('attendanceTotalDays', 0)} 天")
    print(f"连续签到: {user.get('attendanceConsecutiveDays', 0)} 天")
    print(f"最后签到: {user.get('lastAttendanceDate', '从未签到')}")
    print(f"注册时间: {user.get('createdAt', '未知')}")
    print(f"最后登录: {user.get('lastLoginDate', '未知')}")

    if card:
        print("-"*60)
        print("通行证信息:")
        print(f"  卡密: {card.get('key', '')}")
        print(f"  类型: {get_card_type_label(card.get('type', 'unknown'))}")
        print(f"  状态: {get_card_status(card)}")
        expire_at = card.get('expire_at', 0)
        expire_str = '永久有效' if expire_at == 0 else datetime.fromtimestamp(expire_at/1000).strftime('%Y-%m-%d %H:%M:%S')
        print(f"  过期时间: {expire_str}")
    print("="*60)

def modify_points(username):
    user = find_user(username)
    if not user:
        return
    current = user.get('totalPoints', 0)
    print(f"当前积分: {current:.2f}")
    try:
        new_value = float(input("请输入新的积分值 (负数表示扣除): "))
    except ValueError:
        print("请输入有效数字")
        return
    if new_value < 0:
        if current < abs(new_value):
            print("积分不足")
            return
        user['totalPoints'] = round(current - abs(new_value), 2)
        print(f"已扣除 {abs(new_value):.2f}，剩余 {user['totalPoints']:.2f}")
    else:
        user['totalPoints'] = round(new_value, 2)
        print(f"积分已设为 {user['totalPoints']:.2f}")
    save_users()

def modify_pl(username):
    user = find_user(username)
    if not user:
        return
    current = get_user_pl_balance(username)
    print(f"当前PL: {current:.4f}")
    try:
        new_value = float(input("请输入新的PL值 (负数表示扣除): "))
    except ValueError:
        print("请输入有效数字")
        return
    if new_value < 0:
        if current < abs(new_value):
            print("PL不足")
            return
        update_user_pl_balance(username, -abs(new_value))
        print(f"已扣除 {abs(new_value):.4f}，剩余 {get_user_pl_balance(username):.4f}")
    else:
        update_user_pl_balance(username, new_value - current)
        print(f"PL已设为 {get_user_pl_balance(username):.4f}")
    save_user_pl()

def modify_verification(username):
    user = find_user(username)
    if not user:
        return
    current = identity_verifications.get(username, {}).get('verified', False)
    print(f"当前认证状态: {'已认证' if current else '未认证'}")
    if current:
        choice = input("删除认证? (y/n): ").strip().lower()
        if choice == 'y':
            if username in identity_verifications:
                del identity_verifications[username]
                save_identity_verifications()
                print("已删除认证")
        return
    print("\n请输入认证信息:")
    real_name = input("真实姓名: ").strip()
    id_number = input("身份证号: ").strip()
    gender = input("性别 (男/女): ").strip()
    if not all([real_name, id_number, gender]):
        print("信息不完整")
        return
    if len(id_number) != 18:
        print("身份证号必须为18位")
        return
    id_hash = hashlib.sha256(id_number.encode()).hexdigest()
    id_masked = id_number[:3] + '*****' + id_number[14:]
    identity_verifications[username] = {
        'username': username, 'real_name': real_name,
        'id_number_hash': id_hash, 'id_number_masked': id_masked,
        'gender': gender, 'verified': True,
        'verified_at': datetime.now().isoformat()
    }
    save_identity_verifications()
    print("认证成功！")

def modify_attendance(username):
    user = find_user(username)
    if not user:
        return
    print(f"\n当前签到: 累计 {user.get('attendanceTotalDays', 0)} 天, 连续 {user.get('attendanceConsecutiveDays', 0)} 天")
    print("1. 修改累计天数")
    print("2. 修改连续天数")
    print("3. 同时修改")
    print("4. 重置")
    choice = input("请选择 (1-4): ").strip()
    if choice == '1':
        try:
            user['attendanceTotalDays'] = int(input("新的累计天数: "))
        except ValueError:
            print("请输入整数")
            return
    elif choice == '2':
        try:
            user['attendanceConsecutiveDays'] = int(input("新的连续天数: "))
        except ValueError:
            print("请输入整数")
            return
    elif choice == '3':
        try:
            user['attendanceTotalDays'] = int(input("新的累计天数: "))
            user['attendanceConsecutiveDays'] = int(input("新的连续天数: "))
        except ValueError:
            print("请输入整数")
            return
    elif choice == '4':
        confirm = input("确认重置? (y/n): ").strip().lower()
        if confirm == 'y':
            user['attendanceTotalDays'] = 0
            user['attendanceConsecutiveDays'] = 0
            user['lastAttendanceDate'] = ''
            user['firstAttendanceDate'] = ''
            user['lastAttendanceTimestamp'] = 0
    else:
        print("无效选择")
        return
    save_users()
    print(f"已更新: 累计 {user.get('attendanceTotalDays', 0)} 天, 连续 {user.get('attendanceConsecutiveDays', 0)} 天")

def delete_user(username):
    user = find_user(username)
    if not user:
        return
    confirm = input(f"确认删除用户 '{username}'? (y/n): ").strip().lower()
    if confirm != 'y':
        return
    if username in users:
        del users[username]
        save_users()
    for data in [user_pl, identity_verifications, restricted_users, gateway_cards, fund_data]:
        if username in data:
            del data[username]
    save_user_pl()
    save_identity_verifications()
    save_restricted_users()
    save_gateway_cards()
    save_fund_data()
    print(f"用户 '{username}' 已删除")

def attendance_compensation_menu():
    while True:
        print("\n" + "="*60)
        print("     签到补偿管理")
        print("="*60)
        print("1. 为用户补签 (增加签到天数)")
        print("2. 批量补签")
        print("3. 回退签到 (减少签到天数)")
        print("4. 重置用户签到")
        print("5. 查看签到排行")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            compensate_attendance()
        elif choice == '2':
            batch_compensate_attendance()
        elif choice == '3':
            rollback_attendance()
        elif choice == '4':
            reset_attendance()
        elif choice == '5':
            show_attendance_rank()
        else:
            print("无效选项")

def compensate_attendance():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    try:
        days = int(input("请输入要补签的天数: "))
    except ValueError:
        print("请输入有效的整数")
        return
    if days <= 0:
        print("天数必须大于0")
        return
    current_total = user.get('attendanceTotalDays', 0)
    current_consecutive = user.get('attendanceConsecutiveDays', 0)
    user['attendanceTotalDays'] = current_total + days
    user['attendanceConsecutiveDays'] = min(current_consecutive + days, user['attendanceTotalDays'])
    if user.get('lastAttendanceDate'):
        user['lastAttendanceDate'] = datetime.now().strftime('%Y-%m-%d')
    save_users()
    print(f"补签成功!")
    print(f"   累计签到: {current_total} → {user['attendanceTotalDays']} 天")
    print(f"   连续签到: {current_consecutive} → {user['attendanceConsecutiveDays']} 天")

def batch_compensate_attendance():
    print("\n批量补签")
    print("输入格式: 用户名,补签天数 (每行一个)")
    print("输入空行结束")
    print("-"*40)
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    if not lines:
        print("没有输入任何数据")
        return
    success = 0
    failed = []
    for line in lines:
        parts = line.split(',')
        if len(parts) != 2:
            failed.append(f"{line} - 格式错误")
            continue
        username = parts[0].strip()
        try:
            days = int(parts[1].strip())
        except ValueError:
            failed.append(f"{line} - 天数必须是整数")
            continue
        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue
        if days <= 0:
            failed.append(f"{line} - 天数必须大于0")
            continue
        user = users[username]
        user['attendanceTotalDays'] = user.get('attendanceTotalDays', 0) + days
        user['attendanceConsecutiveDays'] = min(user.get('attendanceConsecutiveDays', 0) + days, user['attendanceTotalDays'])
        if user.get('lastAttendanceDate'):
            user['lastAttendanceDate'] = datetime.now().strftime('%Y-%m-%d')
        success += 1
    if success > 0:
        save_users()
        print(f"成功补签 {success} 个用户")
    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def rollback_attendance():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    current_total = user.get('attendanceTotalDays', 0)
    current_consecutive = user.get('attendanceConsecutiveDays', 0)
    print(f"\n当前签到数据:")
    print(f"  累计签到: {current_total} 天")
    print(f"  连续签到: {current_consecutive} 天")
    try:
        days = int(input("请输入要回退的天数: "))
    except ValueError:
        print("请输入有效的整数")
        return
    if days <= 0:
        print("天数必须大于0")
        return
    if current_total < days:
        print(f"累计签到只有 {current_total} 天，无法回退 {days} 天")
        return
    user['attendanceTotalDays'] = current_total - days
    user['attendanceConsecutiveDays'] = max(0, current_consecutive - days)
    save_users()
    print(f"回退成功!")
    print(f"   累计签到: {current_total} → {user['attendanceTotalDays']} 天")
    print(f"   连续签到: {current_consecutive} → {user['attendanceConsecutiveDays']} 天")

def reset_attendance():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    print(f"\n当前签到数据:")
    print(f"  累计签到: {user.get('attendanceTotalDays', 0)} 天")
    print(f"  连续签到: {user.get('attendanceConsecutiveDays', 0)} 天")
    confirm = input("\n确认重置所有签到数据? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    user['attendanceTotalDays'] = 0
    user['attendanceConsecutiveDays'] = 0
    user['lastAttendanceDate'] = ''
    user['firstAttendanceDate'] = ''
    user['lastAttendanceTimestamp'] = 0
    user['attendanceClaimedTotalCycles'] = {}
    user['attendanceClaimedConsecutiveCycles'] = {}
    save_users()
    print("签到数据已重置")

def show_attendance_rank():
    if not users:
        print("没有用户数据")
        return
    sorted_users = sorted(
        [(u, data.get('attendanceTotalDays', 0), data.get('attendanceConsecutiveDays', 0))
         for u, data in users.items() if data.get('attendanceTotalDays', 0) > 0],
        key=lambda x: x[1],
        reverse=True
    )
    if not sorted_users:
        print("没有用户有签到记录")
        return
    print("\n" + "="*60)
    print("签到排行 (累计签到)")
    print("-"*60)
    print(f"{'排名':<6} {'用户名':<20} {'累计':<10} {'连续':<10}")
    print("-"*60)
    for i, (username, total, consecutive) in enumerate(sorted_users[:20], 1):
        print(f"{i:<6} {username:<20} {total:<10} {consecutive:<10}")
    print("="*60)
    print(f"共 {len(sorted_users)} 个用户有签到记录")

def pl_rate_management_menu():
    while True:
        current_rate = get_current_pl_rate()
        print("\n" + "="*60)
        print(f"PL汇率管理 (当前汇率: {current_rate:.4f})")
        print("="*60)
        print("1. 查看汇率历史")
        print("2. 强制刷新汇率")
        print("3. 设置固定汇率")
        print("4. 查看汇率统计")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_pl_rate_history()
        elif choice == '2':
            force_refresh_pl_rate()
        elif choice == '3':
            set_fixed_pl_rate()
        elif choice == '4':
            show_pl_rate_stats()
        else:
            print("无效选项")

def get_current_pl_rate():
    history = pl_rate_data.get('rate_history', [])
    if history:
        latest = history[-1]
        current_time = int(time.time())
        if current_time - latest.get('timestamp', 0) < 300:
            return latest.get('rate', 0.07)
    return generate_new_pl_rate()

def generate_new_pl_rate():
    current_time = int(time.time())
    period = current_time // 300
    seed_bytes = str(period).encode() + b'pl_rate_salt_2024'
    seed_hash = hashlib.md5(seed_bytes).hexdigest()
    seed_int = int(seed_hash[:8], 16)
    random.seed(seed_int)
    rate = round(random.uniform(0.02, 0.42), 4)
    random.seed()
    if 'rate_history' not in pl_rate_data:
        pl_rate_data['rate_history'] = []
    pl_rate_data['rate_history'].append({
        'timestamp': current_time,
        'rate': rate,
        'period': period
    })
    if len(pl_rate_data['rate_history']) > 1000:
        pl_rate_data['rate_history'] = pl_rate_data['rate_history'][-1000:]
    save_pl_rate_data()
    return rate

def show_pl_rate_history():
    history = pl_rate_data.get('rate_history', [])
    if not history:
        print("没有汇率历史记录")
        return
    print("\n" + "="*60)
    print("PL汇率历史 (最近20条)")
    print("-"*60)
    for record in history[-20:]:
        dt = datetime.fromtimestamp(record.get('timestamp', 0)).strftime('%Y-%m-%d %H:%M:%S')
        rate = record.get('rate', 0)
        print(f"  {dt}  ->  {rate:.4f}")
    print("="*60)

def force_refresh_pl_rate():
    confirm = input("确认强制刷新PL汇率? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    new_rate = generate_new_pl_rate()
    print(f"汇率已刷新: {new_rate:.4f}")

def set_fixed_pl_rate():
    try:
        rate = float(input("请输入要设置的汇率值 (0.02-0.42): "))
    except ValueError:
        print("请输入有效的数字")
        return
    if rate < 0.02 or rate > 0.42:
        print("汇率必须在 0.02-0.42 之间")
        return
    current_time = int(time.time())
    if 'rate_history' not in pl_rate_data:
        pl_rate_data['rate_history'] = []
    pl_rate_data['rate_history'].append({
        'timestamp': current_time,
        'rate': rate,
        'period': current_time // 300,
        'fixed': True
    })
    save_pl_rate_data()
    print(f"汇率已设置为 {rate:.4f}")

def show_pl_rate_stats():
    history = pl_rate_data.get('rate_history', [])
    if not history:
        print("没有汇率历史数据")
        return
    rates = [r.get('rate', 0) for r in history]
    print("\n" + "="*60)
    print("PL汇率统计")
    print("-"*60)
    print(f"记录总数: {len(rates)}")
    print(f"最高汇率: {max(rates):.4f}")
    print(f"最低汇率: {min(rates):.4f}")
    print(f"平均汇率: {sum(rates)/len(rates):.4f}")
    print(f"当前汇率: {rates[-1]:.4f}")
    print("="*60)

def fund_management_menu():
    while True:
        print("\n" + "="*60)
        print("     理财基金管理")
        print("="*60)
        print("1. 查看用户理财余额")
        print("2. 修改用户理财余额")
        print("3. 批量添加理财余额")
        print("4. 查看理财利率")
        print("5. 修改理财利率")
        print("6. 查看理财历史")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_user_fund()
        elif choice == '2':
            modify_user_fund()
        elif choice == '3':
            batch_add_fund()
        elif choice == '4':
            show_fund_rate()
        elif choice == '5':
            modify_fund_rate()
        elif choice == '6':
            show_fund_history()
        else:
            print("无效选项")

def show_user_fund():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    fund = fund_data.get(username, {})
    balance = fund.get('balance', 0)
    total_interest = fund.get('total_interest', 0)
    today = datetime.now().strftime('%Y-%m-%d')
    today_interest = fund.get('today_interest', {}).get(today, 0)
    print(f"\n用户 '{username}' 理财信息:")
    print("-"*40)
    print(f"理财余额: {balance:.2f} 积分")
    print(f"总收益: {total_interest:.2f} 积分")
    print(f"今日收益: {today_interest:.2f} 积分")
    print(f"最后计息日: {fund.get('last_interest_date', '无')}")

def modify_user_fund():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    fund = fund_data.get(username, {})
    current = fund.get('balance', 0)
    print(f"\n当前理财余额: {current:.2f} 积分")
    try:
        new_value = float(input("请输入新的理财余额: "))
    except ValueError:
        print("请输入有效的数字")
        return
    if new_value < 0:
        print("理财余额不能为负数")
        return
    if username not in fund_data:
        fund_data[username] = {'balance': 0, 'total_interest': 0, 'today_interest': {}, 'last_interest_date': ''}
    fund_data[username]['balance'] = round(new_value, 2)
    save_fund_data()
    print(f"理财余额已修改为: {new_value:.2f} 积分")

def batch_add_fund():
    print("\n批量添加理财余额")
    print("输入格式: 用户名,金额 (每行一个)")
    print("输入空行结束")
    print("-"*40)
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    if not lines:
        print("没有输入任何数据")
        return
    success = 0
    failed = []
    for line in lines:
        parts = line.split(',')
        if len(parts) != 2:
            failed.append(f"{line} - 格式错误")
            continue
        username = parts[0].strip()
        try:
            amount = float(parts[1].strip())
        except ValueError:
            failed.append(f"{line} - 金额必须是数字")
            continue
        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue
        if amount <= 0:
            failed.append(f"{line} - 金额必须大于0")
            continue
        if username not in fund_data:
            fund_data[username] = {'balance': 0, 'total_interest': 0, 'today_interest': {}, 'last_interest_date': ''}
        fund_data[username]['balance'] = round(fund_data[username]['balance'] + amount, 2)
        success += 1
    if success > 0:
        save_fund_data()
        print(f"成功为 {success} 个用户添加理财余额")
    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def show_fund_rate():
    today = datetime.now().strftime('%Y-%m-%d')
    rate_data = load_data(os.path.join(DATA_DIR, 'fund_rate.enc'), {})
    rate = rate_data.get(today, {}).get('rate', 0.0058)
    print("\n" + "="*40)
    print("理财利率信息")
    print("-"*40)
    print(f"日期: {today}")
    print(f"利率: {rate:.4f}")
    print(f"范围: 0.0058 - 0.5183")
    print("="*40)

def modify_fund_rate():
    today = datetime.now().strftime('%Y-%m-%d')
    rate_data = load_data(os.path.join(DATA_DIR, 'fund_rate.enc'), {})
    current = rate_data.get(today, {}).get('rate', 0.0058)
    print(f"\n当前利率: {current:.4f}")
    try:
        new_rate = float(input("请输入新的利率 (0.0058-0.5183): "))
    except ValueError:
        print("请输入有效的数字")
        return
    if new_rate < 0.0058 or new_rate > 0.5183:
        print("利率必须在 0.0058-0.5183 之间")
        return
    rate_data[today] = {
        'rate': round(new_rate, 4),
        'date': today,
        'updated_at': int(time.time() * 1000)
    }
    save_data(os.path.join(DATA_DIR, 'fund_rate.enc'), rate_data)
    print(f"今日利率已修改为: {new_rate:.4f}")

def show_fund_history():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    history = []
    for rid, record in fund_history.items():
        if record.get('username') == username:
            history.append(record)
    if not history:
        print(f"用户 '{username}' 没有理财记录")
        return
    history.sort(key=lambda x: -x.get('timestamp', 0))
    print(f"\n用户 '{username}' 理财历史 (最近20条)")
    print("-"*60)
    for record in history[:20]:
        dt = datetime.fromtimestamp(record.get('timestamp', 0)/1000).strftime('%Y-%m-%d %H:%M:%S')
        op_type = record.get('type', '')
        amount = record.get('amount', 0)
        sign = '+' if op_type in ['deposit', 'interest'] else '-'
        print(f"  {dt}  {op_type:<10} {sign}{amount:.2f}")

def system_points_menu():
    while True:
        print("\n" + "="*60)
        print(f"系统积分池管理 (当前: {system_points:.2f})")
        print("="*60)
        print("1. 查看积分池详情")
        print("2. 添加积分到池子")
        print("3. 从池子扣除积分")
        print("4. 重置积分池")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_system_points()
        elif choice == '2':
            add_to_system_points()
        elif choice == '3':
            deduct_from_system_points()
        elif choice == '4':
            reset_system_points()
        else:
            print("无效选项")

def show_system_points():
    global system_points
    total_user_points = sum(u.get('totalPoints', 0) for u in users.values())
    total_fund = sum(f.get('balance', 0) for f in fund_data.values())
    print("\n" + "="*50)
    print("系统积分池详情")
    print("-"*50)
    print(f"系统总积分: {system_points:.2f}")
    print(f"用户总积分: {total_user_points:.2f}")
    print(f"理财总余额: {total_fund:.2f}")
    print(f"总流通积分: {total_user_points + total_fund:.2f}")
    print("="*50)

def add_to_system_points():
    global system_points
    try:
        amount = float(input("请输入要添加的积分数量: "))
    except ValueError:
        print("请输入有效的数字")
        return
    if amount <= 0:
        print("数量必须大于0")
        return
    system_points += amount
    save_system_points()
    print(f"已添加 {amount:.2f} 积分到系统池")
    print(f"   当前系统总积分: {system_points:.2f}")

def deduct_from_system_points():
    global system_points
    try:
        amount = float(input("请输入要扣除的积分数量: "))
    except ValueError:
        print("请输入有效的数字")
        return
    if amount <= 0:
        print("数量必须大于0")
        return
    if system_points < amount:
        print(f"系统积分不足，当前只有 {system_points:.2f}")
        return
    system_points -= amount
    save_system_points()
    print(f"已扣除 {amount:.2f} 积分")
    print(f"   当前系统总积分: {system_points:.2f}")

def reset_system_points():
    global system_points
    confirm = input(f"确认重置系统积分池为0? (当前: {system_points:.2f}) (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    system_points = 0
    save_system_points()
    print("系统积分池已重置为0")

def coupon_management_menu():
    while True:
        print("\n" + "="*60)
        print("     优惠券管理")
        print("="*60)
        print("1. 查看用户优惠券")
        print("2. 发放优惠券 (发送到邮箱)")
        print("3. 批量发放优惠券 (发送到邮箱)")
        print("4. 撤销优惠券")
        print("5. 查看优惠券统计")
        print("6. 清理过期优惠券")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_user_coupons()
        elif choice == '2':
            grant_coupon()
        elif choice == '3':
            batch_grant_coupons()
        elif choice == '4':
            revoke_coupon()
        elif choice == '5':
            show_coupon_stats()
        elif choice == '6':
            cleanup_expired_coupons()
        else:
            print("无效选项")

def show_user_coupons():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    coupons = []
    for cid, coupon in user_coupons.items():
        if coupon.get('username') == username:
            coupons.append(coupon)
    if not coupons:
        print(f"用户 '{username}' 没有优惠券")
        return
    print(f"\n用户 '{username}' 的优惠券:")
    print("-"*60)
    for i, coupon in enumerate(coupons, 1):
        status = "已使用" if coupon.get('used', False) else "有效"
        c_type = coupon.get('type', 'unknown')
        discount = coupon.get('discount', 0)
        threshold = coupon.get('threshold', 0)
        expire = datetime.fromtimestamp(coupon.get('expire_at', 0)/1000).strftime('%Y-%m-%d %H:%M')
        print(f"  {i}. {c_type} 减{discount} 门槛{threshold} [{status}]")
        print(f"     过期: {expire}")

def grant_coupon():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return

    print("\n选择优惠券类型:")
    print("1. 满减券 (满X减Y)")
    print("2. 无门槛券")
    print("3. 指定商品券")
    print("4. PL立减金")
    print("5. 指定补签卡券")
    print("6. 赌神卡券")

    choice = input("请选择 (1-6): ").strip()
    type_map = {
        '1': 'full_reduction',
        '2': 'unconditional',
        '3': 'product_specific',
        '4': 'pl_discount',
        '5': 'makeup_specific',
        '6': 'gamblers_specific'
    }

    if choice not in type_map:
        print("无效选择")
        return

    coupon_type = type_map[choice]

    try:
        discount = float(input("请输入优惠金额: "))
        if discount <= 0:
            print("优惠金额必须大于0")
            return
    except ValueError:
        print("请输入有效的数字")
        return

    threshold = 0
    product_id = ''

    if coupon_type == 'full_reduction':
        try:
            threshold = float(input("请输入门槛金额: "))
            if threshold <= 0:
                print("门槛金额必须大于0")
                return
            if threshold < discount:
                print("门槛不能小于优惠金额")
                return
            if threshold > 12:
                print("满减券门槛不能超过12积分")
                return
            if discount > 10:
                print("满减券优惠金额不能超过10积分")
                return
        except ValueError:
            print("请输入有效的数字")
            return

    elif coupon_type == 'unconditional':
        if discount > 7:
            print("无门槛券优惠金额不能超过7积分")
            return

    elif coupon_type == 'pl_discount':
        if discount < 3 or discount > 12:
            print("PL立减金金额必须在3-12之间")
            return
        threshold = 0
        product_id = ''

    elif coupon_type == 'product_specific':
        print("\n支持的商品ID:")
        print("  point_code - 普通积分卡 (原价1.2)")
        print("  premium_point_code - 高级积分卡 (原价3.5)")
        print("  reset_code - 重置密码卡 (原价8)")
        print("  boost_code - 积分加成卡 (原价8.8)")
        print("  special_point_code - 特殊积分卡 (原价20)")
        print("  makeup_code - 补签卡 (原价200)")
        print("  gamblers_code - 赌神积分卡 (原价100)")

        product_id = input("请输入商品ID: ").strip()

        price_map = {
            'point_code': 1.2,
            'premium_point_code': 3.5,
            'reset_code': 8,
            'boost_code': 8.8,
            'special_point_code': 20,
            'makeup_code': 200,
            'gamblers_code': 100
        }

        base_price = price_map.get(product_id, 0)
        if base_price <= 0:
            print("无效的商品ID")
            return

        max_discount = base_price * 0.8
        if discount > max_discount:
            print(f"指定商品券优惠金额不能超过原价{base_price}积分的80%，即{max_discount:.2f}积分")
            return
        threshold = 0

    elif coupon_type == 'makeup_specific':
        product_id = 'makeup_code'
        if discount > 160:
            print("指定补签卡券优惠金额不能超过160积分")
            return
        threshold = 0

    elif coupon_type == 'gamblers_specific':
        product_id = 'gamblers_code'
        if discount < 0 or discount > 30:
            print("赌神卡券金额必须在0-30之间")
            return
        threshold = 0

    duration = 24
    try:
        duration_input = input("请输入有效期(小时, 默认24): ").strip()
        if duration_input:
            duration = int(duration_input)
            if duration < 1 or duration > 168:
                print("有效期必须在1-168小时之间")
                return
    except ValueError:
        print("请输入有效的数字")
        return

    coupon_id = f"CPN_{int(time.time()*1000)}_{random.randint(1000,9999)}"
    expire_at = int((time.time() + duration * 3600) * 1000)

    type_labels = {
        'full_reduction': '满减券',
        'unconditional': '无门槛券',
        'product_specific': '指定商品券',
        'pl_discount': 'PL立减金',
        'makeup_specific': '指定补签卡券',
        'gamblers_specific': '赌神卡券'
    }

    desc = f'管理员发放-{type_labels.get(coupon_type, coupon_type)}'
    if coupon_type == 'full_reduction':
        desc = f'满{threshold}减{discount}'
    elif coupon_type == 'unconditional':
        desc = f'无门槛减{discount}'
    elif coupon_type == 'pl_discount':
        desc = f'PL立减{discount}PL'
    elif coupon_type == 'product_specific':
        product_label = get_product_type_label(product_id)
        desc = f'指定{product_label}减{discount}'
    elif coupon_type == 'makeup_specific':
        desc = f'指定补签卡减{discount}'
    elif coupon_type == 'gamblers_specific':
        desc = f'指定赌神卡减{discount}'

    user_coupons[coupon_id] = {
        'id': coupon_id,
        'username': username,
        'type': coupon_type,
        'discount': round(discount, 1),
        'threshold': round(threshold, 1),
        'product_id': product_id,
        'used': False,
        'expire_at': expire_at,
        'created_at': int(time.time() * 1000),
        'description': desc
    }
    save_user_coupons()

    mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
    mail_attachments[mail_id] = {
        'id': mail_id,
        'username': username,
        'type': 'coupon',
        'coupon_id': coupon_id,
        'created_at': int(time.time() * 1000),
        'expires_at': int(time.time() * 1000) + 28800000,
        'title': f'优惠券-{type_labels.get(coupon_type, coupon_type)}',
        'description': desc,
        'claimed': False,
        'claimed_at': 0,
        'source': 'admin_grant'
    }
    save_mail_attachments()

    print(f"优惠券已发放到用户邮箱: {coupon_id}")
    print(f"  类型: {type_labels.get(coupon_type, coupon_type)}")
    print(f"  优惠: {desc}")

def get_product_type_label(product_id):
    labels = {
        'point_code': '普通积分卡',
        'premium_point_code': '高级积分卡',
        'reset_code': '重置密码卡',
        'boost_code': '积分加成卡',
        'special_point_code': '特殊积分卡',
        'makeup_code': '补签卡',
        'gamblers_code': '赌神积分卡'
    }
    return labels.get(product_id, product_id)

def batch_grant_coupons():
    print("\n批量发放优惠券 (发送到邮箱)")
    print("输入格式: 用户名,优惠券类型,优惠金额,门槛(可选),商品ID(可选)")
    print("类型: full_reduction, unconditional, product_specific, pl_discount, makeup_specific, gamblers_specific")
    print("示例: testuser,full_reduction,5,10")
    print("示例: testuser,product_specific,1,,point_code")
    print("输入空行结束")
    print("-"*40)

    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)

    if not lines:
        print("没有输入任何数据")
        return

    success = 0
    failed = []

    for line in lines:
        parts = line.split(',')
        if len(parts) < 3:
            failed.append(f"{line} - 格式错误 (需要至少3个字段)")
            continue

        username = parts[0].strip()
        coupon_type = parts[1].strip()

        try:
            discount = float(parts[2].strip())
            if discount <= 0:
                failed.append(f"{line} - 优惠金额必须大于0")
                continue
        except ValueError:
            failed.append(f"{line} - 优惠金额必须是数字")
            continue

        if coupon_type not in ['full_reduction', 'unconditional', 'product_specific', 'pl_discount', 'makeup_specific', 'gamblers_specific']:
            failed.append(f"{line} - 无效的优惠券类型")
            continue

        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue

        threshold = 0
        if len(parts) >= 4 and parts[3].strip():
            try:
                threshold = float(parts[3].strip())
                if threshold < 0:
                    threshold = 0
            except ValueError:
                pass

        product_id = ''
        if len(parts) >= 5 and parts[4].strip():
            product_id = parts[4].strip()

        if coupon_type == 'full_reduction':
            if discount > 10:
                failed.append(f"{line} - 满减券优惠金额不能超过10积分")
                continue
            if threshold <= 0:
                failed.append(f"{line} - 满减券必须设置门槛")
                continue
            if threshold > 12:
                failed.append(f"{line} - 满减券门槛不能超过12积分")
                continue
            if threshold < discount:
                failed.append(f"{line} - 满减券门槛不能小于优惠金额")
                continue

        elif coupon_type == 'unconditional':
            if discount > 7:
                failed.append(f"{line} - 无门槛券优惠金额不能超过7积分")
                continue

        elif coupon_type == 'pl_discount':
            if discount < 3 or discount > 12:
                failed.append(f"{line} - PL立减金金额必须在3-12之间")
                continue
            threshold = 0
            product_id = ''

        elif coupon_type == 'product_specific':
            price_map = {
                'point_code': 1.2,
                'premium_point_code': 3.5,
                'reset_code': 8,
                'boost_code': 8.8,
                'special_point_code': 20,
                'makeup_code': 200,
                'gamblers_code': 100
            }
            base_price = price_map.get(product_id, 0)
            if base_price <= 0:
                failed.append(f"{line} - 无效的商品ID")
                continue
            max_discount = base_price * 0.8
            if discount > max_discount:
                failed.append(f"{line} - 优惠金额不能超过{max_discount:.2f}")
                continue
            threshold = 0

        elif coupon_type == 'makeup_specific':
            if product_id != 'makeup_code':
                product_id = 'makeup_code'
            if discount > 160:
                failed.append(f"{line} - 指定补签卡券优惠金额不能超过160积分")
                continue
            threshold = 0

        elif coupon_type == 'gamblers_specific':
            if product_id != 'gamblers_code':
                product_id = 'gamblers_code'
            if discount < 0 or discount > 30:
                failed.append(f"{line} - 赌神卡券金额必须在0-30之间")
                continue
            threshold = 0

        coupon_id = f"CPN_{int(time.time()*1000)}_{random.randint(1000,9999)}"
        expire_at = int((time.time() + 24 * 3600) * 1000)

        type_labels = {
            'full_reduction': '满减券',
            'unconditional': '无门槛券',
            'product_specific': '指定商品券',
            'pl_discount': 'PL立减金',
            'makeup_specific': '指定补签卡券',
            'gamblers_specific': '赌神卡券'
        }

        desc = f'批量发放-{type_labels.get(coupon_type, coupon_type)}'
        if coupon_type == 'full_reduction':
            desc = f'满{threshold}减{discount}'
        elif coupon_type == 'unconditional':
            desc = f'无门槛减{discount}'
        elif coupon_type == 'pl_discount':
            desc = f'PL立减{discount}PL'
        elif coupon_type == 'product_specific':
            product_label = get_product_type_label(product_id)
            desc = f'指定{product_label}减{discount}'
        elif coupon_type == 'makeup_specific':
            desc = f'指定补签卡减{discount}'
        elif coupon_type == 'gamblers_specific':
            desc = f'指定赌神卡减{discount}'

        user_coupons[coupon_id] = {
            'id': coupon_id,
            'username': username,
            'type': coupon_type,
            'discount': round(discount, 1),
            'threshold': round(threshold, 1),
            'product_id': product_id,
            'used': False,
            'expire_at': expire_at,
            'created_at': int(time.time() * 1000),
            'description': desc
        }

        mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
        mail_attachments[mail_id] = {
            'id': mail_id,
            'username': username,
            'type': 'coupon',
            'coupon_id': coupon_id,
            'created_at': int(time.time() * 1000),
            'expires_at': int(time.time() * 1000) + 28800000,
            'title': f'优惠券-{type_labels.get(coupon_type, coupon_type)}',
            'description': desc,
            'claimed': False,
            'claimed_at': 0,
            'source': 'batch_grant'
        }
        success += 1

    if success > 0:
        save_user_coupons()
        save_mail_attachments()
        print(f"成功发放 {success} 张优惠券到用户邮箱")

    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def revoke_coupon():
    coupon_id = input("请输入优惠券ID: ").strip()
    if coupon_id not in user_coupons:
        print("优惠券不存在")
        return
    if user_coupons[coupon_id].get('used', False):
        print("优惠券已被使用，无法撤销")
        return
    username = user_coupons[coupon_id].get('username', '')
    confirm = input(f"确认撤销用户 '{username}' 的优惠券? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return

    for mail_id, mail in mail_attachments.items():
        if mail.get('type') == 'coupon' and mail.get('coupon_id') == coupon_id:
            del mail_attachments[mail_id]
            break

    del user_coupons[coupon_id]
    save_user_coupons()
    save_mail_attachments()
    print("优惠券已撤销")

def show_coupon_stats():
    total = len(user_coupons)
    used = sum(1 for c in user_coupons.values() if c.get('used', False))
    valid = total - used
    type_stats = {}
    for c in user_coupons.values():
        c_type = c.get('type', 'unknown')
        type_stats[c_type] = type_stats.get(c_type, 0) + 1
    print("\n" + "="*50)
    print("优惠券统计")
    print("-"*50)
    print(f"总数: {total}")
    print(f"已使用: {used}")
    print(f"有效: {valid}")
    print("\n按类型:")
    for c_type, count in sorted(type_stats.items()):
        print(f"  {c_type}: {count}")
    print("="*50)

def cleanup_expired_coupons():
    current_time = int(time.time() * 1000)
    to_remove = []
    for cid, coupon in user_coupons.items():
        if coupon.get('used', False) or coupon.get('expire_at', 0) < current_time:
            to_remove.append(cid)
    if not to_remove:
        print("没有需要清理的优惠券")
        return
    confirm = input(f"确认清理 {len(to_remove)} 张过期/已使用的优惠券? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return

    for cid in to_remove:
        for mail_id, mail in mail_attachments.items():
            if mail.get('type') == 'coupon' and mail.get('coupon_id') == cid:
                del mail_attachments[mail_id]
                break
        del user_coupons[cid]

    save_user_coupons()
    save_mail_attachments()
    print(f"已清理 {len(to_remove)} 张优惠券")

def claim_coupon_from_mail(username, mail_id):
    if mail_id not in mail_attachments:
        return False, "邮件不存在"

    mail = mail_attachments[mail_id]
    if mail.get('username') != username:
        return False, "无权操作"

    if mail.get('claimed', False):
        return False, "已领取"

    if mail.get('type') != 'coupon':
        return False, "不是优惠券邮件"

    coupon_id = mail.get('coupon_id')
    if not coupon_id or coupon_id not in user_coupons:
        return False, "优惠券不存在"

    coupon = user_coupons[coupon_id]
    if coupon.get('used', False):
        return False, "优惠券已使用"

    mail['claimed'] = True
    mail['claimed_at'] = int(time.time() * 1000)
    save_mail_attachments()

    return True, f"成功领取优惠券: {coupon.get('description', '')}"

def cdk_management_menu():
    while True:
        print("\n" + "="*60)
        print("     CDK礼包管理")
        print("="*60)
        print("1. 查看所有CDK")
        print("2. 创建CDK礼包")
        print("3. 删除CDK礼包")
        print("4. 查看用户CDK兑换记录")
        print("5. CDK统计")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_cdk_packages()
        elif choice == '2':
            create_cdk_package()
        elif choice == '3':
            delete_cdk_package()
        elif choice == '4':
            show_user_cdk_records()
        elif choice == '5':
            show_cdk_stats()
        else:
            print("无效选项")

def show_cdk_packages():
    if not cdk_packages:
        print("没有CDK礼包")
        return
    print("\n" + "="*80)
    print(f"{'CDK码':<15} {'名称':<15} {'类型':<12} {'值':<10} {'状态':<8} {'使用者':<12}")
    print("-"*80)
    for code, pkg in cdk_packages.items():
        status = "已使用" if pkg.get('used', False) else "有效"
        used_by = pkg.get('used_by', '')
        print(f"{code:<15} {pkg.get('name', ''):<15} {pkg.get('reward_type', ''):<12} {pkg.get('reward_value', ''):<10} {status:<8} {used_by:<12}")
    print("="*80)

def create_cdk_package():
    name = input("请输入CDK名称 (小写字母和数字): ").strip().lower()
    if not name or len(name) < 3 or len(name) > 32:
        print("名称必须为3-32位小写字母和数字")
        return
    if name in cdk_packages:
        print("CDK名称已存在")
        return
    print("\n奖励类型:")
    print("1. 积分 (points)")
    print("2. 普通积分卡 (point_code)")
    print("3. 高级积分卡 (premium_point_code)")
    print("4. 重置密码卡 (reset_code)")
    print("5. 积分加成卡 (boost_code)")
    print("6. 特殊积分卡 (special_point_code)")
    print("7. 补签卡 (makeup_code)")
    print("8. 赌神积分卡 (gamblers_code)")
    choice = input("请选择 (1-8): ").strip()
    type_map = {
        '1': 'points', '2': 'point_code', '3': 'premium_point_code',
        '4': 'reset_code', '5': 'boost_code', '6': 'special_point_code',
        '7': 'makeup_code', '8': 'gamblers_code'
    }
    if choice not in type_map:
        print("无效选择")
        return
    reward_type = type_map[choice]
    reward_value = input("请输入奖励值: ").strip()
    try:
        quantity = int(input("请输入数量 (1-100): "))
        if quantity < 1 or quantity > 100:
            print("数量必须在1-100之间")
            return
    except ValueError:
        print("请输入有效的数字")
        return
    is_universal = input("是否通用CDK? (y/n): ").strip().lower() == 'y'
    cdk_packages[name] = {
        'code': name, 'name': name, 'reward_type': reward_type,
        'reward_value': reward_value, 'reward_quantity': quantity,
        'is_universal': is_universal, 'used': False, 'used_by': '',
        'used_at': 0, 'start_time': 0, 'expiry_time': 0,
        'created_at': int(time.time() * 1000),
        'min_total_days': 0, 'min_consecutive_days': 0
    }
    save_cdk_packages()
    print(f"CDK礼包 '{name}' 创建成功")

def delete_cdk_package():
    name = input("请输入CDK名称: ").strip().lower()
    if name not in cdk_packages:
        print("CDK不存在")
        return
    confirm = input(f"确认删除CDK '{name}'? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    del cdk_packages[name]
    save_cdk_packages()
    print(f"CDK '{name}' 已删除")

def show_user_cdk_records():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    records = user_cdk_records.get(username, {})
    if not records:
        print(f"用户 '{username}' 没有CDK兑换记录")
        return
    print(f"\n用户 '{username}' 的CDK兑换记录:")
    print("-"*60)
    for cdk_code, record in records.items():
        exchanged = datetime.fromtimestamp(record.get('exchanged_at', 0)/1000).strftime('%Y-%m-%d %H:%M')
        reward = record.get('reward_description', '')
        print(f"  {cdk_code}  ->  {reward}  ({exchanged})")

def show_cdk_stats():
    total = len(cdk_packages)
    used = sum(1 for p in cdk_packages.values() if p.get('used', False))
    type_stats = {}
    for p in cdk_packages.values():
        r_type = p.get('reward_type', 'unknown')
        type_stats[r_type] = type_stats.get(r_type, 0) + 1
    print("\n" + "="*50)
    print("CDK统计")
    print("-"*50)
    print(f"总数: {total}")
    print(f"已使用: {used}")
    print(f"有效: {total - used}")
    print("\n按奖励类型:")
    for r_type, count in sorted(type_stats.items()):
        print(f"  {r_type}: {count}")
    print("="*50)

def mail_management_menu():
    while True:
        print("\n" + "="*60)
        print("     邮件附件管理")
        print("="*60)
        print("1. 查看用户邮件")
        print("2. 领取邮件附件")
        print("3. 清理已领取邮件")
        print("4. 清理过期邮件")
        print("5. 查看邮件统计")
        print("6. 强制删除邮件")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_user_mails()
        elif choice == '2':
            claim_mail_attachment()
        elif choice == '3':
            cleanup_claimed_mails()
        elif choice == '4':
            cleanup_expired_mails()
        elif choice == '5':
            show_mail_stats()
        elif choice == '6':
            force_delete_mail()
        else:
            print("无效选项")

def show_user_mails():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return
    mails = [(aid, mail) for aid, mail in mail_attachments.items() if mail.get('username') == username]
    if not mails:
        print(f"用户 '{username}' 没有邮件")
        return
    print(f"\n用户 '{username}' 的邮件:")
    print("-"*60)
    for aid, mail in mails:
        status = "已领取" if mail.get('claimed', False) else "未领取"
        title = mail.get('title', '')
        created = datetime.fromtimestamp(mail.get('created_at', 0)/1000).strftime('%Y-%m-%d %H:%M')
        mail_type = mail.get('type', 'unknown')
        print(f"  [{mail_type}] {aid[:20]}... [{status}] {title}")
        print(f"    创建: {created}")
        if mail.get('type') == 'coupon':
            coupon_id = mail.get('coupon_id', '')
            if coupon_id in user_coupons:
                coupon = user_coupons[coupon_id]
                print(f"    优惠券: {coupon.get('description', '')}")

def claim_mail_attachment():
    username = input("请输入用户名: ").strip()
    user = find_user(username)
    if not user:
        return

    mail_id = input("请输入邮件ID: ").strip()
    if mail_id not in mail_attachments:
        print("邮件不存在")
        return

    mail = mail_attachments[mail_id]
    if mail.get('username') != username:
        print("无权操作")
        return

    if mail.get('claimed', False):
        print("已领取")
        return

    mail_type = mail.get('type', '')

    if mail_type == 'coupon':
        success, msg = claim_coupon_from_mail(username, mail_id)
        if success:
            print(f"领取成功! {msg}")
        else:
            print(f"领取失败: {msg}")
        return

    if mail_type in ['point', 'premium_point', 'reset', 'boost', 'special_point', 'makeup', 'gamblers', 'cancellation']:
        code = mail.get('code', '')
        codes = mail.get('codes', [])
        if not code and not codes:
            print("卡密不存在")
            return

        code_storage_map = {
            'point': (point_codes, save_point_codes),
            'premium_point': (premium_point_codes, save_premium_point_codes),
            'reset': (reset_codes, save_reset_codes),
            'boost': (boost_codes, save_boost_codes),
            'special_point': (special_point_codes, save_special_point_codes),
            'makeup': (makeup_codes, save_makeup_codes),
            'gamblers': (gamblers_codes, save_gamblers_codes),
            'cancellation': (cancellation_codes, save_cancellation_codes)
        }

        if mail_type not in code_storage_map:
            print("不支持的卡密类型")
            return

        storage, save_func = code_storage_map[mail_type]

        if mail.get('is_batch', False):
            added = 0
            for c in codes:
                if c and c not in storage:
                    storage[c] = {
                        'code': c,
                        'username': username,
                        'used': False,
                        'recycled': False,
                        'createdAt': mail.get('created_at', int(time.time() * 1000)),
                        'type': mail_type,
                        'adminGranted': True,
                        'source': mail.get('source', 'mail')
                    }
                    added += 1
            if added > 0:
                save_func()
                mail['claimed'] = True
                mail['claimed_at'] = int(time.time() * 1000)
                save_mail_attachments()
                print(f"成功领取 {added} 张卡密")
            else:
                print("卡密已存在或无效")
        else:
            if code and code not in storage:
                storage[code] = {
                    'code': code,
                    'username': username,
                    'used': False,
                    'recycled': False,
                    'createdAt': mail.get('created_at', int(time.time() * 1000)),
                    'type': mail_type,
                    'adminGranted': True,
                    'source': mail.get('source', 'mail')
                }
                save_func()
                mail['claimed'] = True
                mail['claimed_at'] = int(time.time() * 1000)
                save_mail_attachments()
                print(f"成功领取卡密: {code}")
            else:
                print("卡密已存在或无效")
        return

    print(f"不支持的邮件类型: {mail_type}")

def cleanup_claimed_mails():
    to_remove = [aid for aid, mail in mail_attachments.items() if mail.get('claimed', False)]
    if not to_remove:
        print("没有已领取的邮件")
        return
    confirm = input(f"确认清理 {len(to_remove)} 封已领取邮件? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    for aid in to_remove:
        del mail_attachments[aid]
    save_mail_attachments()
    print(f"已清理 {len(to_remove)} 封邮件")

def cleanup_expired_mails():
    current_time = int(time.time() * 1000)
    to_remove = [aid for aid, mail in mail_attachments.items() if mail.get('expires_at', 0) > 0 and current_time > mail.get('expires_at', 0)]
    if not to_remove:
        print("没有过期邮件")
        return
    confirm = input(f"确认清理 {len(to_remove)} 封过期邮件? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    for aid in to_remove:
        del mail_attachments[aid]
    save_mail_attachments()
    print(f"已清理 {len(to_remove)} 封邮件")

def show_mail_stats():
    total = len(mail_attachments)
    claimed = sum(1 for m in mail_attachments.values() if m.get('claimed', False))
    unclaimed = total - claimed
    type_stats = {}
    for m in mail_attachments.values():
        m_type = m.get('type', 'unknown')
        type_stats[m_type] = type_stats.get(m_type, 0) + 1
    print("\n" + "="*50)
    print("邮件统计")
    print("-"*50)
    print(f"总数: {total}")
    print(f"已领取: {claimed}")
    print(f"未领取: {unclaimed}")
    print("\n按类型:")
    for m_type, count in sorted(type_stats.items()):
        print(f"  {m_type}: {count}")
    print("="*50)

def force_delete_mail():
    mail_id = input("请输入邮件ID: ").strip()
    if mail_id not in mail_attachments:
        print("邮件不存在")
        return
    username = mail_attachments[mail_id].get('username', '')
    confirm = input(f"确认删除用户 '{username}' 的邮件? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    del mail_attachments[mail_id]
    save_mail_attachments()
    print("邮件已删除")

def gateway_card_management_menu():
    while True:
        print("\n" + "="*60)
        print("     通行证卡密管理")
        print("="*60)
        print("1. 列出所有通行证")
        print("2. 添加通行证 (扣除积分)")
        print("3. 移除通行证 (积分不退还)")
        print("4. 清理过期通行证")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            list_gateway_cards()
        elif choice == '2':
            username = input("用户名: ").strip()
            add_gateway_card(username)
        elif choice == '3':
            username = input("用户名: ").strip()
            remove_gateway_card(username)
        elif choice == '4':
            cleanup_gateway_cards()

def list_gateway_cards():
    if not gateway_cards:
        print("暂无通行证")
        return
    print("\n" + "="*70)
    print(f"{'用户名':<16} {'卡密':<24} {'类型':<10} {'状态':<10}")
    print("-"*70)
    for username, card in gateway_cards.items():
        print(f"{username:<16} {card.get('key', ''):<24} {get_card_type_label(card.get('type', '')):<10} {get_card_status(card):<10}")
    print("="*70)

def generate_gateway_key():
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    while True:
        parts = [''.join(random.choice(chars) for _ in range(4)) for _ in range(4)]
        key = '-'.join(parts)
        if key not in gateway_cards:
            return key

def get_card_expire_time(card_type):
    now = datetime.now()
    if card_type == 'hour':
        next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        if now.minute == 0 and now.second == 0:
            next_hour = now + timedelta(hours=1)
            next_hour = next_hour.replace(minute=0, second=0, microsecond=0)
        return int(next_hour.timestamp() * 1000)
    elif card_type == 'day':
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return int(tomorrow.timestamp() * 1000)
    elif card_type == 'permanent':
        return 0
    return 0

def get_card_price(card_type):
    prices = {'hour': 6.6, 'permanent': 388.8}
    if card_type == 'day':
        now = datetime.now()
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        remain_ms = (tomorrow - now).total_seconds() * 1000
        remain_hours = max(0, remain_ms / (1000 * 60 * 60))
        if remain_hours <= 0:
            return 0
        return round(remain_hours * 6.6, 2)
    return prices.get(card_type, 0)

def add_gateway_card(username):
    user = find_user(username)
    if not user:
        return
    print("\n1. 小时卡 - 6.6积分")
    print("2. 天卡 - 按小时计费")
    print("3. 永久卡 - 388.8积分")
    choice = input("请选择: ").strip()
    type_map = {'1': 'hour', '2': 'day', '3': 'permanent'}
    if choice not in type_map:
        print("无效选择")
        return
    card_type = type_map[choice]
    price = get_card_price(card_type)
    if price <= 0:
        print("当前时间无法购买天卡")
        return
    if user.get('totalPoints', 0) < price:
        print(f"积分不足，需要 {price:.2f}")
        return
    user['totalPoints'] = round(user['totalPoints'] - price, 2)
    save_users()
    key = generate_gateway_key()
    gateway_cards[username] = {
        'username': username, 'type': card_type, 'key': key,
        'price': price, 'created_at': int(time.time() * 1000),
        'expire_at': get_card_expire_time(card_type), 'used': False
    }
    save_gateway_cards()
    print(f"已添加: {key} (扣除 {price:.2f} 积分)")

def remove_gateway_card(username):
    if username not in gateway_cards:
        print("用户没有通行证")
        return
    confirm = input("确认移除? (积分不退还) (y/n): ").strip().lower()
    if confirm == 'y':
        del gateway_cards[username]
        save_gateway_cards()
        print("已移除")

def cleanup_gateway_cards():
    current_time = int(time.time() * 1000)
    removed = []
    for username in list(gateway_cards.keys()):
        card = gateway_cards[username]
        if card.get('used', False) or (card.get('expire_at', 0) > 0 and current_time > card.get('expire_at', 0)):
            removed.append(username)
    if removed:
        for username in removed:
            del gateway_cards[username]
        save_gateway_cards()
        print(f"清理了 {len(removed)} 张通行证")
    else:
        print("没有需要清理的通行证")

def code_management_menu():
    while True:
        print("\n" + "="*60)
        print("     卡密管理")
        print("="*60)
        print("1. 查看卡密统计")
        print("2. 查看用户卡密")
        print("3. 生成卡密 (管理员赠送，发送到邮箱)")
        print("4. 批量生成卡密 (发送到邮箱)")
        print("5. 回收卡密")
        print("6. 清理过期卡密")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_code_stats()
        elif choice == '2':
            username = input("用户名: ").strip()
            show_user_codes(username)
        elif choice == '3':
            generate_code_for_user()
        elif choice == '4':
            batch_generate_codes()
        elif choice == '5':
            recycle_code()
        elif choice == '6':
            cleanup_expired_codes()

def show_code_stats():
    code_types = {
        'point': (point_codes, '普通积分卡'),
        'premium_point': (premium_point_codes, '高级积分卡'),
        'reset': (reset_codes, '重置密码卡'),
        'boost': (boost_codes, '积分加成卡'),
        'special_point': (special_point_codes, '特殊积分卡'),
        'makeup': (makeup_codes, '补签卡'),
        'gamblers': (gamblers_codes, '赌神积分卡'),
        'cancellation': (cancellation_codes, '注销卡')
    }
    print("\n" + "="*60)
    print("卡密统计")
    print("-"*60)
    for name, (codes, label) in code_types.items():
        count = len(codes)
        used = sum(1 for c in codes.values() if c.get('used', False))
        recycled = sum(1 for c in codes.values() if c.get('recycled', False))
        print(f"{label:<12} 总数:{count:<6} 已用:{used:<6} 已回收:{recycled:<6}")
    print("="*60)

def show_user_codes(username):
    user = find_user(username)
    if not user:
        return
    code_types = {
        'point': (point_codes, '普通积分卡'),
        'premium_point': (premium_point_codes, '高级积分卡'),
        'reset': (reset_codes, '重置密码卡'),
        'boost': (boost_codes, '积分加成卡'),
        'special_point': (special_point_codes, '特殊积分卡'),
        'makeup': (makeup_codes, '补签卡'),
        'gamblers': (gamblers_codes, '赌神积分卡'),
        'cancellation': (cancellation_codes, '注销卡')
    }
    found = False
    print(f"\n用户 '{username}' 的卡密:")
    for type_name, (codes, label) in code_types.items():
        for code, data in codes.items():
            if data.get('username') == username:
                found = True
                status = "有效" if not data.get('used', False) and not data.get('recycled', False) else "已用"
                print(f"  {label:<10} {code:<20} {status}")
    if not found:
        print("  用户没有任何卡密")

def generate_code_for_user():
    username = input("用户名: ").strip()
    if username not in users:
        print("用户不存在")
        return
    print("\n1. 普通积分卡 2. 高级积分卡 3. 重置密码卡 4. 积分加成卡")
    print("5. 特殊积分卡 6. 补签卡 7. 赌神积分卡 8. 注销卡")
    choice = input("请选择 (1-8): ").strip()
    type_map = {
        '1': ('point', point_codes, save_point_codes, '普通积分卡'),
        '2': ('premium_point', premium_point_codes, save_premium_point_codes, '高级积分卡'),
        '3': ('reset', reset_codes, save_reset_codes, '重置密码卡'),
        '4': ('boost', boost_codes, save_boost_codes, '积分加成卡'),
        '5': ('special_point', special_point_codes, save_special_point_codes, '特殊积分卡'),
        '6': ('makeup', makeup_codes, save_makeup_codes, '补签卡'),
        '7': ('gamblers', gamblers_codes, save_gamblers_codes, '赌神积分卡'),
        '8': ('cancellation', cancellation_codes, save_cancellation_codes, '注销卡')
    }
    if choice not in type_map:
        print("无效选择")
        return
    type_name, codes, save_func, label = type_map[choice]
    code = generate_code()
    codes[code] = {
        'code': code, 'username': username, 'used': False, 'recycled': False,
        'createdAt': int(time.time() * 1000), 'type': type_name,
        'adminGranted': True, 'source': 'admin_grant'
    }
    save_func()

    mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
    mail_attachments[mail_id] = {
        'id': mail_id,
        'username': username,
        'type': type_name,
        'code': code,
        'codes': [code],
        'created_at': int(time.time() * 1000),
        'expires_at': int(time.time() * 1000) + 28800000,
        'title': f'管理员赠送-{label}',
        'description': f'管理员为您赠送了{label}1张',
        'claimed': False,
        'claimed_at': 0,
        'source': 'admin_grant',
        'quantity': 1,
        'is_batch': False
    }
    save_mail_attachments()

    print(f"已生成 {label}: {code} (已发送到邮箱)")

def batch_generate_codes():
    print("\n格式: 用户名,卡密类型,数量")
    print("类型: point, premium_point, reset, boost, special_point, makeup, gamblers, cancellation")
    print("输入空行结束")
    type_map = {
        'point': (point_codes, save_point_codes, '普通积分卡'),
        'premium_point': (premium_point_codes, save_premium_point_codes, '高级积分卡'),
        'reset': (reset_codes, save_reset_codes, '重置密码卡'),
        'boost': (boost_codes, save_boost_codes, '积分加成卡'),
        'special_point': (special_point_codes, save_special_point_codes, '特殊积分卡'),
        'makeup': (makeup_codes, save_makeup_codes, '补签卡'),
        'gamblers': (gamblers_codes, save_gamblers_codes, '赌神积分卡'),
        'cancellation': (cancellation_codes, save_cancellation_codes, '注销卡')
    }
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    generated = 0
    for line in lines:
        parts = line.split(',')
        if len(parts) != 3:
            print(f"格式错误: {line}")
            continue
        username = parts[0].strip()
        code_type = parts[1].strip()
        try:
            count = int(parts[2].strip())
        except ValueError:
            print(f"数量错误: {line}")
            continue
        if username not in users or code_type not in type_map or count < 1:
            print(f"无效: {line}")
            continue
        codes, save_func, label = type_map[code_type]
        codes_list = []
        for _ in range(count):
            code = generate_code()
            codes[code] = {
                'code': code, 'username': username, 'used': False, 'recycled': False,
                'createdAt': int(time.time() * 1000), 'type': code_type,
                'adminGranted': True, 'source': 'admin_grant'
            }
            codes_list.append(code)
            generated += 1
        save_func()

        codes_str = '\n'.join(codes_list)
        mail_id = f"mail_{int(time.time()*1000)}_{random.randint(1000,9999)}"
        mail_attachments[mail_id] = {
            'id': mail_id,
            'username': username,
            'type': code_type,
            'code': codes_list[0] if codes_list else '',
            'codes': codes_list,
            'created_at': int(time.time() * 1000),
            'expires_at': int(time.time() * 1000) + 28800000,
            'title': f'管理员批量赠送-{label} x{count}',
            'description': f'管理员为您批量赠送了{label} {count}张\n\n卡密列表:\n{codes_str}',
            'claimed': False,
            'claimed_at': 0,
            'source': 'admin_grant',
            'quantity': count,
            'is_batch': True
        }
        save_mail_attachments()
        print(f"为用户 {username} 生成 {count} 张 {label} (已发送到邮箱)")
    print(f"共生成 {generated} 张卡密")

def recycle_code():
    code = input("请输入卡密: ").strip().upper()
    for codes, save_func in [
        (point_codes, save_point_codes), (premium_point_codes, save_premium_point_codes),
        (reset_codes, save_reset_codes), (boost_codes, save_boost_codes),
        (special_point_codes, save_special_point_codes), (makeup_codes, save_makeup_codes),
        (gamblers_codes, save_gamblers_codes), (cancellation_codes, save_cancellation_codes)
    ]:
        if code in codes and codes[code].get('adminGranted', False) and not codes[code].get('used', False):
            codes[code]['recycled'] = True
            save_func()

            for mail_id, mail in mail_attachments.items():
                if mail.get('code') == code or (mail.get('codes') and code in mail.get('codes', [])):
                    del mail_attachments[mail_id]
                    save_mail_attachments()
                    break

            print(f"已回收 {code}")
            return
    print("卡密不存在或不可回收")

def cleanup_expired_codes():
    current_time = int(time.time() * 1000)
    removed = 0
    for codes, save_func, max_age in [
        (point_codes, save_point_codes, 172800000),
        (premium_point_codes, save_premium_point_codes, 172800000),
        (reset_codes, save_reset_codes, 86400000),
        (boost_codes, save_boost_codes, 259200000),
        (special_point_codes, save_special_point_codes, 172800000),
        (makeup_codes, save_makeup_codes, 3600000),
        (gamblers_codes, save_gamblers_codes, 86400000),
    ]:
        to_remove = [k for k, v in codes.items() if v.get('used', False) or v.get('recycled', False) or (max_age > 0 and current_time - v.get('createdAt', 0) > max_age)]
        if to_remove:
            for k in to_remove:
                del codes[k]
            save_func()
            removed += len(to_remove)

    mail_to_remove = []
    for mail_id, mail in mail_attachments.items():
        if mail.get('type') in ['point', 'premium_point', 'reset', 'boost', 'special_point', 'makeup', 'gamblers', 'cancellation']:
            code = mail.get('code', '')
            if code:
                found = False
                for codes in [point_codes, premium_point_codes, reset_codes, boost_codes, special_point_codes, makeup_codes, gamblers_codes, cancellation_codes]:
                    if code in codes:
                        found = True
                        break
                if not found:
                    mail_to_remove.append(mail_id)

    for mail_id in mail_to_remove:
        del mail_attachments[mail_id]

    if mail_to_remove:
        save_mail_attachments()

    print(f"清理了 {removed} 张过期卡密")

def system_stats_menu():
    while True:
        print("\n" + "="*60)
        print("     系统统计与监控")
        print("="*60)
        print("1. 用户统计")
        print("2. 财务统计")
        print("3. 卡密统计")
        print("4. 订单统计")
        print("5. 完整系统报告")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_user_stats()
        elif choice == '2':
            show_financial_stats()
        elif choice == '3':
            show_code_stats()
        elif choice == '4':
            show_order_stats()
        elif choice == '5':
            show_full_report()

def show_user_stats():
    total = len(users)
    verified = sum(1 for u in users if identity_verifications.get(u, {}).get('verified', False))
    today = datetime.now().strftime('%Y-%m-%d')
    active = sum(1 for u in users.values() if u.get('lastLoginDate') == today)
    total_attendance = sum(u.get('attendanceTotalDays', 0) for u in users.values())
    print("\n" + "="*50)
    print("用户统计")
    print("-"*50)
    print(f"总用户: {total}")
    if total > 0:
        print(f"已认证: {verified} ({verified/total*100:.1f}%)")
    else:
        print("已认证: 0")
    print(f"今日活跃: {active}")
    print(f"受限用户: {len(restricted_users)}")
    print(f"总签到天数: {total_attendance}")
    print("="*50)

def show_financial_stats():
    total_points = sum(u.get('totalPoints', 0) for u in users.values())
    total_pl = sum(get_user_pl_balance(u) for u in users)
    total_fund = sum(f.get('balance', 0) for f in fund_data.values())
    print("\n" + "="*50)
    print("财务统计")
    print("-"*50)
    print(f"用户总积分: {total_points:.2f}")
    print(f"系统总积分: {system_points:.2f}")
    print(f"理财总余额: {total_fund:.2f}")
    print(f"PL总余额: {total_pl:.4f}")
    print("="*50)

def show_order_stats():
    total = len(orders)
    paid = sum(1 for o in orders.values() if o.get('status') == 'paid')
    total_amount = sum(o.get('product_price', 0) for o in orders.values())
    print("\n" + "="*50)
    print("订单统计")
    print("-"*50)
    print(f"总订单: {total}")
    print(f"已支付: {paid}")
    print(f"总金额: {total_amount:.2f}")
    print("="*50)

def show_full_report():
    print("\n" + "="*60)
    print(f"完整系统报告 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    show_user_stats()
    show_financial_stats()
    show_code_stats()
    show_order_stats()

def risk_management_menu():
    while True:
        print("\n" + "="*60)
        print("     用户风控管理")
        print("="*60)
        print("1. 查看受限用户")
        print("2. 设置用户限制")
        print("3. 解除用户限制")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            show_restricted_users()
        elif choice == '2':
            set_user_restriction()
        elif choice == '3':
            remove_user_restriction()

def show_restricted_users():
    if not restricted_users:
        print("没有受限用户")
        return
    print("\n受限用户:")
    for username, data in restricted_users.items():
        restrictions = data.get('restrictions', {})
        types = [t for t, v in restrictions.items() if v]
        print(f"  {username}: {', '.join(types) if types else '无限制'}")

def set_user_restriction():
    username = input("用户名: ").strip()
    if username not in users:
        print("用户不存在")
        return
    print("1. 限制登录 2. 限制商城 3. 限制生成手机号 4. 全部")
    choice = input("请选择: ").strip()
    if choice not in ['1', '2', '3', '4']:
        print("无效选择")
        return
    if username not in restricted_users:
        restricted_users[username] = {
            'username': username,
            'restrictions': {'login': False, 'mall': False, 'generate_phone': False},
            'restricted_at': datetime.now().isoformat(),
            'restricted_by': 'admin'
        }
    if choice == '1':
        restricted_users[username]['restrictions']['login'] = True
    elif choice == '2':
        restricted_users[username]['restrictions']['mall'] = True
    elif choice == '3':
        restricted_users[username]['restrictions']['generate_phone'] = True
    elif choice == '4':
        restricted_users[username]['restrictions']['login'] = True
        restricted_users[username]['restrictions']['mall'] = True
        restricted_users[username]['restrictions']['generate_phone'] = True
    save_restricted_users()
    print("已设置限制")

def remove_user_restriction():
    username = input("用户名: ").strip()
    if username not in restricted_users:
        print("用户不在受限列表")
        return
    del restricted_users[username]
    save_restricted_users()
    print("已解除所有限制")

def backup_menu():
    while True:
        print("\n" + "="*60)
        print("     数据备份与恢复")
        print("="*60)
        print("1. 创建备份")
        print("2. 查看备份列表")
        print("3. 恢复备份")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            create_backup()
        elif choice == '2':
            list_backups()
        elif choice == '3':
            restore_backup()

def create_backup():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(BACKUP_DIR, f'backup_{timestamp}')
    os.makedirs(backup_path)
    count = 0
    for f in os.listdir(DATA_DIR):
        if f.endswith('.enc'):
            shutil.copy2(os.path.join(DATA_DIR, f), os.path.join(backup_path, f))
            count += 1
    print(f"备份创建成功: {backup_path} ({count} 个文件)")

def list_backups():
    if not os.path.exists(BACKUP_DIR):
        print("没有备份")
        return
    backups = [d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d)) and d.startswith('backup_')]
    if not backups:
        print("没有备份")
        return
    print("\n备份列表:")
    for b in sorted(backups, reverse=True):
        print(f"  {b}")

def restore_backup():
    backups = []
    if os.path.exists(BACKUP_DIR):
        backups = [d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d)) and d.startswith('backup_')]

    if not backups:
        print("没有备份")
        return

    print("\n可用的备份:")
    for i, b in enumerate(sorted(backups, reverse=True), 1):
        print(f"  {i}. {b}")

    try:
        choice = int(input("选择备份编号: ").strip())
        if choice < 1 or choice > len(backups):
            print("无效选择")
            return

        backup_name = sorted(backups, reverse=True)[choice - 1]
        confirm = input(f"确认恢复 '{backup_name}'? (y/n): ").strip().lower()
        if confirm != 'y':
            print("取消操作")
            return

        backup_path = os.path.join(BACKUP_DIR, backup_name)
        for f in os.listdir(backup_path):
            if f.endswith('.enc'):
                shutil.copy2(os.path.join(backup_path, f), os.path.join(DATA_DIR, f))

        refresh_data()
        print("备份恢复成功")

    except ValueError:
        print("请输入有效编号")

def batch_operations_menu():
    while True:
        print("\n" + "="*60)
        print("     批量操作工具")
        print("="*60)
        print("1. 批量修改积分")
        print("2. 批量修改PL余额")
        print("3. 批量认证用户")
        print("4. 批量重置签到")
        print("5. 批量删除用户")
        print("6. 导出用户数据 (JSON)")
        print("7. 导出用户数据 (CSV)")
        print("0. 返回主菜单")
        print("-"*60)
        choice = input("请选择操作: ").strip()
        if choice == '0':
            break
        elif choice == '1':
            batch_modify_points()
        elif choice == '2':
            batch_modify_pl()
        elif choice == '3':
            batch_verify_users()
        elif choice == '4':
            batch_reset_attendance()
        elif choice == '5':
            batch_delete_users()
        elif choice == '6':
            export_users_json()
        elif choice == '7':
            export_users_csv()
        else:
            print("无效选项")

def batch_modify_points():
    print("\n批量修改积分")
    print("输入格式: 用户名,新积分值 (每行一个)")
    print("输入空行结束")
    print("-"*40)
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    if not lines:
        print("没有输入任何数据")
        return
    success = 0
    failed = []
    for line in lines:
        parts = line.split(',')
        if len(parts) != 2:
            failed.append(f"{line} - 格式错误")
            continue
        username = parts[0].strip()
        try:
            points = float(parts[1].strip())
        except ValueError:
            failed.append(f"{line} - 积分必须是数字")
            continue
        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue
        users[username]['totalPoints'] = round(points, 2)
        success += 1
    if success > 0:
        save_users()
        print(f"成功修改 {success} 个用户的积分")
    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def batch_modify_pl():
    print("\n批量修改PL余额")
    print("输入格式: 用户名,新PL值 (每行一个)")
    print("输入空行结束")
    print("-"*40)
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    if not lines:
        print("没有输入任何数据")
        return
    success = 0
    failed = []
    for line in lines:
        parts = line.split(',')
        if len(parts) != 2:
            failed.append(f"{line} - 格式错误")
            continue
        username = parts[0].strip()
        try:
            pl = float(parts[1].strip())
        except ValueError:
            failed.append(f"{line} - PL必须是数字")
            continue
        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue
        current = get_user_pl_balance(username)
        update_user_pl_balance(username, pl - current)
        success += 1
    if success > 0:
        save_user_pl()
        print(f"成功修改 {success} 个用户的PL余额")
    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def batch_verify_users():
    print("\n批量认证用户")
    print("输入格式: 用户名,真实姓名,身份证号,性别 (每行一个)")
    print("输入空行结束")
    print("-"*40)
    lines = []
    while True:
        line = input().strip()
        if not line:
            break
        lines.append(line)
    if not lines:
        print("没有输入任何数据")
        return
    success = 0
    failed = []
    for line in lines:
        parts = line.split(',')
        if len(parts) != 4:
            failed.append(f"{line} - 格式错误 (需要4个字段)")
            continue
        username = parts[0].strip()
        real_name = parts[1].strip()
        id_number = parts[2].strip()
        gender = parts[3].strip()
        if username not in users:
            failed.append(f"{line} - 用户不存在")
            continue
        if len(id_number) != 18:
            failed.append(f"{line} - 身份证号必须为18位")
            continue
        if gender not in ['男', '女']:
            failed.append(f"{line} - 性别必须是男/女")
            continue
        id_hash = hashlib.sha256(id_number.encode()).hexdigest()
        id_masked = id_number[:3] + '*****' + id_number[14:]
        identity_verifications[username] = {
            'username': username, 'real_name': real_name,
            'id_number_hash': id_hash, 'id_number_masked': id_masked,
            'gender': gender, 'verified': True,
            'verified_at': datetime.now().isoformat()
        }
        success += 1
    if success > 0:
        save_identity_verifications()
        print(f"成功认证 {success} 个用户")
    if failed:
        print(f"\n失败 {len(failed)} 条:")
        for f in failed:
            print(f"   {f}")

def batch_reset_attendance():
    print("\n批量重置签到")
    print("输入用户名 (每行一个)，输入空行结束")
    print("-"*40)
    usernames = []
    while True:
        line = input().strip()
        if not line:
            break
        usernames.append(line)
    if not usernames:
        print("没有输入任何用户名")
        return
    confirm = input(f"确认重置 {len(usernames)} 个用户的签到数据? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    success = 0
    failed = []
    for username in usernames:
        if username not in users:
            failed.append(username)
            continue
        user = users[username]
        user['attendanceTotalDays'] = 0
        user['attendanceConsecutiveDays'] = 0
        user['lastAttendanceDate'] = ''
        user['firstAttendanceDate'] = ''
        user['lastAttendanceTimestamp'] = 0
        user['attendanceClaimedTotalCycles'] = {}
        user['attendanceClaimedConsecutiveCycles'] = {}
        success += 1
    if success > 0:
        save_users()
        print(f"成功重置 {success} 个用户的签到数据")
    if failed:
        print(f"\n用户不存在: {', '.join(failed)}")

def batch_delete_users():
    print("\n批量删除用户")
    print("输入用户名 (每行一个)，输入空行结束")
    print("-"*40)
    usernames = []
    while True:
        line = input().strip()
        if not line:
            break
        usernames.append(line)
    if not usernames:
        print("没有输入任何用户名")
        return
    print("\n将要删除的用户:")
    for username in usernames:
        if username in users:
            print(f"  {username}")
    confirm = input(f"\n确认删除 {len(usernames)} 个用户? (y/n): ").strip().lower()
    if confirm != 'y':
        print("取消操作")
        return
    success = 0
    failed = []
    for username in usernames:
        if username not in users:
            failed.append(username)
            continue
        del users[username]
        for data in [user_pl, identity_verifications, restricted_users, gateway_cards, fund_data]:
            if username in data:
                del data[username]
        success += 1
    if success > 0:
        save_users()
        save_user_pl()
        save_identity_verifications()
        save_restricted_users()
        save_gateway_cards()
        save_fund_data()
        print(f"成功删除 {success} 个用户")
    if failed:
        print(f"\n用户不存在: {', '.join(failed)}")

def export_users_json():
    export_data = {}
    for username, user_data in users.items():
        export_data[username] = {
            'username': username,
            'email': user_data.get('email', ''),
            'totalPoints': user_data.get('totalPoints', 0),
            'pl_balance': get_user_pl_balance(username),
            'verified': identity_verifications.get(username, {}).get('verified', False),
            'attendanceTotal': user_data.get('attendanceTotalDays', 0),
            'attendanceConsecutive': user_data.get('attendanceConsecutiveDays', 0),
            'createdAt': user_data.get('createdAt', ''),
            'lastLogin': user_data.get('lastLoginDate', '')
        }
    filename = f"users_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    print(f"已导出到 {filename}")

def export_users_csv():
    import csv
    filename = f"users_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['用户名', '邮箱', '积分', 'PL余额', '认证状态', '累计签到', '连续签到', '注册时间'])
        for username, user_data in users.items():
            writer.writerow([
                username,
                user_data.get('email', ''),
                user_data.get('totalPoints', 0),
                get_user_pl_balance(username),
                '已认证' if identity_verifications.get(username, {}).get('verified', False) else '未认证',
                user_data.get('attendanceTotalDays', 0),
                user_data.get('attendanceConsecutiveDays', 0),
                user_data.get('createdAt', '')
            ])
    print(f"已导出到 {filename}")

def main_menu():
    while True:
        print("\n" + "="*70)
        print("     用户数据管理工具 - User Data Manager (完整版)")
        print("="*70)
        print("1.  列出所有用户")
        print("2.  查看用户详情")
        print("3.  注册新用户")
        print("4.  修改用户积分")
        print("5.  修改用户PL余额")
        print("6.  修改用户认证状态")
        print("7.  修改用户签到数据")
        print("8.  签到补偿管理")
        print("9.  PL汇率管理")
        print("10. 理财基金管理")
        print("11. 系统积分池管理")
        print("12. 优惠券管理")
        print("13. CDK礼包管理")
        print("14. 邮件附件管理")
        print("15. 通行证卡密管理")
        print("16. 卡密管理 (积分卡/重置卡等)")
        print("17. 系统统计与监控")
        print("18. 用户风控管理")
        print("19. 数据备份与恢复")
        print("20. 批量操作工具")
        print("21. 删除用户")
        print("22. 刷新数据")
        print("0. 退出")
        print("-"*70)

        choice = input("请选择操作: ").strip()

        if choice == '0':
            print("再见！")
            break
        elif choice == '1':
            list_users()
        elif choice == '2':
            username = input("请输入用户名: ").strip()
            show_user_detail(username)
        elif choice == '3':
            register_user_menu()
        elif choice == '4':
            username = input("请输入用户名: ").strip()
            modify_points(username)
        elif choice == '5':
            username = input("请输入用户名: ").strip()
            modify_pl(username)
        elif choice == '6':
            username = input("请输入用户名: ").strip()
            modify_verification(username)
        elif choice == '7':
            username = input("请输入用户名: ").strip()
            modify_attendance(username)
        elif choice == '8':
            attendance_compensation_menu()
        elif choice == '9':
            pl_rate_management_menu()
        elif choice == '10':
            fund_management_menu()
        elif choice == '11':
            system_points_menu()
        elif choice == '12':
            coupon_management_menu()
        elif choice == '13':
            cdk_management_menu()
        elif choice == '14':
            mail_management_menu()
        elif choice == '15':
            gateway_card_management_menu()
        elif choice == '16':
            code_management_menu()
        elif choice == '17':
            system_stats_menu()
        elif choice == '18':
            risk_management_menu()
        elif choice == '19':
            backup_menu()
        elif choice == '20':
            batch_operations_menu()
        elif choice == '21':
            username = input("请输入用户名: ").strip()
            delete_user(username)
        elif choice == '22':
            refresh_data()
        else:
            print("无效选项")

if __name__ == '__main__':
    import math

    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    if len(sys.argv) > 1:
        if sys.argv[1] == '--backup':
            create_backup()
        elif sys.argv[1] == '--stats':
            show_full_report()
        elif sys.argv[1] == '--list':
            list_users()
        else:
            print("用法: python3 user_manager.py [--backup|--stats|--list]")
    else:
        main_menu()