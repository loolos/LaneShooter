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

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw enemy as a spaceship (triangle pointing down)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2); // Bottom point
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2); // Top left
        ctx.lineTo(this.x, this.y - this.height / 2 + 5); // Center notch
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2); // Top right
        ctx.closePath();
        ctx.fill();
        
        // Draw cockpit/cannon detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 4, this.width / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw wing details
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 3);
        ctx.moveTo(this.x + this.width / 3, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 3);
        ctx.stroke();
        
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
        
        ctx.restore();
    }

    /**
     * Take damage
     * @param {number} damage
     * @returns {object} - Returns {destroyed: boolean, unitsKilled: number}
     */
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: 1 };
        }
        return { destroyed: false, unitsKilled: 0 };
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
    
    /**
     * Draw basic enemy as a simple fighter
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        
        // Draw main body (triangle)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2);
        ctx.lineTo(this.x, this.y - this.height / 2 + 3);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw cockpit
        ctx.fillStyle = 'rgba(255, 200, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 4, this.width / 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
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
        this.width = 35; // Slightly smaller, more agile
        this.height = 35;
    }
    
    /**
     * Draw fast enemy as a sleek interceptor
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw sleek pointed fighter
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2.5, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 6, this.y - this.height / 4);
        ctx.lineTo(this.x, this.y - this.height / 2 + 2);
        ctx.lineTo(this.x + this.width / 6, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 2.5, this.y - this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw afterburner effect
        ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 8, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 2 + 3);
        ctx.lineTo(this.x + this.width / 8, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw cockpit
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 5, this.width / 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

/**
 * Tank Enemy - Slower but has more health, health increases with level
 */
class TankEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'tank';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.7; // Override base speed
        this.speed = this.baseSpeed;
        
        // Health increases with level: base 3, +1 per level
        this.maxHealth = 3 + (level - 1);
        this.health = this.maxHealth;
        this.initialHealth = 3; // Base health for color calculation
        
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (3 + (level - 1) * 0.5); // Slightly more score
        this.width = 50;
        this.height = 50;
        
        // Update color based on health
        this.updateColor();
    }
    
    /**
     * Update color based on health
     */
    updateColor() {
        const healthRatio = this.maxHealth / this.initialHealth;
        
        // Color changes from blue to purple to red as health increases
        if (healthRatio <= 1.5) {
            // Blue to purple
            const intensity = (healthRatio - 1) * 2;
            this.color = `rgb(${83 + intensity * 50}, ${82 - intensity * 50}, ${237 - intensity * 100})`;
        } else if (healthRatio <= 2.5) {
            // Purple to red
            const intensity = (healthRatio - 1.5);
            this.color = `rgb(${133 + intensity * 122}, ${32 - intensity * 32}, ${137 - intensity * 137})`;
        } else {
            // Red
            this.color = '#ff0000';
        }
    }
    
    /**
     * Draw tank enemy as a heavy battleship
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        
        // Draw main body (wider, more armored)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 3);
        ctx.lineTo(this.x - this.width / 3, this.y - this.height / 2);
        ctx.lineTo(this.x, this.y - this.height / 2 + 5);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 3);
        ctx.closePath();
        ctx.fill();
        
        // Draw armor plates
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 4);
        ctx.moveTo(this.x - this.width / 4, this.y);
        ctx.lineTo(this.x + this.width / 4, this.y);
        ctx.stroke();
        
        // Draw cannon/weapon mount
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 3, this.width / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        const barWidth = this.width;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height / 2 - 10;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        ctx.restore();
    }
}

/**
 * Formation Enemy - Multiple enemies in a row that decrease when shot, count increases with level
 */
class FormationEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'formation';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.9;
        this.speed = this.baseSpeed;
        
        // Enemy count increases with level: base 4, +1 every 2 levels (max 8)
        const baseCount = 4;
        const levelBonus = Math.floor((level - 1) / 2);
        this.enemyCount = Math.min(8, baseCount + levelBonus);
        this.maxEnemies = this.enemyCount;
        this.maxUnits = this.enemyCount; // Alias for consistency
        this.initialCount = baseCount;
        this.health = this.enemyCount; // Health equals enemy count
        this.maxHealth = this.maxEnemies;
        
        // Score increases with count
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (1.5 + levelBonus * 0.3);
        this.enemyWidth = 35; // Width of each enemy
        this.enemyHeight = 35; // Height of each enemy
        this.spacing = 10; // Spacing between enemies
        
        // Update color based on count
        this.updateColor();
    }
    
    /**
     * Update color based on enemy count
     */
    updateColor() {
        const countRatio = this.maxEnemies / this.initialCount;
        
        // Color changes from red to orange to yellow as count increases
        if (countRatio <= 1.5) {
            // Red to orange
            const intensity = (countRatio - 1) * 2;
            this.color = `rgb(${255}, ${56 + intensity * 100}, ${56 - intensity * 56})`;
        } else {
            // Orange to yellow
            const intensity = (countRatio - 1.5);
            this.color = `rgb(${255}, ${156 + intensity * 99}, ${0})`;
        }
    }

    /**
     * Draw formation as multiple enemies in a row
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Calculate total width
        const totalWidth = (this.enemyCount * this.enemyWidth) + ((this.enemyCount - 1) * this.spacing);
        const startX = this.x - totalWidth / 2;
        
        // Draw enemies in a row as small fighters
        for (let i = 0; i < this.enemyCount; i++) {
            const enemyX = startX + (i * (this.enemyWidth + this.spacing)) + (this.enemyWidth / 2);
            
            // Draw fighter shape
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(enemyX, this.y + this.enemyHeight / 2);
            ctx.lineTo(enemyX - this.enemyWidth / 2, this.y - this.enemyHeight / 2);
            ctx.lineTo(enemyX, this.y - this.enemyHeight / 2 + 2);
            ctx.lineTo(enemyX + this.enemyWidth / 2, this.y - this.enemyHeight / 2);
            ctx.closePath();
            ctx.fill();
            
            // Draw wing details
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(enemyX - this.enemyWidth / 4, this.y);
            ctx.lineTo(enemyX - this.enemyWidth / 2, this.y - this.enemyHeight / 3);
            ctx.moveTo(enemyX + this.enemyWidth / 4, this.y);
            ctx.lineTo(enemyX + this.enemyWidth / 2, this.y - this.enemyHeight / 3);
            ctx.stroke();
            
            // Draw cockpit
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(enemyX, this.y - this.enemyHeight / 4, this.enemyWidth / 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Take damage - reduces enemy count
     * @param {number} damage
     * @returns {object} - Returns {destroyed: boolean, unitsKilled: number}
     */
    takeDamage(damage) {
        const oldCount = this.enemyCount;
        this.health -= damage;
        this.enemyCount = Math.max(1, Math.ceil(this.health));
        const unitsKilled = oldCount - this.enemyCount;
        
        if (this.health <= 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: unitsKilled };
        }
        return { destroyed: false, unitsKilled: unitsKilled };
    }

    /**
     * Get collision bounds - based on formation size
     */
    getBounds() {
        const totalWidth = (this.enemyCount * this.enemyWidth) + ((this.enemyCount - 1) * this.spacing);
        return {
            x: this.x - totalWidth / 2,
            y: this.y - this.enemyHeight / 2,
            width: totalWidth,
            height: this.enemyHeight
        };
    }
}

/**
 * Swarm Enemy - Multiple small units that decrease when shot, count increases with level
 */
class SwarmEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'swarm';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.8;
        this.speed = this.baseSpeed;
        
        // Unit count increases with level: base 5, +1 every 2 levels (max 10)
        const baseCount = 5;
        const levelBonus = Math.floor((level - 1) / 2);
        this.unitCount = Math.min(10, baseCount + levelBonus);
        this.maxUnits = this.unitCount;
        this.initialCount = baseCount;
        this.health = this.unitCount; // Health equals unit count
        this.maxHealth = this.maxUnits;
        
        // Score increases with count
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (2 + levelBonus * 0.3);
        this.unitSize = 15; // Size of each unit
        this.spread = 30; // Spread between units
        
        // Update color based on count
        this.updateColor();
    }
    
    /**
     * Update color based on unit count
     */
    updateColor() {
        const countRatio = this.maxUnits / this.initialCount;
        
        // Color changes from orange to yellow to white as count increases
        if (countRatio <= 1.5) {
            // Orange to yellow
            const intensity = (countRatio - 1) * 2;
            this.color = `rgb(${255}, ${165 + intensity * 90}, ${2 - intensity * 2})`;
        } else {
            // Yellow to white
            const intensity = (countRatio - 1.5);
            this.color = `rgb(${255}, ${255}, ${92 + intensity * 163})`;
        }
    }

    /**
     * Draw swarm as multiple small units
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        
        // Draw units in a formation as small drones
        const unitsPerRow = Math.ceil(Math.sqrt(this.unitCount));
        const spacing = this.spread / unitsPerRow;
        let unitIndex = 0;
        
        for (let row = 0; row < unitsPerRow && unitIndex < this.unitCount; row++) {
            for (let col = 0; col < unitsPerRow && unitIndex < this.unitCount; col++) {
                const offsetX = (col - (unitsPerRow - 1) / 2) * spacing;
                const offsetY = (row - (unitsPerRow - 1) / 2) * spacing;
                const unitX = this.x + offsetX;
                const unitY = this.y + offsetY;
                
                // Draw drone body (small triangle)
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(unitX, unitY + this.unitSize / 2);
                ctx.lineTo(unitX - this.unitSize / 2, unitY - this.unitSize / 2);
                ctx.lineTo(unitX, unitY - this.unitSize / 2 + 1);
                ctx.lineTo(unitX + this.unitSize / 2, unitY - this.unitSize / 2);
                ctx.closePath();
                ctx.fill();
                
                // Draw small glow/eye
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(unitX, unitY - this.unitSize / 4, this.unitSize / 6, 0, Math.PI * 2);
                ctx.fill();
                
                unitIndex++;
            }
        }
        
        ctx.restore();
    }

    /**
     * Take damage - reduces unit count
     * @param {number} damage
     * @returns {object} - Returns {destroyed: boolean, unitsKilled: number}
     */
    takeDamage(damage) {
        const oldCount = this.unitCount;
        this.health -= damage;
        this.unitCount = Math.max(1, Math.ceil(this.health));
        const unitsKilled = oldCount - this.unitCount;
        
        if (this.health <= 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: unitsKilled };
        }
        return { destroyed: false, unitsKilled: unitsKilled };
    }

    /**
     * Get collision bounds - based on swarm size
     */
    getBounds() {
        const swarmRadius = (this.spread / 2) + (this.unitSize / 2);
        return {
            x: this.x - swarmRadius,
            y: this.y - swarmRadius,
            width: swarmRadius * 2,
            height: swarmRadius * 2
        };
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
     * @param {number} level - Current game level
     * @returns {Enemy}
     */
    static create(type, x, y, laneIndex, level = 1) {
        const enemyClasses = {
            'basic': BasicEnemy,
            'fast': FastEnemy,
            'tank': TankEnemy,
            'swarm': SwarmEnemy,
            'formation': FormationEnemy
        };

        const EnemyClass = enemyClasses[type];
        if (!EnemyClass) {
            console.warn(`Unknown enemy type: ${type}`);
            return new BasicEnemy(x, y, laneIndex);
        }

        // Pass level to enemies that need it
        if (type === 'tank' || type === 'swarm' || type === 'formation') {
            return new EnemyClass(x, y, laneIndex, level);
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
            'basic': 50,
            'fast': 15 + (level - 1) * 4,
            'tank': 10 + (level - 1) * 3,
            'swarm': 12 + (level - 1) * 2,
            'formation': 13 + (level - 1) * 2
        };

        // Calculate total weight
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        // Select enemy type based on weights
        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return this.create(type, x, y, laneIndex, level);
            }
        }

        // Fallback to basic
        return this.create('basic', x, y, laneIndex, level);
    }
}

