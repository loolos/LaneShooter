/**
 * Main Game Class - Manages game state, entities, and game loop
 */
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        // Game state
        this.state = 'menu'; // menu, playing, dying, gameover, victory
        this.score = 0;
        this.level = 1;
        this.frameCount = 0;
        this.gameStartTime = 0; // Game start time in milliseconds
        this.elapsedTime = 0; // Elapsed time in seconds

        // Game entities
        this.player = null;
        this.enemies = [];
        this.powerups = [];
        this.xpTexts = []; // Floating XP text
        this.effects = []; // Visual effects
        this.levelUpText = null; // Level up text display
        this.upgradeFlash = null; // Upgrade flash effect { type: string, startTime: number, duration: number }
        this.gateSubtitle = null; // Gate subtitle display
        this.experienceBoostUntil = 0; // Experience boost expiry timestamp
        this.experienceMultiplier = 1; // Current experience multiplier
        this.laserLaneEffect = null; // Laser visual effect { laneIndex, startTime, duration }
        this.emptyScreenSince = null; // Timestamp when all lanes became empty

        // Systems
        this.audioManager = new AudioManager();
        this.audioManager.initializeDefaultSounds();
        this.audioManager.initializeMusic();
        this.currentMusicLevel = 1;
        this.hasCarrier = false;
        this.gateManager = typeof GateManager !== 'undefined' ? new GateManager() : null;
        
        // Performance testing system (only initialized if TestManager exists)
        this.testManager = null;
        if (typeof TestManager !== 'undefined') {
            this.testManager = new TestManager(this);
        }
        this.victoryShown = false; // Track if victory has been shown (only show once at level 20)
        this.victoryLocked = false; // Lock victory screen for 3 seconds
        this.carrierSpawnedAtLevels = new Set(); // Track which levels have spawned a carrier
        this.victoryParticles = []; // Victory screen particles
        this.victoryStars = []; // Victory screen stars
        this.victoryEnergyRings = []; // Victory screen energy rings
        this.victoryTime = 0; // Time since victory screen appeared
        this._gameOverTimeout = null; // Track gameOver delayed callback
        this._victoryLockTimeout = null; // Track victory lock timeout
        this._continueHandler = null; // Track victory continue handler for cleanup

        // Debug logging system
        this.lastLogTime = 0;
        this.logInterval = 5000; // Log every 5 seconds
        this.frameCountSinceLastLog = 0;
        this.lastLogFrameCount = 0;

        // Input handling
        this.keys = {};
        this.keysPressed = {}; // Track keys that were just pressed (not held)
        this.setupInputHandlers();

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.scoreToNextElement = document.getElementById('scoreToNext');
        this.levelElement = document.getElementById('level');
        this.timeElement = document.getElementById('time');
        this.upgradePanel = document.getElementById('upgradePanel');
        this.menuScreen = document.getElementById('menuScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.victoryScreen = document.getElementById('victoryScreen');
        this.finalScoreElement = document.getElementById('finalScore');
        this.victoryScoreElement = document.getElementById('victoryScore');

        // Setup UI handlers
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('restartButton').addEventListener('click', () => this.start());

        // Start game loop
        this.lastTime = 0;
        this.gameLoop(0);

        // Handle window resize for mobile
        window.addEventListener('resize', () => this.setupCanvas());
    }

    /**
     * Setup canvas size (responsive for mobile)
     */
    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        // Use container size for mobile, or fixed size for desktop
        const isMobile = window.innerWidth <= 900;

        if (isMobile) {
            // Mobile: use full container size
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
            // Update CONFIG for mobile
            CONFIG.CANVAS_WIDTH = containerRect.width;
            CONFIG.CANVAS_HEIGHT = containerRect.height;
            // Adjust lane positions for mobile (25% and 75% of width)
            CONFIG.LANE_POSITIONS = [
                containerRect.width * 0.25,
                containerRect.width * 0.75
            ];
        } else {
            // Desktop: use fixed size
            this.canvas.width = CONFIG.CANVAS_WIDTH;
            this.canvas.height = CONFIG.CANVAS_HEIGHT;
            // Reset to original lane positions
            CONFIG.LANE_POSITIONS = [200, 600];
        }

        // Update player position if game is running
        if (this.player && this.state === 'playing') {
            this.player.targetX = CONFIG.LANE_POSITIONS[this.player.laneIndex];
        }
    }

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const code = e.code.toLowerCase();

            // Track if key was just pressed (not already held)
            if (!this.keys[key]) {
                this.keysPressed[key] = true;
            }
            if (!this.keys[code]) {
                this.keysPressed[code] = true;
            }

            this.keys[key] = true;
            this.keys[code] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const code = e.code.toLowerCase();
            this.keys[key] = false;
            this.keys[code] = false;
            this.keysPressed[key] = false;
            this.keysPressed[code] = false;
        });

        // Touch and click input for mobile
        this.setupTouchHandlers();
    }

    /**
     * Setup touch and click handlers for mobile
     */
    setupTouchHandlers() {
        const canvas = this.canvas;

        // Prevent default touch behaviors
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

        // Handle touch on canvas - toggle lane on any tap
        canvas.addEventListener('touchstart', (e) => {
            if (this.state !== 'playing' || !this.player) return;
            e.preventDefault();
            // Toggle to next lane (cycle through lanes)
            const nextLaneIndex = (this.player.laneIndex + 1) % CONFIG.LANE_COUNT;
            this.player.laneIndex = nextLaneIndex;
            this.player.targetX = CONFIG.LANE_POSITIONS[this.player.laneIndex];
        }, { passive: false });

        // Also handle click on canvas for desktop testing
        canvas.addEventListener('click', (e) => {
            if (this.state !== 'playing' || !this.player) return;
            // Toggle to next lane (cycle through lanes)
            const nextLaneIndex = (this.player.laneIndex + 1) % CONFIG.LANE_COUNT;
            this.player.laneIndex = nextLaneIndex;
            this.player.targetX = CONFIG.LANE_POSITIONS[this.player.laneIndex];
        });
    }

    /**
     * Start new game
     */
    start() {
        // Cancel any pending delayed callbacks from previous game
        if (this._gameOverTimeout) {
            clearTimeout(this._gameOverTimeout);
            this._gameOverTimeout = null;
        }
        if (this._victoryLockTimeout) {
            clearTimeout(this._victoryLockTimeout);
            this._victoryLockTimeout = null;
        }
        if (this._continueHandler) {
            document.removeEventListener('keydown', this._continueHandler);
            document.removeEventListener('click', this._continueHandler);
            document.removeEventListener('touchstart', this._continueHandler);
            this._continueHandler = null;
        }

        // Ensure canvas is properly sized
        this.setupCanvas();

        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.frameCount = 0;
        this.gameStartTime = Date.now();
        this.elapsedTime = 0;
        this.enemies = [];
        this.powerups = [];
        this.xpTexts = [];
        this.effects = [];
        this.gateSubtitle = null;
        this.experienceBoostUntil = 0;
        this.experienceMultiplier = 1;
        this.laserLaneEffect = null;
        this.emptyScreenSince = null;
        this.currentMusicLevel = 1;
        this.hasCarrier = false;
        this.victoryShown = false;
        this.victoryLocked = false;
        this.victoryParticles = [];
        this.victoryStars = [];
        this.victoryEnergyRings = [];
        this.victoryTime = 0;
        this.carrierSpawnedAtLevels = new Set();

        // Start background music
        this.audioManager.unlockAudio();
        this.audioManager.startBackgroundMusic(this.level);

        // Create player in center of first lane
        const startX = CONFIG.LANE_POSITIONS[0];
        this.player = new Player(startX, CONFIG.PLAYER_Y);

        if (this.gateManager) {
            this.gateManager.reset(Date.now());
        }

        // Hide menus
        this.menuScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';

        this.updateUI();
    }

    /**
     * Game over
     */
    victory() {
        if (this.state === 'victory') return; // Prevent multiple calls

        this.state = 'victory';
        this.victoryScoreElement.textContent = Math.floor(this.score);
        this.victoryScreen.style.display = 'flex';
        this.victoryTime = 0;

        // Initialize victory animation particles
        this.initVictoryAnimation();

        // Play epic victory music
        this.audioManager.startVictoryMusic();

        // Lock screen for 3 seconds to prevent quick skipping
        this.victoryLocked = true;
        this._victoryLockTimeout = setTimeout(() => {
            this._victoryLockTimeout = null;
            this.victoryLocked = false;
        }, 3000);

        // Clean up previous continue handler if any
        if (this._continueHandler) {
            document.removeEventListener('keydown', this._continueHandler);
            document.removeEventListener('click', this._continueHandler);
            document.removeEventListener('touchstart', this._continueHandler);
        }

        // Setup continue handler - any key press continues the game (only after lock)
        this._continueHandler = (e) => {
            if (this.victoryLocked) return;

            this.continueAfterVictory();
            document.removeEventListener('keydown', this._continueHandler);
            document.removeEventListener('click', this._continueHandler);
            document.removeEventListener('touchstart', this._continueHandler);
            this._continueHandler = null;
        };

        document.addEventListener('keydown', this._continueHandler);
        document.addEventListener('click', this._continueHandler);
        document.addEventListener('touchstart', this._continueHandler);
    }

    /**
     * Initialize victory screen animation particles
     */
    initVictoryAnimation() {
        this.victoryParticles = [];
        this.victoryStars = [];

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Create burst particles (golden/rainbow)
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.3;
            const speed = 2 + Math.random() * 4;
            this.victoryParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                life: 0,
                maxLife: 60 + Math.random() * 40,
                color: `hsl(${Math.random() * 60 + 30}, 100%, ${50 + Math.random() * 30}%)`, // Golden to orange
                glow: true
            });
        }

        // Create floating stars
        for (let i = 0; i < 50; i++) {
            this.victoryStars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 2 + Math.random() * 4,
                speed: 0.3 + Math.random() * 0.5,
                angle: Math.random() * Math.PI * 2,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.05 + Math.random() * 0.1,
                color: `hsl(${Math.random() * 60 + 30}, 100%, ${70 + Math.random() * 30}%)`
            });
        }

        // Create energy rings
        this.victoryEnergyRings = [];
        for (let i = 0; i < 3; i++) {
            this.victoryEnergyRings.push({
                x: centerX,
                y: centerY,
                radius: 0,
                maxRadius: 200 + i * 100,
                speed: 2 + i * 0.5,
                life: 0,
                maxLife: 120,
                alpha: 1,
                color: `hsl(${30 + i * 20}, 100%, 60%)`
            });
        }
    }

    /**
     * Update victory screen animation
     */
    updateVictoryAnimation() {
        this.victoryTime++;

        // Update burst particles
        this.victoryParticles = this.victoryParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life++;
            particle.size *= 0.98;
            return particle.life < particle.maxLife;
        });

        // Update floating stars
        this.victoryStars.forEach(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.twinkle += star.twinkleSpeed;
            
            // Wrap around screen
            if (star.x < 0) star.x = this.canvas.width;
            if (star.x > this.canvas.width) star.x = 0;
            if (star.y < 0) star.y = this.canvas.height;
            if (star.y > this.canvas.height) star.y = 0;
        });

        // Update energy rings
        if (this.victoryEnergyRings) {
            this.victoryEnergyRings.forEach(ring => {
                ring.radius += ring.speed;
                ring.life++;
                ring.alpha = 1 - (ring.life / ring.maxLife);
                
                // Create new ring when old one fades
                if (ring.life >= ring.maxLife && this.victoryTime % 60 === 0) {
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    ring.radius = 0;
                    ring.life = 0;
                    ring.alpha = 1;
                    ring.x = centerX;
                    ring.y = centerY;
                }
            });
        }

        // Spawn new particles occasionally
        if (this.victoryTime % 10 === 0 && this.victoryParticles.length < 100) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.victoryParticles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                life: 0,
                maxLife: 40 + Math.random() * 30,
                color: `hsl(${Math.random() * 60 + 30}, 100%, ${50 + Math.random() * 30}%)`,
                glow: true
            });
        }
    }

    /**
     * Draw victory screen animation
     */
    drawVictoryAnimation() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw energy rings
        if (this.victoryEnergyRings) {
            this.victoryEnergyRings.forEach(ring => {
                if (ring.alpha > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = ring.alpha * 0.6;
                    this.ctx.strokeStyle = ring.color;
                    this.ctx.lineWidth = 3;
                    this.ctx.shadowColor = ring.color;
                    this.ctx.shadowBlur = 20;
                    this.ctx.beginPath();
                    this.ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            });
        }

        // Draw floating stars
        this.victoryStars.forEach(star => {
            const twinkle = Math.sin(star.twinkle) * 0.5 + 0.5;
            this.ctx.save();
            this.ctx.globalAlpha = twinkle;
            this.ctx.fillStyle = star.color;
            this.ctx.shadowColor = star.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw burst particles
        this.victoryParticles.forEach(particle => {
            const progress = particle.life / particle.maxLife;
            const alpha = 1 - progress;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            if (particle.glow) {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 15;
            }
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw central burst effect
        const burstProgress = Math.min(this.victoryTime / 30, 1);
        if (burstProgress < 1) {
            const burstSize = burstProgress * 150;
            const burstAlpha = (1 - burstProgress) * 0.8;
            this.ctx.save();
            this.ctx.globalAlpha = burstAlpha;
            const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, burstSize);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, burstSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Draw pulsing glow at center
        const pulse = Math.sin(this.victoryTime * 0.1) * 0.3 + 0.7;
        this.ctx.save();
        this.ctx.globalAlpha = pulse * 0.4;
        const pulseGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
        pulseGradient.addColorStop(0, 'rgba(255, 215, 0, 1)');
        pulseGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        this.ctx.fillStyle = pulseGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    continueAfterVictory() {
        this.state = 'playing';
        this.victoryScreen.style.display = 'none';
        
        // Clear victory animation
        this.victoryParticles = [];
        this.victoryStars = [];
        this.victoryEnergyRings = [];
        this.victoryTime = 0;
        
        // Resume music
        if (this.hasCarrier) {
            this.audioManager.startCarrierMusic();
        } else {
            this.audioManager.startBackgroundMusic(this.level);
        }
        // Game continues normally, can play infinitely until death
    }

    gameOver() {
        // Only trigger from active gameplay, and avoid duplicate delayed transitions.
        if (this.state !== 'playing' || this._gameOverTimeout) return;
        this.state = 'dying';

        // Stop music when game over
        this.audioManager.stopMusic();

        // Create player death explosion effect
        if (this.player) {
            const explosion = new ExplosionEffect(this.player.x, this.player.y, 'large');
            this.effects.push(explosion);
        }

        // Delay game over screen to show explosion
        this._gameOverTimeout = setTimeout(() => {
            this._gameOverTimeout = null;
            if (this.state === 'dying') {
                this.state = 'gameover';
                this.audioManager.play('gameover');
                this.finalScoreElement.textContent = Math.floor(this.score);
                this.gameOverScreen.style.display = 'flex';
            }
        }, 500);
    }

    /**
     * Handle input
     */
    handleInput() {
        if (this.state !== 'playing') return;

        // Lane switching - only switch once per key press
        if (this.keysPressed['a'] || this.keysPressed['arrowleft']) {
            this.player.switchLane(-1);
            this.keysPressed['a'] = false;
            this.keysPressed['arrowleft'] = false;
        }
        if (this.keysPressed['d'] || this.keysPressed['arrowright']) {
            this.player.switchLane(1);
            this.keysPressed['d'] = false;
            this.keysPressed['arrowright'] = false;
        }

        // Shooting is now automatic - removed manual shooting
    }

    /**
     * Spawn enemies
     */
    spawnEnemies() {
        // Hard cap on total active enemies to prevent performance degradation at high levels
        const activeEnemyCount = this.enemies.filter(e => e.active).length;
        const maxEnemies = 50;
        if (activeEnemyCount >= maxEnemies) return;

        // Increase spawn rate with level - slow gradual increase
        // Uses square root for smoother progression: level 1 = 1.0x, level 5 = 1.4x, level 10 = 1.73x
        const earlyLevelSpawnNerf = this.level <= 3 ? (0.78 + (this.level - 1) * 0.08) : 1;
        const spawnRate = CONFIG.ENEMY_SPAWN_RATE * Math.min(1 + Math.sqrt(this.level - 1) * 0.1, 2) * earlyLevelSpawnNerf;

        if (Math.random() < spawnRate) {
            const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
            const x = CONFIG.LANE_POSITIONS[laneIndex];
            const laneHasCarrier = this.enemies.some(e => e.type === 'carrier' && e.active && e.laneIndex === laneIndex);
            const enemy = EnemyFactory.createRandom(x, -40, laneIndex, this.level, laneHasCarrier);
            this.enemies.push(enemy);
        }

        // Spawn carrier enemy occasionally at level 5+ (if not at forced levels that are multiples of 5)
        // Each lane can have at most one active carrier
        if (this.level >= 5 && this.level % 5 !== 0) {
            if (Math.random() < 0.001) {
                const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                const laneHasCarrier = this.enemies.some(e => e.type === 'carrier' && e.active && e.laneIndex === laneIndex);
                if (!laneHasCarrier) {
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const carrier = EnemyFactory.create('carrier', x, 100, laneIndex, this.level);
                    this.enemies.push(carrier);
                    this.hasCarrier = true;
                    this.audioManager.startCarrierMusic();
                }
            }
        }
    }

    /**
     * Ensure gameplay never stays empty for too long.
     * If all lanes are empty for 0.5s, force-spawn one random enemy.
     * @param {number} now
     */
    ensureEnemyPresence(now) {
        const hasActiveEnemy = this.enemies.some(enemy => enemy.active);

        if (hasActiveEnemy) {
            this.emptyScreenSince = null;
            return;
        }

        if (this.emptyScreenSince === null) {
            this.emptyScreenSince = now;
            return;
        }

        if (now - this.emptyScreenSince < 500) {
            return;
        }

        const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
        const x = CONFIG.LANE_POSITIONS[laneIndex];
        const forcedEnemy = EnemyFactory.createRandom(x, -40, laneIndex, this.level, false);
        this.enemies.push(forcedEnemy);
        this.emptyScreenSince = null;
    }

    /**
     * Spawn powerups
     * Random powerups (not from enemy drops) stop spawning after level 5
     */
    spawnPowerups() {
        // Stop random powerup spawning after level 5
        if (this.level >= 5) {
            return;
        }
        
        if (Math.random() < CONFIG.POWERUP_SPAWN_RATE) {
            const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
            const x = CONFIG.LANE_POSITIONS[laneIndex];
            const powerup = PowerupFactory.createRandom(x, -25);
            this.powerups.push(powerup);
        }
    }

    /**
     * Activate temporary experience boost from gate
     * @param {number} durationMs - Boost duration in milliseconds
     * @param {number} multiplier - XP multiplier
     */
    activateExperienceGateBoost(durationMs = 10000, multiplier = 2) {
        const now = Date.now();
        this.experienceBoostUntil = Math.max(this.experienceBoostUntil, now + durationMs);
        this.experienceMultiplier = Math.max(1, multiplier);
    }

    /**
     * Get current experience multiplier (returns 1 if inactive)
     * @returns {number}
     */
    getCurrentExperienceMultiplier() {
        return Date.now() < this.experienceBoostUntil ? this.experienceMultiplier : 1;
    }

    /**
     * Apply current experience multiplier
     * @param {number} baseAmount
     * @returns {number}
     */
    applyExperienceMultiplier(baseAmount) {
        return Math.max(1, Math.floor(baseAmount * this.getCurrentExperienceMultiplier()));
    }

    /**
     * Trigger center subtitle for gate events
     * @param {string} text
     * @param {string} color
     * @param {number} duration
     */
    triggerGateSubtitle(text, color = '#ffffff', duration = 1200) {
        this.gateSubtitle = {
            text,
            color,
            startTime: Date.now(),
            duration
        };
    }

    /**
     * Keep gate-related temporary states up to date
     * @param {number} now
     */
    updateGateEffectStates(now) {
        if (this.gateSubtitle && now - this.gateSubtitle.startTime >= this.gateSubtitle.duration) {
            this.gateSubtitle = null;
        }

        if (this.laserLaneEffect) {
            const fireStartTime = this.laserLaneEffect.startTime + this.laserLaneEffect.warmupDuration;
            const fireEndTime = fireStartTime + this.laserLaneEffect.fireDuration;

            if (now >= fireStartTime && this.laserLaneEffect.phase !== 'firing') {
                this.laserLaneEffect.phase = 'firing';
                this.laserLaneEffect.nextTickTime = fireStartTime;
                this.audioManager.play('laserFire', 0.46);
            }

            while (
                this.laserLaneEffect.active &&
                this.laserLaneEffect.phase === 'firing' &&
                now >= this.laserLaneEffect.nextTickTime &&
                now < fireEndTime
            ) {
                this.applyLaneLaserTick(this.laserLaneEffect);
                this.laserLaneEffect.nextTickTime += this.laserLaneEffect.tickInterval;
            }

            if (now >= fireEndTime) {
                this.laserLaneEffect.active = false;
                this.laserLaneEffect = null;
            }
        }

        if (this.experienceBoostUntil > 0 && now >= this.experienceBoostUntil) {
            this.experienceBoostUntil = 0;
            this.experienceMultiplier = 1;
        }
    }

    /**
     * Fire lane laser and damage all enemies ahead in lane
     * @param {number} laneIndex
     */
    fireLaneLaser(laneIndex) {
        if (!this.player) return;

        const now = Date.now();
        this.audioManager.play('laserWarmup', 0.38);
        this.laserLaneEffect = {
            laneIndex,
            startTime: now,
            warmupDuration: 1000,
            fireDuration: randomInt(3000, 5000),
            tickInterval: 500,
            nextTickTime: now + 1000,
            damagePercentPerTick: 0.05,
            phase: 'warmup',
            active: true
        };
    }

    /**
     * Apply one periodic laser damage tick
     * @param {object} laserEffect
     */
    applyLaneLaserTick(laserEffect) {
        if (!this.player || !laserEffect) return;

        let scoreGained = 0;
        let hitSomething = false;

        const enemiesSnapshot = [...this.enemies];
        for (const enemy of enemiesSnapshot) {
            if (!enemy.active || enemy.laneIndex !== laserEffect.laneIndex) continue;

            const enemyBottomY = enemy.getBottomY ? enemy.getBottomY() : enemy.y + enemy.height / 2;
            // Only hit enemies in front of player.
            if (enemyBottomY > this.player.y + this.player.height / 2) continue;

            hitSomething = true;
            const laserDamage = Math.max(1, Math.floor(enemy.maxHealth * laserEffect.damagePercentPerTick));
            const result = enemy.takeDamage(laserDamage);
            const unitsKilled = result.unitsKilled || 0;
            const isMultiUnitEnemy = enemy.type === 'formation' || enemy.type === 'swarm' || (enemy.type === 'splinter' && enemy.isChild && enemy.units);

            if (unitsKilled > 0 && isMultiUnitEnemy) {
                const unitScore = (enemy.healthPerUnit || 1) * CONFIG.SCORE_PER_ENEMY;
                scoreGained += unitScore * unitsKilled;
            }

            if (!result.destroyed) {
                continue;
            }

            if (!isMultiUnitEnemy) {
                scoreGained += enemy.scoreValue;
            }

            // Laser-killed enemies always drop experience.
            this.gainExperienceFromEnemy(enemy, 0);

            this.playEnemyDeathSound(enemy.type);
            this.audioManager.queueKillAccent(enemy.type, 0.75);
            this.effects.push(EffectManager.createEffect(enemy.x, enemy.y, enemy.type));

            if (enemy.type === 'carrier') {
                this.audioManager.play('carrierVictory');
            }

            if (enemy.type === 'splinter' && result.spawnChildren) {
                const childConfig = result.childConfig || null;
                const child = EnemyFactory.createSplinterChild(
                    enemy.x,
                    enemy.y - 6,
                    enemy.laneIndex,
                    this.level,
                    childConfig
                );
                this.enemies.push(child);
            }
        }

        if (hitSomething) {
            this.audioManager.play('hit');
        }

        if (scoreGained > 0) {
            this.score += scoreGained;
            this.updateUI();
        }
    }

    /**
     * Update game entities
     */
    update() {
        const now = Date.now();

        // Always update effects even after game over to show death animation (optimized cleanup)
        let effectIndex = 0;
        while (effectIndex < this.effects.length) {
            const effect = this.effects[effectIndex];
            if (!effect.active) {
                this.effects.splice(effectIndex, 1);
                continue;
            }
            effect.update();
            if (!effect.active) {
                this.effects.splice(effectIndex, 1);
                continue;
            }
            effectIndex++;
        }
        
        // Limit effects aggressively to prevent performance issues
        if (this.effects.length > 30) {
            this.effects = this.effects.filter(e => e.active).slice(-30);
        }

        // Update level up text
        if (this.levelUpText && this.levelUpText.active) {
            this.levelUpText.lifetime++;
            // Scale animation: grow then shrink
            if (this.levelUpText.lifetime < 30) {
                this.levelUpText.scale = 1 + (this.levelUpText.lifetime / 30) * 0.5; // Grow to 1.5x
            } else {
                const shrinkProgress = (this.levelUpText.lifetime - 30) / (this.levelUpText.maxLifetime - 30);
                this.levelUpText.scale = 1.5 - shrinkProgress * 0.5; // Shrink from 1.5x to 1x
            }
            // Fade out
            if (this.levelUpText.lifetime > this.levelUpText.maxLifetime * 0.6) {
                const fadeStart = this.levelUpText.maxLifetime * 0.6;
                const fadeDuration = this.levelUpText.maxLifetime - fadeStart;
                this.levelUpText.alpha = 1 - ((this.levelUpText.lifetime - fadeStart) / fadeDuration);
            }
            if (this.levelUpText.lifetime >= this.levelUpText.maxLifetime) {
                this.levelUpText.active = false;
            }
        }

        // Update upgrade flash effect
        if (this.upgradeFlash) {
            const elapsed = Date.now() - this.upgradeFlash.startTime;
            if (elapsed >= this.upgradeFlash.duration) {
                // Remove flash class from upgrade icon before removing flash effect
                const upgradeIcon = document.querySelector(`.upgrade-icon.${this.upgradeFlash.type}`);
                if (upgradeIcon) {
                    upgradeIcon.classList.remove('flash');
                }
                // Remove flash effect
                this.upgradeFlash = null;
            } else {
                // Update flash class on upgrade icon
                const upgradeIcon = document.querySelector(`.upgrade-icon.${this.upgradeFlash.type}`);
                if (upgradeIcon && !upgradeIcon.classList.contains('flash')) {
                    upgradeIcon.classList.add('flash');
                }
            }
        }

        this.updateGateEffectStates(now);

        // If victory state, pause all game logic but update victory animation
        if (this.state === 'victory') {
            this.updateVictoryAnimation();
            return; // Completely pause game during victory screen
        }

        if (this.state !== 'playing') return;

        // Update elapsed time
        if (this.gameStartTime > 0) {
            this.elapsedTime = Math.floor((now - this.gameStartTime) / 1000); // Convert to seconds
        }

        // Update music based on game state
        this.updateMusic();

        // Update player
        this.player.update();

        // Auto-shoot
        if (this.player) {
            this.player.shoot(this.audioManager);
            // Auto-shoot alt ship if exists
            if (this.player.altShip) {
                this.player.altShip.shoot(this.audioManager);
            }
        }

        // Spawn enemies and powerups
        this.spawnEnemies();
        this.spawnPowerups();

        if (this.gateManager) {
            this.gateManager.update(this, now);
        }

        // Update enemies (optimized: remove inactive ones during iteration)
        let enemyIndex = 0;
        while (enemyIndex < this.enemies.length) {
            const enemy = this.enemies[enemyIndex];
            
            if (!enemy.active) {
                // Remove inactive enemy without creating new array
                this.enemies.splice(enemyIndex, 1);
                continue;
            }
            
            // Only fast enemies' speed increases with level, all others stay at base speed
            if (enemy.type === 'fast') {
                // Fast enemies speed increases with level
                let speedIncrement = CONFIG.ENEMY_SPEED_INCREMENT;
                if (this.level > 10) {
                    // Additional speed boost for late game (20% more per level after level 10)
                    speedIncrement = CONFIG.ENEMY_SPEED_INCREMENT * (1 + (this.level - 10) * 0.02);
                }
                enemy.speed = enemy.baseSpeed + (this.level - 1) * speedIncrement;
            } else if (enemy.type !== 'carrier') {
                // All other enemies (except carrier) stay at base speed, no level scaling
                enemy.speed = enemy.baseSpeed;
            }
            enemy.update();

            // Handle carrier enemy spawning (only if carrier is still active and enemy count is below cap)
            if (enemy.type === 'carrier' && enemy.active && enemy.shouldSpawnEnemy()) {
                const currentActiveCount = this.enemies.filter(e => e.active).length;
                if (currentActiveCount < 50) {
                    const spawnX = enemy.x;
                    const spawnY = enemy.y + enemy.height / 2 + 20;

                    const spawnEffect = EffectManager.createEffect(spawnX, spawnY, 'spawn');
                    this.effects.push(spawnEffect);

                    const enemyTypes = ['formation', 'swarm'];
                    const randomType = enemyTypes[randomInt(0, enemyTypes.length - 1)];
                    const spawnedEnemy = EnemyFactory.create(randomType, spawnX, spawnY, enemy.laneIndex, this.level);
                    this.enemies.push(spawnedEnemy);
                }
                enemy.resetSpawnCooldown();
            }
            
            enemyIndex++;
        }

        // Check carrier status again after removing inactive enemies
        // This ensures music stops immediately when carrier is destroyed
        const hasCarrierAfterUpdate = this.enemies.some(e => e.type === 'carrier' && e.active);
        if (hasCarrierAfterUpdate !== this.hasCarrier) {
            this.hasCarrier = hasCarrierAfterUpdate;
            if (hasCarrierAfterUpdate) {
                // Carrier appeared, switch to intense music
                this.audioManager.startCarrierMusic();
            } else {
                // Carrier destroyed, switch back to background music
                this.audioManager.startBackgroundMusic(this.level);
            }
        }

        // Prevent full empty-screen downtime during gameplay.
        this.ensureEnemyPresence(now);

        // Update powerups (optimized: remove inactive ones during iteration)
        let powerupIndex = 0;
        while (powerupIndex < this.powerups.length) {
            const powerup = this.powerups[powerupIndex];
            if (!powerup.active) {
                this.powerups.splice(powerupIndex, 1);
                continue;
            }
            try {
                powerup.update();
            } catch (error) {
                console.error(`ERROR updating powerup ${powerupIndex}:`, error);
                powerup.active = false; // Deactivate problematic powerup
                this.powerups.splice(powerupIndex, 1);
                continue;
            }
            powerupIndex++;
        }

        // Update XP texts (optimized: remove inactive ones during iteration)
        let xpTextIndex = 0;
        while (xpTextIndex < this.xpTexts.length) {
            const xpText = this.xpTexts[xpTextIndex];
            if (!xpText.active) {
                this.xpTexts.splice(xpTextIndex, 1);
                continue;
            }
            xpText.update();
            xpTextIndex++;
        }

        // Cap XP texts to prevent rendering overload at high levels
        if (this.xpTexts.length > 20) {
            this.xpTexts = this.xpTexts.slice(-20);
        }

        // Optimized bullet group-enemy collision detection: lane-based y-axis only
        if (this.player) {
            // Combine player and alt ship bullet groups (avoid extra filter passes)
            const activeBulletGroups = [];
            for (const bg of this.player.bulletGroups) {
                if (bg.active && bg.remainingCount > 0) activeBulletGroups.push(bg);
            }
            if (this.player.altShip) {
                for (const bg of this.player.altShip.bulletGroups) {
                    if (bg.active && bg.remainingCount > 0) activeBulletGroups.push(bg);
                }
            }
            const activeEnemies = [];
            for (const e of this.enemies) {
                if (e.active) activeEnemies.push(e);
            }
            
            // Safety check: prevent excessive entity counts
            if (activeBulletGroups.length > 200 || activeEnemies.length > 100) {
                console.warn(`WARNING: Unusually high entity count - Bullet Groups: ${activeBulletGroups.length}, Enemies: ${activeEnemies.length}`);
                if (activeBulletGroups.length > 300) {
                    this.player.bulletGroups = this.player.bulletGroups.filter(bg => bg.active).slice(0, 200);
                }
                if (activeEnemies.length > 150) {
                    this.enemies = this.enemies.filter(e => e.active).slice(0, 100);
                }
            }

            // Group bullet groups and enemies by lane - each lane is checked independently
            const bulletGroupsByLane = new Array(CONFIG.LANE_COUNT).fill(null).map(() => []);
            const enemiesByLane = new Array(CONFIG.LANE_COUNT).fill(null).map(() => []);

            // Group bullet groups by their lane (determined at creation time)
            activeBulletGroups.forEach(bulletGroup => {
                if (bulletGroup.laneIndex >= 0 && bulletGroup.laneIndex < CONFIG.LANE_COUNT) {
                    bulletGroupsByLane[bulletGroup.laneIndex].push(bulletGroup);
                }
            });

            // Group enemies by lane
            activeEnemies.forEach(enemy => {
                if (enemy.laneIndex >= 0 && enemy.laneIndex < CONFIG.LANE_COUNT) {
                    enemiesByLane[enemy.laneIndex].push(enemy);
                }
            });

            // For each lane, independently check collisions between bullet groups and enemies
            // Each lane only checks its own bullet groups against its own enemies
            for (let laneIndex = 0; laneIndex < CONFIG.LANE_COUNT; laneIndex++) {
                // Get bullet groups and enemies for this specific lane
                const laneBulletGroups = bulletGroupsByLane[laneIndex];
                const laneEnemies = enemiesByLane[laneIndex];

                // Skip if no bullet groups or enemies in this lane
                if (laneBulletGroups.length === 0 || laneEnemies.length === 0) {
                    continue;
                }

                // Sort bullet groups by Y descending (most forward first) to process collisions in order
                const sortedBulletGroups = laneBulletGroups
                    .filter(bg => bg && bg.active && bg.remainingCount > 0)
                    .sort((a, b) => b.y - a.y); // Sort descending (most forward first)

                // Process each bullet group - it can hit multiple enemies in the same frame
                for (const bulletGroup of sortedBulletGroups) {
                    // Skip if bullet group is no longer active or has no bullets remaining
                    if (!bulletGroup.active || bulletGroup.remainingCount <= 0) continue;
                    
                    // Keep processing collisions until bullet group has no bullets left or no more enemies to hit
                    let continueCollisionCheck = true;
                    while (continueCollisionCheck && bulletGroup.active && bulletGroup.remainingCount > 0) {
                        // Find the most forward active enemy in this lane (bottommost = closest to player)
                        let mostForwardEnemy = null;
                        let mostForwardBottomY = -Infinity;
                        for (const enemy of laneEnemies) {
                            if (!enemy.active) continue;
                            const bottomY = enemy.getBottomY();
                            if (bottomY > mostForwardBottomY) {
                                mostForwardBottomY = bottomY;
                                mostForwardEnemy = enemy;
                            }
                        }

                        if (!mostForwardEnemy) {
                            continueCollisionCheck = false;
                            break;
                        }

                        const mostForwardEnemyBottomY = mostForwardBottomY;
                        
                        // Y-axis collision detection: bullet group top <= enemy bottom
                        if (bulletGroup.y <= mostForwardEnemyBottomY) {
                            // Collision detected! Consume one bullet from the group
                            // The bullet group will visually remove a random bullet
                            bulletGroup.consumeBullets(1);

                            // Calculate actual damage based on bullet group power and enemy type
                            // Damage is per bullet, so we calculate for 1 bullet consumed
                            const actualDamage = bulletGroup.getDamage(mostForwardEnemy, 1);

                            // Snapshot alive units before damage to find which ones actually die
                            const isMultiUnit = (mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm' || (mostForwardEnemy.type === 'splinter' && mostForwardEnemy.isChild && mostForwardEnemy.units)) && mostForwardEnemy.units;
                            let aliveBeforeDamage = null;
                            if (isMultiUnit) {
                                aliveBeforeDamage = new Set();
                                for (let ui = 0; ui < mostForwardEnemy.units.length; ui++) {
                                    if (mostForwardEnemy.units[ui].health > 0) aliveBeforeDamage.add(ui);
                                }
                            }

                            const result = mostForwardEnemy.takeDamage(actualDamage);

                            // Compute positions of actually destroyed units by comparing before/after
                            let destroyedUnitPositions = [];
                            if (isMultiUnit && aliveBeforeDamage) {
                                let startX, startY, colSpacing, rowSpacing;
                                if (mostForwardEnemy.type === 'formation') {
                                    const totalWidth = (mostForwardEnemy.cols * mostForwardEnemy.enemyWidth) + ((mostForwardEnemy.cols - 1) * mostForwardEnemy.spacing);
                                    const totalHeight = (mostForwardEnemy.rows * mostForwardEnemy.enemyHeight) + ((mostForwardEnemy.rows - 1) * mostForwardEnemy.rowSpacing);
                                    startX = mostForwardEnemy.x - totalWidth / 2;
                                    startY = mostForwardEnemy.y - totalHeight / 2;
                                    colSpacing = mostForwardEnemy.enemyWidth + mostForwardEnemy.spacing;
                                    rowSpacing = mostForwardEnemy.enemyHeight + mostForwardEnemy.rowSpacing;
                                }
                                for (const ui of aliveBeforeDamage) {
                                    const unit = mostForwardEnemy.units[ui];
                                    if (unit.health <= 0) {
                                        if (mostForwardEnemy.type === 'formation') {
                                            destroyedUnitPositions.push({
                                                x: startX + (unit.col * colSpacing) + (mostForwardEnemy.enemyWidth / 2),
                                                y: startY + (unit.row * rowSpacing) + (mostForwardEnemy.enemyHeight / 2)
                                            });
                                        } else {
                                            destroyedUnitPositions.push({
                                                x: mostForwardEnemy.x + unit.offsetX,
                                                y: mostForwardEnemy.y + unit.offsetY
                                            });
                                        }
                                    }
                                }
                            }
                            const unitsKilled = result.unitsKilled || 0;

                            // Give score and experience for each unit killed (Formation/Swarm/Splinter Child)
                            if (unitsKilled > 0 && (mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm' || (mostForwardEnemy.type === 'splinter' && mostForwardEnemy.isChild && mostForwardEnemy.units))) {
                                // Score: proportional to unit health, independent of total count
                                const unitScore = mostForwardEnemy.healthPerUnit * CONFIG.SCORE_PER_ENEMY;

                                // Give score for each killed unit
                                this.score += unitScore * unitsKilled;

                                // Swarm/Formation: each unit has 0.5 (50%) chance to drop XP
                                const experienceChance = 0.5;

                                // Queue kill accent for each unit killed (but limit to avoid spam)
                                const maxAccents = Math.min(unitsKilled, 3);
                                for (let i = 0; i < maxAccents; i++) {
                                    this.audioManager.queueKillAccent(mostForwardEnemy.type, 0.5);
                                }

                                for (let i = 0; i < unitsKilled; i++) {
                                    // Chance to gain experience from each unit
                                    if (Math.random() < experienceChance) {
                                        this.gainExperienceFromEnemy(mostForwardEnemy, i);
                                    }
                                }
                            }

                            if (result.destroyed) {
                                // Only give score for non-multi-unit enemies (Formation/Swarm/Splinter Child already handled above)
                                const isMultiUnitEnemy = mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm' || (mostForwardEnemy.type === 'splinter' && mostForwardEnemy.isChild && mostForwardEnemy.units);
                                if (!isMultiUnitEnemy) {
                                    this.score += mostForwardEnemy.scoreValue;
                                }

                                // Give experience when enemy is completely destroyed (for non-multi-unit enemies)
                                if (!isMultiUnitEnemy) {
                                    // Get drop rate based on enemy type
                                    let dropRate = 0.2; // Default
                                    if (mostForwardEnemy.type === 'basic') {
                                        dropRate = 0.2; // 20%
                                    } else if (mostForwardEnemy.type === 'fast') {
                                        dropRate = 0.3; // 30%
                                    } else if (mostForwardEnemy.type === 'tank') {
                                        dropRate = 0.5; // 50%
                                    } else if (mostForwardEnemy.type === 'splinter') {
                                        dropRate = mostForwardEnemy.isChild ? 0.1 : 0.25;
                                    } else if (mostForwardEnemy.type === 'carrier') {
                                        dropRate = 1.0; // 100%
                                    }

                                    // Check if should drop experience
                                    if (Math.random() < dropRate) {
                                        this.gainExperienceFromEnemy(mostForwardEnemy, 0);
                                    }
                                }

                                // Play enemy-specific death sound
                                this.playEnemyDeathSound(mostForwardEnemy.type);
                                
                                // Play special victory sound for carrier destruction
                                if (mostForwardEnemy.type === 'carrier') {
                                    this.audioManager.play('carrierVictory');
                                }

                                // Queue kill accent for beat synchronization
                                let accentIntensity = 0.5;
                                if (mostForwardEnemy.type === 'tank' || mostForwardEnemy.type === 'carrier') {
                                    accentIntensity = 0.8;
                                } else if (mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm' || (mostForwardEnemy.type === 'splinter' && mostForwardEnemy.isChild && mostForwardEnemy.units)) {
                                    accentIntensity = 0.6;
                                } else {
                                    accentIntensity = 0.4;
                                }
                                this.audioManager.queueKillAccent(mostForwardEnemy.type, accentIntensity);

                                // Create destruction effect
                                const effect = EffectManager.createEffect(mostForwardEnemy.x, mostForwardEnemy.y, mostForwardEnemy.type);
                                this.effects.push(effect);

                                // Splinter enemies break into smaller shards on destruction
                                // Create ONE child enemy with multiple units (like swarm/formation)
                                if (mostForwardEnemy.type === 'splinter' && result.spawnChildren) {
                                    const childConfig = result.childConfig || null;
                                    const childX = mostForwardEnemy.x;
                                    const childY = mostForwardEnemy.y - 6;
                                    const child = EnemyFactory.createSplinterChild(
                                        childX,
                                        childY,
                                        mostForwardEnemy.laneIndex,
                                        this.level,
                                        childConfig
                                    );
                                    this.enemies.push(child);
                                }

                                this.updateUI();
                            } else if (unitsKilled > 0) {
                                // Play hit sound even if not fully destroyed
                                this.audioManager.play('hit');

                                // Create effects for destroyed units
                                destroyedUnitPositions.forEach((pos, index) => {
                                    if (index < unitsKilled) {
                                        let effectType = 'swarm';
                                        if (mostForwardEnemy.type === 'formation') {
                                            effectType = 'formation';
                                        } else if (mostForwardEnemy.type === 'splinter' && mostForwardEnemy.isChild) {
                                            effectType = 'splinter';
                                        }
                                        const effect = EffectManager.createEffect(pos.x, pos.y, effectType);
                                        this.effects.push(effect);
                                    }
                                });

                                this.updateUI();
                            }
                            
                            // Continue checking for more collisions if bullet group still has bullets
                            // The while loop will check again for the next most forward enemy
                        } else {
                            // Bullet group has passed all enemies, stop checking collisions
                            continueCollisionCheck = false;
                        }
                    }
                }
            }
        }

        // Check player-enemy collisions (reuse active list where possible)
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            // For formation, swarm, and splinter child enemies, only check collision with actual units
            // (especially bottom row units that can actually hit the player)
            if (enemy.type === 'formation' || enemy.type === 'swarm' || (enemy.type === 'splinter' && enemy.isChild && enemy.units)) {
                // Use cached alive units if available
                if (!enemy._cachedAliveUnits || enemy._needsCacheUpdate) {
                    enemy._cachedAliveUnits = enemy.units.filter(u => u.health > 0);
                    enemy._needsCacheUpdate = false;
                }
                const aliveUnits = enemy._cachedAliveUnits;
                
                // Check collision with each alive unit
                let collisionDetected = false;
                for (const unit of aliveUnits) {
                    // Calculate unit's actual position
                    let unitX, unitY;
                    if (enemy.type === 'formation') {
                        const totalWidth = (enemy.cols * enemy.enemyWidth) + ((enemy.cols - 1) * enemy.spacing);
                        const totalHeight = (enemy.rows * enemy.enemyHeight) + ((enemy.rows - 1) * enemy.rowSpacing);
                        const startX = enemy.x - totalWidth / 2;
                        const startY = enemy.y - totalHeight / 2;
                        unitX = startX + (unit.col * (enemy.enemyWidth + enemy.spacing)) + (enemy.enemyWidth / 2);
                        unitY = startY + (unit.row * (enemy.enemyHeight + enemy.rowSpacing)) + (enemy.enemyHeight / 2);
                    } else { // swarm or splinter child
                        unitX = enemy.x + unit.offsetX;
                        unitY = enemy.y + unit.offsetY;
                    }

                    // Check collision with unit's actual bounds
                    let unitWidth, unitHeight;
                    if (enemy.type === 'formation') {
                        unitWidth = enemy.enemyWidth;
                        unitHeight = enemy.enemyHeight;
                    } else { // swarm or splinter child
                        unitWidth = enemy.unitSize;
                        unitHeight = enemy.unitSize;
                    }
                    const unitBounds = {
                        x: unitX - unitWidth / 2,
                        y: unitY - unitHeight / 2,
                        width: unitWidth,
                        height: unitHeight
                    };

                    if (checkCollision(this.player.getBounds(), unitBounds)) {
                        collisionDetected = true;
                        break;
                    }
                }
                if (collisionDetected) {
                    this.gameOver();
                }
            } else {
                // For other enemy types, use standard bounds check
                if (checkCollision(this.player.getBounds(), enemy.getBounds())) {
                    this.gameOver();
                }
            }
        }

        // Check player-powerup collisions
        this.powerups.forEach(powerup => {
            if (checkCollision(this.player.getBounds(), powerup.getBounds())) {
                powerup.active = false;

                if (powerup.type === 'experience') {
                    // Handle experience powerup
                    const oldLevel = this.player.getUpgradeLevel(powerup.upgradeType);
                    const xpMultiplier = this.getCurrentExperienceMultiplier();
                    const gainedExperience = Math.max(1, Math.floor(powerup.experienceAmount * xpMultiplier));
                    const leveledUp = powerup.apply(this.player, xpMultiplier);
                    const newLevel = this.player.getUpgradeLevel(powerup.upgradeType);

                    // Show XP text for experience powerup
                    this.xpTexts.push(new XPText(powerup.x, powerup.y, gainedExperience, powerup.upgradeType));

                    // If leveled up, play upgrade sound and trigger flash
                    if (leveledUp) {
                        const upgradeSoundName = powerup.upgradeType + 'Upgrade';
                        if (this.audioManager.sounds[upgradeSoundName]) {
                            this.audioManager.play(upgradeSoundName);
                        }
                        // Trigger flash effect
                        this.triggerUpgradeFlash(powerup.upgradeType);
                    } else {
                        this.audioManager.play('powerup');
                    }
                } else {
                    // Handle regular powerups
                    const oldLevel = this.player.getUpgradeLevel(powerup.type);
                    const xpMultiplier = this.getCurrentExperienceMultiplier();
                    const baseExperience = powerup.experienceAmount || 5;
                    const gainedExperience = Math.max(1, Math.floor(baseExperience * xpMultiplier));
                    powerup.apply(this.player, xpMultiplier);
                    const newLevel = this.player.getUpgradeLevel(powerup.type);

                    // Show XP text for powerup
                    this.xpTexts.push(new XPText(powerup.x, powerup.y, gainedExperience, powerup.type));

                    // If leveled up, play upgrade sound and trigger flash
                    if (newLevel > oldLevel) {
                        const upgradeSoundName = powerup.type + 'Upgrade';
                        if (this.audioManager.sounds[upgradeSoundName]) {
                            this.audioManager.play(upgradeSoundName);
                        }
                        // Trigger flash effect
                        this.triggerUpgradeFlash(powerup.type);
                    } else {
                        this.audioManager.play('powerup');
                    }
                }

                this.updateUI();
            }
        });

        // Level up - based on both score and time
        // Score contribution: same as before
        // Time contribution: +1 level every 30 seconds
        let scoreBasedLevel = 1;
        let totalRequired = 0;

        // Calculate level based on score
        // Polynomial formula: A + B*n + C*n² + D*n³ + E*n⁴
        // requiredForLevel(n) = 200 + 120*n + 30*n² + 1*n³ + 0.1*n⁴
        while (true) {
            const A = 200;  // Constant term
            const B = 120;  // Linear coefficient
            const C = 30;   // Quadratic coefficient
            const D = 1;    // Cubic coefficient
            const E = 1/10;    // Quartic coefficient
            const n = scoreBasedLevel;
            const requiredForNext = Math.floor(A + B * n + C * n * n + D * n * n * n + E * n * n * n * n);
            
            if (this.score >= totalRequired + requiredForNext) {
                totalRequired += requiredForNext;
                scoreBasedLevel++;
            } else {
                break;
            }
        }

        // Calculate level based on time (1 level per 30 seconds)
        const timeBasedLevel = 1 + Math.floor(this.elapsedTime / 30);

        // Combined level: take the higher of score-based or time-based, but also consider both
        // Formula: max(scoreLevel, timeLevel) + bonus from having both
        const baseLevel = Math.max(scoreBasedLevel, timeBasedLevel);
        // Bonus: if both score and time contribute, add a small bonus
        const bothContribute = scoreBasedLevel > 1 && timeBasedLevel > 1;
        const calculatedLevel = baseLevel + (bothContribute ? Math.floor(Math.min(scoreBasedLevel, timeBasedLevel) / 3) : 0);

        if (calculatedLevel > this.level) {
            const oldLevel = this.level;
            this.level = calculatedLevel;
            this.updateUI();

            // Level up effect: clear bottom half of screen enemies
            this.onLevelUp(oldLevel);

            // Check for victory at level 20 (only show once)
            if (this.level >= 20 && this.state === 'playing' && !this.victoryShown) {
                this.victoryShown = true;
                this.victory();
            }
        }
    }

    /**
     * Draw game
     */
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw effects even after game over to show death animation
        this.effects.forEach(effect => effect.draw(this.ctx));

        // Draw victory animation if in victory state
        if (this.state === 'victory') {
            this.drawVictoryAnimation();
            return;
        }

        if (this.state !== 'playing') return;

        // Draw lane dividers
        this.drawLaneDividers();

        // Draw gates before entities for readability
        if (this.gateManager) {
            this.gateManager.draw(this.ctx);
        }

        // Draw player
        if (this.player) {
            this.player.draw(this.ctx, this.upgradeFlash);

            // Draw bullet groups (only active ones, and only if on screen)
            const canvasHeight = this.canvas.height;
            const canvasWidth = this.canvas.width;
            this.player.bulletGroups.forEach(bulletGroup => {
                if (bulletGroup.active && bulletGroup.remainingCount > 0 && bulletGroup.y > -50 && bulletGroup.y < canvasHeight + 50) {
                    bulletGroup.draw(this.ctx);
                }
            });
            
            // Draw alt ship bullet groups if exists
            if (this.player.altShip) {
                this.player.altShip.bulletGroups.forEach(bulletGroup => {
                    if (bulletGroup.active && bulletGroup.remainingCount > 0 && bulletGroup.y > -50 && bulletGroup.y < canvasHeight + 50) {
                        bulletGroup.draw(this.ctx);
                    }
                });
            }
        }

        // Draw enemies (only active ones, and only if on screen or near screen)
        const canvasHeight = this.canvas.height;
        const canvasWidth = this.canvas.width;
        this.enemies.forEach(enemy => {
            if (enemy.active && enemy.y > -100 && enemy.y < canvasHeight + 100) {
                enemy.draw(this.ctx);
            }
        });

        // Draw powerups (only active ones, and only if on screen)
        this.powerups.forEach(powerup => {
            if (powerup.active && powerup.y > -50 && powerup.y < canvasHeight + 50) {
                powerup.draw(this.ctx);
            }
        });

        // Draw XP texts (only active ones, and only if on screen)
        this.xpTexts.forEach(xpText => {
            if (xpText.active && xpText.y > -50 && xpText.y < canvasHeight + 50) {
                xpText.draw(this.ctx);
            }
        });

        this.drawGateOverlays();

        // Draw level up text
        if (this.levelUpText && this.levelUpText.active) {
            this.ctx.save();
            this.ctx.globalAlpha = this.levelUpText.alpha;
            this.ctx.translate(this.levelUpText.x, this.levelUpText.y);
            this.ctx.scale(this.levelUpText.scale, this.levelUpText.scale);

            // Draw with glow effect
            this.ctx.shadowColor = '#ffd700';
            this.ctx.shadowBlur = 20;
            this.ctx.font = 'bold 72px Arial';
            this.ctx.fillStyle = '#ffd700';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 4;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.strokeText(this.levelUpText.text, 0, 0);
            this.ctx.fillText(this.levelUpText.text, 0, 0);

            this.ctx.restore();
        }
    }

    /**
     * Draw lane dividers
     */
    drawLaneDividers() {
        // Already drawn by player.drawLaneIndicators, but can add more visual elements here
    }

    /**
     * Draw gate-related overlays: lane laser, experience flash, and subtitles
     */
    drawGateOverlays() {
        const now = Date.now();

        if (this.laserLaneEffect) {
            const laneX = CONFIG.LANE_POSITIONS[this.laserLaneEffect.laneIndex];
            const beamWidth = CONFIG.LANE_WIDTH * 0.42;
            const warmupDuration = this.laserLaneEffect.warmupDuration;
            const fireDuration = this.laserLaneEffect.fireDuration;
            const fireStartTime = this.laserLaneEffect.startTime + warmupDuration;
            const isWarmup = now < fireStartTime;
            const elapsed = now - this.laserLaneEffect.startTime;

            this.ctx.save();
            const beamHeight = this.player ? this.player.y + 20 : this.canvas.height;

            if (isWarmup) {
                const warmupProgress = Math.max(0, Math.min(1, elapsed / warmupDuration));
                const chargePulse = Math.sin(now * 0.02) * 0.5 + 0.5;
                const warmupAlpha = 0.1 + warmupProgress * 0.3;
                const warmupWidth = beamWidth * (0.18 + warmupProgress * 0.24);

                // Charging guide column that grows brighter during preheat.
                this.ctx.globalAlpha = warmupAlpha;
                const chargeGradient = this.ctx.createLinearGradient(laneX - warmupWidth / 2, 0, laneX + warmupWidth / 2, 0);
                chargeGradient.addColorStop(0, 'rgba(255, 90, 110, 0.15)');
                chargeGradient.addColorStop(0.5, 'rgba(255, 220, 190, 0.9)');
                chargeGradient.addColorStop(1, 'rgba(255, 90, 110, 0.15)');
                this.ctx.fillStyle = chargeGradient;
                this.ctx.shadowColor = '#ff4d4f';
                this.ctx.shadowBlur = 20;
                this.ctx.fillRect(laneX - warmupWidth / 2, -10, warmupWidth, beamHeight);

                // Charging ring indicates imminent firing without flashing the whole column.
                this.ctx.globalAlpha = 0.35 + chargePulse * 0.25;
                this.ctx.strokeStyle = '#ffd4c4';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(laneX, beamHeight - 40, 14 + warmupProgress * 24, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                const fireElapsed = now - fireStartTime;
                const fireProgress = Math.max(0, Math.min(1, fireElapsed / fireDuration));
                const beamAlpha = 0.95 * (1 - fireProgress);

                // Stable light column that slowly dims out over time.
                this.ctx.globalAlpha = beamAlpha;
                const beamGradient = this.ctx.createLinearGradient(laneX - beamWidth / 2, 0, laneX + beamWidth / 2, 0);
                beamGradient.addColorStop(0, 'rgba(255, 80, 100, 0.2)');
                beamGradient.addColorStop(0.22, 'rgba(255, 160, 150, 0.8)');
                beamGradient.addColorStop(0.5, 'rgba(255, 250, 220, 1)');
                beamGradient.addColorStop(0.78, 'rgba(255, 160, 150, 0.8)');
                beamGradient.addColorStop(1, 'rgba(255, 80, 100, 0.2)');
                this.ctx.fillStyle = beamGradient;
                this.ctx.shadowColor = '#ff6c6c';
                this.ctx.shadowBlur = 30;
                this.ctx.fillRect(laneX - beamWidth / 2, -10, beamWidth, beamHeight);
            }

            this.ctx.restore();
        }

        if (this.getCurrentExperienceMultiplier() > 1) {
            const pulse = Math.sin(now * 0.02) * 0.5 + 0.5;
            const shimmer = Math.sin(now * 0.009) * 0.5 + 0.5;
            const remainingMs = Math.max(0, this.experienceBoostUntil - now);
            const seconds = (remainingMs / 1000).toFixed(1);

            this.ctx.save();
            const overlayGradient = this.ctx.createRadialGradient(
                this.canvas.width / 2,
                this.canvas.height / 2,
                40,
                this.canvas.width / 2,
                this.canvas.height / 2,
                this.canvas.width * 0.62
            );
            overlayGradient.addColorStop(0, `rgba(78, 205, 196, ${0.08 + pulse * 0.08})`);
            overlayGradient.addColorStop(0.45, `rgba(135, 255, 244, ${0.05 + shimmer * 0.05})`);
            overlayGradient.addColorStop(1, 'rgba(78, 205, 196, 0.01)');
            this.ctx.fillStyle = overlayGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            const ringCount = 3;
            const ringBaseRadius = 50;
            for (let i = 0; i < ringCount; i++) {
                const ringPulse = (pulse + i * 0.33) % 1;
                this.ctx.strokeStyle = `rgba(126, 255, 236, ${0.28 - i * 0.06})`;
                this.ctx.lineWidth = 2 + i * 0.8;
                this.ctx.shadowColor = '#4ecdc4';
                this.ctx.shadowBlur = 14;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.canvas.width / 2,
                    52,
                    ringBaseRadius + ringPulse * 28 + i * 14,
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            }

            this.ctx.fillStyle = '#b9fff8';
            this.ctx.shadowColor = '#72fff1';
            this.ctx.shadowBlur = 18;
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`✦ EXP x${this.experienceMultiplier} ✦  ${seconds}s`, this.canvas.width / 2, 52);
            this.ctx.restore();
        }

        if (this.gateSubtitle) {
            const elapsed = now - this.gateSubtitle.startTime;
            const progress = Math.max(0, Math.min(1, elapsed / this.gateSubtitle.duration));
            const alpha = 1 - progress;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = this.gateSubtitle.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4;
            this.ctx.shadowColor = this.gateSubtitle.color;
            this.ctx.shadowBlur = 20;
            this.ctx.font = 'bold 52px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeText(this.gateSubtitle.text, this.canvas.width / 2, this.canvas.height * 0.4);
            this.ctx.fillText(this.gateSubtitle.text, this.canvas.width / 2, this.canvas.height * 0.4);
            this.ctx.restore();
        }
    }

    /**
     * Handle level up: clear bottom half enemies and show level up text
     * @param {number} oldLevel - Previous level
     */
    onLevelUp(oldLevel) {
        if (!this.canvas) return;

        // Create shockwave effect (damage is applied in real-time as shockwave moves)
        const shockwave = EffectManager.createEffect(0, 0, 'shockwave', this);
        this.effects.push(shockwave);

        // Show "Level Up!" text in center of screen
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.levelUpText = {
            x: centerX,
            y: centerY,
            text: 'LEVEL UP!',
            lifetime: 0,
            maxLifetime: 90, // 1.5 seconds at 60fps
            active: true,
            scale: 1.0,
            alpha: 1.0
        };

        // Play level up sound
        this.audioManager.play('levelup');

        // Force spawn carrier at all levels that are multiples of 5 (5, 10, 15, 20, 25, ...)
        // Each lane can have at most one active carrier
        if (this.level % 5 === 0) {
            if (!this.carrierSpawnedAtLevels.has(this.level)) {
                // Find a lane without an active carrier
                const carrierLanes = new Set();
                for (const e of this.enemies) {
                    if (e.type === 'carrier' && e.active) carrierLanes.add(e.laneIndex);
                }
                const freeLanes = [];
                for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
                    if (!carrierLanes.has(i)) freeLanes.push(i);
                }
                if (freeLanes.length > 0) {
                    const laneIndex = freeLanes[randomInt(0, freeLanes.length - 1)];
                    const x = CONFIG.LANE_POSITIONS[laneIndex];
                    const carrier = EnemyFactory.create('carrier', x, 100, laneIndex, this.level);
                    this.enemies.push(carrier);
                    this.carrierSpawnedAtLevels.add(this.level);
                    this.hasCarrier = true;
                    this.audioManager.startCarrierMusic();
                }
            }
        }
    }

    /**
     * Update music based on game state
     * Note: Carrier status check is done after enemy updates to ensure accuracy
     */
    updateMusic() {
        if (this.state !== 'playing') {
            this.audioManager.stopMusic();
            return;
        }

        const experienceBoostActive = this.getCurrentExperienceMultiplier() > 1;
        if (experienceBoostActive) {
            if (this.audioManager.currentMusic !== 'experienceGate') {
                this.audioManager.startExperienceGateMusic();
            }
            return;
        }

        if (this.audioManager.currentMusic === 'experienceGate') {
            if (this.hasCarrier) {
                this.audioManager.startCarrierMusic();
            } else {
                this.currentMusicLevel = this.level;
                this.audioManager.startBackgroundMusic(this.level);
            }
        }

        // Carrier status is checked after enemy updates in update() method
        // This ensures accurate detection when carriers are destroyed

        // Update music tempo if level changed (for background music)
        if (this.level !== this.currentMusicLevel && !this.hasCarrier) {
            this.currentMusicLevel = this.level;
            this.audioManager.startBackgroundMusic(this.level);
        }

        // Calculate and update tension for dynamic music (only if not carrier music)
        if (!this.hasCarrier && this.audioManager.currentMusic === 'background') {
            const tension = this.calculateTension();
            this.audioManager.updateMusicTension(tension);
        }
    }

    /**
     * Calculate game tension based on enemies, level, and distance threat
     * @returns {number} Tension value (0-1)
     */
    calculateTension() {
        const enemyWeights = {
            'carrier': 3.0,
            'tank': 2.0,
            'formation': 1.5,
            'swarm': 1.5,
            'splinter': 1.3,
            'fast': 1.2,
            'basic': 1.0
        };

        let enemyCount = 0;
        let totalWeight = 0;
        let bottomHalfCount = 0;
        const bottomHalfY = this.canvas.height / 2;

        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            enemyCount++;
            totalWeight += enemyWeights[enemy.type] || 1.0;
            if (enemy.y > bottomHalfY) bottomHalfCount++;
        }

        const enemyCountComponent = Math.min(enemyCount / 15, 1.0) * 0.3;
        const enemyWeightComponent = Math.min(totalWeight / 10, 1.0) * 0.35;
        const levelComponent = Math.min((this.level - 1) / 19, 1.0) * 0.25;
        const distanceThreatComponent = enemyCount > 0
            ? (bottomHalfCount / enemyCount) * 0.1
            : 0;

        return Math.max(0, Math.min(1, enemyCountComponent + enemyWeightComponent + levelComponent + distanceThreatComponent));
    }

    /**
     * Play enemy-specific death sound
     * @param {string} enemyType - Type of enemy
     */
    playEnemyDeathSound(enemyType) {
        // Map enemy types to their death sounds
        const soundMap = {
            'basic': 'basic',
            'fast': 'fast',
            'tank': 'tank',
            'formation': 'formation',
            'swarm': 'swarm',
            'splinter': 'basic',
            'carrier': 'carrier'
        };

        const soundName = soundMap[enemyType] || 'hit';
        this.audioManager.play(soundName);
    }

    /**
     * Gain experience from defeated enemy unit
     * Creates an experience powerup instead of directly adding experience
     * @param {Enemy} enemy - The enemy
     * @param {number} unitIndex - Index of the unit (for positioning multiple XP powerups)
     */
    gainExperienceFromEnemy(enemy, unitIndex = 0) {
        if (!this.player) return;

        let xpAmount = 1;

        // Tank-like enemies: XP only depends on level (doubled)
        if (enemy.type === 'tank' || (enemy.type === 'splinter' && !enemy.isChild)) {
            // Simple formula: level-based XP for tanks (doubled from original)
            // Level 1: 20 XP, Level 5: 22 XP, Level 10: 24 XP, Level 20: 28 XP
            xpAmount = Math.floor(20 + (this.level - 1) * 1); // Doubled: 10->20, 0.5->1
            xpAmount = Math.max(1, xpAmount);
        }
        // Formation/Swarm enemies: XP depends on level and unit count (inverse relationship, doubled)
        else if (enemy.type === 'formation' || enemy.type === 'swarm' || (enemy.type === 'splinter' && enemy.isChild)) {
            const maxUnits = enemy.maxUnits || enemy.maxEnemies || 1;
            // Base XP per unit based on level, inversely proportional to unit count (doubled)
            // Level 1: base 20 XP, Level 5: base 30 XP, Level 10: base 40 XP
            // Then divided by unit count: more units = less XP per unit
            const baseXP = Math.floor(20 + (this.level - 1) * 2); // Doubled: 10->20, 1->2
            xpAmount = Math.floor(baseXP / maxUnits);
            xpAmount = Math.max(1, xpAmount);
        }
        // Other enemies (Basic, Fast, Carrier): simplified formula based on level only
        else {
            // Simple level-based XP calculation
            // Basic: Level 1: 2 XP, Level 5: 4 XP, Level 10: 6 XP
            // Fast: Level 1: 4 XP, Level 5: 8 XP, Level 10: 12 XP
            // Carrier: Level 5: 60 XP, Level 10: 84 XP, Level 15: 108 XP (doubled)
            let baseXPPerLevel = 2; // Base XP per level for Basic
            if (enemy.type === 'fast') {
                baseXPPerLevel = 4; // Fast enemies give 2x Basic
            } else if (enemy.type === 'carrier') {
                baseXPPerLevel = 60; // Carrier gives much more (doubled from 30)
            }

            xpAmount = Math.floor(baseXPPerLevel + (this.level - 1) * (baseXPPerLevel / 5));
            xpAmount = Math.max(1, xpAmount);
        }

        // Randomly select which upgrade type to gain XP for
        const upgradeTypes = ['rapidfire', 'multishot', 'powerboost', 'altlane'];
        const randomType = upgradeTypes[randomInt(0, upgradeTypes.length - 1)];

        // Calculate position offset for multiple units
        const offsetX = (unitIndex % 3 - 1) * 20; // Spread horizontally
        const offsetY = Math.floor(unitIndex / 3) * 15; // Stack vertically

        // Only create experience powerup if XP amount is large (> level * 5 + 5)
        // Otherwise, directly add experience and show XP text (like before)
        if (xpAmount > this.level * 5 + 5) {
            // Create experience powerup for large XP amounts
            const experiencePowerup = PowerupFactory.create('experience', enemy.x + offsetX, enemy.y - offsetY, xpAmount, randomType);
            this.powerups.push(experiencePowerup);
        } else {
            // Directly add experience for small XP amounts (like before)
            const adjustedXpAmount = this.applyExperienceMultiplier(xpAmount);
            const oldLevel = this.player.getUpgradeLevel(randomType);
            this.player.addExperience(randomType, adjustedXpAmount);
            const newLevel = this.player.getUpgradeLevel(randomType);

            // Show XP text at enemy position with offset
            this.xpTexts.push(new XPText(enemy.x + offsetX, enemy.y - offsetY, adjustedXpAmount, randomType));

            // If leveled up, play upgrade sound and trigger flash
            if (newLevel > oldLevel) {
                const upgradeSoundName = randomType + 'Upgrade';
                if (this.audioManager.sounds[upgradeSoundName]) {
                    this.audioManager.play(upgradeSoundName);
                }
                // Trigger flash effect
                this.triggerUpgradeFlash(randomType);
            }

            this.updateUI();
        }
    }

    /**
     * Calculate score needed to reach next level
     * @returns {number} Score needed to reach next level
     */
    getScoreToNextLevel() {
        // Calculate current score-based level
        let scoreBasedLevel = 1;
        let totalRequired = 0;

        const A = 200;  // Constant term
        const B = 120;  // Linear coefficient
        const C = 30;   // Quadratic coefficient
        const D = 1;    // Cubic coefficient
        const E = 1/10;    // Quartic coefficient

        // Find current score-based level
        while (true) {
            const n = scoreBasedLevel;
            const requiredForNext = Math.floor(A + B * n + C * n * n + D * n * n * n + E * n * n * n * n);
            
            if (this.score >= totalRequired + requiredForNext) {
                totalRequired += requiredForNext;
                scoreBasedLevel++;
            } else {
                break;
            }
        }

        // Calculate score needed for next level
        const nextLevel = scoreBasedLevel + 1;
        const requiredForNext = Math.floor(A + B * nextLevel + C * nextLevel * nextLevel + D * nextLevel * nextLevel * nextLevel + E * nextLevel * nextLevel * nextLevel * nextLevel);
        const totalForNext = totalRequired + requiredForNext;
        const scoreNeeded = Math.max(0, totalForNext - this.score);

        return scoreNeeded;
    }

    /**
     * Trigger upgrade flash effect
     * @param {string} upgradeType - Type of upgrade (rapidfire, multishot, powerboost, altlane)
     */
    triggerUpgradeFlash(upgradeType) {
        this.upgradeFlash = {
            type: upgradeType,
            startTime: Date.now(),
            duration: 500 // 0.5 seconds
        };
    }

    /**
     * Update UI elements (throttled to prevent excessive DOM rebuilds)
     */
    updateUI() {
        const now = Date.now();
        if (this._lastUIUpdate && now - this._lastUIUpdate < 100) {
            this._uiUpdatePending = true;
            return;
        }
        this._lastUIUpdate = now;
        this._uiUpdatePending = false;
        this.scoreElement.textContent = Math.floor(this.score);
        this.levelElement.textContent = this.level;

        // Update score to next level
        if (this.scoreToNextElement) {
            const scoreToNext = this.getScoreToNextLevel();
            this.scoreToNextElement.textContent = Math.floor(scoreToNext);
        }

        // Update time display
        if (this.timeElement) {
            const minutes = Math.floor(this.elapsedTime / 60);
            const seconds = this.elapsedTime % 60;
            this.timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Update side upgrade panel with descriptions
        if (this.player) {
            const upgrades = this.player.getAllUpgrades();
            const upgradeConfig = {
                'rapidfire': {
                    icon: '⚡',
                    name: 'Fire Rate',
                    desc: 'Shooting Speed',
                    color: '#ff6b6b'
                },
                'multishot': {
                    icon: '🔫',
                    name: 'Multi Shot',
                    desc: 'Bullet Count',
                    color: '#4ecdc4'
                },
                'powerboost': {
                    icon: '💨',
                    name: 'Power Boost',
                    desc: 'Damage & Speed',
                    color: '#ffe66d'
                },
                'altlane': {
                    icon: '🚀',
                    name: 'Alt Lane',
                    desc: 'Movement Speed & Alt Ship',
                    color: '#a29bfe'
                }
            };

            // Clear existing display
            this.upgradePanel.innerHTML = '';

            // Add title
            const title = document.createElement('div');
            title.className = 'upgrade-panel-title';
            title.textContent = 'UPGRADES';
            this.upgradePanel.appendChild(title);

            // Create upgrade items for all types with progress bars
            const experience = this.player.getAllExperience();
            for (const [type, config] of Object.entries(upgradeConfig)) {
                const level = upgrades[type] || 0;
                const currentExp = experience[type] || 0;
                const requiredExp = this.player.getRequiredExperience(type);
                const progress = this.player.getExperienceProgress(type);

                const upgradeItem = document.createElement('div');
                upgradeItem.className = 'upgrade-item' + (level > 0 ? ' has-upgrade' : '');

                const icon = document.createElement('div');
                icon.className = `upgrade-icon ${type}`;
                icon.textContent = config.icon;

                const info = document.createElement('div');
                info.className = 'upgrade-info';

                const name = document.createElement('div');
                name.className = 'upgrade-name';
                name.textContent = config.name;

                const desc = document.createElement('div');
                desc.className = 'upgrade-desc';
                desc.textContent = config.desc;

                // Progress bar container
                const progressContainer = document.createElement('div');
                progressContainer.className = 'upgrade-progress-container';

                const progressBar = document.createElement('div');
                progressBar.className = 'upgrade-progress-bar';
                progressBar.style.width = `${progress * 100}%`;

                const progressText = document.createElement('div');
                progressText.className = 'upgrade-progress-text';
                progressText.textContent = `${currentExp}/${requiredExp}`;

                progressContainer.appendChild(progressBar);
                progressContainer.appendChild(progressText);

                info.appendChild(name);
                info.appendChild(desc);
                info.appendChild(progressContainer);

                const levelDisplay = document.createElement('div');
                levelDisplay.className = 'upgrade-level';
                levelDisplay.textContent = `Lv.${level}`;

                upgradeItem.appendChild(icon);
                upgradeItem.appendChild(info);
                upgradeItem.appendChild(levelDisplay);
                this.upgradePanel.appendChild(upgradeItem);
            }
        } else {
            this.upgradePanel.innerHTML = '';
        }
    }

    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.frameCount++;
        this.frameCountSinceLastLog++;

        // Log system status every 5 seconds
        if (timestamp - this.lastLogTime >= this.logInterval) {
            this.logSystemStatus(timestamp);
            this.lastLogTime = timestamp;
            this.lastLogFrameCount = this.frameCountSinceLastLog;
            this.frameCountSinceLastLog = 0;
        }

        try {
            // Flush pending UI updates that were throttled
            if (this._uiUpdatePending) {
                this._lastUIUpdate = 0;
                this.updateUI();
            }

            const perfStart = performance.now();

            this.handleInput();
            const inputTime = performance.now() - perfStart;

            const updateStart = performance.now();
            this.update();
            const updateTime = performance.now() - updateStart;

            const drawStart = performance.now();
            this.draw();
            const drawTime = performance.now() - drawStart;
            
            // Calculate total frame time
            const totalFrameTime = inputTime + updateTime + drawTime;

            // Update performance test system if available
            if (this.testManager) {
                this.testManager.update(totalFrameTime);
            }

            // Log if any operation takes too long (>16ms for 60fps)
            if (updateTime > 16 || drawTime > 16 || inputTime > 16) {
                console.warn(`SLOW OPERATION DETECTED - Input: ${inputTime.toFixed(2)}ms, Update: ${updateTime.toFixed(2)}ms, Draw: ${drawTime.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error('ERROR in game loop:', error);
            console.error('Stack trace:', error.stack);
            // Log current state when error occurs
            this.logSystemStatus(timestamp);
            throw error; // Re-throw to see error in console
        }

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    /**
     * Log system status for debugging
     * @param {number} timestamp - Current timestamp
     */
    logSystemStatus(timestamp) {
        // Measure update performance
        const updateStart = performance.now();
        // This is called from gameLoop, so we can't measure update() here
        // But we can log what we know

        const logData = {
            timestamp: new Date().toISOString(),
            gameTime: this.gameStartTime > 0 ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
            gameState: this.state,
            level: this.level,
            score: this.score,

            // Entity counts
            enemyCount: this.enemies.length,
            activeEnemyCount: this.enemies.filter(e => e.active).length,
            powerupCount: this.powerups.length,
            activePowerupCount: this.powerups.filter(p => p.active).length,
            bulletCount: this.player ? this.player.bulletGroups.length : 0,
            effectCount: this.effects.length,
            xpTextCount: this.xpTexts.length,

            // Performance
            fps: Math.round(this.lastLogFrameCount / (this.logInterval / 1000)),
            frameCount: this.frameCount,

            // Audio system status
            audioEnabled: this.audioManager.enabled,
            musicEnabled: this.audioManager.musicEnabled,
            currentMusic: this.audioManager.currentMusic,
            tension: this.audioManager.tension.toFixed(3),
            targetTension: this.audioManager.targetTension.toFixed(3),
            musicLayers: Object.keys(this.audioManager.musicLayers || {}),
            musicOscillators: (this.audioManager.musicOscillators || []).length,
            patternIntervals: Object.keys(this.audioManager.patternIntervals || {}),
            beatSyncInterval: this.audioManager.beatSyncInterval !== null,
            killAccentQueue: (this.audioManager.killAccentQueue || []).length,

            // Enemy type breakdown
            enemyTypes: this.getEnemyTypeBreakdown(),

            // Player status
            playerUpgrades: this.player ? this.player.getAllUpgrades() : null,

            // Memory (if available)
            memory: this.getMemoryInfo()
        };

        console.log('=== GAME STATUS LOG ===');
        console.log(JSON.stringify(logData, null, 2));
        console.log('=======================');
    }

    /**
     * Get breakdown of enemy types
     * @returns {object} Enemy type counts
     */
    getEnemyTypeBreakdown() {
        const breakdown = {};
        this.enemies.forEach(enemy => {
            if (enemy.active) {
                breakdown[enemy.type] = (breakdown[enemy.type] || 0) + 1;
            }
        });
        return breakdown;
    }

    /**
     * Get memory information if available
     * @returns {object} Memory info
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
            };
        }
        return { available: false };
    }
}
