<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Of Us · Cyberpunk Racing</title>
    <!-- Import Google Font for Cyberpunk look -->
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
    <!-- Three.js CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        :root {
            --neon-blue: #00f3ff;
            --neon-pink: #ff00ff;
            --neon-purple: #bc13fe;
            --bg-dark: #050510;
        }

        * {
            box-sizing: border-box;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            margin: 0;
            overflow: hidden;
            background-color: var(--bg-dark);
            font-family: 'Orbitron', sans-serif;
            color: white;
            touch-action: none; /* Prevent scroll on mobile */
        }

        #game-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 1;
        }

        /* UI OVERLAY */
        #ui-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            pointer-events: none; /* Let clicks pass through to controls if needed */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* HEADER / SCORE */
        .hud-header {
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
        }

        .score-box {
            text-align: right;
        }

        .score-label {
            font-size: 0.8rem;
            color: var(--neon-blue);
            letter-spacing: 2px;
        }

        .score-val {
            font-size: 2rem;
            font-weight: 900;
            text-shadow: 0 0 10px var(--neon-blue);
        }

        .artist-credit {
            font-size: 0.9rem;
            color: var(--neon-pink);
            text-shadow: 0 0 5px var(--neon-pink);
            border-left: 3px solid var(--neon-purple);
            padding-left: 10px;
        }

        .artist-credit span {
            display: block;
            font-size: 1.2rem;
            font-weight: bold;
            color: white;
        }

        /* MENUS */
        .menu-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(5, 5, 16, 0.85);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            z-index: 20;
            transition: opacity 0.3s;
        }

        .hidden {
            opacity: 0;
            pointer-events: none;
        }

        h1 {
            font-size: 3rem;
            text-transform: uppercase;
            margin: 0;
            background: linear-gradient(90deg, var(--neon-blue), var(--neon-pink));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow: 0 0 20px rgba(188, 19, 254, 0.5);
            text-align: center;
            line-height: 1;
        }

        h2 {
            font-size: 1rem;
            color: white;
            letter-spacing: 4px;
            margin-bottom: 30px;
            opacity: 0.8;
            text-align: center;
        }

        .upload-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            width: 90%;
            max-width: 400px;
            margin-bottom: 30px;
        }

        .upload-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--neon-blue);
            padding: 15px;
            border-radius: 8px;
            color: var(--neon-blue);
            font-family: 'Orbitron', sans-serif;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            text-align: center;
            transition: 0.3s;
        }

        .upload-btn:hover {
            background: rgba(0, 243, 255, 0.1);
            box-shadow: 0 0 15px var(--neon-blue);
        }

        .upload-btn input {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
        }
        
        .upload-btn.locked {
            border-color: var(--neon-purple);
            color: var(--neon-purple);
            pointer-events: none;
            background: rgba(188, 19, 254, 0.1);
        }

        .file-status {
            font-size: 0.7rem;
            color: white;
            display: block;
            margin-top: 5px;
        }

        .start-btn {
            background: var(--neon-pink);
            color: white;
            border: none;
            padding: 15px 50px;
            font-size: 1.5rem;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 0 20px var(--neon-pink);
            text-transform: uppercase;
            transition: transform 0.1s;
        }
        
        .start-btn:disabled {
            background: #555;
            box-shadow: none;
            cursor: not-allowed;
            opacity: 0.5;
        }

        .start-btn:active {
            transform: scale(0.95);
        }

        /* TOUCH CONTROLS */
        .controls-area {
            width: 100%;
            height: 200px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            pointer-events: auto;
            margin-bottom: 20px;
        }

        .dpad-btn {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid var(--neon-blue);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: white;
            backdrop-filter: blur(4px);
            transition: 0.1s;
        }
        
        .dpad-btn:active {
            background: var(--neon-blue);
            color: black;
            box-shadow: 0 0 20px var(--neon-blue);
        }

        /* GAME OVER MODAL */
        #game-over-screen {
            z-index: 30;
        }
        
        .final-score {
            font-size: 4rem;
            color: var(--neon-purple);
            text-shadow: 0 0 30px var(--neon-purple);
            margin: 20px 0;
        }

        .lane-guide {
            position: absolute;
            bottom: 30%;
            width: 100%;
            display: flex;
            justify-content: center;
            opacity: 0.2;
            pointer-events: none;
        }
        .lane-guide div {
            width: 2px;
            height: 20px;
            background: var(--neon-blue);
            margin: 0 8vw;
            box-shadow: 0 0 10px var(--neon-blue);
        }

    </style>
