// 游戏配置
const config = {
    gridSize: 20,
    canvasWidth: 400,
    canvasHeight: 400,
    initialSpeed: 150,
    speedIncrease: 10,
    foodScore: 10,
    specialFoodScore: 25,
    specialFoodChance: 0.1, // 10% 概率生成特殊食物
    speedBoostDuration: 3000, // 加速持续时间（毫秒）
    speedBoostMultiplier: 0.5, // 加速倍数（值越小速度越快）
    timeModeDuration: 60, // 时间模式持续时间（秒）
    challengeModeTarget: 300 // 挑战模式目标分数
};

// 调整画布大小以适应屏幕
function resizeCanvas() {
    const gameContainer = document.querySelector('.game-container');
    const containerWidth = gameContainer.clientWidth;
    const maxCanvasSize = Math.min(containerWidth - 30, 400); // 30px 是容器的左右内边距
    
    canvas.width = maxCanvasSize;
    canvas.height = maxCanvasSize;
    
    config.canvasWidth = maxCanvasSize;
    config.canvasHeight = maxCanvasSize;
    
    // 重新初始化游戏以适应新的画布大小
    if (!gameState.isPlaying) {
        initGame();
    }
}

// 游戏状态
let gameState = {
    snake: [],
    food: {},
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    highScore: 0,
    level: 1,
    speed: config.initialSpeed,
    time: 0,
    isPlaying: false,
    isPaused: false,
    isSpeedBoosted: false,
    speedBoostTimer: null,
    timeTimer: null,
    difficulty: 'medium',
    mode: 'endless',
    gameLoop: null
};

// DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const levelElement = document.getElementById('level');
const timeElement = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const difficultySelect = document.getElementById('difficultySelect');
const modeSelect = document.getElementById('modeSelect');

const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardContent = document.getElementById('leaderboardContent');
const closeModal = document.querySelector('.close');

// 初始化游戏
function initGame() {
    // 从localStorage加载最高分
    gameState.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    updateHighScore();
    
    // 获取难度和模式设置
    gameState.difficulty = difficultySelect.value;
    gameState.mode = modeSelect.value;
    
    // 根据难度设置初始速度
    switch (gameState.difficulty) {
        case 'easy':
            gameState.speed = config.initialSpeed + 50;
            break;
        case 'medium':
            gameState.speed = config.initialSpeed;
            break;
        case 'hard':
            gameState.speed = config.initialSpeed - 50;
            break;
    }
    
    // 重置游戏状态
    gameState = {
        ...gameState,
        snake: [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ],
        food: generateFood(),
        direction: 'right',
        nextDirection: 'right',
        score: 0,
        level: 1,
        time: 0,
        isPlaying: false,
        isPaused: false,
        isSpeedBoosted: false,
        speedBoostTimer: null,
        timeTimer: null,
        gameLoop: null
    };
    
    // 更新UI
    updateScore();
    updateLevel();
    updateTime();
    drawGame();
    
    // 重置按钮状态
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// 生成食物
function generateFood() {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * (config.canvasWidth / config.gridSize)),
            y: Math.floor(Math.random() * (config.canvasHeight / config.gridSize)),
            isSpecial: Math.random() < config.specialFoodChance
        };
    } while (isFoodOnSnake(food));
    return food;
}

// 检查食物是否在蛇身上
function isFoodOnSnake(food) {
    return gameState.snake.some(segment => segment.x === food.x && segment.y === food.y);
}

