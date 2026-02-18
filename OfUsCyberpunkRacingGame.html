<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Of Us Cyberpunk Racing Game</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #050011;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            touch-action: none; /* Prevent pull-to-refresh on mobile */
        }
        canvas {
            display: block;
            width: 100%;
            height: 100vh;
        }
        #ui {
            position: absolute;
            top: 20px;
            left: 20px;
            color: #0ff;
            font-size: 24px;
            text-shadow: 0 0 10px #0ff;
            pointer-events: none;
            z-index: 10;
        }
        #speedometer {
            position: absolute;
            bottom: 20px;
            right: 20px;
            color: #f0f;
            font-size: 32px;
            font-weight: bold;
            text-shadow: 0 0 10px #f0f;
            text-align: right;
            pointer-events: none;
            z-index: 10;
        }
        #controls-hint {
            position: absolute;
            bottom: 20px;
            left: 20px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            pointer-events: none;
        }
        #game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            display: none;
            z-index: 20;
            background: rgba(0,0,0,0.8);
            padding: 40px;
            border: 2px solid #0ff;
            border-radius: 10px;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.2);
        }
        h1 { color: #fff; margin: 0 0 20px 0; font-size: 40px; text-shadow: 0 0 20px #f0f; }
        button {
            background: #f0f;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 20px;
            cursor: pointer;
            border-radius: 30px;
            text-transform: uppercase;
            font-weight: bold;
            box-shadow: 0 0 20px #f0f;
            transition: transform 0.1s;
        }
        button:active { transform: scale(0.95); }
    </style>
</head>
<body>

    <div id="ui">SCORE: <span id="score">0</span></div>
    <div id="speedometer"><span id="speed">0</span> KM/H</div>
    <div id="controls-hint">ARROWS / WASD to Steer<br>SHIFT to Boost</div>
    
    <div id="game-over">
        <h1>CRASHED!</h1>
        <p style="color: #ccc; margin-bottom: 30px;">FINAL SCORE: <span id="final-score">0</span></p>
        <button onclick="resetGame()">RACE AGAIN</button>
    </div>

    <canvas id="gameCanvas"></canvas>

<script>
/**
 * OF US CYBERPUNK RACING GAME
 * A retro-wave endless racer.
 */

// --- CONFIGURATION ---
const CFG = {
    roadWidth: 2000,
    segmentLength: 200,
    rumbleLength: 3,
    cameraHeight: 1000, // Camera height from ground
    drawDistance: 300,
    fieldOfView: 100,
    fogDensity: 5,
    colors: {
        road: '#0a0a2a',
        grass: '#050011',
        rumble: '#f0f',
        lane: '#0ff'
    }
};

// --- GAME STATE ---
let canvas, ctx;
let width, height;
let segments = [];
let obstacles = [];
let giants = []; // Background giant structures
let cameraX = 0;
let state = {
    speed: 0,
    playerX: 0,
    playerZ: 0,
    score: 0,
    gameOver: false,
    maxSpeed: 12000, // normalized speed units
    keys: {},
    touch: { active: false, x: 0, drift: false }
};

class GameEntity {
    constructor(z) {
        this.x = 0;
        this.y = 0;
        this.z = z;
        this.width = 0;
        this.height = 0;
    }
}

class Obstacle extends GameEntity {
    constructor() {
        super(0);
        this.reset();
        this.z = state.playerZ + 2000 + Math.random() * 5000;
    }

    reset() {
        this.type = Math.random() > 0.5 ? 1 : 2; // 1: Pillar, 2: Spikes
        // FIXED: Spawning range now covers full width plus a tiny bit of buffer
        // Range: -CFG.roadWidth to +CFG.roadWidth
        this.x = (Math.random() * CFG.roadWidth * 2.0) - CFG.roadWidth;
        this.y = 0; 
        this.width = 500; 
        this.height = 400;
        this.active = true;
    }

    update(dt) {
        // Recycle if passed
        if (this.z < state.playerZ - CFG.cameraHeight) {
            this.z = state.playerZ + CFG.drawDistance * CFG.segmentLength;
            this.reset();
        }
    }
}

class Giant extends GameEntity {
    constructor(side) {
        super(0);
        this.side = side; // -1 left, 1 right
        this.z = state.playerZ + Math.random() * 10000;
        this.active = true;
        this.meshType = Math.floor(Math.random() * 3);
    }
    
    update(dt) {
         if (this.z < state.playerZ - CFG.cameraHeight) {
            this.z = state.playerZ + CFG.drawDistance * CFG.segmentLength + Math.random() * 5000;
            this.meshType = Math.floor(Math.random() * 3);
         }
    }
}

// --- INIT ---
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d', { alpha: false });
    
    resize();
    window.addEventListener('resize', resize);
    
    // Inputs
    window.addEventListener('keydown', e => state.keys[e.key] = true);
    window.addEventListener('keyup', e => state.keys[e.key] = false);
    
    // Touch Inputs
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', () => { state.touch.active = false; state.touch.drift = false; });

    resetGame();
    requestAnimationFrame(loop);
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const halfWidth = width / 2;
    state.touch.active = true;
    // Normalize touch X from -1 to 1
    state.touch.x = (touch.clientX - halfWidth) / halfWidth;
    
    // Tap bottom area to drift/brake
    if (touch.clientY > height * 0.8) {
        state.touch.drift = true;
    } else {
        state.touch.drift = false;
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function resetGame() {
    state.speed = 0;
    state.playerX = 0;
    state.playerZ = 0;
    state.score = 0;
    state.gameOver = false;
    cameraX = 0;
    
    document.getElementById('game-over').style.display = 'none';
    
    // Build Road
    segments = [];
    for (let i = 0; i < 500; i++) {
        segments.push({
            p1: { x: 0, y: 0, z: i * CFG.segmentLength },
            p2: { x: 0, y: 0, z: (i + 1) * CFG.segmentLength },
            curve: Math.sin(i * 0.05) * 4, // Gentle curves
            y: Math.sin(i * 0.1) * 1000 // Rolling hills
        });
    }
    
    // Init Obstacles
    obstacles = [];
    for(let i=0; i<15; i++) {
        obstacles.push(new Obstacle());
        // Stagger initial positions
        obstacles[i].z += i * 1500;
    }

    // Init Giants
    giants = [];
    for(let i=0; i<10; i++) {
        let g = new Giant(i % 2 === 0 ? -1 : 1);
        g.z += i * 3000;
        giants.push(g);
    }
}

// --- MATH UTILS ---
// FIXED PROJECT FUNCTION: Properly handles visual projection
function project(p, cameraX, cameraY, cameraZ, width, height, roadWidth) {
    // cameraDepth (0.8) determines FOV/Scale. 
    // 0.8 is standard for Racer-style pseudo-3D
    const cameraDepth = 0.8; 
    
    let scale = cameraDepth / (p.z - cameraZ);
    
    let x = (1 + scale * (p.x - cameraX)) * width / 2;
    let y = (1 - scale * (p.y - cameraY)) * height / 2;
    let w = scale * roadWidth * width / 2;
    return { x, y, w, scale };
}

// --- UPDATE LOOP ---
let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

function update(dt) {
    if (state.gameOver) return;

    // Acceleration
    const maxSpeed = state.keys['Shift'] || state.touch.drift ? CFG.maxSpeed * 1.5 : CFG.maxSpeed;
    const accel = (state.keys['ArrowUp'] || state.keys['w'] || state.touch.active) ? 5000 : -2000;
    
    state.speed += accel * dt;
    state.speed = Math.max(0, Math.min(state.speed, maxSpeed));

    // Steering
    let steer = 0;
    if (state.keys['ArrowLeft'] || state.keys['a']) steer = -1;
    if (state.keys['ArrowRight'] || state.keys['d']) steer = 1;
    if (state.touch.active) steer = state.touch.x * 1.5;

    // Physics
    const speedRatio = state.speed / CFG.maxSpeed;
    state.playerX += steer * speedRatio * 4000 * dt;
    
    // FIXED: Clamp Player X (The Invisible Wall)
    // Ensures player cannot leave the road width entirely
    const limit = CFG.roadWidth - 200; 
    if (state.playerX < -limit) state.playerX = -limit;
    if (state.playerX > limit) state.playerX = limit;

    // Move forward
    state.playerZ += state.speed * dt;
    state.score += Math.floor(state.speed * dt * 0.1);

    // Update UI
    document.getElementById('score').innerText = Math.floor(state.score);
    document.getElementById('speed').innerText = Math.floor(state.speed / 100);

    // Camera follow
    cameraX = cameraX + (state.playerX - cameraX) * 5 * dt;

    // Update Entities
    [...obstacles, ...giants].forEach(e => e.update(dt));

    // Collision Detection
    checkCollisions();
}

function checkCollisions() {
    const playerZ = state.playerZ;
    // Simple hitbox approximation
    const hitZ = 200; 
    const hitX = 300; 

    obstacles.forEach(obs => {
        // Check Z depth overlap
        if (obs.z > playerZ && obs.z < playerZ + hitZ) {
            // Check X width overlap
            // obs.x is center, width is ~400
            let overlap = (state.playerX > obs.x - obs.width/2 - hitX) && 
                          (state.playerX < obs.x + obs.width/2 + hitX);
            
            if (overlap) {
                crash();
            }
        }
    });
}

function crash() {
    state.gameOver = true;
    state.speed = 0;
    document.getElementById('final-score').innerText = Math.floor(state.score);
    document.getElementById('game-over').style.display = 'block';
    
    // Shake effect
    canvas.style.transform = `translate(${Math.random()*20-10}px, ${Math.random()*20-10}px)`;
    setTimeout(() => canvas.style.transform = 'none', 500);
}

// --- RENDER LOOP ---
function draw() {
    ctx.fillStyle = CFG.colors.grass;
    ctx.fillRect(0, 0, width, height);

    // Dynamic background grid (Sun/Sky)
    drawBackground();

    // SAFETY CHECK: Ensure segments exist before trying to draw
    if (segments.length === 0) return;

    const baseSegment = Math.floor(state.playerZ / CFG.segmentLength);
    const playerPercent = (state.playerZ % CFG.segmentLength) / CFG.segmentLength;
    const playerY = Math.sin((baseSegment + playerPercent) * 0.1) * 1000;

    let maxY = height; // Clip bottom

    // Draw Road from back to front
    for (let n = 0; n < CFG.drawDistance; n++) {
        // Robust index calculation
        let idx = (baseSegment + n) % segments.length;
        if (idx < 0) idx += segments.length; // Handle potential negative modulo
        
        const segment = segments[idx];
        if (!segment) continue; // Safety check if segment doesn't exist

        const loopIdx = baseSegment + n;
        
        // Offset Z for infinite road illusion
        const segmentZ = loopIdx * CFG.segmentLength; 
        
        // Relative to camera
        const relZ = segmentZ - state.playerZ;
        if (relZ < 1) continue;

        // Curve calculation (accumulate)
        const currentCurve = segment.curve; 
        
        // Calculate next segment index safely
        let nextIdx = (idx + 1) % segments.length;
        if (nextIdx < 0) nextIdx += segments.length;
        const nextSegment = segments[nextIdx];

        if (!nextSegment) continue;

        // Use hardcoded camera height for projection Y offset (1500)
        const p1 = project(
            { x: -currentCurve * Math.pow(n, 2) * 0.1, y: segment.y - playerY, z: relZ }, 
            cameraX, 1500, 0, width, height, CFG.roadWidth
        );
        const p2 = project(
            { x: -currentCurve * Math.pow(n+1, 2) * 0.1, y: nextSegment.y - playerY, z: relZ + CFG.segmentLength }, 
            cameraX, 1500, 0, width, height, CFG.roadWidth
        );

        if (p1.y >= maxY) continue; // Behind hill

        drawSegment(ctx, width, height, p1, p2, idx);
        
        // Render Entities in this segment
        renderEntitiesInSegment(n, relZ, p1, p2, segment.y - playerY);
    }
    
    // Draw Player Car
    drawPlayer();
}

function drawBackground() {
    // Sun
    ctx.save();
    const sunY = height * 0.3;
    const gradient = ctx.createLinearGradient(0, 0, 0, height/2);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(1, "#20004a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height/2);

    ctx.beginPath();
    ctx.arc(width/2, sunY, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#f09';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#f09';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Grid lines on sun
    ctx.fillStyle = '#20004a';
    for(let i=0; i<10; i++) {
        ctx.fillRect(width/2 - 110, sunY - 80 + (i*14 + (Date.now()/50)%14), 220, 4);
    }
    ctx.restore();
}

function drawSegment(ctx, width, height, p1, p2, i) {
    const isLoop = Math.floor(i / 6) % 2;
    const laneColor = (Math.floor(i / 2) % 2) ? CFG.colors.lane : CFG.colors.road;
    
    // Ground
    ctx.fillStyle = isLoop ? '#0a001a' : '#050011';
    ctx.fillRect(0, p2.y, width, p1.y - p2.y);

    // Rumble Strips
    const r1 = p1.w * 1.2;
    const r2 = p2.w * 1.2;
    ctx.fillStyle = isLoop ? '#f0f' : '#000';
    ctx.beginPath();
    ctx.moveTo(p1.x - r1, p1.y);
    ctx.lineTo(p1.x + r1, p1.y);
    ctx.lineTo(p2.x + r2, p2.y);
    ctx.lineTo(p2.x - r2, p2.y);
    ctx.fill();

    // Road
    ctx.fillStyle = CFG.colors.road;
    ctx.beginPath();
    ctx.moveTo(p1.x - p1.w, p1.y);
    ctx.lineTo(p1.x + p1.w, p1.y);
    ctx.lineTo(p2.x + p2.w, p2.y);
    ctx.lineTo(p2.x - p2.w, p2.y);
    ctx.fill();

    // Lane marker
    if (isLoop) {
        const l1 = p1.w * 0.05;
        const l2 = p2.w * 0.05;
        ctx.fillStyle = laneColor;
        ctx.beginPath();
        ctx.moveTo(p1.x - l1, p1.y);
        ctx.lineTo(p1.x + l1, p1.y);
        ctx.lineTo(p2.x + l2, p2.y);
        ctx.lineTo(p2.x - l2, p2.y);
        ctx.fill();
    }
}

function renderEntitiesInSegment(n, relZ, p1, p2, segmentY) {
    // Render Obstacles
    obstacles.forEach(obs => {
        // If obstacle is within this segment's Z-range
        const obsRelZ = obs.z - state.playerZ;
        if (obsRelZ >= relZ && obsRelZ < relZ + CFG.segmentLength) {
            
            const scale = p1.scale;
            const spriteX = p1.x + (scale * obs.x * width/2);
            const spriteY = p1.y;
            const spriteW = obs.width * scale * width/2;
            const spriteH = obs.height * scale * width/2;

            ctx.save();
            ctx.translate(spriteX, spriteY);
            
            // Draw Neon Rock/Block
            ctx.fillStyle = '#000';
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#0ff';
            
            if (obs.type === 1) {
                // Triangle/Pyramid
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-spriteW/2, -spriteH);
                ctx.lineTo(spriteW/2, -spriteH);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                // Box
                ctx.fillRect(-spriteW/2, -spriteH, spriteW, spriteH);
                ctx.strokeRect(-spriteW/2, -spriteH, spriteW, spriteH);
                // X pattern
                ctx.beginPath();
                ctx.moveTo(-spriteW/2, -spriteH);
                ctx.lineTo(spriteW/2, 0);
                ctx.moveTo(spriteW/2, -spriteH);
                ctx.lineTo(-spriteW/2, 0);
                ctx.stroke();
            }

            ctx.restore();
        }
    });

    // Render Giants (Side scenery)
    giants.forEach(g => {
        const gRelZ = g.z - state.playerZ;
         if (gRelZ >= relZ && gRelZ < relZ + CFG.segmentLength) {
            const scale = p1.scale;
            // Place far to the side
            const offsetX = (CFG.roadWidth * 2.5) * g.side; 
            const spriteX = p1.x + (scale * offsetX * width/2);
            const spriteY = p1.y;
            const spriteSize = 2000 * scale * width/2;

            ctx.save();
            ctx.globalAlpha = Math.min(1, gRelZ / 10000); // Fade in distance
            ctx.translate(spriteX, spriteY);
            
            ctx.strokeStyle = '#f0f';
            ctx.lineWidth = 1;
            
            // Draw simple wireframe structures
            if (g.meshType === 0) {
                // Tower
                ctx.strokeRect(-spriteSize/4, -spriteSize, spriteSize/2, spriteSize);
            } else if (g.meshType === 1) {
                // Arch
                ctx.beginPath();
                ctx.arc(0, 0, spriteSize/2, Math.PI, 0);
                ctx.stroke();
            }
            ctx.restore();
         }
    });
}

function drawPlayer() {
    // Car bounce based on speed
    const bounce = Math.sin(Date.now() / 50) * (state.speed / CFG.maxSpeed) * 5;
    const carW = 120;
    const carH = 60;
    const carX = width / 2;
    const carY = height - 100 - bounce;

    ctx.save();
    ctx.translate(carX, carY);

    // Turning tilt
    let tilt = 0;
    if (state.keys['ArrowLeft'] || state.keys['a']) tilt = -0.1;
    if (state.keys['ArrowRight'] || state.keys['d']) tilt = 0.1;
    ctx.rotate(tilt);

    // Car Body (Back view)
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f0f';
    
    // Main chassis
    ctx.beginPath();
    ctx.moveTo(-carW/2, 0);
    ctx.lineTo(-carW/2, -carH/2);
    ctx.lineTo(-carW/4, -carH); // Roof left
    ctx.lineTo(carW/4, -carH);  // Roof right
    ctx.lineTo(carW/2, -carH/2);
    ctx.lineTo(carW/2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail lights
    ctx.shadowColor = '#f00';
    ctx.fillStyle = '#f00';
    ctx.fillRect(-carW/2 + 10, -20, 30, 10);
    ctx.fillRect(carW/2 - 40, -20, 30, 10);

    // License plate neon
    ctx.shadowColor = '#0ff';
    ctx.fillStyle = '#0ff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NEON', 0, -10);
    
    // Exhaust flame
    if (state.speed > 1000) {
        ctx.fillStyle = '#fa0';
        ctx.shadowColor = '#fa0';
        const flameSize = Math.random() * 20 + 10;
        ctx.beginPath();
        ctx.arc(-30, 5, flameSize/2, 0, Math.PI*2);
        ctx.arc(30, 5, flameSize/2, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}

// Start
init();

</script>
</body>
</html>
