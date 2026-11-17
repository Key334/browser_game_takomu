const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI要素
const levelText = document.getElementById('levelText');
const gaugeBar = document.getElementById('gaugeBar');
const tapCountEl = document.getElementById('tapCount');
const feverBanner = document.getElementById('feverBanner');
const soundBtn = document.getElementById('soundBtn');
const feedBtn = document.getElementById('feedBtn');
const spinBtn = document.getElementById('spinBtn');
const inkBtn = document.getElementById('inkBtn');

// 画面サイズ管理
let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// Web Audio API サウンドエンジン
let audioCtx = null;
let isSoundOn = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isSoundOn = !isSoundOn;
  soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
  if (isSoundOn) {
    initAudio();
    playSound('bubble');
  }
});

function playSound(type) {
  if (!isSoundOn) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'puni') {
    // ぷにっ！という弾む音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'bubble') {
    // 水中のぽわん音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.start(now);
    osc.stop(now + 0.13);
  } else if (type === 'spin') {
    // くるりん音
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.25);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  } else if (type === 'ink') {
    // ぷしゅー噴射音
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.32);
  } else if (type === 'eat') {
    // もぐもぐ音
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.setValueAtTime(560, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'fever') {
    // フィーバーファンファーレ
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.connect(g);
      g.connect(audioCtx.destination);
      const t = now + idx * 0.07;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t);
      o.stop(t + 0.25);
    });
  }
}

// ゲーム状態管理
const state = {
  taps: 0,
  level: 1,
  gauge: 0,
  maxGauge: 100,
  fever: false,
  feverTimer: 0,
  time: 0
};

// タコさんのキャラクターデータ
const octopus = {
  x: width * 0.5,
  y: height * 0.48,
  vx: 0,
  vy: 0,
  targetX: null,
  targetY: null,
  baseRadius: Math.min(width, height) * 0.18,
  scaleX: 1,
  scaleY: 1,
  scaleVelX: 0,
  scaleVelY: 0,
  rotation: 0,
  spinRemaining: 0,
  expression: 'normal', // 'normal', 'happy', 'surprised', 'bliss'
  expressionTimer: 0,
  blinkTimer: 180,
  isBlinking: false
};

// エフェクト用配列
const bubbles = [];
const ripples = [];
const particles = [];
const inkClouds = [];
const foods = [];

// 背景の泡を初期配置
for (let i = 0; i < 24; i++) {
  bubbles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 3 + Math.random() * 9,
    speed: 0.4 + Math.random() * 0.9,
    wobble: Math.random() * Math.PI * 2,
    alpha: 0.15 + Math.random() * 0.25
  });
}

// UI更新
function addGauge(amount) {
  state.taps++;
  tapCountEl.textContent = state.taps;

  if (state.fever) return;

  state.gauge += amount;
  if (state.gauge >= state.maxGauge) {
    state.gauge = state.maxGauge;
    startFever();
  }
  gaugeBar.style.width = `${(state.gauge / state.maxGauge) * 100}%`;
}

function startFever() {
  state.fever = true;
  state.feverTimer = 420; // 約7秒間
  state.level++;
  levelText.textContent = `ふよふよ Lv.${state.level}`;
  feverBanner.classList.add('active');
  playSound('fever');

  // 周囲にハートやキラキラを大量放出
  for (let i = 0; i < 22; i++) {
    spawnParticle(
      octopus.x + (Math.random() - 0.5) * 120,
      octopus.y + (Math.random() - 0.5) * 120,
      Math.random() > 0.5 ? '❤️' : '✨'
    );
  }
}

function endFever() {
  state.fever = false;
  state.gauge = 0;
  gaugeBar.style.width = '0%';
  feverBanner.classList.remove('active');
}

// パーティクル生成
function spawnParticle(x, y, symbol) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
  const speed = 1.5 + Math.random() * 2.8;
  particles.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    symbol,
    size: 18 + Math.random() * 10,
    alpha: 1,
    life: 65 + Math.random() * 25
  });
}

