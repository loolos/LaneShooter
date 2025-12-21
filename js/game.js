/**
 * Main Game Class - Manages game state, entities, and game loop
 */
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

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
        this.upgradePanel = document.getElementById('upgradePanel');
        this.menuScreen = document.getElementById('menuScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.finalScoreElement = document.getElementById('finalScore');

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
        const touchLeft = document.getElementById('touchLeft');
        const touchRight = document.getElementById('touchRight');
        const canvas = this.canvas;

        // Prevent default touch behaviors
        canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

        // Left area handlers
        const handleLeft = () => {
            if (this.state === 'playing' && this.player) {
                this.player.switchLane(-1);
            }
        };

        // Right area handlers
        const handleRight = () => {
            if (this.state === 'playing' && this.player) {
                this.player.switchLane(1);
            }
        };

        // Click events
        touchLeft.addEventListener('click', handleLeft);
        touchRight.addEventListener('click', handleRight);

        // Touch events
        touchLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleLeft();
        }, { passive: false });

        touchRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleRight();
        }, { passive: false });

        // Also handle touch on canvas (for direct canvas interaction)
        let touchStartX = 0;
        canvas.addEventListener('touchstart', (e) => {
            if (this.state !== 'playing' || !this.player) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            touchStartX = touch.clientX - rect.left;
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (this.state !== 'playing' || !this.player) return;
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const touchEndX = touch.clientX - rect.left;
            const touchDeltaX = touchEndX - touchStartX;

            // Swipe detection (optional - for swipe gestures)
            // For now, just use tap position
            const canvasWidth = rect.width;
            const tapX = touchEndX;

            if (tapX < canvasWidth / 2) {
                // Left half
                this.player.switchLane(-1);
            } else {
                // Right half
                this.player.switchLane(1);
            }
        }, { passive: false });
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
                'speedboost': { 
                    icon: '💨', 
                    name: 'Bullet Power', 
                    desc: 'Attack Power',
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
            
            // Create upgrade items for all types
            for (const [type, config] of Object.entries(upgradeConfig)) {
                const level = upgrades[type] || 0;
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
                
                info.appendChild(name);
                info.appendChild(desc);
                
                const levelDisplay = document.createElement('div');
                levelDisplay.className = 'upgrade-level';
                levelDisplay.textContent = level;
                
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

        this.handleInput();
        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

