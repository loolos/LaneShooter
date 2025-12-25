/**
 * Main Game Class - Manages game state, entities, and game loop
 */
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        // Game state
        this.state = 'menu'; // menu, playing, gameover, victory
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

        // Systems
        this.audioManager = new AudioManager();
        this.audioManager.initializeDefaultSounds();
        this.audioManager.initializeMusic();
        this.currentMusicLevel = 1;
        this.hasCarrier = false;
        this.victoryShown = false; // Track if victory has been shown (only show once at level 20)
        this.victoryLocked = false; // Lock victory screen for 3 seconds
        this.carrierSpawnedAtLevels = new Set(); // Track which levels have spawned a carrier
        this.victoryParticles = []; // Victory screen particles
        this.victoryStars = []; // Victory screen stars
        this.victoryEnergyRings = []; // Victory screen energy rings
        this.victoryTime = 0; // Time since victory screen appeared

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
        this.currentMusicLevel = 1;
        this.hasCarrier = false;
        this.victoryShown = false; // Reset victory flag on new game
        this.victoryLocked = false; // Reset victory lock on new game
        this.victoryParticles = [];
        this.victoryStars = [];
        this.victoryEnergyRings = [];
        this.victoryTime = 0;
        this.carrierSpawnedAtLevels = new Set(); // Reset carrier spawn tracking

        // Start background music
        this.audioManager.startBackgroundMusic(this.level);

        // Create player in center of first lane
        const startX = CONFIG.LANE_POSITIONS[0];
        this.player = new Player(startX, CONFIG.PLAYER_Y);

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
        this.victoryScoreElement.textContent = this.score;
        this.victoryScreen.style.display = 'flex';
        this.victoryTime = 0;

        // Initialize victory animation particles
        this.initVictoryAnimation();

        // Play epic victory music
        this.audioManager.startVictoryMusic();

        // Lock screen for 3 seconds to prevent quick skipping
        this.victoryLocked = true;
        setTimeout(() => {
            this.victoryLocked = false;
        }, 3000); // 3 seconds lock

        // Setup continue handler - any key press continues the game (only after lock)
        const continueHandler = (e) => {
            // Ignore input if still locked
            if (this.victoryLocked) return;

            this.continueAfterVictory();
            document.removeEventListener('keydown', continueHandler);
            document.removeEventListener('click', continueHandler);
            document.removeEventListener('touchstart', continueHandler);
        };

        document.addEventListener('keydown', continueHandler);
        document.addEventListener('click', continueHandler);
        document.addEventListener('touchstart', continueHandler);
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
        // Don't trigger multiple times
        if (this.state === 'gameover') return;

        // Stop music when game over
        this.audioManager.stopMusic();

        // Create player death explosion effect
        if (this.player) {
            const explosion = new ExplosionEffect(this.player.x, this.player.y, 'large');
            this.effects.push(explosion);
        }

        // Delay game over screen to show explosion
        setTimeout(() => {
            this.state = 'gameover';
            this.audioManager.play('gameover');
            this.finalScoreElement.textContent = this.score;
            this.gameOverScreen.style.display = 'flex';
        }, 500); // 500ms delay for explosion animation
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
        // Increase spawn rate with level - slow gradual increase
        // Uses square root for smoother progression: level 1 = 1.0x, level 5 = 1.4x, level 10 = 1.73x
        const spawnRate = CONFIG.ENEMY_SPAWN_RATE * Math.min(1 + Math.sqrt(this.level - 1) * 0.1, 2);

        if (Math.random() < spawnRate) {
            const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
            const x = CONFIG.LANE_POSITIONS[laneIndex];
            const enemy = EnemyFactory.createRandom(x, -40, laneIndex, this.level);
            this.enemies.push(enemy);
        }

        // Spawn carrier enemy occasionally at level 5+ (if not at forced levels that are multiples of 5)
        if (this.level >= 5 && this.level % 5 !== 0) {
            // Check if there's already a carrier
            const hasCarrier = this.enemies.some(e => e.type === 'carrier' && e.active);
            if (!hasCarrier && Math.random() < 0.001) { // Very low spawn rate for carrier
                const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                const x = CONFIG.LANE_POSITIONS[laneIndex];
                const carrier = EnemyFactory.create('carrier', x, 100, laneIndex, this.level); // Spawn near top
                this.enemies.push(carrier);
                // Switch to carrier music when carrier spawns
                this.hasCarrier = true;
                this.audioManager.startCarrierMusic();
            }
        }
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
     * Update game entities
     */
    update() {
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
        
        // Limit effects to prevent memory issues
        if (this.effects.length > 100) {
            this.effects = this.effects.slice(-100); // Keep only last 100 effects
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

        // If victory state, pause all game logic but update victory animation
        if (this.state === 'victory') {
            this.updateVictoryAnimation();
            return; // Completely pause game during victory screen
        }

        if (this.state !== 'playing') return;

        // Update elapsed time
        if (this.gameStartTime > 0) {
            this.elapsedTime = Math.floor((Date.now() - this.gameStartTime) / 1000); // Convert to seconds
        }

        // Update music based on game state
        this.updateMusic();

        // Update player
        this.player.update();

        // Auto-shoot
        if (this.player) {
            this.player.shoot(this.audioManager);
        }

        // Spawn enemies and powerups
        this.spawnEnemies();
        this.spawnPowerups();

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

            // Handle carrier enemy spawning (only if carrier is still active)
            if (enemy.type === 'carrier' && enemy.active && enemy.shouldSpawnEnemy()) {
                // Spawn a random enemy from the carrier (only heavy or formation enemies)
                const spawnX = enemy.x;
                const spawnY = enemy.y + enemy.height / 2 + 20; // Spawn below the carrier

                // Create spawn animation effect with portal
                const spawnEffect = EffectManager.createEffect(spawnX, spawnY, 'spawn');
                this.effects.push(spawnEffect);

                // Only spawn heavy (tank) or formation enemies
                const enemyTypes = ['tank', 'formation'];
                const randomType = enemyTypes[randomInt(0, enemyTypes.length - 1)];
                const spawnedEnemy = EnemyFactory.create(randomType, spawnX, spawnY, enemy.laneIndex, this.level);
                this.enemies.push(spawnedEnemy);
                enemy.resetSpawnCooldown();
            }
            
            enemyIndex++;
        }

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

        // Optimized bullet-enemy collision detection: lane-based y-axis only
        if (this.player) {
            const activeBullets = this.player.bullets.filter(b => b.active);
            const activeEnemies = this.enemies.filter(e => e.active);
            
            // Safety check: prevent excessive entity counts
            if (activeBullets.length > 200 || activeEnemies.length > 100) {
                console.warn(`WARNING: Unusually high entity count - Bullets: ${activeBullets.length}, Enemies: ${activeEnemies.length}`);
                if (activeBullets.length > 300) {
                    this.player.bullets = this.player.bullets.filter(b => b.active).slice(0, 200);
                }
                if (activeEnemies.length > 150) {
                    this.enemies = this.enemies.filter(e => e.active).slice(0, 100);
                }
            }

            // Group bullets and enemies by lane - each lane is checked independently
            const bulletsByLane = new Array(CONFIG.LANE_COUNT).fill(null).map(() => []);
            const enemiesByLane = new Array(CONFIG.LANE_COUNT).fill(null).map(() => []);

            // Group bullets by their lane (determined at creation time)
            activeBullets.forEach(bullet => {
                if (bullet.laneIndex >= 0 && bullet.laneIndex < CONFIG.LANE_COUNT) {
                    bulletsByLane[bullet.laneIndex].push(bullet);
                }
            });

            // Group enemies by lane
            activeEnemies.forEach(enemy => {
                if (enemy.laneIndex >= 0 && enemy.laneIndex < CONFIG.LANE_COUNT) {
                    enemiesByLane[enemy.laneIndex].push(enemy);
                }
            });

            // For each lane, independently check collisions between bullets and enemies
            // Each lane only checks its own bullets against its own most forward enemy
            for (let laneIndex = 0; laneIndex < CONFIG.LANE_COUNT; laneIndex++) {
                // Get bullets and enemies for this specific lane
                const laneBullets = bulletsByLane[laneIndex];
                const laneEnemies = enemiesByLane[laneIndex];

                // Skip if no bullets or enemies in this lane
                if (laneBullets.length === 0 || laneEnemies.length === 0) {
                    continue;
                }

                // Find the most forward enemy in this lane (bottommost = closest to player)
                // This is the enemy with the largest bottom Y value
                const mostForwardEnemy = laneEnemies.reduce((forward, enemy) => {
                    const enemyBottomY = enemy.getBottomY();
                    const forwardBottomY = forward ? forward.getBottomY() : -Infinity;
                    return enemyBottomY > forwardBottomY ? enemy : forward;
                }, null);

                if (!mostForwardEnemy) continue;

                const mostForwardEnemyBottomY = mostForwardEnemy.getBottomY();

                // Check all bullets in this lane, process all bullets that reach the enemy bottom
                // Sort bullets by Y descending (most forward first) to process collisions in order
                const sortedBullets = laneBullets
                    .filter(b => b && b.active)
                    .sort((a, b) => b.y - a.y); // Sort descending (most forward first)

                // Process all bullets that collide with the enemy in this frame
                for (const bullet of sortedBullets) {
                    // Skip if bullet is no longer active (was destroyed by previous collision)
                    if (!bullet.active) continue;
                    
                    // Y-axis collision detection: bullet top <= enemy bottom
                    if (bullet.y <= mostForwardEnemyBottomY) {
                        // Check if enemy is still active (might have been destroyed by previous bullet)
                        if (!mostForwardEnemy.active) {
                            // Enemy already destroyed, remaining bullets continue upward (don't destroy them)
                            continue;
                        }

                        // Collision detected!
                        bullet.active = false;

                        // Calculate actual damage based on bullet power and enemy type
                        const actualDamage = bullet.getDamage(mostForwardEnemy);

                        // Store unit positions before damage for formation/swarm enemies
                        let destroyedUnitPositions = [];
                        if ((mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm') && mostForwardEnemy.units) {
                            // Pre-calculate formation dimensions if needed
                            let startX, startY, colSpacing, rowSpacing;
                            if (mostForwardEnemy.type === 'formation') {
                                const totalWidth = (mostForwardEnemy.cols * mostForwardEnemy.enemyWidth) + ((mostForwardEnemy.cols - 1) * mostForwardEnemy.spacing);
                                const totalHeight = (mostForwardEnemy.rows * mostForwardEnemy.enemyHeight) + ((mostForwardEnemy.rows - 1) * mostForwardEnemy.rowSpacing);
                                startX = mostForwardEnemy.x - totalWidth / 2;
                                startY = mostForwardEnemy.y - totalHeight / 2;
                                colSpacing = mostForwardEnemy.enemyWidth + mostForwardEnemy.spacing;
                                rowSpacing = mostForwardEnemy.enemyHeight + mostForwardEnemy.rowSpacing;
                            }
                            
                            // Store positions of units that are about to be destroyed
                            mostForwardEnemy.units.forEach(unit => {
                                if (unit.health > 0 && unit.health <= actualDamage) {
                                    if (mostForwardEnemy.type === 'formation') {
                                        destroyedUnitPositions.push({
                                            x: startX + (unit.col * colSpacing) + (mostForwardEnemy.enemyWidth / 2),
                                            y: startY + (unit.row * rowSpacing) + (mostForwardEnemy.enemyHeight / 2)
                                        });
                                    } else { // swarm
                                        destroyedUnitPositions.push({
                                            x: mostForwardEnemy.x + unit.offsetX,
                                            y: mostForwardEnemy.y + unit.offsetY
                                        });
                                    }
                                }
                            });
                        }

                        const result = mostForwardEnemy.takeDamage(actualDamage);
                        const unitsKilled = result.unitsKilled || 0;

                        // Give score and experience for each unit killed (Formation/Swarm)
                        if (unitsKilled > 0 && (mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm')) {
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
                            // Only give score for non-multi-unit enemies (Formation/Swarm already handled above)
                            if (mostForwardEnemy.type !== 'formation' && mostForwardEnemy.type !== 'swarm') {
                                this.score += mostForwardEnemy.scoreValue;
                            }

                            // Give experience when enemy is completely destroyed (for non-multi-unit enemies)
                            if (mostForwardEnemy.type !== 'formation' && mostForwardEnemy.type !== 'swarm') {
                                // Get drop rate based on enemy type
                                let dropRate = 0.2; // Default
                                if (mostForwardEnemy.type === 'basic') {
                                    dropRate = 0.2; // 20%
                                } else if (mostForwardEnemy.type === 'fast') {
                                    dropRate = 0.3; // 30%
                                } else if (mostForwardEnemy.type === 'tank') {
                                    dropRate = 0.5; // 50%
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

                            // Queue kill accent for beat synchronization
                            let accentIntensity = 0.5;
                            if (mostForwardEnemy.type === 'tank' || mostForwardEnemy.type === 'carrier') {
                                accentIntensity = 0.8;
                            } else if (mostForwardEnemy.type === 'formation' || mostForwardEnemy.type === 'swarm') {
                                accentIntensity = 0.6;
                            } else {
                                accentIntensity = 0.4;
                            }
                            this.audioManager.queueKillAccent(mostForwardEnemy.type, accentIntensity);

                            // Create destruction effect
                            const effect = EffectManager.createEffect(mostForwardEnemy.x, mostForwardEnemy.y, mostForwardEnemy.type);
                            this.effects.push(effect);

                            this.updateUI();
                        } else if (unitsKilled > 0) {
                            // Play hit sound even if not fully destroyed
                            this.audioManager.play('hit');

                            // Create effects for destroyed units
                            destroyedUnitPositions.forEach((pos, index) => {
                                if (index < unitsKilled) {
                                    const effect = EffectManager.createEffect(pos.x, pos.y, mostForwardEnemy.type === 'formation' ? 'formation' : 'swarm');
                                    this.effects.push(effect);
                                }
                            });

                            this.updateUI();
                        }
                    }
                }
            }
        }

        // Check player-enemy collisions (only check active enemies)
        const activeEnemiesForPlayer = this.enemies.filter(e => e.active);
        activeEnemiesForPlayer.forEach(enemy => {
            // For formation and swarm enemies, only check collision with actual units
            // (especially bottom row units that can actually hit the player)
            if (enemy.type === 'formation' || enemy.type === 'swarm') {
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
                    } else { // swarm
                        unitX = enemy.x + unit.offsetX;
                        unitY = enemy.y + unit.offsetY;
                    }

                    // Check collision with unit's actual bounds
                    let unitWidth, unitHeight;
                    if (enemy.type === 'formation') {
                        unitWidth = enemy.enemyWidth;
                        unitHeight = enemy.enemyHeight;
                    } else { // swarm
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
        });

        // Check player-powerup collisions
        this.powerups.forEach(powerup => {
            if (checkCollision(this.player.getBounds(), powerup.getBounds())) {
                powerup.active = false;

                if (powerup.type === 'experience') {
                    // Handle experience powerup
                    const oldLevel = this.player.getUpgradeLevel(powerup.upgradeType);
                    const leveledUp = powerup.apply(this.player);
                    const newLevel = this.player.getUpgradeLevel(powerup.upgradeType);

                    // Show XP text for experience powerup
                    this.xpTexts.push(new XPText(powerup.x, powerup.y, powerup.experienceAmount, powerup.upgradeType));

                    // If leveled up, show level up effect
                    if (leveledUp) {
                        // Could add level up effect here
                    }
                } else {
                    // Handle regular powerups
                    const oldLevel = this.player.getUpgradeLevel(powerup.type);
                    powerup.apply(this.player);
                    const newLevel = this.player.getUpgradeLevel(powerup.type);

                    // Show XP text for powerup
                    this.xpTexts.push(new XPText(powerup.x, powerup.y, powerup.experienceAmount || 5, powerup.type));

                    // If leveled up, show level up effect
                    if (newLevel > oldLevel) {
                        // Could add level up effect here
                    }
                }

                this.audioManager.play('powerup');
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
        // Where: A = 200, B = 100, C = 20, D = 1, E = 1
        // requiredForLevel(n) = 200 + 100*n + 20*n² + 1*n³ + 1*n⁴
        while (true) {
            const A = 200;  // Constant term
            const B = 100;  // Linear coefficient
            const C = 20;   // Quadratic coefficient
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

        // Draw player
        if (this.player) {
            this.player.draw(this.ctx);

            // Draw bullets (only active ones, and only if on screen)
            const canvasHeight = this.canvas.height;
            const canvasWidth = this.canvas.width;
            this.player.bullets.forEach(bullet => {
                if (bullet.active && bullet.y > -50 && bullet.y < canvasHeight + 50) {
                    bullet.draw(this.ctx);
                }
            });
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
     * Handle level up: clear bottom half enemies and show level up text
     * @param {number} oldLevel - Previous level
     */
    onLevelUp(oldLevel) {
        if (!this.canvas) return;

        const canvasHeight = this.canvas.height;
        const bottomHalfY = canvasHeight / 2; // Bottom half starts at middle of screen

        // Find enemies in bottom half of screen
        const enemiesToDestroy = [];
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;

            // Check if enemy is in bottom half (y > bottomHalfY)
            // For multi-unit enemies, check if any unit is in bottom half
            if (enemy.type === 'formation' || enemy.type === 'swarm') {
                // Check if any unit is in bottom half
                const hasUnitInBottomHalf = enemy.units.some(unit => {
                    if (unit.health <= 0) return false;
                    let unitY;
                    if (enemy.type === 'formation') {
                        const totalHeight = (enemy.rows * enemy.enemyHeight) + ((enemy.rows - 1) * enemy.rowSpacing);
                        const startY = enemy.y - totalHeight / 2;
                        unitY = startY + (unit.row * (enemy.enemyHeight + enemy.rowSpacing)) + (enemy.enemyHeight / 2);
                    } else { // swarm
                        unitY = enemy.y + unit.offsetY;
                    }
                    return unitY > bottomHalfY;
                });

                if (hasUnitInBottomHalf) {
                    enemiesToDestroy.push(enemy);
                }
            } else {
                // Regular enemies: check if center is in bottom half
                if (enemy.y > bottomHalfY) {
                    enemiesToDestroy.push(enemy);
                }
            }
        });

        // Destroy enemies in bottom half (no XP gain)
        enemiesToDestroy.forEach(enemy => {
            // Create explosion effects
            if (enemy.type === 'formation' || enemy.type === 'swarm') {
                // Create effects for each unit in bottom half
                enemy.units.forEach(unit => {
                    if (unit.health <= 0) return;
                    let unitX, unitY;
                    if (enemy.type === 'formation') {
                        const totalWidth = (enemy.cols * enemy.enemyWidth) + ((enemy.cols - 1) * enemy.spacing);
                        const totalHeight = (enemy.rows * enemy.enemyHeight) + ((enemy.rows - 1) * enemy.rowSpacing);
                        const startX = enemy.x - totalWidth / 2;
                        const startY = enemy.y - totalHeight / 2;
                        unitX = startX + (unit.col * (enemy.enemyWidth + enemy.spacing)) + (enemy.enemyWidth / 2);
                        unitY = startY + (unit.row * (enemy.enemyHeight + enemy.rowSpacing)) + (enemy.enemyHeight / 2);
                    } else { // swarm
                        unitX = enemy.x + unit.offsetX;
                        unitY = enemy.y + unit.offsetY;
                    }

                    if (unitY > bottomHalfY) {
                        const effect = EffectManager.createEffect(unitX, unitY, enemy.type === 'formation' ? 'formation' : 'swarm');
                        this.effects.push(effect);
                    }
                });
            } else {
                // Regular enemy explosion
                const effect = EffectManager.createEffect(enemy.x, enemy.y, enemy.type);
                this.effects.push(effect);
            }

            // Mark enemy as destroyed (no XP, no score)
            enemy.active = false;
        });

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

        // Play level up sound (if available)
        this.audioManager.play('powerup');

        // Force spawn carrier at all levels that are multiples of 5 (5, 10, 15, 20, 25, ...)
        if (this.level % 5 === 0) {
            // Check if we've already spawned a carrier at this level
            if (!this.carrierSpawnedAtLevels.has(this.level)) {
                // Force spawn carrier (even if there's already an active carrier)
                const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
                const x = CONFIG.LANE_POSITIONS[laneIndex];
                const carrier = EnemyFactory.create('carrier', x, 100, laneIndex, this.level);
                this.enemies.push(carrier);
                // Mark this level as having spawned a carrier
                this.carrierSpawnedAtLevels.add(this.level);
                // Switch to carrier music when carrier spawns
                this.hasCarrier = true;
                this.audioManager.startCarrierMusic();
            }
        }
    }

    /**
     * Update music based on game state
     */
    updateMusic() {
        if (this.state !== 'playing') {
            this.audioManager.stopMusic();
            return;
        }

        // Check for carrier status
        const hasCarrier = this.enemies.some(e => e.type === 'carrier' && e.active);

        // If carrier status changed, switch music
        if (hasCarrier !== this.hasCarrier) {
            this.hasCarrier = hasCarrier;
            if (hasCarrier) {
                // Carrier appeared, switch to intense music
                this.audioManager.startCarrierMusic();
            } else {
                // Carrier destroyed, switch back to background music
                this.audioManager.startBackgroundMusic(this.level);
            }
        }

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
        const activeEnemies = this.enemies.filter(e => e.active);
        const enemyCount = activeEnemies.length;

        // 1. Enemy count component (0-0.3)
        const maxEnemies = 15; // Assume 15 enemies is "full screen"
        const enemyCountComponent = Math.min(enemyCount / maxEnemies, 1.0) * 0.3;

        // 2. Dangerous enemy weight component (0-0.35)
        const enemyWeights = {
            'carrier': 3.0,
            'tank': 2.0,
            'formation': 1.5,
            'swarm': 1.5,
            'fast': 1.2,
            'basic': 1.0
        };

        let totalWeight = 0;
        activeEnemies.forEach(enemy => {
            totalWeight += enemyWeights[enemy.type] || 1.0;
        });

        const maxWeight = 10; // Normalize to max weight
        const enemyWeightComponent = Math.min(totalWeight / maxWeight, 1.0) * 0.35;

        // 3. Level component (0-0.25)
        const maxLevel = 20;
        const levelComponent = Math.min((this.level - 1) / (maxLevel - 1), 1.0) * 0.25;

        // 4. Distance threat component (0-0.1)
        // Enemies in bottom half of screen are more threatening
        const canvasHeight = this.canvas.height;
        const bottomHalfY = canvasHeight / 2;
        const bottomHalfEnemies = activeEnemies.filter(e => e.y > bottomHalfY);
        const distanceThreatComponent = enemyCount > 0
            ? (bottomHalfEnemies.length / enemyCount) * 0.1
            : 0;

        // Total tension
        const tension = enemyCountComponent + enemyWeightComponent + levelComponent + distanceThreatComponent;

        return Math.max(0, Math.min(1, tension));
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

        // Tank enemies: XP only depends on level (doubled)
        if (enemy.type === 'tank') {
            // Simple formula: level-based XP for tanks (doubled from original)
            // Level 1: 20 XP, Level 5: 22 XP, Level 10: 24 XP, Level 20: 28 XP
            xpAmount = Math.floor(20 + (this.level - 1) * 1); // Doubled: 10->20, 0.5->1
            xpAmount = Math.max(1, xpAmount);
        }
        // Formation/Swarm enemies: XP depends on level and unit count (inverse relationship, doubled)
        else if (enemy.type === 'formation' || enemy.type === 'swarm') {
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
            // Carrier: Level 5: 20 XP, Level 10: 30 XP, Level 15: 40 XP
            let baseXPPerLevel = 2; // Base XP per level for Basic
            if (enemy.type === 'fast') {
                baseXPPerLevel = 4; // Fast enemies give 2x Basic
            } else if (enemy.type === 'carrier') {
                baseXPPerLevel = 30; // Carrier gives much more
            }

            xpAmount = Math.floor(baseXPPerLevel + (this.level - 1) * (baseXPPerLevel / 5));
            xpAmount = Math.max(1, xpAmount);
        }

        // Randomly select which upgrade type to gain XP for
        const upgradeTypes = ['rapidfire', 'multishot', 'powerboost', 'lanespeed'];
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
            const oldLevel = this.player.getUpgradeLevel(randomType);
            this.player.addExperience(randomType, xpAmount);
            const newLevel = this.player.getUpgradeLevel(randomType);

            // Show XP text at enemy position with offset
            this.xpTexts.push(new XPText(enemy.x + offsetX, enemy.y - offsetY, xpAmount, randomType));

            // If leveled up, show level up effect
            if (newLevel > oldLevel) {
                // Could add level up effect here
            }

            this.updateUI();
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;

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
                'lanespeed': {
                    icon: '🚀',
                    name: 'Lane Speed',
                    desc: 'Movement Speed',
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
            const perfStart = performance.now();

            this.handleInput();
            const inputTime = performance.now() - perfStart;

            const updateStart = performance.now();
            this.update();
            const updateTime = performance.now() - updateStart;

            const drawStart = performance.now();
            this.draw();
            const drawTime = performance.now() - drawStart;

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
            bulletCount: this.player ? this.player.bullets.length : 0,
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

