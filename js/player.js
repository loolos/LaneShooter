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
        this.baseShootCooldown = 300; // Base cooldown in milliseconds
        this.shootCooldown = this.baseShootCooldown;
        this.lastShootTime = 0;
        this.bullets = [];
        
        // Permanent Upgrades System
        this.upgrades = {
            rapidfire: 0,      // Level 0 = no upgrade, each level reduces cooldown by 10%
            multishot: 0,      // Level 0 = 1 bullet, each level adds 1 bullet
            speedboost: 0,    // Level 0 = base speed, each level increases by 20%
            lanespeed: 0      // Level 0 = base speed, each level increases by 30%
        };
        
        // Base values
        this.baseMoveSpeed = 25;
        this.baseBulletSpeed = CONFIG.BULLET_SPEED;
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
        // Update move speed based on upgrades
        this.moveSpeed = this.baseMoveSpeed * (1 + this.upgrades.lanespeed * 0.3);
        
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
        
        // Get bullet count from multishot upgrade
        const bulletCount = 1 + this.upgrades.multishot;
        const bulletSpeed = this.getEffectiveBulletSpeed();

        // Create bullets
        if (bulletCount === 1) {
            this.bullets.push(new Bullet(this.x, this.y - this.height / 2, bulletSpeed));
        } else {
            // Multi-shot: spread bullets evenly
            const spread = 15;
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * spread;
                this.bullets.push(new Bullet(this.x + offset, this.y - this.height / 2, bulletSpeed));
            }
        }

        audioManager.play('shoot');
    }

    /**
     * Get effective shoot cooldown (affected by upgrades)
     */
    getEffectiveShootCooldown() {
        // Each level reduces cooldown by 10% (max 90% reduction at level 9)
        const reduction = Math.min(0.9, this.upgrades.rapidfire * 0.1);
        return this.baseShootCooldown * (1 - reduction);
    }

    /**
     * Get effective bullet speed (affected by upgrades)
     */
    getEffectiveBulletSpeed() {
        // Each level increases speed by 20%
        return this.baseBulletSpeed * (1 + this.upgrades.speedboost * 0.2);
    }

    /**
     * Upgrade a permanent stat
     * @param {string} type - Upgrade type
     */
    upgrade(type) {
        if (this.upgrades.hasOwnProperty(type)) {
            this.upgrades[type]++;
            return true;
        }
        return false;
    }

    /**
     * Get upgrade level
     * @param {string} type - Upgrade type
     * @returns {number} - Upgrade level
     */
    getUpgradeLevel(type) {
        return this.upgrades[type] || 0;
    }

    /**
     * Get all upgrades info
     * @returns {object} - Copy of upgrades object
     */
    getAllUpgrades() {
        return { ...this.upgrades };
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

