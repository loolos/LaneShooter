/**
 * BulletGroup class - Represents a group of bullets fired together as a single unit
 * Each group has a count, speed, damage, and visual representation
 */
class BulletGroup {
    constructor(centerX, startY, bulletCount, speed = CONFIG.BULLET_SPEED, powerboostLevel = 0, playerX = 0) {
        this.centerX = centerX; // Center X position of the group
        this.y = startY; // Current Y position (all bullets move together)
        this.bulletCount = bulletCount; // Total number of bullets in this group
        this.remainingCount = bulletCount; // Remaining bullets (decreases when hitting enemies)
        this.speed = speed;
        this.powerboostLevel = powerboostLevel;
        this.baseDamage = 1; // Base damage per bullet
        this.active = true;
        
        // Lane tracking: determine lane based on player's x position when group was created
        const laneMidpoint = (CONFIG.LANE_POSITIONS[0] + CONFIG.LANE_POSITIONS[CONFIG.LANE_COUNT - 1]) / 2;
        this.laneIndex = playerX < laneMidpoint ? 0 : 1;
        
        // Visual properties for individual bullets
        this.bulletWidth = 5;
        this.bulletHeight = 15;
        
        // Calculate bullet positions (spread horizontally for multishot)
        this.bulletPositions = [];
        if (bulletCount === 1) {
            this.bulletPositions.push({ x: centerX });
        } else {
            // Multi-shot: spread bullets evenly
            const spread = 15;
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * spread;
                this.bulletPositions.push({ 
                    x: centerX + offset
                });
            }
        }
        
        // Track which bullets are still visible (for animation when hitting enemies)
        // When a bullet is consumed, we randomly mark one as invisible
        this.visibleBullets = new Set();
        for (let i = 0; i < bulletCount; i++) {
            this.visibleBullets.add(i);
        }
    }
    
    /**
     * Get damage for this bullet group against a specific enemy
     * Damage is calculated per bullet, and we can consume multiple bullets
     * @param {Enemy} enemy - The enemy being hit
     * @param {number} bulletsToConsume - Number of bullets to consume (default: 1)
     * @returns {number} - Total damage amount
     */
    getDamage(enemy, bulletsToConsume = 1) {
        // Base damage per bullet
        let damagePerBullet = this.baseDamage;
        
        // For enemies with health bars (maxHealth > 1), apply compound damage multiplier from powerboost
        if (enemy.maxHealth > 1) {
            // Each level increases damage by 20% (compound: 1.2^level)
            damagePerBullet = damagePerBullet * Math.pow(1.2, this.powerboostLevel);
        }
        
        // Total damage = damage per bullet * number of bullets consumed
        return damagePerBullet * bulletsToConsume;
    }
    
    /**
     * Consume bullets when hitting an enemy
     * @param {number} count - Number of bullets to consume
     * @returns {boolean} - Returns true if group is still active after consumption
     */
    consumeBullets(count = 1) {
        const actualConsume = Math.min(count, this.remainingCount);
        this.remainingCount -= actualConsume;
        
        // Randomly remove visual bullets for animation
        const visibleArray = Array.from(this.visibleBullets);
        for (let i = 0; i < actualConsume && visibleArray.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * visibleArray.length);
            const bulletIndex = visibleArray[randomIndex];
            this.visibleBullets.delete(bulletIndex);
            visibleArray.splice(randomIndex, 1);
        }
        
        // Deactivate if no bullets remaining
        if (this.remainingCount <= 0) {
            this.active = false;
            return false;
        }
        
        return true;
    }

    /**
     * Update bullet group position
     */
    update() {
        this.y -= this.speed;
        
        // Deactivate if off screen
        if (this.y + this.bulletHeight < 0) {
            this.active = false;
        }
    }
    
    /**
     * Get the top Y position of the bullet group (for collision detection)
     * @returns {number} - Top Y coordinate
     */
    getTopY() {
        return this.y;
    }
    
    /**
     * Get the bottom Y position of the bullet group
     * @returns {number} - Bottom Y coordinate
     */
    getBottomY() {
        return this.y + this.bulletHeight;
    }

    /**
     * Draw bullet group - only show visible bullets
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active || this.remainingCount <= 0) return;

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
        
        // Draw only visible bullets
        this.bulletPositions.forEach((pos, index) => {
            if (this.visibleBullets.has(index)) {
                // Draw bullet as a rectangle with glow
                ctx.fillRect(pos.x - this.bulletWidth / 2, this.y, this.bulletWidth, this.bulletHeight);
                
                // Add extra glow effect for high levels
                if (this.powerboostLevel >= 3) {
                    ctx.shadowBlur = 15 + this.powerboostLevel * 3;
                    ctx.fillRect(pos.x - this.bulletWidth / 2, this.y, this.bulletWidth, this.bulletHeight);
                    ctx.shadowBlur = 10 + this.powerboostLevel * 2; // Reset for next bullet
                }
            }
        });
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }

    /**
     * Get collision bounds (for the entire group)
     */
    getBounds() {
        // Find the leftmost and rightmost visible bullets
        let minX = Infinity;
        let maxX = -Infinity;
        
        this.bulletPositions.forEach((pos, index) => {
            if (this.visibleBullets.has(index)) {
                minX = Math.min(minX, pos.x - this.bulletWidth / 2);
                maxX = Math.max(maxX, pos.x + this.bulletWidth / 2);
            }
        });
        
        if (minX === Infinity) {
            // No visible bullets
            return {
                x: this.centerX - this.bulletWidth / 2,
                y: this.y,
                width: this.bulletWidth,
                height: this.bulletHeight
            };
        }
        
        return {
            x: minX,
            y: this.y,
            width: maxX - minX,
            height: this.bulletHeight
        };
    }
}