</head>
<body>

    <!-- 3D Canvas Container -->
    <div id="game-container"></div>

    <!-- UI Overlay -->
    <div id="ui-layer">
        <div class="hud-header">
            <div class="artist-credit">
                Of Us
                <span>DELROGUE</span>
            </div>
            <div class="score-box">
                <div class="score-label">TIME ALIVE</div>
                <div class="score-val" id="hud-score">0.00</div>
            </div>
        </div>

        <!-- Lane Markers -->
        <div class="lane-guide">
            <div></div>
            <div></div>
        </div>

        <!-- Touch Controls -->
        <div class="controls-area" id="touch-controls">
            <div class="dpad-btn" id="btn-left">←</div>
            <div class="dpad-btn" id="btn-right">→</div>
        </div>
    </div>

    <!-- Start Menu -->
    <div id="start-screen" class="menu-screen">
        <h1>OF US</h1>
        <h2>CYBERPUNK RACING</h2>
        
        <div class="upload-grid">
            <!-- Audio - Auto Loaded -->
            <label class="upload-btn" id="btn-audio-wrapper">
                <span>🎵 Soundtrack</span>
                <span class="file-status" id="status-audio">Searching for 'Of Us'...</span>
                <!-- Fallback input if auto-load fails -->
                <input type="file" id="input-audio" accept="audio/*" style="display:none">
            </label>
            
            <label class="upload-btn">
                <span>📸 Player Image (You)</span>
                <span class="file-status" id="status-you">Default: Green Cube</span>
                <input type="file" id="input-you" accept="image/*">
            </label>

            <label class="upload-btn">
                <span>📸 Avoid Image (Ex)</span>
                <span class="file-status" id="status-ex">Default: Red Cube</span>
                <input type="file" id="input-ex" accept="image/*">
            </label>
        </div>

        <button class="start-btn" id="btn-start" disabled>LOADING...</button>
        <p style="margin-top:20px; font-size: 0.8rem; color: #888;">Avoid ALL memories (images). Use Arrow Keys or On-Screen buttons.</p>
    </div>

    <!-- Game Over Menu -->
    <div id="game-over-screen" class="menu-screen hidden">
        <h1>CRASHED</h1>
        <h2>THE MEMORIES CAUGHT UP</h2>
        <div class="final-score" id="final-score">0.00</div>
        <button class="start-btn" id="btn-restart">RESTART</button>
    </div>