// 波紋生成
function spawnRipple(x, y) {
  ripples.push({
    x,
    y,
    r: 8,
    maxR: 75,
    alpha: 0.65
  });
}

// タコさんのぷにっとバウンス
function squishOctopus(sx, sy, expr = 'happy', duration = 55) {
  octopus.scaleX = sx;
  octopus.scaleY = sy;
  octopus.scaleVelX = 0;
  octopus.scaleVelY = 0;
  octopus.expression = expr;
  octopus.expressionTimer = duration;
}

// アクション：タコさんを直接タップ
function interactWithOctopus(tapX, tapY) {
  playSound('puni');
  addGauge(14);

  // タップ位置に応じて少し跳ねる
  const dx = octopus.x - tapX;
  const dy = octopus.y - tapY;
  octopus.vx += dx * 0.04;
  octopus.vy += dy * 0.04 - 2.2;

  squishOctopus(1.28, 0.74, state.fever ? 'bliss' : 'happy', 60);

  const symbols = state.fever ? ['💖', '✨', '🌟', '🎵'] : ['💕', '♪', '🫧', '✨'];
  for (let i = 0; i < 4; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    spawnParticle(tapX + (Math.random() - 0.5) * 30, tapY - 10, sym);
  }
}

// アクション：エサをまく
feedBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('bubble');
  const margin = 70;
  const fx = margin + Math.random() * (width - margin * 2);
  const fy = margin + Math.random() * (height * 0.65);
  foods.push({
    x: fx,
    y: fy,
    vy: 0.4,
    wobble: Math.random() * Math.PI * 2,
    size: 26
  });
  spawnRipple(fx, fy);
});

// アクション：くるりん回転
spinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('spin');
  addGauge(10);
  octopus.spinRemaining += Math.PI * 2;
  octopus.vy -= 2.5;
  squishOctopus(0.82, 1.22, 'bliss', 70);
  for (let i = 0; i < 6; i++) {
    spawnParticle(octopus.x, octopus.y, '✨');
  }
});

// アクション：ぷしゅー（タコ墨ジェット）
inkBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playSound('ink');
  addGauge(12);
  octopus.vy = -8.5;
  octopus.vx += (Math.random() - 0.5) * 4;
  squishOctopus(0.75, 1.32, 'surprised', 65);

  // タコ墨雲を生成
  for (let i = 0; i < 7; i++) {
    inkClouds.push({
      x: octopus.x + (Math.random() - 0.5) * 35,
      y: octopus.y + octopus.baseRadius * 0.65,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 1.2 + Math.random() * 2.2,
      r: 14 + Math.random() * 18,
      alpha: 0.85
    });
  }
});

