/**
 * Powerup Base Class - Extensible system for power-ups
 */
class Powerup {
    constructor(x, y, experienceAmount = 0) {
        this.x = x;
        this.y = y;
        // Size based on experience amount: sqrt(experience) * baseSize
        // Base size is 20, and scales with sqrt of experience
        const baseSize = 20;
        const experienceSize = experienceAmount > 0 ? Math.sqrt(experienceAmount) * 3 : 1;
        this.width = baseSize + experienceSize;
        this.height = baseSize + experienceSize;
        this.speed = 3;
        this.active = true;
        this.type = 'default';
        this.duration = 0; // 0 means instant effect
        this.color = '#ffd700';
        this.experienceAmount = experienceAmount; // Store experience amount for experience powerups
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
            'experience': this.getExperienceIcon(), // Get icon based on upgrade type
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
     * Get icon for experience powerup based on upgrade type
     * @returns {string} Icon emoji
     */
    getExperienceIcon() {
        // Check if this is an experience powerup with upgradeType
        if (this.type === 'experience' && this.upgradeType) {
            const iconMap = {
                'rapidfire': '⚡',
                'multishot': '🔫',
                'speedboost': '💨',
                'lanespeed': '🚀'
            };
            return iconMap[this.upgradeType] || '⭐';
        }
        return '⭐';
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
        super(x, y, 5); // 5 XP
        this.type = 'rapidfire';
        this.color = '#ff6b6b';
    }

    apply(player) {
        // Add experience instead of direct upgrade (5 XP per powerup)
        player.addExperience('rapidfire', this.experienceAmount);
    }
}

/**
 * Multi Shot Powerup - Permanent upgrade: Shoots multiple bullets
 */
class MultiShotPowerup extends Powerup {
    constructor(x, y) {
        super(x, y, 5); // 5 XP
        this.type = 'multishot';
        this.color = '#4ecdc4';
    }

    apply(player) {
        // Add experience instead of direct upgrade (5 XP per powerup)
        player.addExperience('multishot', this.experienceAmount);
    }
}

/**
 * Speed Boost Powerup - Permanent upgrade: Increases bullet speed
 */
class SpeedBoostPowerup extends Powerup {
    constructor(x, y) {
        super(x, y, 5); // 5 XP
        this.type = 'speedboost';
        this.color = '#ffe66d';
    }

    apply(player) {
        // Add experience instead of direct upgrade (5 XP per powerup)
        player.addExperience('speedboost', this.experienceAmount);
    }
}

/**
 * Lane Speed Powerup - Permanent upgrade: Increases lane switching speed
 */
class LaneSpeedPowerup extends Powerup {
    constructor(x, y) {
        super(x, y, 5); // 5 XP
        this.type = 'lanespeed';
        this.color = '#a29bfe';
    }

    apply(player) {
        // Add experience instead of direct upgrade (5 XP per powerup)
        player.addExperience('lanespeed', this.experienceAmount);
    }
}

/**
 * Experience Powerup - Drops experience for a random upgrade type
 * Now uses the same draw method as other powerups (shows icon instead of XP amount)
 */
class ExperiencePowerup extends Powerup {
    constructor(x, y, xpAmount, upgradeType) {
        super(x, y, xpAmount);
        this.type = 'experience';
        this.upgradeType = upgradeType; // Which upgrade type this XP is for
        // Color based on upgrade type (same as regular powerups)
        const upgradeColors = {
            'rapidfire': '#ff6b6b',
            'multishot': '#4ecdc4',
            'speedboost': '#ffe66d',
            'lanespeed': '#a29bfe'
        };
        this.color = upgradeColors[upgradeType] || '#ffd700';
    }

    apply(player) {
        // Add experience to the specified upgrade type
        const oldLevel = player.getUpgradeLevel(this.upgradeType);
        player.addExperience(this.upgradeType, this.experienceAmount);
        const newLevel = player.getUpgradeLevel(this.upgradeType);
        
        // Return whether level up occurred
        return newLevel > oldLevel;
    }
    
    // No need to override draw() - uses base class draw() which shows icon
}

/**
 * Powerup Factory - Creates powerups by type
 */
class PowerupFactory {
    static create(type, x, y, xpAmount = 0, upgradeType = null) {
        const powerupClasses = {
            'rapidfire': RapidFirePowerup,
            'multishot': MultiShotPowerup,
            'speedboost': SpeedBoostPowerup,
            'lanespeed': LaneSpeedPowerup,
            'experience': ExperiencePowerup
        };

        const PowerupClass = powerupClasses[type];
        if (!PowerupClass) {
            console.warn(`Unknown powerup type: ${type}`);
            return new Powerup(x, y, xpAmount);
        }

        // Special handling for experience powerups
        if (type === 'experience') {
            return new ExperiencePowerup(x, y, xpAmount, upgradeType);
        }

        return new PowerupClass(x, y);
    }

    static createRandom(x, y) {
        const types = ['rapidfire', 'multishot', 'speedboost', 'lanespeed'];
        const randomType = types[randomInt(0, types.length - 1)];
        return this.create(randomType, x, y);
    }
}