/**
 * Legacy Bullet class - kept for backward compatibility if needed
 * @deprecated Use BulletGroup instead
 */
class Bullet {
    constructor(x, y, speed = CONFIG.BULLET_SPEED, powerboostLevel = 0, playerX = 0) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 15;
        this.speed = speed;
        this.active = true;
        this.powerboostLevel = powerboostLevel;
        this.baseDamage = 1;
        
        const laneMidpoint = (CONFIG.LANE_POSITIONS[0] + CONFIG.LANE_POSITIONS[CONFIG.LANE_COUNT - 1]) / 2;
        this.laneIndex = playerX < laneMidpoint ? 0 : 1;
    }
    
    getDamage(enemy) {
        let damage = this.baseDamage;
        if (enemy.maxHealth > 1) {
            damage = damage * Math.pow(1.2, this.powerboostLevel);
        }
        return damage;
    }

    update() {
        this.y -= this.speed;
        if (this.y + this.height < 0) {
            this.active = false;
        }
    }
    
    getTopY() {
        return this.y;
    }

    draw(ctx) {
        if (!this.active) return;

        let bulletColor = '#00ffff';
        if (this.powerboostLevel > 0) {
            if (this.powerboostLevel <= 2) {
                bulletColor = `rgb(0, ${255 - this.powerboostLevel * 50}, 255)`;
            } else if (this.powerboostLevel <= 5) {
                const intensity = (this.powerboostLevel - 2) * 85;
                bulletColor = `rgb(${intensity}, 255, 0)`;
            } else {
                const redIntensity = 255;
                const greenIntensity = 255 - (this.powerboostLevel - 5) * 50;
                bulletColor = `rgb(${redIntensity}, ${Math.max(0, greenIntensity)}, 0)`;
            }
        }
        
        ctx.fillStyle = bulletColor;
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 10 + this.powerboostLevel * 2;
        
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        
        if (this.powerboostLevel >= 3) {
            ctx.shadowBlur = 15 + this.powerboostLevel * 3;
            ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        }
        
        ctx.shadowBlur = 0;
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
