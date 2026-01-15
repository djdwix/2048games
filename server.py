from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import random
import string
import os
import time
import threading
from functools import wraps
from collections import defaultdict
import socket
import hashlib
import json
import atexit
import shutil
from datetime import datetime

app = Flask(__name__)
CORS(app)

PUBLIC_DIR = 'public'
DATA_DIR = 'data'
if not os.path.exists(PUBLIC_DIR):
    os.makedirs(PUBLIC_DIR)
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DATABASE = 'phone_numbers.db'
BACKUP_DIR = 'backup'
MAX_BACKUP_FILES = 5

CARRIER_PREFIXES = {
    '中国移动': ['134', '135', '136', '137', '138', '139', '147', '148', '150', 
                '151', '152', '157', '158', '159', '172', '178', '182', '183', 
                '184', '187', '188', '198'],
    '中国联通': ['130', '131', '132', '145', '146', '155', '156', '166', '171', 
                '175', '176', '185', '186'],
    '中国电信': ['133', '149', '153', '173', '177', '180', '181', '189', '191', 
                '193', '199'],
    '中国广电': ['192'],
    '虚拟运营商': ['170', '171']
}

recent_requests = {}
request_lock = threading.Lock()

TC_CAPTCHA_APP_ID = '1314462072'

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return '127.0.0.1'

def get_carrier_by_prefix(phone_number):
    if len(phone_number) < 3:
        return '未知'
    
    prefix = phone_number[:3]
    for carrier, prefixes in CARRIER_PREFIXES.items():
        if prefix in prefixes:
            return carrier
    
    if prefix.startswith('19') and prefix in ['190', '191', '192', '193', '195', '196', '197']:
        return '卫星通信'
    
    return '未知'

def create_backup():
    try:
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
        
        backup_files = []
        for file in os.listdir(BACKUP_DIR):
            if file.startswith('backup_') and file.endswith('.db'):
                backup_files.append(os.path.join(BACKUP_DIR, file))
        
        if len(backup_files) >= MAX_BACKUP_FILES:
            backup_files.sort(key=lambda x: os.path.getmtime(x))
            for i in range(len(backup_files) - MAX_BACKUP_FILES + 1):
                try:
                    os.remove(backup_files[i])
                except Exception as e:
                    print(f"删除备份文件失败: {e}")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(BACKUP_DIR, f'backup_{timestamp}.db')
        
        if os.path.exists(DATABASE):
            shutil.copy2(DATABASE, backup_file)
            return True
        else:
            return False
            
    except Exception as e:
        print(f"创建备份失败: {e}")
        return False

def cleanup_backup_files():
    try:
        if not os.path.exists(BACKUP_DIR):
            return
        
        backup_files = []
        for file in os.listdir(BACKUP_DIR):
            if file.startswith('backup_') and file.endswith('.db'):
                backup_files.append(os.path.join(BACKUP_DIR, file))
        
        if len(backup_files) > MAX_BACKUP_FILES:
            backup_files.sort(key=lambda x: os.path.getmtime(x))
            for i in range(len(backup_files) - MAX_BACKUP_FILES):
                try:
                    os.remove(backup_files[i])
                except Exception as e:
                    print(f"清理备份文件失败: {e}")
                    
    except Exception as e:
        print(f"清理备份文件失败: {e}")

def generate_security_code():
    characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(characters, k=6))

def generate_phone_number():
    all_prefixes = []
    for carrier, prefixes in CARRIER_PREFIXES.items():
        all_prefixes.extend(prefixes)
    
    all_prefixes.extend(['190', '191', '192', '193', '195', '196', '197'])
    
    prefix = random.choice(all_prefixes)
    middle = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    return prefix + middle + suffix

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.execute('PRAGMA cache_size=10000')
    return conn

def init_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS phone_numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        security_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_used INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        client_ip TEXT,
        carrier TEXT
    )
    ''')
    
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_phone ON phone_numbers(phone_number)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_code ON phone_numbers(security_code)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_used ON phone_numbers(is_used)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_created ON phone_numbers(created_at)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_client_ip ON phone_numbers(client_ip)')
    
    conn.commit()
    conn.close()

def cleanup_unused_phone_numbers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) as count FROM phone_numbers 
            WHERE (is_used = 0 AND security_code IS NULL AND 
                  (strftime('%s', 'now') - strftime('%s', created_at)) > 300)
               OR (is_used = 1 AND 
                  (strftime('%s', 'now') - strftime('%s', created_at)) > 86400)
               OR (security_code IS NOT NULL AND is_used = 0 AND 
                  (strftime('%s', 'now') - strftime('%s', last_accessed)) > 3600)
        ''')
        result = cursor.fetchone()
        count_before = result['count'] if result else 0
        
        cursor.execute('''
            DELETE FROM phone_numbers 
            WHERE (is_used = 0 AND security_code IS NULL AND 
                  (strftime('%s', 'now') - strftime('%s', created_at)) > 300)
               OR (is_used = 1 AND 
                  (strftime('%s', 'now') - strftime('%s', created_at)) > 86400)
               OR (security_code IS NOT NULL AND is_used = 0 AND 
                  (strftime('%s', 'now') - strftime('%s', last_accessed)) > 3600)
        ''')
        
        deleted_count = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        if deleted_count > 0:
            conn_vacuum = sqlite3.connect(DATABASE)
            conn_vacuum.execute('VACUUM')
            conn_vacuum.commit()
            conn_vacuum.close()
            
            print(f"清理了 {deleted_count} 个过期记录")
            print(f"数据库空间已回收")
        
    except Exception as e:
        print(f"清理数据时出错: {e}")

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers['X-Forwarded-For'].split(',')[0]
    elif request.headers.get('X-Real-IP'):
        ip = request.headers['X-Real-IP']
    else:
        ip = request.remote_addr
    
    if ip == '127.0.0.1':
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
        except:
            pass
        finally:
            s.close()
    
    return ip