// キャンバス上のタップ／クリック判定
function handlePointerDown(clientX, clientY) {
  initAudio();
  const dist = Math.hypot(clientX - octopus.x, clientY - octopus.y);
  const hitRadius = octopus.baseRadius * 1.25;

  if (dist <= hitRadius) {
    interactWithOctopus(clientX, clientY);
  } else {
    // 海の別の場所をタップ -> 波紋を出してタコさんが寄ってくる
    playSound('bubble');
    spawnRipple(clientX, clientY);
    octopus.targetX = clientX;
    octopus.targetY = Math.min(Math.max(clientY, 110), height - 130);
    for (let i = 0; i < 3; i++) {
      bubbles.push({
        x: clientX + (Math.random() - 0.5) * 20,
        y: clientY + (Math.random() - 0.5) * 20,
        r: 4 + Math.random() * 6,
        speed: 1.2 + Math.random() * 1.2,
        wobble: Math.random() * Math.PI * 2,
        alpha: 0.5
      });
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  handlePointerDown(e.clientX, e.clientY);
});

// 添付画像のタコさんを描画する精巧なベクター関数
function drawOctopus(ctx, x, y, radius, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(octopus.rotation);

  // ふよふよ呼吸アニメーション＋弾性スケール
  const breathX = 1 + Math.sin(time * 0.045) * 0.04;
  const breathY = 1 + Math.cos(time * 0.045) * 0.04;
  ctx.scale(octopus.scaleX * breathX, octopus.scaleY * breathY);

  // 正規化座標（元画像のプロポーションを忠実に再現）
  // 基準サイズ: 200x200 相当の座標系を radius にスケーリング
  const s = radius / 95;
  ctx.scale(s, s);

  const lineWidth = 13.5;
  const strokeColor = '#0c0c0c';
  const bodyColor = state.fever ? '#ffd6eb' : '#ffe6f2';

  // 耳と頭の揺れ
  const earWaveL = Math.sin(time * 0.06) * 4;
  const earWaveR = Math.cos(time * 0.06 + 0.5) * 4;
  // 足のふよふよ波打ち
  const legWave1 = Math.sin(time * 0.07) * 5;
  const legWave2 = Math.cos(time * 0.075) * 5;
  const legWave3 = Math.sin(time * 0.08 + 1.0) * 5;

  // --- 1. タコの体・耳・足の輪郭パス ---
  ctx.beginPath();

  // 頭頂部のくぼみから右耳へ
  ctx.moveTo(-14, -36);
  ctx.quadraticCurveTo(2, -41, 16, -45);

  // 右耳（丸いメンダコ耳）
  ctx.bezierCurveTo(
    12, -78 + earWaveR,
    38, -96 + earWaveR,
    54, -84 + earWaveR
  );
  ctx.bezierCurveTo(
    68, -72 + earWaveR,
    66, -42 + earWaveR,
    46, -30
  );

  // 右側面から一番右の跳ねた足へ
  ctx.bezierCurveTo(
    56, -12,
    60, 8,
    63, 24 + legWave1 * 0.4
  );
  // 一番右のくるんと跳ねた足先
  ctx.bezierCurveTo(
    74, 26 + legWave1,
    84, 18 + legWave1,
    88, 22 + legWave1
  );
  ctx.bezierCurveTo(
    93, 30 + legWave1,
    90, 56 + legWave1,
    72, 65 + legWave1 * 0.7
  );
  ctx.bezierCurveTo(
    58, 71 + legWave1 * 0.5,
    46, 62 + legWave2 * 0.5,
    40, 58 + legWave2 * 0.5
  );

  // 中央右のぷっくりした足
  ctx.bezierCurveTo(
    36, 73 + legWave2,
    18, 76 + legWave2,
    10, 62 + legWave3 * 0.5
  );

  // 中央左のぷっくりした足
  ctx.bezierCurveTo(
    2, 82 + legWave3,
    -24, 82 + legWave3,
    -32, 62 + legWave2 * 0.5
  );

  // 一番左のくるんと跳ねた足
  ctx.bezierCurveTo(
    -42, 74 + legWave1,
    -68, 72 + legWave1,
    -74, 52 + legWave1
  );
  ctx.bezierCurveTo(
    -78, 38 + legWave1,
    -72, 26 + legWave1,
    -65, 29 + legWave1
  );
  ctx.bezierCurveTo(
    -58, 32 + legWave1 * 0.5,
    -53, 32,
    -53, 24
  );

  // 左側面から左耳へ
  ctx.bezierCurveTo(
    -55, 6,
    -51, -12,
    -45, -24
  );

  // 左耳（少し大きめの丸いメンダコ耳）
  ctx.bezierCurveTo(
    -66, -36 + earWaveL,
    -68, -72 + earWaveL,
    -52, -86 + earWaveL
  );
  ctx.bezierCurveTo(
    -36, -98 + earWaveL,
    -8, -80 + earWaveL,
    -14, -36
  );

  ctx.closePath();

  // 塗りつぶしと太い黒アウトライン
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  // フィーバー時のほっぺピンク
  if (state.fever || octopus.expression === 'happy' || octopus.expression === 'bliss') {
    ctx.fillStyle = 'rgba(255, 130, 175, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-42, 26, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(45, 22, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 2. 特徴的な2つの目を描画 ---
  drawOctopusEye(ctx, -33, 6, 19, 17, -0.16, true);
  drawOctopusEye(ctx, 32, -2, 20, 18, -0.14, false);

  ctx.restore();
}

// 目の描画（イラストの眠たげな横線入りの目＋表情変化）
function drawOctopusEye(ctx, ex, ey, rx, ry, tilt, isLeft) {
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(tilt);

  // 白目部分
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 10.5;
  ctx.strokeStyle = '#0c0c0c';
  ctx.stroke();

  // 表情に応じた瞳・まぶたの描写
  ctx.lineWidth = 9.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0c0c0c';

  if (octopus.isBlinking) {
    // まばたき
    ctx.beginPath();
    ctx.moveTo(-rx + 2, 1);
    ctx.lineTo(rx - 2, 1);
    ctx.stroke();
  } else if (octopus.expression === 'happy' || octopus.expression === 'bliss') {
    // にっこりアーチ目
    ctx.beginPath();
    ctx.arc(0, 3, rx * 0.58, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (octopus.expression === 'surprised') {
    // びっくり丸目
    ctx.fillStyle = '#0c0c0c';
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.38, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // デフォルト：イラスト通りの斜め横一文字のジト目（メンダコ瞳孔）
    ctx.beginPath();
    ctx.moveTo(-rx + 2, 1);
    ctx.lineTo(rx - 2, -1);
    ctx.stroke();
  }

  ctx.restore();
}

// エビ（エサ）の描画
function drawShrimp(ctx, x, y, size, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 0.1) * 0.25);
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🦐', 0, 0);
  ctx.restore();
}

// メインアニメーションループ
function updateAndDraw() {
  state.time++;
  // 背景は透明にして、CSSの青いグラデーションを見せる
  ctx.clearRect(0, 0, width, height);

  // フィーバー時は色を薄く重ねて、きらめく海にする
  if (state.fever) {
      const hueShift = Math.sin(state.time * 0.05) * 12;
      ctx.fillStyle = `hsla(${190 + hueShift}, 90%, 60%, 0.28)`;
      ctx.fillRect(0, 0, width, height);
    }
  
    // 海中の光差し込み（やさしいグラデーション）
    const grad = ctx.createRadialGradient(
      width * 0.5, height * 0.15, 20,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'rgba(200, 250, 255, 0.35)');
    grad.addColorStop(1, 'rgba(6, 74, 138, 0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

  // フィーバータイマー進行
  if (state.fever) {
    state.feverTimer--;
    if (state.time % 18 === 0) {
      spawnParticle(
        Math.random() * width,
        height * 0.75,
        Math.random() > 0.5 ? '💖' : '✨'
      );
    }
    if (state.feverTimer <= 0) {
      endFever();
    }
  }

  // 1. 背景の泡の更新と描画
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y -= b.speed;
    b.wobble += 0.04;
    const bx = b.x + Math.sin(b.wobble) * 6;

    if (b.y < -20) {
      b.y = height + 20;
      b.x = Math.random() * width;
    }

    ctx.beginPath();
    ctx.arc(bx, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha + 0.15})`;
    ctx.stroke();
  }

  // 2. 波紋の更新と描画
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i];
    rp.r += 2.2;
    rp.alpha -= 0.016;
    if (rp.alpha <= 0) {
      ripples.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(255, 255, 255, ${rp.alpha})`;
    ctx.stroke();
  }

  // 3. タコ墨雲の更新と描画
  for (let i = inkClouds.length - 1; i >= 0; i--) {
    const ink = inkClouds[i];
    ink.x += ink.vx;
    ink.y += ink.vy;
    ink.r += 0.35;
    ink.alpha -= 0.012;
    if (ink.alpha <= 0) {
      inkClouds.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(ink.x, ink.y, ink.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(18, 22, 28, ${ink.alpha})`;
    ctx.fill();
  }

  // 4. エサ（エビ）の更新と描画
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.wobble += 0.05;
    f.x += Math.sin(f.wobble) * 0.6;
    f.y += f.vy;

    // タコさんがエサを自動的に追いかける
    if (i === 0) {
      octopus.targetX = f.x;
      octopus.targetY = f.y;
    }

    drawShrimp(ctx, f.x, f.y, f.size, state.time);

    // タコさんがエサを食べた判定
    const distToFood = Math.hypot(octopus.x - f.x, octopus.y - f.y);
    if (distToFood < octopus.baseRadius * 0.85) {
      foods.splice(i, 1);
      octopus.targetX = null;
      octopus.targetY = null;
      playSound('eat');
      addGauge(18);
      squishOctopus(1.25, 0.8, 'bliss', 65);
      for (let k = 0; k < 5; k++) {
        spawnParticle(f.x, f.y, '😋');
      }
      continue;
    }

    if (f.y > height + 30) {
      foods.splice(i, 1);
    }
  }

  // 5. タコさんのふよふよ浮遊・移動物理演算
  octopus.baseRadius = Math.max(68, Math.min(width, height) * 0.18);

  // 目的地がある場合、ゆるやかに泳いで近づく
  if (octopus.targetX !== null && octopus.targetY !== null) {
    const dx = octopus.targetX - octopus.x;
    const dy = octopus.targetY - octopus.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 12) {
      octopus.vx += (dx / dist) * 0.24;
      octopus.vy += (dy / dist) * 0.24;
    } else {
      octopus.targetX = null;
      octopus.targetY = null;
    }
  }

  // 自然な海中のふよふよ漂い力
  const floatForceX = Math.sin(state.time * 0.018) * 0.06;
  const floatForceY = Math.cos(state.time * 0.024) * 0.08;
  octopus.vx += floatForceX;
  octopus.vy += floatForceY;

  // 画面中央付近へゆるやかに戻る復元力（画面外に出ないよう保護）
  const safeTop = 110;
  const safeBottom = height - 135;
  const safeLeft = octopus.baseRadius + 20;
  const safeRight = width - octopus.baseRadius - 20;

  if (octopus.x < safeLeft) octopus.vx += 0.35;
  if (octopus.x > safeRight) octopus.vx -= 0.35;
  if (octopus.y < safeTop) octopus.vy += 0.35;
  if (octopus.y > safeBottom) octopus.vy -= 0.35;

  // 速度減衰（水の抵抗）
  octopus.vx *= 0.93;
  octopus.vy *= 0.93;
  octopus.x += octopus.vx;
  octopus.y += octopus.vy;

  // くるりん回転アニメーション
  if (octopus.spinRemaining > 0) {
    const step = Math.min(octopus.spinRemaining, 0.24);
    octopus.rotation += step;
    octopus.spinRemaining -= step;
    if (octopus.spinRemaining <= 0) {
      octopus.rotation = 0;
    }
  } else {
    // 移動速度に応じた微妙な傾き
    octopus.rotation = octopus.vx * 0.035;
  }

  // ぷにぷにバネ弾性の復元
  const springK = 0.14;
  const damping = 0.76;
  octopus.scaleVelX += (1 - octopus.scaleX) * springK;
  octopus.scaleVelY += (1 - octopus.scaleY) * springK;
  octopus.scaleVelX *= damping;
  octopus.scaleVelY *= damping;
  octopus.scaleX += octopus.scaleVelX;
  octopus.scaleY += octopus.scaleVelY;

  // 表情・まばたきタイマー管理
  if (octopus.expressionTimer > 0) {
    octopus.expressionTimer--;
    if (octopus.expressionTimer <= 0) {
      octopus.expression = 'normal';
    }
  }

  octopus.blinkTimer--;
  if (octopus.blinkTimer <= 0) {
    octopus.isBlinking = true;
    if (octopus.blinkTimer <= -8) {
      octopus.isBlinking = false;
      octopus.blinkTimer = 140 + Math.floor(Math.random() * 140);
    }
  }

  // タコさん本体の描画
  drawOctopus(ctx, octopus.x, octopus.y, octopus.baseRadius, state.time);

  // 6. ハート・キラキラパーティクルの更新と描画
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.02; // ふわっと上昇
    p.life--;
    p.alpha = Math.min(1, p.life / 25);

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.symbol, p.x, p.y);
    ctx.restore();
  }

  requestAnimationFrame(updateAndDraw);
}

// ゲーム開始
updateAndDraw();
