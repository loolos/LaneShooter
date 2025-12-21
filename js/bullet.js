/**
 * Bullet class - Represents player projectiles
 */
class Bullet {
    constructor(x, y, speed = CONFIG.BULLET_SPEED, speedboostLevel = 0) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 15;
        this.speed = speed;
        this.active = true;
        this.damage = 1;
        this.speedboostLevel = speedboostLevel; // Store upgrade level for color
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

    /**
     * Draw bullet
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        // Change color based on speedboost level (attack power)
        let bulletColor = '#00ffff'; // Default cyan
        if (this.speedboostLevel > 0) {
            if (this.speedboostLevel <= 2) {
                // Cyan to green
                bulletColor = `rgb(0, ${255 - this.speedboostLevel * 50}, 255)`;
            } else if (this.speedboostLevel <= 5) {
                // Green to yellow
                const intensity = (this.speedboostLevel - 2) * 85;
                bulletColor = `rgb(${intensity}, 255, 0)`;
            } else {
                // Yellow to red
                const redIntensity = 255;
                const greenIntensity = 255 - (this.speedboostLevel - 5) * 50;
                bulletColor = `rgb(${redIntensity}, ${Math.max(0, greenIntensity)}, 0)`;
            }
        }
        
        ctx.fillStyle = bulletColor;
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 10 + this.speedboostLevel * 2; // Stronger glow with higher level
        
        // Draw bullet as a rectangle with glow
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        
        // Add extra glow effect for high levels
        if (this.speedboostLevel >= 3) {
            ctx.shadowBlur = 15 + this.speedboostLevel * 3;
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

