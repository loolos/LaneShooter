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
     * Draw powerup
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        // Draw as a rotating diamond shape
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Date.now() * 0.005);
        
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, 0);
        ctx.lineTo(0, this.height / 2);
        ctx.lineTo(-this.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
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
 * Rapid Fire Powerup - Increases shooting rate
 */
class RapidFirePowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'rapidfire';
        this.color = '#ff6b6b';
        this.duration = 10000; // 10 seconds
        this.shootCooldownReduction = 0.5; // Reduce cooldown by 50%
    }

    apply(player) {
        player.activatePowerup('rapidfire', this.duration, {
            shootCooldown: player.shootCooldown * this.shootCooldownReduction
        });
    }
}

/**
 * Multi Shot Powerup - Shoots multiple bullets
 */
class MultiShotPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'multishot';
        this.color = '#4ecdc4';
        this.duration = 8000; // 8 seconds
    }

    apply(player) {
        player.activatePowerup('multishot', this.duration, {
            bulletCount: 3
        });
    }
}

/**
 * Speed Boost Powerup - Increases bullet speed
 */
class SpeedBoostPowerup extends Powerup {
    constructor(x, y) {
        super(x, y);
        this.type = 'speedboost';
        this.color = '#ffe66d';
        this.duration = 12000; // 12 seconds
        this.speedMultiplier = 1.5;
    }

    apply(player) {
        player.activatePowerup('speedboost', this.duration, {
            bulletSpeed: CONFIG.BULLET_SPEED * this.speedMultiplier
        });
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
            'speedboost': SpeedBoostPowerup
        };

        const PowerupClass = powerupClasses[type];
        if (!PowerupClass) {
            console.warn(`Unknown powerup type: ${type}`);
            return new Powerup(x, y);
        }

        return new PowerupClass(x, y);
    }

    static createRandom(x, y) {
        const types = ['rapidfire', 'multishot', 'speedboost'];
        const randomType = types[randomInt(0, types.length - 1)];
        return this.create(randomType, x, y);
    }
}

