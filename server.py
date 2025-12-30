const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIP();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_SOURCES = {
    PRIMARY: 'https://netease-cloud-music-api-liart.vercel.app',
    BACKUP1: 'https://music-api.heiheiha.xyz',
    BACKUP2: 'http://cloud-music.pl-fe.cn',
    SEARCH_API: 'http://music.163.com/api',
    LYRIC_API1: 'https://music.163.com/api',
    LYRIC_API2: 'http://api.injahow.cn',
    LYRIC_API3: 'https://api.itooi.cn'
};

let CACHE_DURATION = 30 * 60 * 1000;
const MAX_SEARCH_RESULTS = 100;

const HISTORY_FILE = path.join(dataDir, 'history.json');

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取播放历史文件失败:', error);
    }
    
    return {
        playHistory: [],
        searchHistory: [],
        lastUpdated: new Date().toISOString()
    };
}

function saveHistory(historyData) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存播放历史文件失败:', error);
        return false;
    }
}

let playHistory = loadHistory();

const COLLECTION_FILE = path.join(dataDir, 'Collection.json');

function loadCollection() {
    try {
        if (fs.existsSync(COLLECTION_FILE)) {
            const data = fs.readFileSync(COLLECTION_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取收藏文件失败:', error);
    }
    
    return {
        collections: [],
        lastUpdated: new Date().toISOString()
    };
}

function saveCollection(collectionData) {
    try {
        fs.writeFileSync(COLLECTION_FILE, JSON.stringify(collectionData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存收藏文件失败:', error);
        return false;
    }
}

let collectionData = loadCollection();

const SETTINGS_FILE = path.join(dataDir, 'settings.json');

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取设置文件失败:', error);
    }
    
    return {
        autoPlay: true,
        defaultQuality: 'exhigh',
        lyricAutoTranslate: false,
        downloadPath: '/downloads',
        cacheEnabled: true,
        cacheDuration: 30,
        theme: 'light',
        colorScheme: 'default',
        language: 'zh-CN',
        notificationEnabled: true,
        smartDownload: true,
        animationEnabled: true,
        savePlayHistory: true,
        maxHistoryItems: 100,
        autoCollectLiked: false
    };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存设置文件失败:', error);
        return false;
    }
}

let appSettings = loadSettings();

if (appSettings.cacheDuration) {
    CACHE_DURATION = appSettings.cacheDuration * 60 * 1000;
}

const ratingCache = new Map();

async function makeApiRequest(endpoint, params = {}, method = 'GET', retryCount = 0) {
    const apiSources = [
        { base: API_SOURCES.PRIMARY, type: 'general' },
        { base: API_SOURCES.BACKUP1, type: 'general' },
        { base: API_SOURCES.BACKUP2, type: 'general' },
        { base: API_SOURCES.SEARCH_API, type: 'search' },
        { base: API_SOURCES.LYRIC_API2, type: 'lyric' },
        { base: API_SOURCES.LYRIC_API3, type: 'lyric' }
    ];
    
    const currentSource = apiSources[retryCount % apiSources.length];
    const isSearchEndpoint = endpoint.includes('/search') || endpoint.includes('/cloudsearch');
    const isLyricEndpoint = endpoint.includes('/lyric');
    
    try {
        const config = {
            method: method,
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://music.163.com',
                'Origin': 'https://music.163.com'
            }
        };
        
        if (method === 'GET') {
            config.params = params;
        } else {
            config.data = params;
        }
        
        if (isLyricEndpoint && currentSource.type === 'lyric') {
            config.url = `${currentSource.base}${endpoint.replace('/lyric', '/music/netease/lyric')}`;
        } else {
            config.url = `${currentSource.base}${endpoint}`;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (retryCount < apiSources.length - 1) {
            return await makeApiRequest(endpoint, params, method, retryCount + 1);
        }
        
        if (isSearchEndpoint) {
            return await tryAlternativeSearch(params.keywords || params.s);
        }
        
        throw error;
    }
}

async function tryAlternativeSearch(keywords) {
    try {
        const response = await axios.get(`https://api.vvhan.com/api/netease`, {
            params: {
                type: 'search',
                key: keywords
            },
            timeout: 8000
        });
        
        if (response.data && response.data.data) {
            const limitedResults = response.data.data.slice(0, MAX_SEARCH_RESULTS);
            return {
                code: 200,
                result: {
                    songs: limitedResults.map(item => ({
                        id: item.id,
                        name: item.name,
                        artists: [{ name: item.artist }],
                        album: { name: item.album },
                        duration: item.duration
                    })),
                    songCount: limitedResults.length
                }
            };
        }
    } catch (error) {
        return {
            code: 500,
            result: {
                songs: [],
                songCount: 0
            }
        };
    }
}

async function getSongRating(songId) {
    if (!songId) {
        return null;
    }
    
    const cacheKey = `rating_${songId}`;
    const cachedData = ratingCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < 60 * 60 * 1000)) {
        return cachedData.data;
    }
    
    try {
        const response = await axios.get(`https://music.163.com/api/v3/song/detail`, {
            params: {
                id: songId,
                c: JSON.stringify([{ id: songId }])
            },
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://music.163.com'
            }
        });
        
        if (response.data && response.data.songs && response.data.songs[0]) {
            const song = response.data.songs[0];
            const ratingData = {
                score: song.score || 0,
                pop: song.pop || 0,
                commentCount: song.commentCount || 0
            };
            
            if (ratingData.score > 0) {
                ratingCache.set(cacheKey, {
                    timestamp: Date.now(),
                    data: ratingData
                });
            }
            
            return ratingData;
        }
    } catch (error) {
        console.log('获取歌曲评分失败:', error.message);
        
        try {
            const backupResponse = await axios.get(`https://netease-cloud-music-api-liart.vercel.app/song/detail`, {
                params: { ids: songId },
                timeout: 3000
            });
            
            if (backupResponse.data && backupResponse.data.songs && backupResponse.data.songs[0]) {
                const song = backupResponse.data.songs[0];
                const ratingData = {
                    score: song.score || 0,
                    pop: song.pop || 0,
                    commentCount: song.commentCount || 0
                };
                
                if (ratingData.score > 0) {
                    ratingCache.set(cacheKey, {
                        timestamp: Date.now(),
                        data: ratingData
                    });
                }
                
                return ratingData;
            }
        } catch (backupError) {
            console.log('备用评分API也失败了:', backupError.message);
        }
    }
    
    return null;
}