def rate_limit():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = get_client_ip()
            now = time.time()
            
            with request_lock:
                if client_ip in recent_requests:
                    last_request_time = recent_requests[client_ip]
                    time_diff = now - last_request_time
                    if time_diff < 3:
                        wait_time = 3 - time_diff
                        return jsonify({
                            'success': False,
                            'error': f'请求过于频繁，请等待{wait_time:.1f}秒后再试',
                            'cooldown': wait_time
                        }), 429
                
                recent_requests[client_ip] = now
            
            cleanup_threshold = now - 30
            with request_lock:
                to_delete = []
                for ip, timestamp in recent_requests.items():
                    if timestamp < cleanup_threshold:
                        to_delete.append(ip)
                for ip in to_delete:
                    del recent_requests[ip]
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.before_request
def before_request():
    now = time.time()
    if now - getattr(app, 'last_cleanup', 0) > 60:
        cleanup_unused_phone_numbers()
        app.last_cleanup = now

@app.route('/')
def index():
    return send_from_directory(PUBLIC_DIR, 'index.html')

@app.route('/privacy-policy')
def privacy_policy():
    return send_from_directory(PUBLIC_DIR, 'privacy-policy.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(PUBLIC_DIR, path)

@app.route('/api/ip-info', methods=['GET'])
def get_ip_info():
    try:
        server_ip = get_local_ip()
        client_ip = get_client_ip()
        
        return jsonify({
            'success': True,
            'server_ip': server_ip,
            'client_ip': client_ip
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'server_ip': '获取失败',
            'client_ip': '获取失败'
        }), 500

@app.route('/api/generate', methods=['POST'])
@rate_limit()
def generate_number():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        max_attempts = 10
        for _ in range(max_attempts):
            phone_number = generate_phone_number()
            carrier = get_carrier_by_prefix(phone_number)
            client_ip = get_client_ip()
            
            cursor.execute(
                'SELECT id FROM phone_numbers WHERE phone_number = ?',
                (phone_number,)
            )
            existing = cursor.fetchone()
            
            if existing:
                continue
            
            try:
                cursor.execute(
                    'INSERT INTO phone_numbers (phone_number, client_ip, carrier) VALUES (?, ?, ?)',
                    (phone_number, client_ip, carrier)
                )
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'phone_number': phone_number,
                    'masked_phone': f"{phone_number[:3]}****{phone_number[7:]}",
                    'carrier': carrier
                })
                
            except sqlite3.IntegrityError:
                continue
        
        return jsonify({
            'success': False,
            'error': '生成失败，请重试'
        }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/generate-code', methods=['POST'])
def generate_security_code_for_number():
    try:
        data = request.json
        phone_number = data.get('phone_number', '').strip()
        client_ip = get_client_ip()
        
        if not phone_number or len(phone_number) != 11:
            return jsonify({
                'success': False,
                'error': '手机号格式不正确'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT id, security_code, is_used, client_ip FROM phone_numbers WHERE phone_number = ?',
            (phone_number,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return jsonify({
                'success': False,
                'error': '手机号不存在'
            }), 404
        
        if result['is_used']:
            return jsonify({
                'success': False,
                'error': '该手机号已被使用'
            }), 400
        
        if result['security_code']:
            if result['client_ip'] != client_ip:
                return jsonify({
                    'success': False,
                    'error': '安全码只能在生成时的客户端下使用'
                }), 403
            return jsonify({
                'success': False,
                'error': '该手机号已生成过安全码'
            }), 400
        
        security_code = generate_security_code()
        
        cursor.execute(
            'UPDATE phone_numbers SET security_code = ?, last_accessed = CURRENT_TIMESTAMP WHERE phone_number = ?',
            (security_code, phone_number)
        )
        conn.commit()
    
        return jsonify({
            'success': True,
            'security_code': security_code
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/verify-copy', methods=['POST'])
def verify_and_copy():
    try:
        data = request.json
        phone_number = data.get('phone_number', '').strip()
        security_code = data.get('security_code', '').strip().upper()
        captcha_ticket = data.get('captcha_ticket', '')
        captcha_randstr = data.get('captcha_randstr', '')
        client_ip = get_client_ip()
        
        if not captcha_ticket or not captcha_randstr:
            return jsonify({
                'success': False,
                'error': '请先完成人机验证'
            }), 400
        
        if not phone_number or len(phone_number) != 11:
            return jsonify({
                'success': False,
                'error': '手机号格式不正确'
            }), 400
        
        if not security_code or len(security_code) != 6:
            return jsonify({
                'success': False,
                'error': '安全码格式不正确'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT security_code, is_used, client_ip FROM phone_numbers WHERE phone_number = ?',
            (phone_number,)
        )
        
        result = cursor.fetchone()
        
        if not result:
            return jsonify({
                'success': False,
                'error': '手机号不存在'
            }), 404
        
        if result['is_used']:
            return jsonify({
                'success': False,
                'error': '该手机号已被使用'
            }), 400
        
        if not result['security_code']:
            return jsonify({
                'success': False,
                'error': '请先生成安全码'
            }), 400
        
        if result['client_ip'] != client_ip:
            return jsonify({
                'success': False,
                'error': '安全码只能在生成时的客户端下使用'
            }), 403
        
        if result['security_code'] != security_code:
            return jsonify({
                'success': False,
                'error': '安全码错误'
            }), 400
        
        cursor.execute(
            'UPDATE phone_numbers SET is_used = 1, last_accessed = CURRENT_TIMESTAMP WHERE phone_number = ?',
            (phone_number,)
        )
        conn.commit()
    
        return jsonify({
            'success': True,
            'phone_number': phone_number,
            'message': '验证成功，可以复制完整号码'
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total FROM phone_numbers')
        total = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as used FROM phone_numbers WHERE is_used = 1')
        used = cursor.fetchone()['used']
        
        cursor.execute('SELECT COUNT(*) as available FROM phone_numbers WHERE is_used = 0')
        available = cursor.fetchone()['available']
        
        cursor.execute('SELECT COUNT(DISTINCT client_ip) as unique_clients FROM phone_numbers')
        unique_clients = cursor.fetchone()['unique_clients']
    
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'used': used,
                'available': available,
                'unique_clients': unique_clients
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/client-info', methods=['GET'])
def get_client_info():
    try:
        client_ip = get_client_ip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as total FROM phone_numbers WHERE client_ip = ?', (client_ip,))
        total_generated = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as used FROM phone_numbers WHERE client_ip = ? AND is_used = 1', (client_ip,))
        total_used = cursor.fetchone()['used']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'client_ip': client_ip,
            'stats': {
                'total_generated': total_generated,
                'total_used': total_used,
                'available': total_generated - total_used
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def cleanup_on_shutdown():
    print("正在创建数据库备份...")
    create_backup()
    print("备份完成")
    print("正在清理数据库...")
    cleanup_unused_phone_numbers()
    cleanup_backup_files()
    print("清理完成")

if __name__ == '__main__':
    if not os.path.exists(PUBLIC_DIR):
        os.makedirs(PUBLIC_DIR)
    
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    required_files = ['index.html', 'privacy-policy.html', 'style.css', 'script.js']
    for file_name in required_files:
        file_path = os.path.join(PUBLIC_DIR, file_name)
        if not os.path.exists(file_path):
            if os.path.exists(file_name):
                import shutil
                shutil.copy(file_name, file_path)
    
    init_database()
    cleanup_unused_phone_numbers()
    cleanup_backup_files()
    
    atexit.register(cleanup_on_shutdown)
    
    import signal
    
    def signal_handler(signum, frame):
        print(f"接收到信号 {signum}，正在保存数据...")
        exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    host_ip = get_local_ip()
    port = 5000
    
    print("=" * 60)
    print("虚拟手机号生成器服务器启动成功!")
    print("=" * 60)
    print(f"本地访问: http://localhost:{port}")
    print(f"网络访问: http://{host_ip}:{port}")
    print(f"隐私政策: http://{host_ip}:{port}/privacy-policy")
    print(f"备份目录: {BACKUP_DIR} (最大备份数: {MAX_BACKUP_FILES})")
    print("=" * 60)
    print("系统特性:")
    print("1. 安全码保护机制")
    print("2. 腾讯云人机验证")
    print("3. IP绑定安全码")
    print("4. 频率限制: 每3秒一次")
    print("5. 自动数据清理")
    print("=" * 60)
    print("腾讯云验证说明:")
    print("1. 复制完整号码需要人机验证")
    print("2. 防止自动化滥用")
    print("3. 增强安全性")
    print("=" * 60)
    
    app.last_cleanup = time.time()
    app.run(debug=True, host='0.0.0.0', port=port, threaded=True)