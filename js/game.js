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
        this.xpTexts = []; // Floating XP text

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
        this.enemies = [];
        this.powerups = [];
        this.xpTexts = [];

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

        // Update XP texts
        this.xpTexts.forEach(xpText => xpText.update());
        this.xpTexts = this.xpTexts.filter(xpText => xpText.active);

        // Check bullet-enemy collisions
        if (this.player) {
            this.player.bullets.forEach(bullet => {
                if (!bullet.active) return; // Skip already inactive bullets
                
                this.enemies.forEach(enemy => {
                    if (!enemy.active) return; // Skip inactive enemies
                    
                    if (checkCollision(bullet.getBounds(), enemy.getBounds())) {
                        bullet.active = false;
                        const result = enemy.takeDamage(bullet.damage);
                        const unitsKilled = result.unitsKilled || 0;
                        
                        // Give experience for each unit killed
                        if (unitsKilled > 0) {
                            // Calculate experience chance based on enemy strength
                            // Stronger enemies have higher chance, weaker enemies have lower chance
                            const maxUnits = enemy.maxUnits || enemy.maxEnemies || 1;
                            const baseScore = enemy.scoreValue / maxUnits; // Score per unit
                            const baseChance = 0.3; // Base 30% chance
                            
                            // Adjust chance: stronger units (higher score) = higher chance
                            // Weak units (score < 5) have reduced chance
                            let experienceChance = baseChance;
                            if (baseScore < 5) {
                                experienceChance = baseChance * (baseScore / 5); // Scale down for weak enemies
                            } else if (baseScore > 10) {
                                experienceChance = Math.min(0.5, baseChance * (baseScore / 10)); // Scale up for strong enemies
                            }
                            
                            for (let i = 0; i < unitsKilled; i++) {
                                // Chance to gain experience from each unit (adjusted based on strength)
                                if (Math.random() < experienceChance) {
                                    this.gainExperienceFromEnemy(enemy, i);
                                }
                            }
                        }
                        
                        if (result.destroyed) {
                            this.score += enemy.scoreValue;
                            this.audioManager.play('hit');
                            this.updateUI();
                        } else if (unitsKilled > 0) {
                            // Play hit sound even if not fully destroyed
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
                const oldLevel = this.player.getUpgradeLevel(powerup.type);
                powerup.apply(this.player);
                const newLevel = this.player.getUpgradeLevel(powerup.type);
                
                // Show XP text for powerup
                this.xpTexts.push(new XPText(powerup.x, powerup.y, 5, powerup.type));
                
                // If leveled up, show level up effect
                if (newLevel > oldLevel) {
                    // Could add level up effect here
                }
                
                this.audioManager.play('powerup');
                this.updateUI();
            }
        });

        // Level up - progressive score requirement
        // Level 1->2: 200, Level 2->3: 250, Level 3->4: 300, etc.
        // Formula: baseScore + (level-1) * increment
        let calculatedLevel = 1;
        let totalRequired = 0;
        
        while (true) {
            const requiredForNext = CONFIG.LEVEL_UP_SCORE + (calculatedLevel - 1) * CONFIG.LEVEL_UP_SCORE_INCREMENT;
            if (this.score >= totalRequired + requiredForNext) {
                totalRequired += requiredForNext;
                calculatedLevel++;
            } else {
                break;
            }
        }
        
        if (calculatedLevel > this.level) {
            this.level = calculatedLevel;
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

        // Draw XP texts
        this.xpTexts.forEach(xpText => xpText.draw(this.ctx));
    }

    /**
     * Draw lane dividers
     */
    drawLaneDividers() {
        // Already drawn by player.drawLaneIndicators, but can add more visual elements here
    }

    /**
     * Gain experience from defeated enemy unit
     * @param {Enemy} enemy - The enemy
     * @param {number} unitIndex - Index of the unit (for positioning multiple XP texts)
     */
    gainExperienceFromEnemy(enemy, unitIndex = 0) {
        if (!this.player) return;

        // Calculate XP based on enemy strength (scoreValue) and game level
        // Base XP = enemy scoreValue / 2, scaled by level, then halved
        // For multi-unit enemies, divide by max units to get per-unit XP
        // Increased XP for stronger enemies (tank with more health, formations/swarms with more units)
        const maxUnits = enemy.maxUnits || enemy.maxEnemies || 1;
        const baseXP = Math.max(1, Math.floor(enemy.scoreValue / 2 / maxUnits));
        const levelMultiplier = 1 + (this.level - 1) * 0.2; // 20% increase per level
        
        // Bonus XP for enhanced enemies (tank with more health, or multi-unit with more units)
        let bonusMultiplier = 1.0;
        if (enemy.type === 'tank' && enemy.maxHealth > 3) {
            bonusMultiplier = 1.0 + (enemy.maxHealth - 3) * 0.1; // +10% per extra health
        } else if ((enemy.type === 'formation' || enemy.type === 'swarm')) {
            const initialCount = enemy.initialCount || (enemy.type === 'formation' ? 4 : 5);
            if (maxUnits > initialCount) {
                bonusMultiplier = 1.0 + (maxUnits - initialCount) * 0.1; // +10% per extra unit
            }
        }
        
        let xpAmount = Math.floor((baseXP * levelMultiplier * bonusMultiplier) / 2); // Reduced to half, but with bonus
        xpAmount = Math.max(1, xpAmount); // Ensure at least 1 XP

        // Randomly select which upgrade type to gain XP for
        const upgradeTypes = ['rapidfire', 'multishot', 'speedboost', 'lanespeed'];
        const randomType = upgradeTypes[randomInt(0, upgradeTypes.length - 1)];

        // Add experience
        const oldLevel = this.player.getUpgradeLevel(randomType);
        this.player.addExperience(randomType, xpAmount);
        const newLevel = this.player.getUpgradeLevel(randomType);

        // Calculate position offset for multiple units
        const offsetX = (unitIndex % 3 - 1) * 20; // Spread horizontally
        const offsetY = Math.floor(unitIndex / 3) * 15; // Stack vertically
        
        // Show XP text at enemy position with offset
        this.xpTexts.push(new XPText(enemy.x + offsetX, enemy.y - offsetY, xpAmount, randomType));

        // If leveled up, show level up effect
        if (newLevel > oldLevel) {
            // Could add level up effect here
        }

        this.updateUI();
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

        this.handleInput();
        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