app.post('/api/collection/add', (req, res) => {
    try {
        const { songId, songName, artist, album, duration, albumPic } = req.body;
        
        if (!songId || !songName) {
            return res.status(400).json({
                code: 400,
                error: '缺少必要参数'
            });
        }
        
        const existingIndex = collectionData.collections ? 
            collectionData.collections.findIndex(item => item.songId === songId) : -1;
        
        if (existingIndex >= 0) {
            return res.json({
                code: 409,
                error: '歌曲已在收藏中',
                message: '此歌曲已在收藏列表中'
            });
        }
        
        const newCollection = {
            songId,
            songName: songName || '未知歌曲',
            artist: artist || '未知歌手',
            album: album || '未知专辑',
            albumPic: albumPic || '',
            duration: duration || 0,
            timestamp: new Date().toISOString(),
            source: 'netease'
        };
        
        if (!collectionData.collections) {
            collectionData.collections = [];
        }
        
        collectionData.collections.unshift(newCollection);
        collectionData.lastUpdated = new Date().toISOString();
        
        saveCollection(collectionData);
        
        res.json({
            code: 200,
            message: '收藏成功',
            data: newCollection,
            total: collectionData.collections.length
        });
        
    } catch (error) {
        console.error('添加收藏失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.delete('/api/collection/remove', (req, res) => {
    try {
        const { songId } = req.query;
        
        if (!songId) {
            return res.status(400).json({
                code: 400,
                error: '缺少歌曲ID'
            });
        }
        
        if (!collectionData.collections) {
            return res.json({
                code: 200,
                message: '收藏列表为空',
                total: 0
            });
        }
        
        const initialLength = collectionData.collections.length;
        collectionData.collections = collectionData.collections.filter(item => item.songId !== songId);
        collectionData.lastUpdated = new Date().toISOString();
        
        saveCollection(collectionData);
        
        res.json({
            code: 200,
            message: '取消收藏成功',
            removed: initialLength - collectionData.collections.length,
            total: collectionData.collections.length
        });
        
    } catch (error) {
        console.error('移除收藏失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/collection/list', (req, res) => {
    try {
        const { limit } = req.query;
        let collections = collectionData.collections || [];
        
        if (limit && !isNaN(limit)) {
            const limitNum = parseInt(limit);
            collections = collections.slice(0, Math.min(limitNum, collections.length));
        }
        
        res.json({
            code: 200,
            data: collections,
            total: collections.length,
            lastUpdated: collectionData.lastUpdated
        });
        
    } catch (error) {
        console.error('获取收藏列表失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/collection/check', (req, res) => {
    try {
        const { songId } = req.query;
        
        if (!songId) {
            return res.status(400).json({
                code: 400,
                error: '缺少歌曲ID'
            });
        }
        
        const isCollected = collectionData.collections ? 
            collectionData.collections.some(item => item.songId === songId) : false;
        
        res.json({
            code: 200,
            isCollected: isCollected,
            total: collectionData.collections ? collectionData.collections.length : 0
        });
        
    } catch (error) {
        console.error('检查收藏状态失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/song/rating', async (req, res) => {
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({
                code: 400,
                error: '缺少歌曲ID参数'
            });
        }
        
        const ratingData = await getSongRating(id);
        
        if (ratingData) {
            res.json({
                code: 200,
                data: ratingData,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                code: 200,
                data: null,
                message: '未找到评分数据',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('获取歌曲评分失败:', error);
        res.status(500).json({
            code: 500,
            error: '获取评分数据失败',
            message: error.message
        });
    }
});

app.post('/api/history/play', (req, res) => {
    try {
        const { songId, songName, artist, album, duration, timestamp } = req.body;
        
        if (!songId) {
            return res.status(400).json({
                code: 400,
                error: '缺少必要参数'
            });
        }
        
        if (!appSettings.savePlayHistory) {
            return res.json({
                code: 200,
                message: '播放历史记录已关闭'
            });
        }
        
        const newRecord = {
            songId,
            songName: songName || '未知歌曲',
            artist: artist || '未知歌手',
            album: album || '未知专辑',
            duration: duration || 0,
            timestamp: timestamp || new Date().toISOString(),
            playCount: 1
        };
        
        const existingIndex = playHistory.playHistory ? playHistory.playHistory.findIndex(item => item.songId === songId) : -1;
        
        if (existingIndex >= 0) {
            playHistory.playHistory[existingIndex].playCount += 1;
            playHistory.playHistory[existingIndex].timestamp = new Date().toISOString();
        } else {
            if (!playHistory.playHistory) {
                playHistory.playHistory = [];
            }
            playHistory.playHistory.unshift(newRecord);
            
            const maxItems = appSettings.maxHistoryItems || 100;
            if (playHistory.playHistory.length > maxItems) {
                playHistory.playHistory = playHistory.playHistory.slice(0, maxItems);
            }
        }
        
        playHistory.lastUpdated = new Date().toISOString();
        
        saveHistory(playHistory);
        
        res.json({
            code: 200,
            message: '播放记录已保存',
            historySize: playHistory.playHistory ? playHistory.playHistory.length : 0
        });
        
    } catch (error) {
        console.error('保存播放记录失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.post('/api/history/search', (req, res) => {
    try {
        const { keyword, resultCount, timestamp } = req.body;
        
        if (!keyword) {
            return res.status(400).json({
                code: 400,
                error: '缺少搜索关键词'
            });
        }
        
        const newRecord = {
            keyword,
            resultCount: resultCount || 0,
            timestamp: timestamp || new Date().toISOString()
        };
        
        const existingIndex = playHistory.searchHistory ? playHistory.searchHistory.findIndex(item => item.keyword === keyword) : -1;
        
        if (existingIndex >= 0) {
            playHistory.searchHistory[existingIndex].timestamp = new Date().toISOString();
        } else {
            if (!playHistory.searchHistory) {
                playHistory.searchHistory = [];
            }
            playHistory.searchHistory.unshift(newRecord);
            
            const maxItems = 50;
            if (playHistory.searchHistory.length > maxItems) {
                playHistory.searchHistory = playHistory.searchHistory.slice(0, maxItems);
            }
        }
        
        playHistory.lastUpdated = new Date().toISOString();
        
        saveHistory(playHistory);
        
        res.json({
            code: 200,
            message: '搜索记录已保存',
            historySize: playHistory.searchHistory ? playHistory.searchHistory.length : 0
        });
        
    } catch (error) {
        console.error('保存搜索记录失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/history/play', (req, res) => {
    try {
        const { limit } = req.query;
        let history = playHistory.playHistory || [];
        
        if (limit && !isNaN(limit)) {
            const limitNum = parseInt(limit);
            history = history.slice(0, Math.min(limitNum, history.length));
        }
        
        res.json({
            code: 200,
            data: history,
            total: history.length,
            lastUpdated: playHistory.lastUpdated
        });
        
    } catch (error) {
        console.error('获取播放历史失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/history/search', (req, res) => {
    try {
        const { limit } = req.query;
        let history = playHistory.searchHistory || [];
        
        if (limit && !isNaN(limit)) {
            const limitNum = parseInt(limit);
            history = history.slice(0, Math.min(limitNum, history.length));
        }
        
        res.json({
            code: 200,
            data: history,
            total: history.length,
            lastUpdated: playHistory.lastUpdated
        });
        
    } catch (error) {
        console.error('获取搜索历史失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.delete('/api/history/play', (req, res) => {
    try {
        const count = playHistory.playHistory ? playHistory.playHistory.length : 0;
        playHistory.playHistory = [];
        playHistory.lastUpdated = new Date().toISOString();
        
        saveHistory(playHistory);
        
        res.json({
            code: 200,
            message: '播放历史已清空',
            clearedCount: count
        });
        
    } catch (error) {
        console.error('清空播放历史失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.delete('/api/history/search', (req, res) => {
    try {
        const count = playHistory.searchHistory ? playHistory.searchHistory.length : 0;
        playHistory.searchHistory = [];
        playHistory.lastUpdated = new Date().toISOString();
        
        saveHistory(playHistory);
        
        res.json({
            code: 200,
            message: '搜索历史已清空',
            clearedCount: count
        });
        
    } catch (error) {
        console.error('清空搜索历史失败:', error);
        res.status(500).json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/search/suggest', async (req, res) => {
    try {
        const { keywords } = req.query;
        if (!keywords) {
            return res.json({ code: 200, result: { songs: [], albums: [] } });
        }
        
        const data = await makeApiRequest('/search/suggest', {
            keywords: keywords,
            type: 'mobile'
        });
        
        res.json({
            code: 200,
            result: {
                songs: data.result?.songs || [],
                albums: data.result?.albums || []
            }
        });
    } catch (error) {
        console.error('搜索建议失败:', error.message);
        res.json({ 
            code: 200, 
            result: { songs: [], albums: [] }
        });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { keywords, limit = 30, offset = 0, type = 1 } = req.query;
        
        const searchLimit = Math.min(parseInt(limit) || 30, MAX_SEARCH_RESULTS);
        
        if (!keywords || keywords.trim() === '') {
            return res.json({
                code: 200,
                result: {
                    songs: [],
                    songCount: 0
                }
            });
        }
        
        const data = await makeApiRequest('/cloudsearch/pc', {
            s: keywords,
            type: type,
            limit: searchLimit,
            offset: offset
        });
        
        let songs = data.result?.songs || [];
        if (songs.length > searchLimit) {
            songs = songs.slice(0, searchLimit);
        }
        
        const formattedData = {
            code: data.code || 200,
            result: {
                songs: songs,
                songCount: Math.min(data.result?.songCount || songs.length, searchLimit),
                maxResults: MAX_SEARCH_RESULTS
            }
        };
        
        res.json(formattedData);
    } catch (error) {
        console.error('搜索失败:', error.message);
        res.status(500).json({ 
            code: 500, 
            error: '搜索失败',
            message: error.message,
            result: {
                songs: [],
                songCount: 0,
                maxResults: MAX_SEARCH_RESULTS
            }
        });
    }
});

app.get('/api/song/detail', async (req, res) => {
    try {
        const { ids } = req.query;
        const data = await makeApiRequest('/song/detail', { 
            ids: ids 
        });
        
        res.json({
            code: 200,
            songs: data.songs || [],
            privileges: data.privileges || []
        });
    } catch (error) {
        console.error('获取歌曲详情失败:', error.message);
        res.json({ 
            code: 200,
            songs: [],
            privileges: []
        });
    }
});

app.get('/api/song/url/v1', async (req, res) => {
    try {
        const { id, level = 'exhigh' } = req.query;
        
        const validLevels = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];
        const actualLevel = validLevels.includes(level) ? level : 'exhigh';
        
        const data = await makeApiRequest('/song/url/v1', { 
            id: id,
            level: actualLevel
        });
        
        const result = {
            code: data.code || 200,
            data: []
        };
        
        if (data.data && Array.isArray(data.data)) {
            result.data = data.data;
        } else if (data.data) {
            result.data = [data.data];
        } else {
            result.data = [{
                id: id,
                url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
                level: actualLevel,
                fee: 0
            }];
        }
        
        res.json(result);
    } catch (error) {
        console.error('获取歌曲URL失败:', error.message);
        res.json({ 
            code: 200,
            data: [{
                id: req.query.id,
                url: `https://music.163.com/song/media/outer/url?id=${req.query.id}.mp3`,
                level: req.query.level || 'standard',
                fee: 0
            }]
        });
    }
});

app.get('/api/top/songs', async (req, res) => {
    try {
        const data = await makeApiRequest('/top/song', { 
            type: 0 
        });
        
        let songs = data.data || [];
        if (songs.length > MAX_SEARCH_RESULTS) {
            songs = songs.slice(0, MAX_SEARCH_RESULTS);
        }
        
        const formattedData = {
            code: 200,
            data: songs.map(song => ({
                id: song.id,
                name: song.name,
                artists: song.artists || [{ name: '未知歌手' }],
                album: song.album || { name: '未知专辑', picUrl: '' },
                duration: song.duration || 0,
                fee: song.fee || 0
            }))
        };
        
        res.json(formattedData);
    } catch (error) {
        console.error('获取热门歌曲失败:', error.message);
        res.json({ 
            code: 500, 
            data: [],
            error: '获取热门歌曲失败'
        });
    }
});

const LYRIC_APIS = [
    {
        name: '官方API',
        url: (id) => `https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`,
        parse: (data) => {
            if (data.lrc && data.lrc.lyric) {
                return {
                    original: data.lrc.lyric,
                    translated: data.tlyric?.lyric || ''
                };
            }
            return null;
        }
    },
    {
        name: '第三方API-1',
        url: (id) => `https://api.itooi.cn/netease/lyric?id=${id}`,
        parse: (data) => {
            if (data.code === 200 && data.data && data.data.lyric) {
                return {
                    original: data.data.lyric,
                    translated: data.data.tlyric || ''
                };
            }
            return null;
        }
    },
    {
        name: '第三方API-2',
        url: (id) => `http://api.injahow.cn/meting/?type=lyric&id=${id}`,
        parse: (data) => {
            if (data.lyric) {
                return {
                    original: data.lyric,
                    translated: data.tlyric || ''
                };
            }
            return null;
        }
    },
    {
        name: '第三方API-3',
        url: (id) => `https://music.163.xiwnn.com/lyric?id=${id}`,
        parse: (data) => {
            if (data.lyric) {
                return {
                    original: data.lyric,
                    translated: data.tlyric || ''
                };
            }
            return null;
        }
    },
    {
        name: '第三方API-4',
        url: (id) => `https://api.mtnhao.com/lyric?id=${id}`,
        parse: (data) => {
            if (data.lrc && data.lrc.lyric) {
                return {
                    original: data.lrc.lyric,
                    translated: data.tlyric?.lyric || ''
                };
            }
            return null;
        }
    },
    {
        name: '第三方API-5',
        url: (id) => `https://music.api.94lyn.com/lyric?id=${id}`,
        parse: (data) => {
            if (data.code === 200 && data.lyric) {
                return {
                    original: data.lyric,
                    translated: data.tlyric || ''
                };
            }
            return null;
        }
    },
    {
        name: 'VVHan备用API',
        url: (id) => `https://api.vvhan.com/api/netease?type=lyric&id=${id}`,
        parse: (data) => {
            if (data.success && data.lyric) {
                return {
                    original: data.lyric,
                    translated: data.tlyric || ''
                };
            }
            return null;
        }
    }
];

const lyricCache = new Map();

async function fetchLyricsFromMultipleSources(songId) {
    const promises = LYRIC_APIS.map(async (api, index) => {
        try {
            const response = await axios.get(api.url(songId), {
                timeout: 3000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://music.163.com'
                }
            });
            
            const parsed = api.parse(response.data);
            if (parsed && parsed.original && parsed.original.trim()) {
                return {
                    source: api.name,
                    data: parsed,
                    success: true
                };
            }
        } catch (error) {
            return {
                source: api.name,
                data: null,
                success: false
            };
        }
    });
    
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
            return result.value;
        }
    }
    
    return null;
}

function generateMockLyrics(songId) {
    const songLyricsMap = {
        'default': {
            original: `[00:00.00]音乐播放中...
[00:05.00]歌词加载完成
[00:10.00]请享受音乐
[00:15.00]♪ ♫ ♬ ♭
[00:20.00]音乐让生活更美好
[00:25.00]此刻正是聆听的好时光
[00:30.00]放松心情，享受旋律
[00:35.00]♪ ♫ ♬ ♭
[00:40.00]让音乐带走所有烦恼
[00:45.00]沉浸在美妙的旋律中
[00:50.00]感受每个音符的跳动
[00:55.00]♪ ♫ ♬ ♭`,
            translated: `[00:00.00]Music is playing...
[00:05.00]Lyrics loaded
[00:10.00]Enjoy the music
[00:15.00]♪ ♫ ♬ ♭
[00:20.00]Music makes life better
[00:25.00]Now is the perfect time to listen
[00:30.00]Relax and enjoy the melody
[00:35.00]♪ ♫ ♬ ♭
[00:40.00]Let music take away all worries
[00:45.00]Immerse in the beautiful melody
[00:50.00]Feel the rhythm of every note
[00:55.00]♪ ♫ ♬ ♭`
        }
    };
    
    return songLyricsMap['default'];
}

app.get('/api/lyric/new', async (req, res) => {
    try {
        const { id } = req.query;
        
        if (!id || isNaN(id)) {
            return res.json({
                code: 200,
                lrc: { lyric: '[00:00.00]歌词加载中...\n[00:05.00]请选择一首歌曲' },
                tlyric: { lyric: '' },
                klyric: { lyric: '' },
                romalrc: { lyric: '' },
                source: '本地'
            });
        }
        
        const cacheKey = `lyric_${id}`;
        const cachedData = lyricCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
            return res.json(cachedData.data);
        }
        
        const lyricResult = await fetchLyricsFromMultipleSources(id);
        
        if (lyricResult && lyricResult.data) {
            const { original, translated } = lyricResult.data;
            
            const responseData = {
                code: 200,
                lrc: { 
                    lyric: original 
                },
                tlyric: { 
                    lyric: translated 
                },
                klyric: { lyric: '' },
                romalrc: { lyric: '' },
                source: lyricResult.source,
                timestamp: new Date().toISOString()
            };
            
            lyricCache.set(cacheKey, {
                timestamp: Date.now(),
                data: responseData
            });
            
            return res.json(responseData);
        }
        
        try {
            const backupResponse = await axios.get(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`, {
                timeout: 3000
            });
            
            if (backupResponse.data && backupResponse.data.lrc && backupResponse.data.lrc.lyric) {
                const responseData = {
                    code: 200,
                    lrc: { 
                        lyric: backupResponse.data.lrc.lyric 
                    },
                    tlyric: { 
                        lyric: backupResponse.data.tlyric?.lyric || '' 
                    },
                    klyric: { lyric: '' },
                    romalrc: { lyric: '' },
                    source: '官方备用API',
                    timestamp: new Date().toISOString()
                };
                
                lyricCache.set(cacheKey, {
                    timestamp: Date.now(),
                    data: responseData
                });
                
                return res.json(responseData);
            }
        } catch (backupError) {
        }
        
        const mockLyrics = generateMockLyrics(id);
        const mockResponseData = {
            code: 200,
            lrc: { 
                lyric: mockLyrics.original
            },
            tlyric: { 
                lyric: mockLyrics.translated
            },
            klyric: { lyric: '' },
            romalrc: { lyric: '' },
            source: '模拟歌词',
            timestamp: new Date().toISOString()
        };
        
        lyricCache.set(cacheKey, {
            timestamp: Date.now(),
            data: mockResponseData
        });
        
        res.json(mockResponseData);
        
    } catch (error) {
        console.error('获取歌词失败:', error.message);
        
        const mockLyrics = generateMockLyrics(req.query.id || 'default');
        const responseData = { 
            code: 200,
            lrc: { 
                lyric: mockLyrics.original
            },
            tlyric: { lyric: mockLyrics.translated },
            klyric: { lyric: '' },
            romalrc: { lyric: '' },
            source: '错误恢复',
            timestamp: new Date().toISOString()
        };
        
        const cacheKey = `lyric_${req.query.id || 'default'}`;
        lyricCache.set(cacheKey, {
            timestamp: Date.now(),
            data: responseData
        });
        
        res.json(responseData);
    }
});

app.get('/api/lyric', async (req, res) => {
    try {
        const { id } = req.query;
        
        const cacheKey = `lyric_${id}`;
        const cachedData = lyricCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
            const formattedData = {
                code: 200,
                lrc: { 
                    lyric: cachedData.data.lrc?.lyric || '[00:00.00]暂无歌词' 
                },
                tlyric: { 
                    lyric: cachedData.data.tlyric?.lyric || '' 
                }
            };
            
            return res.json(formattedData);
        }
        
        const response = await axios.get(`http://${LOCAL_IP}:${PORT}/api/lyric/new?id=${id}`, {
            timeout: 4000
        }).catch(() => null);
        
        if (response && response.data) {
            const formattedData = {
                code: 200,
                lrc: { 
                    lyric: response.data.lrc?.lyric || '[00:00.00]暂无歌词' 
                },
                tlyric: { 
                    lyric: response.data.tlyric?.lyric || '' 
                }
            };
            
            lyricCache.set(cacheKey, {
                timestamp: Date.now(),
                data: response.data
            });
            
            res.json(formattedData);
        } else {
            const mockLyrics = generateMockLyrics(id);
            const responseData = { 
                code: 200,
                lrc: { lyric: mockLyrics.original },
                tlyric: { lyric: mockLyrics.translated }
            };
            
            lyricCache.set(cacheKey, {
                timestamp: Date.now(),
                data: responseData
            });
            
            res.json(responseData);
        }
    } catch (error) {
        console.error('获取旧版歌词失败:', error.message);
        const mockLyrics = generateMockLyrics(req.query.id);
        res.json({ 
            code: 200,
            lrc: { lyric: mockLyrics.original },
            tlyric: { lyric: mockLyrics.translated }
        });
    }
});

app.get('/api/lyric/test', async (req, res) => {
    try {
        const { id = '1330348068' } = req.query;
        
        const testResults = [];
        
        for (const api of LYRIC_APIS) {
            try {
                const startTime = Date.now();
                const response = await axios.get(api.url(id), {
                    timeout: 5000
                });
                const responseTime = Date.now() - startTime;
                
                const parsed = api.parse(response.data);
                
                testResults.push({
                    name: api.name,
                    url: api.url(id),
                    success: true,
                    responseTime: `${responseTime}ms`,
                    hasLyric: !!parsed?.original,
                    lyricLength: parsed?.original?.length || 0,
                    hasTranslation: !!parsed?.translated
                });
            } catch (error) {
                testResults.push({
                    name: api.name,
                    url: api.url(id),
                    success: false,
                    error: error.message,
                    responseTime: null
                });
            }
        }
        
        res.json({
            code: 200,
            songId: id,
            testResults: testResults,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('歌词API测试失败:', error);
        res.status(500).json({
            code: 500,
            error: '测试失败',
            message: error.message
        });
    }
});

app.get('/api/personalized/newsong', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const actualLimit = Math.min(parseInt(limit) || 20, MAX_SEARCH_RESULTS);
        const data = await makeApiRequest('/personalized/newsong', { limit: actualLimit });
        
        res.json({
            code: 200,
            result: data.result || []
        });
    } catch (error) {
        console.error('获取推荐新歌失败:', error.message);
        res.json({ 
            code: 200,
            result: []
        });
    }
});

app.get('/api/recommend/songs', async (req, res) => {
    try {
        const data = await makeApiRequest('/recommend/songs');
        
        let songs = data.data?.dailySongs || [];
        if (songs.length > MAX_SEARCH_RESULTS) {
            songs = songs.slice(0, MAX_SEARCH_RESULTS);
        }
        
        res.json({
            code: 200,
            data: songs
        });
    } catch (error) {
        console.error('获取每日推荐失败:', error.message);
        res.json({ 
            code: 200,
            data: []
        });
    }
});

app.get('/api/simple/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.json({ success: false, data: [] });
        }
        
        const response = await axios.get('https://api.vvhan.com/api/netease', {
            params: {
                type: 'search',
                key: q
            },
            timeout: 5000
        });
        
        if (response.data.success) {
            const limitedResults = response.data.data.slice(0, MAX_SEARCH_RESULTS);
            res.json({
                success: true,
                data: limitedResults.map(item => ({
                    id: item.id,
                    name: item.name,
                    artist: item.artist,
                    album: item.album,
                    picUrl: item.picUrl
                }))
            });
        } else {
            res.json({ success: false, data: [] });
        }
    } catch (error) {
        console.error('简单搜索失败:', error.message);
        res.json({ success: false, data: [] });
    }
});

app.get('/api/download/optimized', async (req, res) => {
    try {
        const { id, quality = 'higher', fallback = 'true' } = req.query;
        
        if (!id) {
            return res.json({
                success: false,
                error: '缺少歌曲ID参数'
            });
        }
        
        const validLevels = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];
        const actualQuality = validLevels.includes(quality) ? quality : 'higher';
        
        const downloadStrategies = [
            {
                name: '外部直链',
                url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
                priority: 1,
                type: 'direct'
            },
            {
                name: '高质量API',
                url: `https://music-api.heiheiha.xyz/song/url/v1?id=${id}&level=${actualQuality}`,
                priority: 2,
                type: 'api'
            },
            {
                name: '主API',
                url: `https://netease-cloud-music-api-liart.vercel.app/song/url/v1?id=${id}&level=${actualQuality}`,
                priority: 3,
                type: 'api'
            },
            {
                name: '备用API',
                url: `http://cloud-music.pl-fe.cn/song/url/v1?id=${id}&level=${actualQuality}`,
                priority: 4,
                type: 'api'
            }
        ];
        
        downloadStrategies.sort((a, b) => a.priority - b.priority);
        
        const results = [];
        let finalUrl = null;
        let finalStrategy = null;
        
        const promises = downloadStrategies.map(async (strategy) => {
            try {
                const startTime = Date.now();
                
                if (strategy.type === 'direct') {
                    return {
                        strategy: strategy.name,
                        success: true,
                        url: strategy.url,
                        responseTime: Date.now() - startTime,
                        type: 'direct'
                    };
                } else {
                    const response = await axios.get(strategy.url, {
                        timeout: 3000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (response.data && response.data.code === 200 && 
                        response.data.data && response.data.data[0] && 
                        response.data.data[0].url) {
                        return {
                            strategy: strategy.name,
                            success: true,
                            url: response.data.data[0].url,
                            responseTime: Date.now() - startTime,
                            type: 'api'
                        };
                    }
                }
            } catch (error) {
                return {
                    strategy: strategy.name,
                    success: false,
                    error: error.message,
                    responseTime: null,
                    type: strategy.type
                };
            }
            
            return {
                strategy: strategy.name,
                success: false,
                error: 'API返回无效数据',
                responseTime: null,
                type: strategy.type
            };
        });
        
        const strategyResults = await Promise.allSettled(promises);
        
        for (const result of strategyResults) {
            if (result.status === 'fulfilled' && result.value.success) {
                finalUrl = result.value.url;
                finalStrategy = result.value.strategy;
                results.push(result.value);
                break;
            } else if (result.status === 'fulfilled') {
                results.push(result.value);
            }
        }
        
        if (finalUrl) {
            res.json({
                success: true,
                url: finalUrl,
                strategy: finalStrategy,
                strategies: results,
                songId: id,
                quality: actualQuality,
                timestamp: new Date().toISOString()
            });
        } else {
            const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
            res.json({
                success: fallback === 'true',
                url: fallbackUrl,
                strategy: '最终备用',
                strategies: results,
                songId: id,
                quality: 'standard',
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('优化下载失败:', error);
        res.status(500).json({
            success: false,
            error: '下载服务出错',
            message: error.message
        });
    }
});

function getSafeChineseFileName(songTitle, artist) {
    const illegalChars = /[<>:"/\\|?*]/g;
    const safeTitle = (songTitle || '未知歌曲').replace(illegalChars, '_');
    const safeArtist = (artist || '未知歌手').replace(illegalChars, '_');
    
    const maxLength = 100;
    let fileName = `${safeTitle} - ${safeArtist}.mp3`;
    
    if (fileName.length > maxLength) {
        const titleMaxLength = maxLength - safeArtist.length - 7;
        const truncatedTitle = safeTitle.substring(0, Math.max(titleMaxLength, 10)) + '...';
        fileName = `${truncatedTitle} - ${safeArtist}.mp3`;
    }
    
    return fileName;
}

app.post('/api/download/stats', (req, res) => {
    try {
        const { songId, songName, artist, timestamp, quality, strategy } = req.body;
        
        res.json({
            code: 200,
            message: '下载统计记录成功',
            data: {
                songId,
                songName,
                artist,
                timestamp,
                quality,
                strategy
            }
        });
    } catch (error) {
        console.error('下载统计记录失败:', error);
        res.json({ 
            code: 500, 
            error: '统计记录失败',
            message: error.message
        });
    }
});

app.get('/api/download/filename', (req, res) => {
    try {
        const { songTitle, artist } = req.query;
        
        if (!songTitle) {
            return res.status(400).json({
                code: 400,
                error: '缺少歌曲标题参数'
            });
        }
        
        const fileName = getSafeChineseFileName(songTitle, artist);
        
        res.json({
            code: 200,
            fileName: fileName,
            downloadName: fileName,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('获取下载文件名失败:', error);
        res.status(500).json({
            code: 500,
            error: '获取文件名失败',
            message: error.message
        });
    }
});

app.get('/api/status', async (req, res) => {
    const status = {};
    const testEndpoints = [
        { name: '搜索测试', endpoint: '/search', params: { keywords: '测试', limit: 1 } },
        { name: '热门歌曲', endpoint: '/top/song', params: { type: 0 } },
        { name: '歌曲详情', endpoint: '/song/detail', params: { ids: '1330348068' } }
    ];
    
    for (const [name, url] of Object.entries(API_SOURCES)) {
        status[name] = { url, status: '未知', responseTime: null };
        
        for (const test of testEndpoints) {
            try {
                const startTime = Date.now();
                const response = await axios.get(`${url}${test.endpoint}`, {
                    params: test.params,
                    timeout: 4000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                const responseTime = Date.now() - startTime;
                
                if (response.data) {
                    status[name].status = '在线';
                    status[name].responseTime = `${responseTime}ms`;
                    status[name].lastTest = test.name;
                    break;
                }
            } catch (e) {
                status[name].status = '离线';
                status[name].error = e.message;
            }
        }
    }
    
    const lyricApiStatus = [];
    for (const api of LYRIC_APIS) {
        try {
            const startTime = Date.now();
            const response = await axios.get(api.url('1330348068'), {
                timeout: 3000
            });
            const responseTime = Date.now() - startTime;
            const parsed = api.parse(response.data);
            
            lyricApiStatus.push({
                name: api.name,
                status: '在线',
                responseTime: `${responseTime}ms`,
                hasLyric: !!parsed?.original,
                lyricLength: parsed?.original?.length || 0
            });
        } catch (error) {
            lyricApiStatus.push({
                name: api.name,
                status: '离线',
                error: error.message
            });
        }
    }
    
    res.json({
        code: 200,
        message: 'API状态检查完成',
        timestamp: new Date().toISOString(),
        sources: status,
        lyricApis: lyricApiStatus,
        lyricCacheSize: lyricCache.size,
        ratingCacheSize: ratingCache.size,
        downloadStrategies: 4,
        cacheDuration: CACHE_DURATION / 60000 + '分钟',
        maxSearchResults: MAX_SEARCH_RESULTS,
        historySize: playHistory.playHistory ? playHistory.playHistory.length : 0,
        searchHistorySize: playHistory.searchHistory ? playHistory.searchHistory.length : 0,
        collectionSize: collectionData.collections ? collectionData.collections.length : 0,
        availableQualities: ['standard', 'higher', 'exhigh', 'lossless', 'hires']
    });
});

app.get('/api/lyric/real-time', async (req, res) => {
    try {
        const { id, currentTime } = req.query;
        
        if (!id) {
            return res.json({
                code: 400,
                error: '缺少歌曲ID参数'
            });
        }
        
        const cacheKey = `lyric_${id}`;
        let lyricData = null;
        
        const cachedData = lyricCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
            lyricData = cachedData.data;
        } else {
            try {
                const response = await axios.get(`https://netease-cloud-music-api-liart.vercel.app/lyric?id=${id}`, {
                    timeout: 3000
                });
                
                if (response.data) {
                    lyricData = {
                        code: 200,
                        lrc: { 
                            lyric: response.data.lrc?.lyric || '[00:00.00]暂无歌词' 
                        },
                        tlyric: { 
                            lyric: response.data.tlyric?.lyric || '' 
                        }
                    };
                    
                    lyricCache.set(cacheKey, {
                        timestamp: Date.now(),
                        data: lyricData
                    });
                }
            } catch (error) {
            }
        }
        
        if (lyricData && currentTime) {
            const ct = parseFloat(currentTime);
            const lines = lyricData.lrc.lyric.split('\n');
            let currentLine = '';
            let nextLine = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.+)/);
                if (match) {
                    const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
                    
                    if (time <= ct) {
                        currentLine = match[4].trim();
                        if (i < lines.length - 1) {
                            const nextMatch = lines[i + 1].match(/\[(\d{2}):(\d{2})\.(\d{2})\](.+)/);
                            if (nextMatch) {
                                nextLine = nextMatch[4].trim();
                            }
                        }
                    }
                }
            }
            
            return res.json({
                code: 200,
                currentLine,
                nextLine,
                currentTime: ct,
                hasLyrics: currentLine !== ''
            });
        }
        
        res.json({
            code: 200,
            currentLine: '',
            nextLine: '',
            hasLyrics: false
        });
        
    } catch (error) {
        console.error('实时歌词接口错误:', error);
        res.json({
            code: 500,
            error: '服务器内部错误',
            message: error.message
        });
    }
});

app.get('/api/lyric/clear-cache', (req, res) => {
    const beforeSize = lyricCache.size;
    lyricCache.clear();
    
    res.json({
        code: 200,
        message: '歌词缓存已清空',
        clearedEntries: beforeSize,
        remainingEntries: lyricCache.size
    });
});

app.get('/api/rating/clear-cache', (req, res) => {
    const beforeSize = ratingCache.size;
    ratingCache.clear();
    
    res.json({
        code: 200,
        message: '评分缓存已清空',
        clearedEntries: beforeSize,
        remainingEntries: ratingCache.size
    });
});

app.get('/api/settings', (req, res) => {
    res.json({
        code: 200,
        settings: appSettings,
        cacheDuration: CACHE_DURATION / 60000,
        maxSearchResults: MAX_SEARCH_RESULTS,
        timestamp: new Date().toISOString(),
        availableQualities: ['standard', 'higher', 'exhigh', 'lossless', 'hires']
    });
});

app.post('/api/settings', (req, res) => {
    try {
        const newSettings = req.body;
        
        const validQualities = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];
        if (newSettings.defaultQuality && !validQualities.includes(newSettings.defaultQuality)) {
            return res.status(400).json({
                code: 400,
                error: '无效的音质设置'
            });
        }
        
        if (newSettings.downloadQuality && !validQualities.includes(newSettings.downloadQuality)) {
            return res.status(400).json({
                code: 400,
                error: '无效的下载音质设置'
            });
        }
        
        if (newSettings.cacheDuration && (newSettings.cacheDuration < 1 || newSettings.cacheDuration > 1440)) {
            return res.status(400).json({
                code: 400,
                error: '缓存时长必须在1-1440分钟之间'
            });
        }
        
        if (newSettings.maxHistoryItems && (newSettings.maxHistoryItems < 1 || newSettings.maxHistoryItems > 1000)) {
            return res.status(400).json({
                code: 400,
                error: '最大历史记录数必须在1-1000之间'
            });
        }
        
        appSettings = { ...appSettings, ...newSettings };
        
        if (newSettings.cacheDuration) {
            CACHE_DURATION = newSettings.cacheDuration * 60 * 1000;
        }
        
        if (newSettings.savePlayHistory === false) {
            playHistory.playHistory = [];
            playHistory.searchHistory = [];
            saveHistory(playHistory);
        }
        
        saveSettings(appSettings);
        
        res.json({
            code: 200,
            message: '设置已更新',
            settings: appSettings,
            cacheDuration: CACHE_DURATION / 60000,
            maxSearchResults: MAX_SEARCH_RESULTS,
            availableQualities: validQualities,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('更新设置失败:', error);
        res.status(500).json({
            code: 500,
            error: '更新设置失败',
            message: error.message
        });
    }
});

app.post('/api/settings/reset', (req, res) => {
    appSettings = {
        autoPlay: true,
        defaultQuality: 'exhigh',
        lyricAutoTranslate: false,
        downloadPath: '/downloads',
        cacheEnabled: true,
        cacheDuration: 30,
        theme: 'light',
        colorScheme: 'default',
        language: 'zh-CN',
        notificationEnabled: true,
        smartDownload: true,
        animationEnabled: true,
        savePlayHistory: true,
        maxHistoryItems: 100,
        autoCollectLiked: false,
        downloadQuality: 'higher'
    };
    
    CACHE_DURATION = 30 * 60 * 1000;
    
    saveSettings(appSettings);
    
    res.json({
        code: 200,
        message: '设置已重置为默认值',
        settings: appSettings,
        cacheDuration: CACHE_DURATION / 60000,
        maxSearchResults: MAX_SEARCH_RESULTS,
        availableQualities: ['standard', 'higher', 'exhigh', 'lossless', 'hires'],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        code: 200,
        message: '音乐播放器API运行正常',
        version: '2.7.1',
        timestamp: new Date().toISOString(),
        features: [
            '优化的歌曲切换速度',
            '实时歌词获取功能',
            '歌词缓存机制',
            '修复的搜索功能',
            '热门歌曲',
            '歌词显示（已优化修复）',
            '歌曲播放',
            'VIP标识',
            '双语翻译',
            '多API源支持',
            '智能歌词缓存',
            '模拟歌词系统',
            '设置管理系统',
            '优化下载功能',
            '并行歌词API请求',
            '播放历史记录系统',
            '搜索历史记录',
            '歌曲收藏功能',
            '设置数据持久化',
            '最大80首搜索结果',
            '白色主题界面',
            '更多主题颜色选择',
            '官方歌曲评分功能',
            '智能中文文件名下载',
            '更多音乐音质选项'
        ],
        performance: {
            lyricCacheSize: lyricCache.size,
            ratingCacheSize: ratingCache.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            lyricApiCount: LYRIC_APIS.length,
            downloadStrategyCount: 4,
            cacheDuration: CACHE_DURATION / 60000 + '分钟',
            maxSearchResults: MAX_SEARCH_RESULTS,
            playHistorySize: playHistory.playHistory ? playHistory.playHistory.length : 0,
            searchHistorySize: playHistory.searchHistory ? playHistory.searchHistory.length : 0,
            collectionSize: collectionData.collections ? collectionData.collections.length : 0,
            settingsPersisted: fs.existsSync(SETTINGS_FILE),
            historyPersisted: fs.existsSync(HISTORY_FILE),
            collectionPersisted: fs.existsSync(COLLECTION_FILE),
            availableQualities: ['standard', 'higher', 'exhigh', 'lossless', 'hires']
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/changelog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'changelog.html'));
});

app.use((req, res) => {
    res.status(404).json({ 
        code: 404, 
        error: '接口不存在',
        availableEndpoints: [
            'GET /api/search?keywords=xxx - 搜索歌曲(最多100首)',
            'GET /api/simple/search?q=xxx - 简单搜索',
            'GET /api/top/songs - 热门歌曲',
            'GET /api/song/url/v1?id=xxx - 歌曲URL',
            'GET /api/song/rating?id=xxx - 歌曲评分',
            'GET /api/download/optimized?id=xxx - 优化下载',
            'GET /api/download/filename?songTitle=xxx&artist=xxx - 获取下载文件名',
            'GET /api/lyric/new?id=xxx - 歌词（新版，已修复）',
            'GET /api/lyric/test?id=xxx - 歌词API测试',
            'GET /api/lyric/real-time?id=xxx&currentTime=xxx - 实时歌词',
            'GET /api/lyric?id=xxx - 歌词（旧版）',
            'GET /api/lyric/clear-cache - 清空歌词缓存',
            'GET /api/rating/clear-cache - 清空评分缓存',
            'POST /api/collection/add - 添加收藏',
            'DELETE /api/collection/remove - 移除收藏',
            'GET /api/collection/list - 获取收藏列表',
            'GET /api/collection/check - 检查是否已收藏',
            'POST /api/history/play - 记录播放历史',
            'POST /api/history/search - 记录搜索历史',
            'GET /api/history/play - 获取播放历史',
            'GET /api/history/search - 获取搜索历史',
            'DELETE /api/history/play - 清空播放历史',
            'DELETE /api/history/search - 清空搜索历史',
            'GET /api/settings - 获取设置',
            'POST /api/settings - 更新设置',
            'GET /api/status - API状态',
            'GET /api/health - 健康检查',
            'GET /settings - 设置页面',
            'GET /changelog - 更新日志'
        ]
    });
});

app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ 
        code: 500, 
        error: '服务器内部错误',
        message: error.message
    });
});

app.listen(PORT, () => {
    console.log(`=======================================`);
    console.log(`🎵 音乐播放器服务器已启动`);
    console.log(`📍 地址: http://${LOCAL_IP}:${PORT}`);
    console.log(`🕒 时间: ${new Date().toLocaleString()}`);
    console.log(`🔧 API源: ${Object.values(API_SOURCES).length}个`);
    console.log(`🎤 歌词API: ${LYRIC_APIS.length}个`);
    console.log(`💾 缓存时长: ${CACHE_DURATION / 60000}分钟`);
    console.log(`🔍 最大搜索结果: ${MAX_SEARCH_RESULTS}首`);
    console.log(`📁 设置文件: ${SETTINGS_FILE}`);
    console.log(`📊 历史文件: ${HISTORY_FILE}`);
    console.log(`❤️  收藏文件: ${COLLECTION_FILE}`);
    console.log(`🎨 主题: ${appSettings.theme}`);
    console.log(`🌈 颜色方案: ${appSettings.colorScheme}`);
    console.log(`=======================================`);
    console.log(`已优化的接口:`);
    console.log(`  GET /api/search?keywords=xxx - 搜索歌曲(最多${MAX_SEARCH_RESULTS}首)`);
    console.log(`  GET /api/lyric/new?id=xxx - 歌词接口（并行API请求）`);
    console.log(`  GET /api/lyric/test?id=xxx - 歌词API测试接口`);
    console.log(`  GET /api/download/optimized?id=xxx - 优化下载接口`);
    console.log(`  GET /api/song/rating?id=xxx - 歌曲评分接口`);
    console.log(`  GET /api/download/filename - 获取中文下载文件名`);
    console.log(`  POST /api/collection/add - 添加收藏`);
    console.log(`  DELETE /api/collection/remove - 移除收藏`);
    console.log(`  GET /api/collection/list - 获取收藏列表`);
    console.log(`  GET /api/collection/check - 检查是否已收藏`);
    console.log(`  POST /api/history/play - 播放历史记录`);
    console.log(`  POST /api/history/search - 搜索历史记录`);
    console.log(`  GET /api/history/play - 获取播放历史`);
    console.log(`  GET /api/history/search - 获取搜索历史`);
    console.log(`  GET /api/settings - 获取设置`);
    console.log(`  POST /api/settings - 更新设置`);
    console.log(`=======================================`);
    console.log(`新功能 (v2.7.1):`);
    console.log(`  ✓ 官方歌曲评分功能`);
    console.log(`  ✓ 智能中文文件名下载`);
    console.log(`  ✓ 更多音乐音质选项 (standard, higher, exhigh, lossless, hires)`);
    console.log(`  ✓ 歌曲收藏功能增强`);
    console.log(`  ✓ 更多主题颜色选择`);
    console.log(`  ✓ 真实IP地址支持`);
    console.log(`  ✓ 播放历史记录系统`);
    console.log(`  ✓ 搜索历史记录系统`);
    console.log(`  ✓ 白色主题界面`);
    console.log(`  ✓ 历史数据持久化存储`);
    console.log(`移除功能:`);
    console.log(`  ✓ 移除用户账户系统`);
    console.log(`  ✓ 移除歌单功能`);
    console.log(`=======================================`);
    console.log(`支持的音质级别:`);
    console.log(`  • standard - 标准品质 (128kbps)`);
    console.log(`  • higher - 较高品质 (192kbps)`);
    console.log(`  • exhigh - 极高品质 (320kbps)`);
    console.log(`  • lossless - 无损音质 (FLAC)`);
    console.log(`  • hires - Hi-Res音质 (24bit/96kHz)`);
    console.log(`=======================================`);
});