<script>
    /**
     * OF US - CYBERPUNK RACING GAME
     * Powered by Three.js
     * Featuring "Of Us" by Delrogue
     */

    // --- CONFIGURATION ---
    const CONFIG = {
        laneWidth: 3.5,
        laneCount: 3,
        speedBase: 0.4,
        speedMax: 1.2,
        speedIncrement: 0.0001,
        obstacleSpawnRate: 60,
        colors: {
            road: 0x111111,
            grid: 0xff00ff,
            fog: 0x050510,
            car: 0x00f3ff
        },
        // CHANGED: Now using MP3 format which is safer for web
        audioFile: 'Of%20Us%20(dance).mp3' 
    };

    // --- GLOBAL VARIABLES ---
    let scene, camera, renderer;
    let playerCar, roadGrid, environmentParticles;
    let obstacles = [];
    let clock = new THREE.Clock();
    
    // Game State
    let isGameActive = false;
    let score = 0;
    let speed = CONFIG.speedBase;
    let frameCount = 0;
    let currentLane = 1; 
    let targetX = 0;

    // Assets
    const textureLoader = new THREE.TextureLoader();
    let textureYou = null;
    let textureEx = null;
    let audioContext, audioBuffer, audioSource, audioAnalyser, dataArray;
    let isAudioPlaying = false;

    // HTML Elements
    const hudScore = document.getElementById('hud-score');
    const finalScore = document.getElementById('final-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const btnStart = document.getElementById('btn-start');

    // --- INITIALIZATION ---
    function init() {
        // Scene Setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(CONFIG.colors.fog);
        scene.fog = new THREE.FogExp2(CONFIG.colors.fog, 0.03);

        // Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 3, 6);
        camera.lookAt(0, 0, -5);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('game-container').appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // --- WORLD GENERATION ---
        createRoad();
        createPlayerCar();
        createEnvironment();

        // --- EVENT LISTENERS ---
        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('keydown', onKeyDown);
        
        document.getElementById('btn-left').addEventListener('pointerdown', (e) => { e.preventDefault(); changeLane(-1); });
        document.getElementById('btn-right').addEventListener('pointerdown', (e) => { e.preventDefault(); changeLane(1); });

        document.getElementById('btn-start').addEventListener('click', startGame);
        document.getElementById('btn-restart').addEventListener('click', resetGame);
        
        setupFileInputs();
        
        // --- LOAD DEFAULT AUDIO ---
        loadDefaultTrack();

        animate();
    }

    // --- ASSET LOADING ---
    function loadDefaultTrack() {
        const statusEl = document.getElementById('status-audio');
        const wrapper = document.getElementById('btn-audio-wrapper');
        
        // Fetch the MP3 file
        fetch(CONFIG.audioFile)
            .then(response => {
                if (!response.ok) throw new Error("HTTP error " + response.status);
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                initAudio(arrayBuffer);
                statusEl.innerText = "Loaded: Of Us (Delrogue)";
                statusEl.style.color = "#00f3ff";
                wrapper.classList.add('locked'); // Lock input so they know it's ready
                btnStart.disabled = false;
                btnStart.innerText = "DRIVE";
            })
            .catch(err => {
                console.warn("Auto-load failed. User must upload.", err);
                statusEl.innerText = "Not found. Please upload MP3.";
                document.getElementById('input-audio').style.display = 'block';
                btnStart.disabled = false;
                btnStart.innerText = "DRIVE (NO MUSIC)";
            });
    }

    function setupFileInputs() {
        // Fallback Audio Upload
        document.getElementById('input-audio').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    initAudio(ev.target.result);
                    document.getElementById('status-audio').innerText = "Loaded: " + file.name;
                    document.getElementById('status-audio').style.color = "#00f3ff";
                    btnStart.innerText = "DRIVE";
                };
                reader.readAsArrayBuffer(file);
            }
        });

        // Image You
        document.getElementById('input-you').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    textureYou = textureLoader.load(ev.target.result);
                    document.getElementById('status-you').innerText = "Image Loaded!";
                    document.getElementById('status-you').style.color = "#00f3ff";
                };
                reader.readAsDataURL(file);
            }
        });

        // Image Ex
        document.getElementById('input-ex').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    textureEx = textureLoader.load(ev.target.result);
                    document.getElementById('status-ex').innerText = "Image Loaded!";
                    document.getElementById('status-ex').style.color = "#00f3ff";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function initAudio(arrayBuffer) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.decodeAudioData(arrayBuffer, function(buffer) {
            audioBuffer = buffer;
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 64;
            dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        });
    }

    function playAudio() {
        if (audioContext && audioBuffer) {
            // Resume context if suspended (browser autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            if (audioSource) audioSource.stop();
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.loop = true;
            audioSource.connect(audioAnalyser);
            audioAnalyser.connect(audioContext.destination);
            audioSource.start(0);
            isAudioPlaying = true;
        }
    }

    function stopAudio() {
        if (audioSource) {
            audioSource.stop();
            isAudioPlaying = false;
        }
    }

    // --- GAME OBJECTS ---
    function createRoad() {
        const geometry = new THREE.PlaneGeometry(200, 400, 40, 40);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff00ff, 
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        roadGrid = new THREE.Mesh(geometry, material);
        roadGrid.rotation.x = -Math.PI / 2;
        roadGrid.position.z = -100;
        scene.add(roadGrid);

        const floorGeo = new THREE.PlaneGeometry(200, 400);
        const floorMat = new THREE.MeshBasicMaterial({ color: 0x020205 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.position.z = -100;
        scene.add(floor);
    }

    function createPlayerCar() {
        playerCar = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 2.5);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 100 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        playerCar.add(body);

        const glowMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.car });
        const strip1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 2.55), glowMat);
        strip1.position.y = 0.3;
        playerCar.add(strip1);

        const cabinGeo = new THREE.BoxGeometry(1.0, 0.4, 1.2);
        const cabinMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.9, -0.2);
        playerCar.add(cabin);

        const engineGeo = new THREE.BoxGeometry(0.8, 0.2, 0.1);
        const engineMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(0, 0.6, 1.26);
        playerCar.add(engine);

        scene.add(playerCar);
    }

    function createEnvironment() {
        const geometry = new THREE.BufferGeometry();
        const count = 1000;
        const positions = new Float32Array(count * 3);
        for(let i = 0; i < count; i++) {
            positions[i*3] = (Math.random() - 0.5) * 100; 
            positions[i*3+1] = Math.random() * 30; 
            positions[i*3+2] = -Math.random() * 100 - 10; 
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
        environmentParticles = new THREE.Points(geometry, material);
        scene.add(environmentParticles);
    }

    function spawnObstacle() {
        const type = Math.random() > 0.5 ? 'you' : 'ex';
        let material;
        if (type === 'you' && textureYou) material = new THREE.MeshBasicMaterial({ map: textureYou });
        else if (type === 'ex' && textureEx) material = new THREE.MeshBasicMaterial({ map: textureEx });
        else material = new THREE.MeshPhongMaterial({ 
            color: type === 'you' ? 0x00ff00 : 0xff0000,
            emissive: type === 'you' ? 0x004400 : 0x440000
        });

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        const lane = Math.floor(Math.random() * 3);
        mesh.position.set((lane - 1) * CONFIG.laneWidth, 1, -80);
        mesh.userData = { active: true, lane: lane };
        scene.add(mesh);
        obstacles.push(mesh);
    }

    // --- GAMEPLAY LOGIC ---
    function changeLane(direction) {
        if (!isGameActive) return;
        const nextLane = currentLane + direction;
        if (nextLane >= 0 && nextLane < CONFIG.laneCount) {
            currentLane = nextLane;
            targetX = (currentLane - 1) * CONFIG.laneWidth;
        }
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowLeft') changeLane(-1);
        if (e.key === 'ArrowRight') changeLane(1);
    }

    function update() {
        if (!isGameActive) return;

        speed += CONFIG.speedIncrement;
        if(speed > CONFIG.speedMax) speed = CONFIG.speedMax;

        roadGrid.position.z += speed;
        if (roadGrid.position.z > -80) roadGrid.position.z = -100;

        // Music Visualizer
        if (isAudioPlaying && audioAnalyser) {
            audioAnalyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a,b)=>a+b,0) / dataArray.length;
            if(avg > 100) roadGrid.material.color.setHex(0xffffff);
            else roadGrid.material.color.setHex(CONFIG.colors.grid);
        }

        playerCar.position.x += (targetX - playerCar.position.x) * 0.1;
        playerCar.rotation.z = (targetX - playerCar.position.x) * -0.1;
        playerCar.position.y = 0.5 + Math.sin(clock.getElapsedTime() * 10) * 0.05;

        frameCount++;
        if (frameCount % Math.floor(CONFIG.obstacleSpawnRate / speed) === 0) spawnObstacle();

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let ob = obstacles[i];
            ob.position.z += speed;

            if (ob.position.z > -2 && ob.position.z < 2) {
                if (Math.abs(ob.position.x - playerCar.position.x) < 1.8) gameOver();
            }

            if (ob.position.z > 10) {
                scene.remove(ob);
                obstacles.splice(i, 1);
            }
        }

        score += speed * 0.1;
        hudScore.innerText = score.toFixed(2);
    }

    function render() {
        renderer.render(scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        update();
        render();
    }

    function startGame() {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        
        score = 0;
        speed = CONFIG.speedBase;
        frameCount = 0;
        currentLane = 1;
        targetX = 0;
        playerCar.position.x = 0;
        
        obstacles.forEach(ob => scene.remove(ob));
        obstacles = [];

        isGameActive = true;
        playAudio();
    }

    function gameOver() {
        isGameActive = false;
        finalScore.innerText = score.toFixed(2);
        gameOverScreen.classList.remove('hidden');
        stopAudio();
    }

    function resetGame() {
        startGame();
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    init();

</script>
</body>
</html>