// 绘制游戏
function drawGame() {
    // 清空画布
    ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // 绘制网格背景
    ctx.strokeStyle = '#e0e0e0';
    for (let i = 0; i < config.canvasWidth; i += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, config.canvasHeight);
        ctx.stroke();
    }
    for (let i = 0; i < config.canvasHeight; i += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(config.canvasWidth, i);
        ctx.stroke();
    }
    
    // 绘制蛇
    gameState.snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = gameState.isSpeedBoosted ? '#ff9800' : '#333';
            // 绘制蛇头方向
            drawSnakeHead(segment, gameState.direction);
        } else {
            // 蛇身
            ctx.fillStyle = gameState.isSpeedBoosted ? '#ffc107' : '#666';
            ctx.fillRect(
                segment.x * config.gridSize,
                segment.y * config.gridSize,
                config.gridSize - 1,
                config.gridSize - 1
            );
        }
    });
    
    // 绘制食物
    if (gameState.food.isSpecial) {
        // 绘制特殊食物的闪烁效果
        const currentTime = Date.now();
        const flash = Math.sin(currentTime / 200) > 0;
        ctx.fillStyle = flash ? '#ffeb3b' : '#ffc107';
        ctx.beginPath();
        ctx.arc(
            gameState.food.x * config.gridSize + config.gridSize / 2,
            gameState.food.y * config.gridSize + config.gridSize / 2,
            config.gridSize / 2 - 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
    } else {
        // 绘制普通食物
        ctx.fillStyle = '#f44336';
        ctx.fillRect(
            gameState.food.x * config.gridSize,
            gameState.food.y * config.gridSize,
            config.gridSize - 1,
            config.gridSize - 1
        );
    }
    
    // 绘制游戏模式信息
    drawModeInfo();
}

// 绘制蛇头
function drawSnakeHead(segment, direction) {
    const x = segment.x * config.gridSize;
    const y = segment.y * config.gridSize;
    
    // 绘制蛇头主体
    ctx.fillRect(x, y, config.gridSize - 1, config.gridSize - 1);
    
    // 绘制蛇眼睛
    ctx.fillStyle = 'white';
    switch (direction) {
        case 'up':
            ctx.fillRect(x + 5, y + 3, 3, 3);
            ctx.fillRect(x + 12, y + 3, 3, 3);
            break;
        case 'down':
            ctx.fillRect(x + 5, y + 14, 3, 3);
            ctx.fillRect(x + 12, y + 14, 3, 3);
            break;
        case 'left':
            ctx.fillRect(x + 3, y + 5, 3, 3);
            ctx.fillRect(x + 3, y + 12, 3, 3);
            break;
        case 'right':
            ctx.fillRect(x + 14, y + 5, 3, 3);
            ctx.fillRect(x + 14, y + 12, 3, 3);
            break;
    }
}

// 绘制游戏模式信息
function drawModeInfo() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    if (gameState.mode === 'time') {
        const timeLeft = config.timeModeDuration - gameState.time;
        ctx.fillText(`时间模式: ${timeLeft}秒`, 10, 20);
    } else if (gameState.mode === 'challenge') {
        const scoreLeft = config.challengeModeTarget - gameState.score;
        ctx.fillText(`挑战模式: 目标${config.challengeModeTarget}分`, 10, 20);
        ctx.fillText(`还需: ${Math.max(0, scoreLeft)}分`, 10, 40);
    } else {
        ctx.fillText('无尽模式', 10, 20);
    }
}

// 更新分数
function updateScore() {
    scoreElement.textContent = gameState.score;
    
    // 更新最高分
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        updateHighScore();
        localStorage.setItem('snakeHighScore', gameState.highScore);
    }
    
    // 检查挑战模式是否完成
    if (gameState.mode === 'challenge' && gameState.score >= config.challengeModeTarget) {
        gameWin();
    }
}

// 更新最高分
function updateHighScore() {
    highScoreElement.textContent = gameState.highScore;
}

// 更新等级
function updateLevel() {
    levelElement.textContent = gameState.level;
}

// 更新时间
function updateTime() {
    timeElement.textContent = gameState.time;
}

