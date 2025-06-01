document.addEventListener('DOMContentLoaded', () => {
    // 登录元素
    const loginContainer = document.getElementById('loginContainer');
    const gameContainer = document.getElementById('gameContainer');
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const captchaContainer = document.getElementById('captchaContainer');
    const captchaQuestion = document.getElementById('captchaQuestion');
    const captchaAnswer = document.getElementById('captchaAnswer');
    const loginError = document.getElementById('loginError');
    
    // 游戏元素
    const gridContainer = document.querySelector('.grid-container');
    const scoreValue = document.querySelector('.score-value');
    const newGameBtn = document.querySelector('.new-game-btn');
    const tryAgainBtn = document.querySelector('.try-again-btn');
    const continueBtn = document.querySelector('.continue-btn');
    const gameOver = document.querySelector('.game-over');
    const winMessage = document.querySelector('.win-message');
    
    // 游戏状态
    let grid = [];
    let score = 0;
    let isGameOver = false;
    let hasWon = false;
    let isContinuing = false;
    
    // 验证问题及答案
    let currentCaptcha = {
        question: '',
        answer: 0
    };
    
    // 内测凭证
    const BETA_CREDENTIALS = {
        username: 'cycling',
        password: '125858'
    };
    
    // 生成人机验证问题
    function generateCaptcha() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operators = ['+', '-', '*'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let question = '';
        let answer = 0;
        
        switch(operator) {
            case '+':
                question = `${num1} + ${num2} = ?`;
                answer = num1 + num2;
                break;
            case '-':
                question = `${num1} - ${num2} = ?`;
                answer = num1 - num2;
                break;
            case '*':
                question = `${num1} × ${num2} = ?`;
                answer = num1 * num2;
                break;
        }
        
        currentCaptcha = {
            question,
            answer
        };
        
        captchaQuestion.textContent = question;
        captchaAnswer.value = '';
    }
    
    // 初始化人机验证
    generateCaptcha();
    
    // 登录函数
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const userAnswer = parseInt(captchaAnswer.value.trim());
        
        // 验证输入
        if (!username || !password) {
            loginError.textContent = '请输入用户名和密码';
            return;
        }
        
        if (isNaN(userAnswer)) {
            loginError.textContent = '请输入有效的验证答案';
            return;
        }
        
        // 验证人机验证
        if (userAnswer !== currentCaptcha.answer) {
            loginError.textContent = '验证答案错误';
            generateCaptcha();
            return;
        }
        
        // 验证凭证
        if (username === BETA_CREDENTIALS.username && password === BETA_CREDENTIALS.password) {
            // 登录成功
            loginError.textContent = '';
            loginContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            initGame();
        } else {
            // 登录失败
            loginError.textContent = '用户名或密码错误';
            generateCaptcha();
        }
    }
    
    // 初始化游戏
    function initGame() {
        // 清空游戏网格
        grid = Array(4).fill().map(() => Array(4).fill(0));
        
        // 清空显示
        gridContainer.innerHTML = '';
        
        // 创建网格单元格
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            gridContainer.appendChild(cell);
        }
        
        // 重置游戏状态
        score = 0;
        scoreValue.textContent = '0';
        isGameOver = false;
        hasWon = false;
        isContinuing = false;
        gameOver.style.display = 'none';
        winMessage.style.display = 'none';
        
        // 添加初始方块
        addRandomTile();
        addRandomTile();
        
        // 更新显示
        updateGrid();
    }
    
    // 在空白位置添加随机方块(2或4)
    function addRandomTile() {
        const emptyCells = [];
        
        // 查找所有空白位置
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        // 如果有空白位置，添加新方块
        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            grid[row][col] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    // 更新游戏网格显示
    function updateGrid() {
        // 移除所有方块
        document.querySelectorAll('.tile').forEach(tile => tile.remove());
        
        // 为非零单元格添加方块
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = grid[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.classList.add('tile', `tile-${value}`);
                    
                    if (value > 2048) {
                        tile.classList.add('tile-super');
                    }
                    
                    tile.textContent = value;
                    
                    // 定位方块
                    tile.style.top = `${row * 25 + 4}%`;
                    tile.style.left = `${col * 25 + 4}%`;
                    
                    gridContainer.appendChild(tile);
                }
            }
        }
    }
    
    // 在指定方向移动方块
    function moveTiles(direction) {
        if (isGameOver) return;
        
        let moved = false;
        const newGrid = JSON.parse(JSON.stringify(grid));
        
        // 根据方向处理网格
        switch (direction) {
            case 'up':
                for (let col = 0; col < 4; col++) {
                    const column = [grid[0][col], grid[1][col], grid[2][col], grid[3][col]];
                    const { arr, changed } = slideAndMerge(column);
                    if (changed) {
                        moved = true;
                        for (let row = 0; row < 4; row++) {
                            newGrid[row][col] = arr[row];
                        }
                    }
                }
                break;
                
            case 'down':
                for (let col = 0; col < 4; col++) {
                    const column = [grid[3][col], grid[2][col], grid[1][col], grid[0][col]];
                    const { arr, changed } = slideAndMerge(column);
                    if (changed) {
                        moved = true;
                        for (let row = 0; row < 4; row++) {
                            newGrid[3 - row][col] = arr[row];
                        }
                    }
                }
                break;
                
            case 'left':
                for (let row = 0; row < 4; row++) {
                    const { arr, changed } = slideAndMerge(grid[row]);
                    if (changed) {
                        moved = true;
                        newGrid[row] = arr;
                    }
                }
                break;
                
            case 'right':
                for (let row = 0; row < 4; row++) {
                    const reversedRow = [...grid[row]].reverse();
                    const { arr, changed } = slideAndMerge(reversedRow);
                    if (changed) {
                        moved = true;
                        newGrid[row] = arr.reverse();
                    }
                }
                break;
        }
        
        // 如果方块移动了，更新网格并添加新方块
        if (moved) {
            grid = newGrid;
            addRandomTile();
            updateGrid();
            updateScore();
            
            // 检查是否获胜(达到2048)
            if (!hasWon && !isContinuing) {
                checkWinCondition();
            }
            
            // 检查游戏是否结束
            if (!hasValidMoves()) {
                gameOver.style.display = 'flex';
                isGameOver = true;
            }
        }
    }
    
    // 滑动并合并行/列
    function slideAndMerge(arr) {
        const originalArr = [...arr];
        let changed = false;
        
        // 移除零
        let nonZeros = arr.filter(val => val !== 0);
        
        // 合并相邻相同数字
        for (let i = 0; i < nonZeros.length - 1; i++) {
            if (nonZeros[i] === nonZeros[i + 1]) {
                nonZeros[i] *= 2;
                nonZeros[i + 1] = 0;
                score += nonZeros[i];
                changed = true;
            }
        }
        
        // 合并后再次移除零
        nonZeros = nonZeros.filter(val => val !== 0);
        
        // 末尾填充零
        while (nonZeros.length < 4) {
            nonZeros.push(0);
        }
        
        // 检查数组是否变化
        if (!changed) {
            changed = !originalArr.every((val, i) => val === nonZeros[i]);
        }
        
        return { arr: nonZeros, changed };
    }
    
    // 更新分数显示
    function updateScore() {
        scoreValue.textContent = score;
    }
    
    // 检查玩家是否达到2048
    function checkWinCondition() {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 2048) {
                    winMessage.style.display = 'flex';
                    hasWon = true;
                    return;
                }
            }
        }
    }
    
    // 检查是否还有有效移动
    function hasValidMoves() {
        // 检查空白单元格
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    return true;
                }
            }
        }
        
        // 检查可能的合并
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = grid[row][col];
                
                // 检查右侧邻居
                if (col < 3 && grid[row][col + 1] === value) {
                    return true;
                }
                
                // 检查下方邻居
                if (row < 3 && grid[row + 1][col] === value) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 事件监听器
    loginBtn.addEventListener('click', handleLogin);
    
    // 允许使用Enter键登录
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    captchaAnswer.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    newGameBtn.addEventListener('click', initGame);
    tryAgainBtn.addEventListener('click', initGame);
    continueBtn.addEventListener('click', () => {
        winMessage.style.display = 'none';
        isContinuing = true;
    });
    
    // 键盘控制
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                moveTiles('up');
                break;
            case 'ArrowDown':
                moveTiles('down');
                break;
            case 'ArrowLeft':
                moveTiles('left');
                break;
            case 'ArrowRight':
                moveTiles('right');
                break;
        }
    });
    
    // 移动设备触摸控制
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                moveTiles('right');
            } else {
                moveTiles('left');
            }
        } else {
            if (dy > 0) {
                moveTiles('down');
            } else {
                moveTiles('up');
            }
        }
    }
});