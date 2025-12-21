/**
 * XP Text - Floating text showing experience gained
 */
class XPText {
    constructor(x, y, xpAmount, upgradeType) {
        this.x = x;
        this.y = y;
        this.xpAmount = xpAmount;
        this.upgradeType = upgradeType;
        this.lifetime = 0;
        this.maxLifetime = 60; // frames
        this.active = true;
        this.alpha = 1.0;
    }

    /**
     * Update XP text position and lifetime
     */
    update() {
        this.lifetime++;
        this.y -= 1; // Float upward
        
        // Fade out
        if (this.lifetime > this.maxLifetime * 0.6) {
            const fadeStart = this.maxLifetime * 0.6;
            const fadeDuration = this.maxLifetime - fadeStart;
            this.alpha = 1 - ((this.lifetime - fadeStart) / fadeDuration);
        }
        
        if (this.lifetime >= this.maxLifetime) {
            this.active = false;
        }
    }

    /**
     * Draw XP text
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        const upgradeColors = {
            'rapidfire': '#ff6b6b',
            'multishot': '#4ecdc4',
            'speedboost': '#ffe66d',
            'lanespeed': '#a29bfe'
        };

        const color = upgradeColors[this.upgradeType] || '#00ff00';
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = `+${this.xpAmount} XP`;
        ctx.strokeText(text, this.x, this.y);
        ctx.fillText(text, this.x, this.y);
        
        ctx.restore();
    }
}

