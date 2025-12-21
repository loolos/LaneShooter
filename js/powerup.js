/**
 * Powerup Base Class - Extensible system for power-ups
 */
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 3;
        this.active = true;
        this.type = 'default';
        this.duration = 0; // 0 means instant effect
        this.color = '#ffd700';
    }

    /**
     * Update powerup position
     */
    update() {
        this.y += this.speed;
        
        // Deactivate if off screen
        if (this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    /**
     * Draw powerup as icon (matching side panel)
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        // Get icon for this powerup type (matching side panel)
        const iconMap = {
            'rapidfire': '⚡',
            'multishot': '🔫',
            'speedboost': '💨',
            'lanespeed': '🚀',
            'default': '⭐'
        };
        const icon = iconMap[this.type] || iconMap['default'];
        
        // Draw background circle with glow
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw outer ring
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        // Draw icon text (emoji)
        ctx.save();
        const fontSize = this.width * 1.2;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(icon, this.x, this.y);
        ctx.restore();
        
        // Add pulsing glow effect
        const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
        ctx.shadowBlur = 20 * pulse;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }

    /**
     * Apply powerup effect to player
     * Override in subclasses
     * @param {Player} player
     */
    apply(player) {
        // Base implementation - override in subclasses
        console.log(`Powerup ${this.type} applied`);
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

/**
 * Rapid Fire Powerup - Permanent upgrade: Increases shooting rate
 */
class RapidFirePowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'rapidfire';
        this.color = '#ff6b6b';
    }

    apply(player) {
        player.upgrade('rapidfire');
    }
}

/**
 * Multi Shot Powerup - Permanent upgrade: Shoots multiple bullets
 */
class MultiShotPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'multishot';
        this.color = '#4ecdc4';
    }

    apply(player) {
        player.upgrade('multishot');
    }
}

/**
 * Speed Boost Powerup - Permanent upgrade: Increases bullet speed
 */
class SpeedBoostPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'speedboost';
        this.color = '#ffe66d';
    }

    apply(player) {
        player.upgrade('speedboost');
    }
}

/**
 * Lane Speed Powerup - Permanent upgrade: Increases lane switching speed
 */
class LaneSpeedPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'lanespeed';
        this.color = '#a29bfe';
    }

    apply(player) {
        player.upgrade('lanespeed');
    }
}

/**
 * Powerup Factory - Creates powerups by type
 */
class PowerupFactory {
    static create(type, x, y) {
        const powerupClasses = {
            'rapidfire': RapidFirePowerup,
            'multishot': MultiShotPowerup,
            'speedboost': SpeedBoostPowerup,
            'lanespeed': LaneSpeedPowerup
        };

        const PowerupClass = powerupClasses[type];
        if (!PowerupClass) {
            console.warn(`Unknown powerup type: ${type}`);
            return new Powerup(x, y);
        }

        return new PowerupClass(x, y);
    }

    static createRandom(x, y) {
        const types = ['rapidfire', 'multishot', 'speedboost', 'lanespeed'];
        const randomType = types[randomInt(0, types.length - 1)];
        return this.create(randomType, x, y);
    }
}