// 移动蛇
function moveSnake() {
    // 更新方向
    gameState.direction = gameState.nextDirection;
    
    // 获取蛇头
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }
    
    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // 将新头添加到蛇的前面
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 播放吃食物音效
        playSound('eat');
        
        // 增加分数
        if (gameState.food.isSpecial) {
            gameState.score += config.specialFoodScore;
            // 激活速度提升
            activateSpeedBoost();
        } else {
            gameState.score += config.foodScore;
        }
        updateScore();
        
        // 检查是否升级
        const newLevel = Math.floor(gameState.score / 50) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            // 根据难度调整速度
            let baseSpeed;
            switch (gameState.difficulty) {
                case 'easy':
                    baseSpeed = config.initialSpeed + 50;
                    break;
                case 'medium':
                    baseSpeed = config.initialSpeed;
                    break;
                case 'hard':
                    baseSpeed = config.initialSpeed - 50;
                    break;
            }
            gameState.speed = Math.max(30, baseSpeed - (gameState.level - 1) * config.speedIncrease);
            updateLevel();
            // 重新设置游戏循环以适应新速度
            if (gameState.gameLoop) {
                clearInterval(gameState.gameLoop);
                gameState.gameLoop = setInterval(gameTick, gameState.isSpeedBoosted ? gameState.speed * config.speedBoostMultiplier : gameState.speed);
            }
        }
        
        // 生成新食物
        gameState.food = generateFood();
    } else {
        // 移除蛇尾
        gameState.snake.pop();
    }
    
    // 绘制游戏
    drawGame();
}

// 检查碰撞
function checkCollision(head) {
    // 检查墙壁碰撞
    if (
        head.x < 0 ||
        head.x >= config.canvasWidth / config.gridSize ||
        head.y < 0 ||
        head.y >= config.canvasHeight / config.gridSize
    ) {
        return true;
    }
    
    // 检查自身碰撞
    for (let i = 1; i < gameState.snake.length; i++) {
        if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// 激活速度提升
function activateSpeedBoost() {
    gameState.isSpeedBoosted = true;
    
    // 清除之前的定时器
    if (gameState.speedBoostTimer) {
        clearTimeout(gameState.speedBoostTimer);
    }
    
    // 重新设置游戏循环以适应加速
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = setInterval(gameTick, gameState.speed * config.speedBoostMultiplier);
    }
    
    // 设置定时器，时间到后恢复正常速度
    gameState.speedBoostTimer = setTimeout(() => {
        gameState.isSpeedBoosted = false;
        if (gameState.gameLoop) {
            clearInterval(gameState.gameLoop);
            gameState.gameLoop = setInterval(gameTick, gameState.speed);
        }
        drawGame();
    }, config.speedBoostDuration);
}

// 游戏结束
function gameOver() {
    // 播放游戏结束音效
    playSound('gameOver');
    
    clearInterval(gameState.gameLoop);
    if (gameState.speedBoostTimer) {
        clearTimeout(gameState.speedBoostTimer);
    }
    if (gameState.timeTimer) {
        clearInterval(gameState.timeTimer);
    }
    gameState.isPlaying = false;
    gameState.isPaused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // 保存分数到排行榜
    saveScoreToLeaderboard();
    
    alert(`游戏结束！最终分数：${gameState.score}，等级：${gameState.level}`);
}

// 游戏胜利
function gameWin() {
    // 播放胜利音效
    playSound('win');
    
    clearInterval(gameState.gameLoop);
    if (gameState.speedBoostTimer) {
        clearTimeout(gameState.speedBoostTimer);
    }
    if (gameState.timeTimer) {
        clearInterval(gameState.timeTimer);
    }
    gameState.isPlaying = false;
    gameState.isPaused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // 保存分数到排行榜
    saveScoreToLeaderboard();
    
    alert(`恭喜你完成挑战！最终分数：${gameState.score}，用时：${gameState.time}秒`);
}

// 游戏主循环
function gameTick() {
    if (!gameState.isPaused) {
        moveSnake();
    }
}

// 开始游戏
function startGame() {
    // 无论游戏是否结束，都重新初始化游戏
    initGame();
    
    // 播放开始游戏音效
    playSound('start');
    
    gameState.isPlaying = true;
    gameState.isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // 开始计时
    gameState.time = 0;
    updateTime();
    gameState.timeTimer = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.time++;
            updateTime();
            
            // 检查时间模式是否结束
            if (gameState.mode === 'time' && gameState.time >= config.timeModeDuration) {
                gameOver();
            }
        }
    }, 1000);
    
    gameState.gameLoop = setInterval(gameTick, gameState.isSpeedBoosted ? gameState.speed * config.speedBoostMultiplier : gameState.speed);
}

