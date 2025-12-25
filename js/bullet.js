/**
 * Bullet class - Represents player projectiles
 */
class Bullet {
    constructor(x, y, speed = CONFIG.BULLET_SPEED, powerboostLevel = 0, playerX = 0) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 15;
        this.speed = speed;
        this.active = true;
        this.powerboostLevel = powerboostLevel; // Store upgrade level for damage and color
        // Base damage is 1, will be calculated based on enemy type when hitting
        this.baseDamage = 1;
        
        // Lane tracking: determine lane based on player's x position when bullet was created
        // Midpoint between lanes: (LANE_POSITIONS[0] + LANE_POSITIONS[1]) / 2
        const laneMidpoint = (CONFIG.LANE_POSITIONS[0] + CONFIG.LANE_POSITIONS[CONFIG.LANE_COUNT - 1]) / 2;
        this.laneIndex = playerX < laneMidpoint ? 0 : 1;
    }
    
    /**
     * Get damage for this bullet against a specific enemy
     * For enemies with health bars (maxHealth > 1), each powerboost level increases damage by 20% (compound)
     * @param {Enemy} enemy - The enemy being hit
     * @returns {number} - Damage amount
     */
    getDamage(enemy) {
        // Base damage
        let damage = this.baseDamage;
        
        // For enemies with health bars (maxHealth > 1), apply compound damage multiplier from powerboost
        if (enemy.maxHealth > 1) {
            // Each level increases damage by 20% (compound: 1.2^level)
            damage = damage * Math.pow(1.2, this.powerboostLevel);
        }
        
        return damage;
    }

    /**
     * Update bullet position
     */
    update() {
        this.y -= this.speed;
        
        // Deactivate if off screen
        if (this.y + this.height < 0) {
            this.active = false;
        }
    }
    
    // getCurrentLane() removed - directly use laneIndex property instead
    
    /**
     * Get the top Y position of the bullet (for collision detection)
     * @returns {number} - Top Y coordinate
     */
    getTopY() {
        return this.y;
    }

    /**
     * Draw bullet
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        // Change color based on powerboost level (attack power)
        let bulletColor = '#00ffff'; // Default cyan
        if (this.powerboostLevel > 0) {
            if (this.powerboostLevel <= 2) {
                // Cyan to green
                bulletColor = `rgb(0, ${255 - this.powerboostLevel * 50}, 255)`;
            } else if (this.powerboostLevel <= 5) {
                // Green to yellow
                const intensity = (this.powerboostLevel - 2) * 85;
                bulletColor = `rgb(${intensity}, 255, 0)`;
            } else {
                // Yellow to red
                const redIntensity = 255;
                const greenIntensity = 255 - (this.powerboostLevel - 5) * 50;
                bulletColor = `rgb(${redIntensity}, ${Math.max(0, greenIntensity)}, 0)`;
            }
        }
        
        ctx.fillStyle = bulletColor;
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 10 + this.powerboostLevel * 2; // Stronger glow with higher level
        
        // Draw bullet as a rectangle with glow
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        
        // Add extra glow effect for high levels
        if (this.powerboostLevel >= 3) {
            ctx.shadowBlur = 15 + this.powerboostLevel * 3;
            ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        }
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }

    /**
     * Get collision bounds
     */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

