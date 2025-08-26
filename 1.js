// ==UserScript==
// @name         色情拦截器 - 备案白名单+随机音乐
// @name:zh-CN   色情拦截器 - 备案白名单+随机音乐
// @namespace    https://tampermonkey.net/
// @version      13.0.0
// @description  15秒监测+备案白名单+第一段模糊匹配+升级拦截页+随机音乐
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// @updateURL    https://raw.githubusercontent.com/djdwix/2048games/main/1.js
// ==/UserScript==

(function() {
    'use strict';

    /* ===== 配置 ===== */
    const PORN_KEYWORDS = [
        'porn','xxx','sex','fuck','pussy','dick','tits','boobs','nude','blowjob','anal','cum','hentai','jav',
        'xvideos','pornhub','xnxx','youporn','redtube','xhamster','onlyfans','camgirl','nsfw','18+','adult'
    ];
    const WHITELIST = ['youtube.com','google.com','baidu.com','wikipedia.org','github.com'];

    /* ===== 工具 ===== */
    const firstSeg = (h) => h.split('.')[0];
    const ls = {
        get: (k, d = []) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d)),
        set: (k, v) => localStorage.setItem(k, JSON.stringify([...new Set(v)]))
    };
    const whitelist = new Set(WHITELIST);
    const blacklist = new Set(ls.get('my_blacklist'));

    const addBlack = (seg) => {
        blacklist.add(seg);
        ls.set('my_blacklist', [...blacklist]);
    };

    /* ===== 备案白名单检测 ===== */
    async function isBeian(hostname) {
        /* 示例：始终返回 false，如需真实接口请替换 */
        return false;
    }

    /* ===== 随机音乐播放器 ===== */
    const musicUrl = 'https://api.uomg.com/api/rand.music?sort=热歌榜&format=json';
    let bgmPlayer = null;

    function loadRandomMusic() {
        fetch(musicUrl)
            .then(r => r.json())
            .then(data => {
                if (data && data.data && data.data.url) {
                    bgmPlayer = new Audio(data.data.url);
                    bgmPlayer.volume = 0.3;
                    bgmPlayer.loop = true;
                    bgmPlayer.play().catch(() => {}); // 允许自动播放失败
                }
            })
            .catch(() => {});
    }

    /* ===== 升级拦截页面（含音乐） ===== */
    function showBlockPage(reason) {
        loadRandomMusic();
        document.documentElement.innerHTML = `
            <html>
            <head>
                <title>🚫 已拦截</title>
                <style>
                    body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-family:Arial,Helvetica;text-align:center}
                    .card{background:rgba(0,0,0,.35);padding:40px;border-radius:12px;box-shadow:0 8px 32px rgba(31,38,135,.37);backdrop-filter:blur(8px);max-width:420px}
                    h1{font-size:2.5em;margin:0 0 .4em}
                    p{margin:.5em 0;font-size:1.1em}
                    #cd{font-weight:bold;font-size:1.4em;color:#ffeb3b}
                    button{margin-top:20px;padding:.8em 2em;font-size:1em;border:none;border-radius:6px;background:#fff;color:#764ba2;cursor:pointer;transition:.3s}
                    button:hover{background:#f1f1f1}
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>🚫 内容已拦截</h1>
                    <p>域名首段：<strong>${firstSeg(location.hostname)}</strong></p>
                    <p>原因：${reason}</p>
                    <p>将在 <span id="cd">5</span> 秒后返回上一页</p>
                    <button onclick="history.back()">立即返回</button>
                </div>
                <script>
                    let t=5;
                    const timer=setInterval(()=>{
                        document.getElementById('cd').textContent=--t;
                        if(t<=0){clearInterval(timer);history.back();}
                    },1000);
                </script>
            </body>
            </html>`;
        window.stop();
    }

    /* ===== 15 秒监测器 ===== */
    function start15sMonitor() {
        const scan = async () => {
            const seg = firstSeg(location.hostname);
            if (blacklist.has(seg)) { showBlockPage('黑名单首段匹配（15s监测）'); return; }
            if (await isBeian(location.hostname)) return;

            const text = [
                document.title,
                document.body?.innerText || '',
                ...Array.from(document.images).map(i => i.alt || ''),
                ...Array.from(document.querySelectorAll('meta[name="keywords"], meta[name="description"]')).map(m => m.content || '')
            ].join(' ').toLowerCase();

            if (PORN_KEYWORDS.some(kw => text.includes(kw))) {
                addBlack(seg);
                showBlockPage('监测到色情关键词（15s监测）');
            }
        };

        scan();
        setInterval(scan, 15000);
    }

    /* ===== 控件 ===== */
    function addUI() {
        const box = document.createElement('div');
        box.innerHTML = `
            <div id="pb-btn" style="position:fixed;top:10px;left:10px;z-index:9999;background:#222;color:#fff;padding:6px 8px;border-radius:6px;font-size:13px;cursor:pointer">⚙️</div>
            <div id="pb-menu" style="display:none;position:fixed;top:40px;left:10px;z-index:10000;background:#333;color:#fff;padding:8px;border-radius:6px;font-size:12px;">
                <div id="pb-ban" style="padding:4px 0;cursor:pointer;">➕ 加入当前首段</div>
                <div id="pb-input" style="padding:4px 0;cursor:pointer;">📝 手动输入首段</div>
                <div id="pb-clear" style="padding:4px 0;cursor:pointer;">🔄 清空本地黑名单</div>
            </div>`;
        document.documentElement.appendChild(box);

        document.getElementById('pb-btn').onclick = () => {
            const m = document.getElementById('pb-menu');
            m.style.display = m.style.display === 'block' ? 'none' : 'block';
        };
        document.getElementById('pb-ban').onclick = () => {
            addBlack(firstSeg(location.hostname));
            showBlockPage('手动加入黑名单');
        };
        document.getElementById('pb-input').onclick = () => {
            const seg = prompt('输入要拦截的首段：', 'example');
            if (seg) { addBlack(seg.trim()); alert(`已加入黑名单：${seg.trim()}.*`); }
        };
        document.getElementById('pb-clear').onclick = () => {
            if (confirm('确定清空本地黑名单？')) { localStorage.removeItem('my_blacklist'); location.reload(); }
        };
        document.addEventListener('click', e => {
            const b=document.getElementById('pb-btn'), m=document.getElementById('pb-menu');
            if (!b.contains(e.target) && !m.contains(e.target)) m.style.display='none';
        });
    }

    /* ===== 主流程 ===== */
    (async function main() {
        const seg = firstSeg(location.hostname);
        if (await isBeian(location.hostname)) return;
        if (blacklist.has(seg)) {
            showBlockPage('本地黑名单首段匹配');
        } else {
            addUI();
            start15sMonitor();
        }
    })();
})();