// 暂停游戏
function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    pauseBtn.textContent = gameState.isPaused ? '继续' : '暂停';
}

// 重置游戏
function resetGame() {
    clearInterval(gameState.gameLoop);
    if (gameState.speedBoostTimer) {
        clearTimeout(gameState.speedBoostTimer);
    }
    if (gameState.timeTimer) {
        clearInterval(gameState.timeTimer);
    }
    initGame();
}

// 处理键盘输入
let lastKeyPressTime = 0;
const keyPressDelay = 50; // 按键延迟，防止快速连续按键导致方向混乱

function handleKeyPress(e) {
    const currentTime = Date.now();
    if (currentTime - lastKeyPressTime < keyPressDelay) {
        return; // 忽略短时间内的重复按键
    }
    
    lastKeyPressTime = currentTime;
    
    switch (e.key) {
        case 'ArrowUp':
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'ArrowDown':
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'ArrowRight':
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
        case ' ': // 空格键暂停/继续
            if (gameState.isPlaying) {
                pauseGame();
            }
            break;
    }
}

// 处理触摸控制
let lastTouchTime = 0;
const touchDelay = 50; // 触摸延迟，防止快速连续点击导致方向混乱

function handleTouchControl(direction) {
    const currentTime = Date.now();
    if (currentTime - lastTouchTime < touchDelay) {
        return; // 忽略短时间内的重复触摸
    }
    
    lastTouchTime = currentTime;
    
    switch (direction) {
        case 'up':
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'down':
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'left':
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'right':
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
    }
}

// 播放音效
function playSound(type) {
    // 这里使用Web Audio API模拟音效，实际项目中可以使用音频文件
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch (type) {
            case 'eat':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                break;
            case 'start':
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
            case 'gameOver':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'win':
                oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
        }
    } catch (e) {
        // 忽略音频错误
    }
}

// 保存分数到排行榜
function saveScoreToLeaderboard() {
    // 从localStorage加载排行榜
    const leaderboard = JSON.parse(localStorage.getItem('snakeLeaderboard')) || [];
    
    // 添加新分数
    leaderboard.push({
        score: gameState.score,
        level: gameState.level,
        time: gameState.time,
        mode: gameState.mode,
        difficulty: gameState.difficulty,
        date: new Date().toISOString()
    });
    
    // 按分数排序
    leaderboard.sort((a, b) => b.score - a.score);
    
    // 只保留前10名
    const topLeaderboard = leaderboard.slice(0, 10);
    
    // 保存回localStorage
    localStorage.setItem('snakeLeaderboard', JSON.stringify(topLeaderboard));
}

