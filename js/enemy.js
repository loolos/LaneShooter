/**
 * Enemy Base Class - Extensible system for enemy types
 */
class Enemy {
    constructor(x, y, laneIndex) {
        this.x = x;
        this.y = y;
        this.laneIndex = laneIndex;
        this.width = 40;
        this.height = 40;
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED; // Store base speed multiplier
        this.speed = this.baseSpeed; // Current speed
        this.active = true;
        this.type = 'default';
        this.health = 1;
        this.maxHealth = 1;
        this.color = '#ff4757';
        this.scoreValue = CONFIG.SCORE_PER_ENEMY;
    }

    /**
     * Update enemy position
     */
    update() {
        this.y += this.speed;
        
        // Deactivate if off screen
        if (this.y > CONFIG.CANVAS_HEIGHT + this.height) {
            this.active = false;
        }
    }

    /**
     * Draw enemy
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw enemy as a rectangle
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Draw health bar if enemy has more than 1 health
        if (this.maxHealth > 1) {
            const barWidth = this.width;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.height / 2 - 8;
            
            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
        
        ctx.shadowBlur = 0;
    }

    /**
     * Take damage
     * @param {number} damage
     * @returns {boolean} - Returns true if enemy is destroyed
     */
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return true;
        }
        return false;
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
 * Basic Enemy - Standard enemy type
 */
class BasicEnemy extends Enemy {
    constructor(x, y, laneIndex) {
        super(x, y, laneIndex);
        this.type = 'basic';
        this.color = '#ff4757';
        this.speed = CONFIG.ENEMY_BASE_SPEED;
    }
}

/**
 * Fast Enemy - Moves faster but worth more points
 */
class FastEnemy extends Enemy {
    constructor(x, y, laneIndex) {
        super(x, y, laneIndex);
        this.type = 'fast';
        this.color = '#ff6348';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 1.5; // Override base speed
        this.speed = this.baseSpeed;
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * 2;
    }
}

/**
 * Tank Enemy - Slower but has more health
 */
class TankEnemy extends Enemy {
    constructor(x, y, laneIndex) {
        super(x, y, laneIndex);
        this.type = 'tank';
        this.color = '#5352ed';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.7; // Override base speed
        this.speed = this.baseSpeed;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * 3;
        this.width = 50;
        this.height = 50;
    }
}

/**
 * Enemy Factory - Creates enemies by type
 */
class EnemyFactory {
    /**
     * Create enemy by type
     * @param {string} type - Enemy type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} laneIndex - Lane index
     * @returns {Enemy}
     */
    static create(type, x, y, laneIndex) {
        const enemyClasses = {
            'basic': BasicEnemy,
            'fast': FastEnemy,
            'tank': TankEnemy
        };

        const EnemyClass = enemyClasses[type];
        if (!EnemyClass) {
            console.warn(`Unknown enemy type: ${type}`);
            return new BasicEnemy(x, y, laneIndex);
        }

        return new EnemyClass(x, y, laneIndex);
    }

    /**
     * Create random enemy based on level
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} laneIndex - Lane index
     * @param {number} level - Current game level
     * @returns {Enemy}
     */
    static createRandom(x, y, laneIndex, level = 1) {
        const weights = {
            'basic': 70,
            'fast': 20 + (level - 1) * 5,
            'tank': 10 + (level - 1) * 3
        };

        // Calculate total weight
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        // Select enemy type based on weights
        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return this.create(type, x, y, laneIndex);
            }
        }

        // Fallback to basic
        return this.create('basic', x, y, laneIndex);
    }
}

