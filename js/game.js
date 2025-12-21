/**
 * Main Game Class - Manages game state, entities, and game loop
 */
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        // Game state
        this.state = 'menu'; // menu, playing, gameover
        this.score = 0;
        this.level = 1;
        this.frameCount = 0;

        // Game entities
        this.player = null;
        this.enemies = [];
        this.powerups = [];

        // Systems
        this.audioManager = new AudioManager();
        this.audioManager.initializeDefaultSounds();

        // Input handling
        this.keys = {};
        this.keysPressed = {}; // Track keys that were just pressed (not held)
        this.setupInputHandlers();

        // UI elements
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.powerupIndicator = document.getElementById('powerup-indicator');
        this.menuScreen = document.getElementById('menuScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');

        // Setup UI handlers
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('restartButton').addEventListener('click', () => this.start());

        // Start game loop
        this.lastTime = 0;
        this.gameLoop(0);
    }

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
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
    }

    /**
     * Start new game
     */
    start() {
        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.frameCount = 0;
        this.enemies = [];
        this.powerups = [];

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
    gameOver() {
        this.state = 'gameover';
        this.audioManager.play('gameover');
        this.finalScoreElement.textContent = this.score;
        this.gameOverScreen.style.display = 'flex';
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
        // Increase spawn rate with level
        const spawnRate = CONFIG.ENEMY_SPAWN_RATE * (1 + (this.level - 1) * 0.1);
        
        if (Math.random() < spawnRate) {
            const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
            const x = CONFIG.LANE_POSITIONS[laneIndex];
            const enemy = EnemyFactory.createRandom(x, -40, laneIndex, this.level);
            this.enemies.push(enemy);
        }
    }

    /**
     * Spawn powerups
     */
    spawnPowerups() {
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
        if (this.state !== 'playing') return;

        this.frameCount++;

        // Update player
        this.player.update();
        
        // Auto-shoot
        if (this.player) {
            this.player.shoot(this.audioManager);
        }

        // Spawn enemies and powerups
        this.spawnEnemies();
        this.spawnPowerups();

        // Update enemies
        this.enemies.forEach(enemy => {
            // Increase speed with level based on enemy's base speed
            enemy.speed = enemy.baseSpeed + (this.level - 1) * CONFIG.ENEMY_SPEED_INCREMENT;
            enemy.update();
        });
        this.enemies = this.enemies.filter(enemy => enemy.active);

        // Update powerups
        this.powerups.forEach(powerup => powerup.update());
        this.powerups = this.powerups.filter(powerup => powerup.active);

        // Check bullet-enemy collisions
        if (this.player) {
            this.player.bullets.forEach(bullet => {
                if (!bullet.active) return; // Skip already inactive bullets
                
                this.enemies.forEach(enemy => {
                    if (!enemy.active) return; // Skip inactive enemies
                    
                    if (checkCollision(bullet.getBounds(), enemy.getBounds())) {
                        bullet.active = false;
                        const destroyed = enemy.takeDamage(bullet.damage);
                        if (destroyed) {
                            this.score += enemy.scoreValue;
                            this.audioManager.play('hit');
                            this.updateUI();
                        }
                        return; // Bullet hit, no need to check other enemies
                    }
                });
            });
        }

        // Check player-enemy collisions
        this.enemies.forEach(enemy => {
            if (checkCollision(this.player.getBounds(), enemy.getBounds())) {
                this.gameOver();
            }
        });

        // Check player-powerup collisions
        this.powerups.forEach(powerup => {
            if (checkCollision(this.player.getBounds(), powerup.getBounds())) {
                powerup.active = false;
                powerup.apply(this.player);
                this.audioManager.play('powerup');
                this.updateUI();
            }
        });

        // Level up
        const newLevel = Math.floor(this.score / CONFIG.LEVEL_UP_SCORE) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.updateUI();
        }
    }

    /**
     * Draw game
     */
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state !== 'playing') return;

        // Draw lane dividers
        this.drawLaneDividers();

        // Draw player
        if (this.player) {
            this.player.draw(this.ctx);

            // Draw bullets
            this.player.bullets.forEach(bullet => bullet.draw(this.ctx));
        }

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw powerups
        this.powerups.forEach(powerup => powerup.draw(this.ctx));
    }

    /**
     * Draw lane dividers
     */
    drawLaneDividers() {
        // Already drawn by player.drawLaneIndicators, but can add more visual elements here
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;

        // Update powerup indicator
        const activePowerups = this.player ? this.player.getActivePowerups() : [];
        if (activePowerups.length > 0) {
            const powerupNames = {
                'rapidfire': 'Rapid Fire',
                'multishot': 'Multi Shot',
                'speedboost': 'Speed Boost'
            };
            const names = activePowerups.map(p => powerupNames[p] || p).join(', ');
            this.powerupIndicator.textContent = `Active: ${names}`;
        } else {
            this.powerupIndicator.textContent = '';
        }
    }

    /**
     * Main game loop
     */
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.handleInput();
        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