// 显示排行榜
function showLeaderboard() {
    // 从localStorage加载排行榜
    const leaderboard = JSON.parse(localStorage.getItem('snakeLeaderboard')) || [];
    
    // 清空排行榜内容
    leaderboardContent.innerHTML = '';
    
    // 如果排行榜为空
    if (leaderboard.length === 0) {
        leaderboardContent.innerHTML = '<p>暂无记录</p>';
    } else {
        // 生成排行榜内容
        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-score">${entry.score}</span>
                <span class="leaderboard-info">${entry.mode === 'endless' ? '无尽' : entry.mode === 'time' ? '时间' : '挑战'} - ${entry.difficulty === 'easy' ? '简单' : entry.difficulty === 'medium' ? '中等' : '困难'}</span>
            `;
            leaderboardContent.appendChild(item);
        });
    }
    
    // 显示模态框
    leaderboardModal.style.display = 'block';
}

// 关闭排行榜
function closeLeaderboard() {
    leaderboardModal.style.display = 'none';
}

// 处理鼠标点击事件
function handleMouseClick(e) {
    if (!gameState.isPlaying) {
        // 游戏结束状态下点击画布重新开始游戏
        startGame();
        return;
    }
    
    if (gameState.isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算蛇头位置（像素坐标）
    const snakeHead = gameState.snake[0];
    const headX = snakeHead.x * config.gridSize + config.gridSize / 2;
    const headY = snakeHead.y * config.gridSize + config.gridSize / 2;
    
    // 计算鼠标与蛇头的相对位置
    const dx = mouseX - headX;
    const dy = mouseY - headY;
    
    // 根据相对位置确定新方向
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平方向
        if (dx > 0 && gameState.direction !== 'left') {
            gameState.nextDirection = 'right';
        } else if (dx < 0 && gameState.direction !== 'right') {
            gameState.nextDirection = 'left';
        }
    } else {
        // 垂直方向
        if (dy > 0 && gameState.direction !== 'up') {
            gameState.nextDirection = 'down';
        } else if (dy < 0 && gameState.direction !== 'down') {
            gameState.nextDirection = 'up';
        }
    }
}

// 事件监听器
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);
leaderboardBtn.addEventListener('click', showLeaderboard);
difficultySelect.addEventListener('change', initGame);
modeSelect.addEventListener('change', initGame);
document.addEventListener('keydown', handleKeyPress);
canvas.addEventListener('click', handleMouseClick);

// 虚拟摇杆控制
const joystickContainer = document.querySelector('.joystick-container');
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
let isJoystickActive = false;
let joystickDirection = null;
let joystickInterval = null;

// 初始化虚拟摇杆
function initJoystick() {
    // 触摸开始事件
    joystickContainer.addEventListener('touchstart', (e) => {
        isJoystickActive = true;
        handleJoystickMove(e.touches[0]);
        // 开始持续检测方向
        joystickInterval = setInterval(() => {
            if (joystickDirection) {
                handleTouchControl(joystickDirection);
            }
        }, 100); // 每100ms检测一次方向
    });
    
    // 触摸移动事件
    joystickContainer.addEventListener('touchmove', (e) => {
        if (isJoystickActive) {
            handleJoystickMove(e.touches[0]);
        }
    });
    
    // 触摸结束事件
    joystickContainer.addEventListener('touchend', () => {
        resetJoystick();
    });
    
    // 触摸离开事件
    joystickContainer.addEventListener('touchleave', () => {
        resetJoystick();
    });
}

// 处理摇杆移动
function handleJoystickMove(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // 计算触摸点相对于摇杆中心的偏移
    let deltaX = touchX - centerX;
    let deltaY = touchY - centerY;
    
    // 计算距离
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2;
    
    // 限制摇杆移动范围
    if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        deltaX *= ratio;
        deltaY *= ratio;
    }
    
    // 更新摇杆位置
    joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // 计算方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平方向
        joystickDirection = deltaX > 0 ? 'right' : 'left';
    } else {
        // 垂直方向
        joystickDirection = deltaY > 0 ? 'down' : 'up';
    }
}

// 添加鼠标事件支持，方便在电脑上测试
function initJoystickMouseSupport() {
    // 鼠标按下事件
    joystickContainer.addEventListener('mousedown', (e) => {
        isJoystickActive = true;
        handleJoystickMove(e);
        // 开始持续检测方向
        joystickInterval = setInterval(() => {
            if (joystickDirection) {
                handleTouchControl(joystickDirection);
            }
        }, 100); // 每100ms检测一次方向
    });
    
    // 鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (isJoystickActive) {
            handleJoystickMove(e);
        }
    });
    
    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
        resetJoystick();
    });
    
    // 鼠标离开事件
    document.addEventListener('mouseleave', () => {
        resetJoystick();
    });
}

// 初始化鼠标支持
initJoystickMouseSupport();

// 重置摇杆
function resetJoystick() {
    isJoystickActive = false;
    joystickDirection = null;
    joystickStick.style.transform = 'translate(0, 0)';
    
    if (joystickInterval) {
        clearInterval(joystickInterval);
        joystickInterval = null;
    }
}

// 初始化虚拟摇杆
initJoystick();

// 模态框事件监听器
closeModal.addEventListener('click', closeLeaderboard);
window.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
        closeLeaderboard();
    }
});

// 初始化游戏
initGame();

// 窗口大小改变时调整画布大小
window.addEventListener('resize', resizeCanvas);

// 初始调整画布大小
resizeCanvas();