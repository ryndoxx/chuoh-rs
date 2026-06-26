// game.js
let currentQuestion = 0;
let score = 0;
const maxTime = 30; 
let timeLeft = maxTime;
let isActionLocked = false;
let isGameActive = false; 
let currentShuffledChoices = []; // 追加：シャッフルされた選択肢を保持
let shuffledQuizIndices = []; // 追加：問題の出題順を保持

let pixiApp = null;
let bgSprite = null;
let live2dModel = null;
let enemyModel = null;
let enemyAnimState = "none"; 

// 位置調整用の定数
const OTOME_POS_CENTER = 180; // スタート前・リザルト時の中央位置
const OTOME_POS_BATTLE = 320; // バトル中の位置

// リザルトモーション用のループタイマー変数
let winMotionInterval = null;

const enemyList = [
    "./models/enemy/enemy.model3.json"
];

window.onload = async function() {
    try {
        const VIRTUAL_WIDTH = 720;
        const VIRTUAL_HEIGHT = 1280;
        const gameContainer = document.getElementById("game-container");

        pixiApp = new PIXI.Application({
            width: VIRTUAL_WIDTH,
            height: VIRTUAL_HEIGHT,
            transparent: true,
            autoStart: true
        });

        pixiApp.view.style.width = "100%";
        pixiApp.view.style.height = "100%";
        gameContainer.appendChild(pixiApp.view);

        const bgTexture = PIXI.Texture.from('./city-bg.jpg');
        bgSprite = new PIXI.Sprite(bgTexture);
        bgSprite.width = VIRTUAL_WIDTH;
        bgSprite.height = VIRTUAL_HEIGHT * 0.625; 
        pixiApp.stage.addChild(bgSprite);

        await loadCharacters();

        pixiApp.ticker.add(() => {
            updateTimerFrame();
            updateEnemyAnim(); 
        });

    } catch (e) {
        console.error("初期化エラー:", e);
    }
};

async function loadCharacters() {
    try {
        live2dModel = await PIXI.live2d.Live2DModel.from("./models/otome/otome.model3.json");
        pixiApp.stage.addChild(live2dModel);
        live2dModel.x = OTOME_POS_CENTER; // 初期位置を中央に設定
        live2dModel.y = 360; 
        live2dModel.scale.set(0.45);

        if (live2dModel.internalModel && live2dModel.internalModel.motionManager) {
            live2dModel.internalModel.motionManager.groups.idle = "Idle";
        }

        enemyModel = await PIXI.live2d.Live2DModel.from(enemyList[0]);
        pixiApp.stage.addChild(enemyModel);
        enemyModel.x = -20;
        enemyModel.y = 420;
        enemyModel.scale.set(0.34);
        
        if (enemyModel.internalModel && enemyModel.internalModel.motionManager) {
            enemyModel.internalModel.motionManager.groups.idle = "Idle";
        }
        
        enemyModel.alphaFilter = new PIXI.filters.AlphaFilter(0);
        enemyModel.filters = [enemyModel.alphaFilter];
        enemyModel.visible = false;
        
    } catch(err) {
        console.warn("Live2Dモデルの読み込みエラー:", err);
    }
}

function startGame() {
    currentQuestion = 0;
    score = 0;
    timeLeft = maxTime;
    
    // --- ここから追加 ---
    shuffledQuizIndices = [];
    for (let i = 0; i < quizData.length; i++) {
        shuffledQuizIndices.push(i);
    }
    shuffledQuizIndices.sort(() => Math.random() - 0.5);
    // --- ここまで追加 ---

    if (live2dModel) {
        live2dModel.x = OTOME_POS_BATTLE; // バトル位置に移動
    }

    document.getElementById("score-val").innerText = score;
    document.getElementById("title-area").classList.add("hidden");
    document.getElementById("hud-area").classList.remove("hidden");
    document.getElementById("setup-action").classList.add("hidden");
    document.getElementById("battle-ui-wrapper").classList.remove("invisible-fixed");
    
    if (enemyModel) {
        enemyAnimState = "fadeIn"; 
    }

    isActionLocked = false;
    isGameActive = true; 
    showQuiz();
}

function showQuiz() {
    if (!isGameActive) return;

    document.getElementById("player-selected-text").innerHTML = "";

    // --- ここから書き換え ---
    // もし用意した問題数より多く回答が進んだら、再度シャッフルする
    if (currentQuestion > 0 && currentQuestion % quizData.length === 0) {
        shuffledQuizIndices.sort(() => Math.random() - 0.5);
    }
    const qIndex = shuffledQuizIndices[currentQuestion % quizData.length];
    const q = quizData[qIndex];
    // --- ここまで書き換え ---
    
    document.getElementById("quiz-word-target").innerHTML = 
        `${q.word.main}<br><span style="font-size: 0.8em;">${q.word.sub}</span>`;

    // 選択肢に「元の位置（originalIndex）」を紐付けてシャッフルする
    currentShuffledChoices = q.choices.map((choice, index) => {
        return { data: choice, originalIndex: index };
    });
    currentShuffledChoices.sort(() => Math.random() - 0.5);

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn, idx) => {
        // シャッフル後のテキストをボタンに表示
        btn.innerText = currentShuffledChoices[idx].data.main;
        btn.disabled = false;
    });

    isActionLocked = false; 
}

