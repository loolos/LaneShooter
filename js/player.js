/**
 * Player class - Handles player movement, shooting, and powerups
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.laneIndex = 0;
        this.targetX = CONFIG.LANE_POSITIONS[this.laneIndex];
        this.moveSpeed = 25; // Increased for faster lane switching
        
        // Shooting
        this.shootCooldown = 300; // milliseconds
        this.lastShootTime = 0;
        this.bullets = [];
        
        // Powerups
        this.activePowerups = {};
        this.powerupEffects = {
            rapidfire: null,
            multishot: null,
            speedboost: null
        };
    }

    /**
     * Switch to a different lane
     * @param {number} direction - -1 for left, 1 for right
     */
    switchLane(direction) {
        const newLaneIndex = this.laneIndex + direction;
        if (newLaneIndex >= 0 && newLaneIndex < CONFIG.LANE_COUNT) {
            this.laneIndex = newLaneIndex;
            this.targetX = CONFIG.LANE_POSITIONS[this.laneIndex];
        }
    }

    /**
     * Update player position and bullets
     */
    update() {
        // Fast lane switching
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 0.5) {
            this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.moveSpeed);
        } else {
            this.x = this.targetX;
        }

        // Update bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => bullet.active);

        // Update powerups
        this.updatePowerups();
    }

    /**
     * Shoot bullets
     * @param {AudioManager} audioManager
     */
    shoot(audioManager) {
        const now = Date.now();
        const cooldown = this.getEffectiveShootCooldown();
        
        if (now - this.lastShootTime < cooldown) {
            return;
        }

        this.lastShootTime = now;
        
        // Check for multishot powerup
        const multishotActive = this.powerupEffects.multishot !== null;
        const bulletCount = multishotActive ? 3 : 1;
        const bulletSpeed = this.getEffectiveBulletSpeed();

        // Create bullets
        if (bulletCount === 1) {
            this.bullets.push(new Bullet(this.x, this.y - this.height / 2, bulletSpeed));
        } else {
            // Multi-shot: center, left, right
            const spread = 15;
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * spread;
                this.bullets.push(new Bullet(this.x + offset, this.y - this.height / 2, bulletSpeed));
            }
        }

        audioManager.play('shoot');
    }

    /**
     * Get effective shoot cooldown (affected by powerups)
     */
    getEffectiveShootCooldown() {
        if (this.powerupEffects.rapidfire !== null) {
            return this.shootCooldown * 0.5; // 50% reduction
        }
        return this.shootCooldown;
    }

    /**
     * Get effective bullet speed (affected by powerups)
     */
    getEffectiveBulletSpeed() {
        if (this.powerupEffects.speedboost !== null) {
            return CONFIG.BULLET_SPEED * 1.5;
        }
        return CONFIG.BULLET_SPEED;
    }

    /**
     * Activate a powerup
     * @param {string} type - Powerup type
     * @param {number} duration - Duration in milliseconds
     * @param {object} effects - Powerup effects
     */
    activatePowerup(type, duration, effects = {}) {
        this.activePowerups[type] = {
            endTime: Date.now() + duration,
            effects: effects
        };
        this.powerupEffects[type] = this.activePowerups[type];
    }

    /**
     * Update active powerups
     */
    updatePowerups() {
        const now = Date.now();
        for (const [type, powerup] of Object.entries(this.activePowerups)) {
            if (now >= powerup.endTime) {
                delete this.activePowerups[type];
                this.powerupEffects[type] = null;
            }
        }
    }

    /**
     * Get active powerup names
     */
    getActivePowerups() {
        return Object.keys(this.activePowerups);
    }

    /**
     * Draw player
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Draw player as a triangle (ship)
        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Draw lane indicators
        this.drawLaneIndicators(ctx);
    }

    /**
     * Draw lane indicators
     * @param {CanvasRenderingContext2D} ctx
     */
    drawLaneIndicators(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        CONFIG.LANE_POSITIONS.forEach((x, index) => {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
            
            // Highlight current lane
            if (index === this.laneIndex) {
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
            }
        });
    }

    /**
     * Get collision bounds
     */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

