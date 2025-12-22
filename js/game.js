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

    continueAfterVictory() {
        this.state = 'playing';
        this.victoryScreen.style.display = 'none';
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
        const spawnRate = CONFIG.ENEMY_SPAWN_RATE * (1 + Math.sqrt(this.level - 1) * 0.15);
        
        if (Math.random() < spawnRate) {
            const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
            const x = CONFIG.LANE_POSITIONS[laneIndex];
            const enemy = EnemyFactory.createRandom(x, -40, laneIndex, this.level);
            this.enemies.push(enemy);
        }
        
        // Spawn carrier enemy occasionally at level 5+
        if (this.level >= 5) {
            // Check if there's already a carrier in this lane
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
        // Always update effects even after game over to show death animation
        this.effects.forEach(effect => effect.update());
        this.effects = this.effects.filter(effect => effect.active);
        
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
        
        if (this.state !== 'playing' && this.state !== 'victory') return;

        this.frameCount++;
        
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

        // Update enemies
        this.enemies.forEach(enemy => {
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
            
            // Handle carrier enemy spawning
            if (enemy.type === 'carrier' && enemy.shouldSpawnEnemy()) {
                // Spawn a random enemy from the carrier (equal probability, no carrier)
                const spawnX = enemy.x;
                const spawnY = enemy.y + enemy.height / 2 + 20; // Spawn below the carrier
                // Randomly select from non-carrier enemy types with equal probability
                const enemyTypes = ['basic', 'fast', 'tank', 'swarm', 'formation'];
                const randomType = enemyTypes[randomInt(0, enemyTypes.length - 1)];
                const spawnedEnemy = EnemyFactory.create(randomType, spawnX, spawnY, enemy.laneIndex, this.level);
                this.enemies.push(spawnedEnemy);
                enemy.resetSpawnCooldown();
            }
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
                        
                        // Calculate actual damage based on bullet power and enemy type
                        const actualDamage = bullet.getDamage(enemy);
                        
                        // Store unit positions before damage for formation/swarm enemies
                        let destroyedUnitPositions = [];
                        if ((enemy.type === 'formation' || enemy.type === 'swarm') && enemy.units) {
                            // Store positions of units that are about to be destroyed
                            enemy.units.forEach(unit => {
                                if (unit.health > 0 && unit.health <= actualDamage) {
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
                                    destroyedUnitPositions.push({ x: unitX, y: unitY });
                                }
                            });
                        }
                        
                        const result = enemy.takeDamage(actualDamage);
                        const unitsKilled = result.unitsKilled || 0;
                        
                        // Give score and experience for each unit killed (Formation/Swarm)
                        if (unitsKilled > 0 && (enemy.type === 'formation' || enemy.type === 'swarm')) {
                            // Score: proportional to unit health, independent of total count
                            const unitScore = enemy.healthPerUnit * CONFIG.SCORE_PER_ENEMY;
                            
                            // Give score for each killed unit
                            this.score += unitScore * unitsKilled;
                            
                            // Swarm/Formation: each unit has 0.5 (50%) chance to drop XP
                            const experienceChance = 0.5;
                            
                            for (let i = 0; i < unitsKilled; i++) {
                                // Chance to gain experience from each unit
                                if (Math.random() < experienceChance) {
                                    this.gainExperienceFromEnemy(enemy, i);
                                }
                            }
                        }
                        
                        if (result.destroyed) {
                            // Only give score for non-multi-unit enemies (Formation/Swarm already handled above)
                            if (enemy.type !== 'formation' && enemy.type !== 'swarm') {
                                this.score += enemy.scoreValue;
                            }
                            
                            // Give experience when enemy is completely destroyed (for non-multi-unit enemies)
                            // Multi-unit enemies already handled above
                            if (enemy.type !== 'formation' && enemy.type !== 'swarm') {
                                // Get drop rate based on enemy type
                                let dropRate = 0.2; // Default
                                if (enemy.type === 'basic') {
                                    dropRate = 0.2; // 20%
                                } else if (enemy.type === 'fast') {
                                    dropRate = 0.3; // 30%
                                } else if (enemy.type === 'tank') {
                                    dropRate = 0.5; // 50%
                                } else if (enemy.type === 'carrier') {
                                    dropRate = 1.0; // 100%
                                }
                                
                                // Check if should drop experience
                                if (Math.random() < dropRate) {
                                    this.gainExperienceFromEnemy(enemy, 0);
                                }
                            }
                            
                            // Play enemy-specific death sound
                            this.playEnemyDeathSound(enemy.type);
                            
                            // Create destruction effect
                            const effect = EffectManager.createEffect(enemy.x, enemy.y, enemy.type);
                            this.effects.push(effect);
                            
                            this.updateUI();
                        } else if (unitsKilled > 0) {
                            // Play hit sound even if not fully destroyed
                            this.audioManager.play('hit');
                            
                            // Create effects for destroyed units
                            destroyedUnitPositions.forEach((pos, index) => {
                                if (index < unitsKilled) {
                                    const effect = EffectManager.createEffect(pos.x, pos.y, enemy.type === 'formation' ? 'formation' : 'swarm');
                                    this.effects.push(effect);
                                }
                            });
                            
                            this.updateUI();
                        }
                        return; // Bullet hit, no need to check other enemies
                    }
                });
            });
        }

        // Check player-enemy collisions
        this.enemies.forEach(enemy => {
            // For formation and swarm enemies, only check collision with actual units
            // (especially bottom row units that can actually hit the player)
            if (enemy.type === 'formation' || enemy.type === 'swarm') {
                // Check collision with each alive unit
                let collisionDetected = false;
                for (const unit of enemy.units) {
                    if (unit.health > 0) {
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

        // Level up - based on both score and time
        // Score contribution: same as before
        // Time contribution: +1 level every 30 seconds
        let scoreBasedLevel = 1;
        let totalRequired = 0;
        
        // Calculate level based on score
        // Formula: requiredForLevel(n) = (300 + (n - 1) × 100) + n² × 10
        while (true) {
            const baseRequired = CONFIG.LEVEL_UP_SCORE + (scoreBasedLevel - 1) * CONFIG.LEVEL_UP_SCORE_INCREMENT;
            const squaredBonus = scoreBasedLevel * scoreBasedLevel * 10;
            const requiredForNext = baseRequired + squaredBonus;
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
            this.audioManager.updateMusicTempo(this.level);
        }
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
     * @param {Enemy} enemy - The enemy
     * @param {number} unitIndex - Index of the unit (for positioning multiple XP texts)
     */
    gainExperienceFromEnemy(enemy, unitIndex = 0) {
        if (!this.player) return;

        let xpAmount = 1;
        
        // Tank enemies: XP only depends on level
        if (enemy.type === 'tank') {
            // Simple formula: level-based XP for tanks
            // Level 1: 5 XP, Level 5: 9 XP, Level 10: 12 XP, Level 20: 16 XP
            xpAmount = Math.floor(10 + (this.level - 1) * 0.5);
            xpAmount = Math.max(1, xpAmount);
        }
        // Formation/Swarm enemies: XP depends on level and unit count (inverse relationship)
        else if (enemy.type === 'formation' || enemy.type === 'swarm') {
            const maxUnits = enemy.maxUnits || enemy.maxEnemies || 1;
            // Base XP per unit based on level, inversely proportional to unit count
            // Level 1: base 10 XP, Level 5: base 15 XP, Level 10: base 20 XP
            // Then divided by unit count: more units = less XP per unit
            const baseXP = Math.floor(10 + (this.level - 1) * 1);
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