function updateEnemyAnim() {
    if (!enemyModel || !enemyModel.alphaFilter) return;

    const fadeSpeed = 0.05;

    if (enemyAnimState === "fadeIn") {
        enemyModel.visible = true;
        
        if (!enemyModel.filters) enemyModel.filters = [enemyModel.alphaFilter];
        
        enemyModel.alphaFilter.alpha += fadeSpeed;
        
        if (enemyModel.alphaFilter.alpha >= 1) {
            enemyModel.alphaFilter.alpha = 1;
            enemyAnimState = "none";
            enemyModel.filters = null; 
        }
    } else if (enemyAnimState === "fadeOut") {
        if (!enemyModel.filters) enemyModel.filters = [enemyModel.alphaFilter];
        
        enemyModel.alphaFilter.alpha -= fadeSpeed;
        
        if (enemyModel.alphaFilter.alpha <= 0) {
            enemyModel.alphaFilter.alpha = 0;
            enemyModel.visible = false;
            enemyAnimState = "none";
        }
    }
}

function updateTimerFrame() {
    if (!isGameActive) return;

    const elapsedSeconds = pixiApp.ticker.elapsedMS / 1000;
    timeLeft -= elapsedSeconds;

    if (timeLeft <= 0) {
        timeLeft = 0;
        document.getElementById("timer-val").innerText = "0.0";
        document.getElementById("time-bar-fill").style.width = "0%";
        handleTimeOut(); 
    } else {
        document.getElementById("timer-val").innerText = timeLeft.toFixed(1);
        const pct = (timeLeft / maxTime) * 100;
        document.getElementById("time-bar-fill").style.width = `${pct}%`;
    }
}

function selectAnswer(idx) {
    if (isActionLocked || !isGameActive) return;
    isActionLocked = true; 

    // --- ここから書き換え ---
    const qIndex = shuffledQuizIndices[currentQuestion % quizData.length];
    const q = quizData[qIndex];
    // --- ここまで書き換え ---
    
    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach(btn => btn.disabled = true);

    // シャッフルされた配列から、プレイヤーが選んだデータを取得
    const selected = currentShuffledChoices[idx];

    document.getElementById("player-selected-text").innerHTML = 
        `${selected.data.main}<br><span style="font-size: 0.7em;">${selected.data.sub}</span>`;

    // 選んだ選択肢の「元の位置」が、正解データ（q.correct）と一致しているか判定
    if (selected.originalIndex === q.correct) {
        score++;
        document.getElementById("score-val").innerText = score;
        buttons[idx].classList.add("anim-correct");
        
        if (enemyModel) {
            enemyModel.internalModel.motionManager.stopAllMotions();
            enemyModel.motion("Damage");
        }
        if (live2dModel) {
            live2dModel.internalModel.motionManager.stopAllMotions();
            live2dModel.motion("Attack");
        }
    } else {
        document.getElementById("quiz-word-box").classList.add("anim-incorrect");
        
        if (enemyModel) {
            enemyModel.internalModel.motionManager.stopAllMotions();
            enemyModel.motion("Attack");
        }
        if (live2dModel) {
            live2dModel.internalModel.motionManager.stopAllMotions();
            live2dModel.motion("Damage");
        }
    }

    setTimeout(() => {
        if (isGameActive) {
            buttons.forEach(btn => btn.classList.remove("anim-correct"));
            document.getElementById("quiz-word-box").classList.remove("anim-incorrect");
            
            currentQuestion++;
            showQuiz();
        }
    }, 500); 
}

function handleTimeOut() {
    isGameActive = false;
    isActionLocked = true;
    
    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach(btn => btn.disabled = true);
    
    document.getElementById("player-selected-text").innerText = "TIME UP!!";

    setTimeout(() => {
        endGame();
    }, 1000);
}

function endGame() { 
    document.getElementById("battle-ui-wrapper").classList.add("invisible-fixed");
    document.getElementById("hud-area").classList.add("hidden");
    document.getElementById("title-area").classList.remove("hidden");
    
    document.getElementById("result-action").classList.remove("hidden");
    document.getElementById("final-score").innerText = score; 

    if (live2dModel) {
        live2dModel.x = OTOME_POS_CENTER; // 中央に戻す
    }

    if (enemyModel) {
        enemyModel.visible = false;
        if (enemyModel.alphaFilter) {
            enemyModel.alphaFilter.alpha = 0;
        }
        enemyAnimState = "none";
    }

    if (live2dModel) {
        // リザルト移行後、即座にWinモーションを再生
        live2dModel.internalModel.motionManager.stopAllMotions();
        live2dModel.motion("Win");

        // 以降、8秒おきにループ再生
        winMotionInterval = setInterval(() => {
            live2dModel.internalModel.motionManager.stopAllMotions();
            live2dModel.motion("Win");
        }, 8000); 
    }
}

function backToSetup() { 
    document.getElementById("result-action").classList.add("hidden");
    document.getElementById("setup-action").classList.remove("hidden"); 

    if (winMotionInterval !== null) {
        clearInterval(winMotionInterval);
        winMotionInterval = null;
    }
    
    if (live2dModel) {
        live2dModel.internalModel.motionManager.stopAllMotions();
        live2dModel.x = OTOME_POS_CENTER; // タイトル画面でも中央を維持
    }
}