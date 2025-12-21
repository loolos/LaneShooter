/**
 * Bullet class - Represents player projectiles
 */
class Bullet {
    constructor(x, y, speed = CONFIG.BULLET_SPEED) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 15;
        this.speed = speed;
        this.active = true;
        this.damage = 1;
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

        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        
        // Draw bullet as a rectangle with glow
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        
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

