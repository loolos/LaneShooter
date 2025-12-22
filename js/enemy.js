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
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'basic';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.6; // Reduced to 60% of original
        this.speed = this.baseSpeed;
        
        // Health increases with level: base 1, +1 every 2 levels
        // Late game: additional health boost (after level 10, health increases faster)
        // Calculate health with late game boost integrated into formula
        this.maxHealth = level > 10
            ? 1 + Math.floor((10 + (level - 10) * 1.2 - 1) / 2)
            : 1 + Math.floor((level - 1) / 2);
        this.health = this.maxHealth;
        this.initialHealth = 1; // Base health for color calculation
        
        // Update color based on health
        this.updateColor();
    }
    
    /**
     * Update color based on remaining health
     */
    updateColor() {
        const healthPercent = this.health / this.maxHealth;
        
        // Color changes from bright red (healthy) to dark red (damaged)
        // Bright red: rgb(255, 71, 87) -> Dark red: rgb(100, 0, 0)
        const r = Math.floor(100 + (255 - 100) * healthPercent);
        const g = Math.floor(0 + 71 * healthPercent);
        const b = Math.floor(0 + 87 * healthPercent);
        this.color = `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Take damage and update color
     */
    takeDamage(damage) {
        this.health -= damage;
        this.updateColor();
        
        if (this.health <= 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: 1 };
        }
        return { destroyed: false, unitsKilled: 0 };
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
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.5 * 0.6; // Slower movement, reduced to 60% (0.3x total)
        this.speed = this.baseSpeed;
        
        // Health increases with level: base 3, +1 per level, then multiplied by 4.5 (2x of previous 2.25x)
        // Late game: additional health boost (after level 10, 10% more health)
        let healthMultiplier = 4.5; // Doubled from 2.25
        if (level > 10) {
            healthMultiplier = 4.5 * (1 + (level - 10) * 0.01); // Additional 1% per level after 10
        }
        const baseHealth = 3 + (level - 1);
        this.maxHealth = Math.floor(baseHealth * healthMultiplier);
        this.health = this.maxHealth;
        this.initialHealth = Math.floor(3 * 4.5); // Base health for color calculation (13.5 -> 13)
        
        // Increased score value for more experience
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (5 + (level - 1) * 1); // More score (increased from 3 + 0.5)
        
        // Size increases with health: base 50x50, scales with maxHealth
        // Base health at level 1 is 6.75 (rounded to 6), so we scale from there
        const baseHealthForSize = 6; // Base health at level 1
        const sizeMultiplier = 1 + (this.maxHealth - baseHealthForSize) / baseHealthForSize * 0.5; // Up to 50% larger
        this.width = Math.floor(50 * sizeMultiplier);
        this.height = Math.floor(50 * sizeMultiplier);
        
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
 * Formation Enemy - Multiple enemies in a grid formation, each unit has individual health
 */
class FormationEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'formation';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.9 * 0.6; // Reduced to 60% (0.54x total)
        this.speed = this.baseSpeed;
        
        // New generation system: fixed total health, random rows/cols
        // Total health increases with level: lvl³/25 + level²/4 + level + 5
        const totalHealth = Math.floor((level * level * level / 25) + (level * level / 4) + level + 5);
        
        // Randomly determine rows and columns within reasonable ranges
        // Rows: 1-4, Columns: 2-8
        const minRows = 1;
        const maxRows = Math.min(4, 1 + Math.floor((level - 1) / 3));
        const minCols = 2;
        const maxCols = Math.min(8, 3 + Math.floor((level - 1) / 2));
        
        // Randomly select rows and columns
        this.rows = randomInt(minRows, maxRows);
        this.cols = randomInt(minCols, maxCols);
        
        // Calculate health per unit: totalHealth / (rows * cols)
        // Ensure at least 1 health per unit
        const totalUnits = this.rows * this.cols;
        this.healthPerUnit = Math.max(1, Math.floor(totalHealth / totalUnits));
        
        // Recalculate actual total health (may be slightly different due to rounding)
        const actualTotalHealth = this.healthPerUnit * totalUnits;
        
        // Initialize units grid - each unit has individual health
        this.units = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.units.push({
                    row: row,
                    col: col,
                    health: this.healthPerUnit,
                    maxHealth: this.healthPerUnit
                });
            }
        }
        
        this.maxUnits = this.units.length;
        this.enemyCount = this.maxUnits;
        this.maxEnemies = this.maxUnits;
        
        // Store actual total health
        this.maxHealth = actualTotalHealth;
        this.health = actualTotalHealth;
        
        // Score increases with total health and unit count
        const baseTotalHealth = 3; // Base total health at level 1 (level²/4 + level + 3 = 3.25 ≈ 3)
        const baseScoreMultiplier = 1.5;
        const scoreBonus = (actualTotalHealth - baseTotalHealth) * 0.1 + (this.maxUnits - 3) * 0.2;
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (baseScoreMultiplier + scoreBonus);
        this.enemyWidth = 35; // Width of each enemy
        this.enemyHeight = 35; // Height of each enemy
        this.spacing = 10; // Spacing between enemies
        this.rowSpacing = 12; // Vertical spacing between rows
        
        // Base color (for shadow)
        this.color = '#ff4757';
    }
    
    /**
     * Get color for a unit based on its health
     */
    getUnitColor(unit) {
        const healthPercent = unit.health / unit.maxHealth;
        
        // Color changes from bright red/orange (healthy) to dark red (damaged)
        if (healthPercent > 0.6) {
            // Bright red to orange
            const intensity = (healthPercent - 0.6) / 0.4;
            return `rgb(${255}, ${Math.floor(56 + intensity * 100)}, ${Math.floor(56 - intensity * 56)})`;
        } else if (healthPercent > 0.3) {
            // Orange to dark orange
            const intensity = (healthPercent - 0.3) / 0.3;
            return `rgb(${Math.floor(255 - intensity * 100)}, ${Math.floor(156 - intensity * 100)}, ${0})`;
        } else {
            // Dark orange to dark red
            const intensity = healthPercent / 0.3;
            return `rgb(${Math.floor(155 + intensity * 100)}, ${Math.floor(56 - intensity * 56)}, ${0})`;
        }
    }

    /**
     * Draw formation as a grid of enemies, each with individual color
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Calculate total width and height
        const totalWidth = (this.cols * this.enemyWidth) + ((this.cols - 1) * this.spacing);
        const totalHeight = (this.rows * this.enemyHeight) + ((this.rows - 1) * this.rowSpacing);
        const startX = this.x - totalWidth / 2;
        const startY = this.y - totalHeight / 2;
        
        // Draw each unit
        for (const unit of this.units) {
            if (unit.health <= 0) continue; // Skip destroyed units
            
            const unitX = startX + (unit.col * (this.enemyWidth + this.spacing)) + (this.enemyWidth / 2);
            const unitY = startY + (unit.row * (this.enemyHeight + this.rowSpacing)) + (this.enemyHeight / 2);
            const unitColor = this.getUnitColor(unit);
            
            ctx.shadowColor = unitColor;
            ctx.shadowBlur = 10;
            
            // Draw fighter shape
            ctx.fillStyle = unitColor;
            ctx.beginPath();
            ctx.moveTo(unitX, unitY + this.enemyHeight / 2);
            ctx.lineTo(unitX - this.enemyWidth / 2, unitY - this.enemyHeight / 2);
            ctx.lineTo(unitX, unitY - this.enemyHeight / 2 + 2);
            ctx.lineTo(unitX + this.enemyWidth / 2, unitY - this.enemyHeight / 2);
            ctx.closePath();
            ctx.fill();
            
            // Draw wing details
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(unitX - this.enemyWidth / 4, unitY);
            ctx.lineTo(unitX - this.enemyWidth / 2, unitY - this.enemyHeight / 3);
            ctx.moveTo(unitX + this.enemyWidth / 4, unitY);
            ctx.lineTo(unitX + this.enemyWidth / 2, unitY - this.enemyHeight / 3);
            ctx.stroke();
            
            // Draw cockpit
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(unitX, unitY - this.enemyHeight / 4, this.enemyWidth / 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Take damage - bottom row units take damage first, randomly distributed
     * If bottom row is destroyed, next bottom row takes damage, and so on
     * @param {number} damage
     * @returns {object} - Returns {destroyed: boolean, unitsKilled: number}
     */
    takeDamage(damage) {
        const oldAliveCount = this.units.filter(u => u.health > 0).length;
        let remainingDamage = damage;
        
        // Keep applying damage until no damage remains or all units are destroyed
        while (remainingDamage > 0) {
            // Get all alive units
            const aliveUnits = this.units.filter(u => u.health > 0);
            
            if (aliveUnits.length === 0) {
                // All units destroyed
                this.active = false;
                return { destroyed: true, unitsKilled: this.maxUnits };
            }
            
            // Find the bottommost row (highest row number)
            const maxRow = Math.max(...aliveUnits.map(u => u.row));
            
            // Get units in the bottommost row
            const bottomRowUnits = aliveUnits.filter(u => u.row === maxRow);
            
            if (bottomRowUnits.length === 0) {
                // Should not happen, but break to avoid infinite loop
                break;
            }
            
            // Distribute damage randomly among bottom row units
            while (remainingDamage > 0 && bottomRowUnits.length > 0) {
                // Randomly select a unit from bottom row
                const randomIndex = randomInt(0, bottomRowUnits.length - 1);
                const unit = bottomRowUnits[randomIndex];
                
                // Apply damage
                const damageToApply = Math.min(remainingDamage, unit.health);
                unit.health -= damageToApply;
                remainingDamage -= damageToApply;
                
                // Remove unit from bottom row list if destroyed
                if (unit.health <= 0) {
                    bottomRowUnits.splice(randomIndex, 1);
                }
            }
        }
        
        // Update total health
        this.health = this.units.reduce((sum, u) => sum + Math.max(0, u.health), 0);
        this.enemyCount = this.units.filter(u => u.health > 0).length;
        
        const newAliveCount = this.enemyCount;
        const unitsKilled = oldAliveCount - newAliveCount;
        
        if (this.health <= 0 || this.enemyCount === 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: unitsKilled };
        }
        
        return { destroyed: false, unitsKilled: unitsKilled };
    }

    /**
     * Get collision bounds - based on formation size
     */
    getBounds() {
        const totalWidth = (this.cols * this.enemyWidth) + ((this.cols - 1) * this.spacing);
        const totalHeight = (this.rows * this.enemyHeight) + ((this.rows - 1) * this.rowSpacing);
        return {
            x: this.x - totalWidth / 2,
            y: this.y - totalHeight / 2,
            width: totalWidth,
            height: totalHeight
        };
    }
}

/**
 * Swarm Enemy - Multiple small units in a formation, each unit has individual health
 */
class SwarmEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'swarm';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 0.8 * 0.6; // Reduced to 60% (0.48x total)
        this.speed = this.baseSpeed;
        
        // New generation system: fixed total health, random rows/cols
        // Total health increases with level: lvl³/25 + level²/4 + level + 5
        const totalHealth = Math.floor((level * level * level / 25) + (level * level / 4) + level + 5);
        
        // Randomly determine rows and columns within reasonable ranges
        // Rows: 1-3, Columns: 3-5
        const minRows = 1;
        const maxRows = Math.min(3, 1 + Math.floor((level - 1) / 3));
        const minCols = 3;
        const maxCols = Math.min(5, 3 + Math.floor((level - 1) / 2));
        
        // Randomly select rows and columns
        this.rows = randomInt(minRows, maxRows);
        const unitsPerRow = randomInt(minCols, maxCols);
        this.unitsPerRow = unitsPerRow;
        const totalUnits = this.rows * unitsPerRow;
        
        // Calculate health per unit: totalHealth / (rows * cols)
        // Ensure at least 1 health per unit
        this.healthPerUnit = Math.max(1, Math.floor(totalHealth / totalUnits));
        
        // Recalculate actual total health (may be slightly different due to rounding)
        const actualTotalHealth = this.healthPerUnit * totalUnits;
        
        // Initialize units - each unit has individual health and position
        this.units = [];
        this.unitSize = 15; // Size of each unit
        // Increased spread for wider distribution, especially for first row to allow multishot to hit all units
        this.spread = 150; // Spread between units (increased significantly for wider distribution)
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < unitsPerRow; col++) {
                // Use larger spacing for first row to allow multishot coverage
                // First row uses full spread, other rows use slightly less
                const rowSpread = row === 0 ? this.spread : this.spread * 0.85;
                // Use a multiplier to ensure units are spread out enough for multishot bullets
                const spacingMultiplier = row === 0 ? 1.2 : 1.0; // First row extra spread
                const offsetX = (col - (unitsPerRow - 1) / 2) * (rowSpread / unitsPerRow) * spacingMultiplier;
                const offsetY = (row - (this.rows - 1) / 2) * (this.spread / unitsPerRow);
                
                this.units.push({
                    row: row,
                    col: col,
                    offsetX: offsetX,
                    offsetY: offsetY,
                    health: this.healthPerUnit,
                    maxHealth: this.healthPerUnit
                });
            }
        }
        
        this.maxUnits = this.units.length;
        this.unitCount = this.maxUnits;
        this.initialCount = 3; // Base count for reference
        
        // Store actual total health
        this.maxHealth = actualTotalHealth;
        this.health = actualTotalHealth;
        
        // Score increases with total health and unit count
        const baseTotalHealth = 5; // Base total health at level 1
        const baseScoreMultiplier = 2;
        const scoreBonus = (actualTotalHealth - baseTotalHealth) * 0.1 + (this.maxUnits - 3) * 0.2;
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (baseScoreMultiplier + scoreBonus);
        
        // Base color (for shadow)
        this.color = '#ffa500';
    }
    
    /**
     * Get color for a unit based on its health
     */
    getUnitColor(unit) {
        const healthPercent = unit.health / unit.maxHealth;
        
        // Color changes from bright orange/yellow (healthy) to dark orange (damaged)
        if (healthPercent > 0.6) {
            // Bright orange to yellow
            const intensity = (healthPercent - 0.6) / 0.4;
            return `rgb(${255}, ${Math.floor(165 + intensity * 90)}, ${Math.floor(2 - intensity * 2)})`;
        } else if (healthPercent > 0.3) {
            // Yellow to orange
            const intensity = (healthPercent - 0.3) / 0.3;
            return `rgb(${255}, ${Math.floor(255 - intensity * 90)}, ${Math.floor(92 - intensity * 90)})`;
        } else {
            // Orange to dark orange
            const intensity = healthPercent / 0.3;
            return `rgb(${Math.floor(255 - intensity * 100)}, ${Math.floor(165 - intensity * 100)}, ${Math.floor(2)})`;
        }
    }

    /**
     * Draw swarm as multiple small units, each with individual color
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Draw each unit
        for (const unit of this.units) {
            if (unit.health <= 0) continue; // Skip destroyed units
            
            const unitX = this.x + unit.offsetX;
            const unitY = this.y + unit.offsetY;
            const unitColor = this.getUnitColor(unit);
            
            ctx.shadowColor = unitColor;
            ctx.shadowBlur = 8;
            
            // Draw drone body (small triangle)
            ctx.fillStyle = unitColor;
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
        }
        
        ctx.restore();
    }

    /**
     * Take damage - bottom row units take damage first, randomly distributed
     * If bottom row is destroyed, next bottom row takes damage, and so on
     * @param {number} damage
     * @returns {object} - Returns {destroyed: boolean, unitsKilled: number}
     */
    takeDamage(damage) {
        const oldAliveCount = this.units.filter(u => u.health > 0).length;
        let remainingDamage = damage;
        
        // Keep applying damage until no damage remains or all units are destroyed
        while (remainingDamage > 0) {
            // Get all alive units
            const aliveUnits = this.units.filter(u => u.health > 0);
            
            if (aliveUnits.length === 0) {
                // All units destroyed
                this.active = false;
                return { destroyed: true, unitsKilled: this.maxUnits };
            }
            
            // Find the bottommost row (highest row number)
            const maxRow = Math.max(...aliveUnits.map(u => u.row));
            
            // Get units in the bottommost row
            const bottomRowUnits = aliveUnits.filter(u => u.row === maxRow);
            
            if (bottomRowUnits.length === 0) {
                // Should not happen, but break to avoid infinite loop
                break;
            }
            
            // Distribute damage randomly among bottom row units
            while (remainingDamage > 0 && bottomRowUnits.length > 0) {
                // Randomly select a unit from bottom row
                const randomIndex = randomInt(0, bottomRowUnits.length - 1);
                const unit = bottomRowUnits[randomIndex];
                
                // Apply damage
                const damageToApply = Math.min(remainingDamage, unit.health);
                unit.health -= damageToApply;
                remainingDamage -= damageToApply;
                
                // Remove unit from bottom row list if destroyed
                if (unit.health <= 0) {
                    bottomRowUnits.splice(randomIndex, 1);
                }
            }
        }
        
        // Update total health and count
        this.health = this.units.reduce((sum, u) => sum + Math.max(0, u.health), 0);
        this.unitCount = this.units.filter(u => u.health > 0).length;
        
        const newAliveCount = this.unitCount;
        const unitsKilled = oldAliveCount - newAliveCount;
        
        if (this.health <= 0 || this.unitCount === 0) {
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
 * Carrier Enemy - Stationary enemy that spawns other enemies, appears after level 5
 */
class CarrierEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'carrier';
        this.baseSpeed = 0; // Stationary - doesn't move
        this.speed = 0;
        
        // Very high health that increases with level (4x original)
        // Base health: 200 (4x of 50), increases by 80 per level (4x of 20)
        this.maxHealth = 200 + (level - 5) * 80; // Only appears at level 5+, 4x health
        this.health = this.maxHealth;
        this.initialHealth = 200;
        
        // High score value
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (10 + (level - 5) * 2);
        this.width = 80;
        this.height = 60;
        
        // Spawning system
        this.spawnCooldown = 0;
        this.spawnInterval = 180; // Spawn every 180 frames (3 seconds at 60fps)
        this.spawnedEnemies = []; // Track spawned enemies for reference
        
        // Color - dark gray/blue for carrier
        this.color = '#4a5568';
    }
    
    /**
     * Update carrier - spawn enemies periodically
     */
    update() {
        // Don't move (speed = 0)
        // Just update spawn cooldown
        this.spawnCooldown++;
        
        // Carrier doesn't go off screen, so no need to check bounds
    }
    
    /**
     * Check if carrier should spawn an enemy
     * @returns {boolean} - True if should spawn
     */
    shouldSpawnEnemy() {
        return this.spawnCooldown >= this.spawnInterval;
    }
    
    /**
     * Reset spawn cooldown after spawning
     */
    resetSpawnCooldown() {
        this.spawnCooldown = 0;
    }
    
    /**
     * Draw carrier as a large stationary ship
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        
        // Draw main carrier body (large rectangular shape)
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Draw carrier deck details
        ctx.fillStyle = 'rgba(100, 100, 120, 0.8)';
        ctx.fillRect(
            this.x - this.width / 2 + 5,
            this.y - this.height / 2 + 5,
            this.width - 10,
            this.height / 3
        );
        
        // Draw launch bay (opening at front)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 4,
            this.width / 4,
            this.height / 2
        );
        
        // Draw side details
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.stroke();
        
        // Draw health bar (always visible for carrier)
        const barWidth = this.width + 10;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height / 2 - 15;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${Math.ceil(this.health)}/${this.maxHealth}`,
            this.x,
            barY - 8
        );
        
        ctx.restore();
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
            'formation': FormationEnemy,
            'carrier': CarrierEnemy
        };

        const EnemyClass = enemyClasses[type];
        if (!EnemyClass) {
            console.warn(`Unknown enemy type: ${type}`);
            return new BasicEnemy(x, y, laneIndex, level);
        }

        // Pass level to enemies that need it (all enemies now use level for health scaling)
        if (type === 'tank' || type === 'swarm' || type === 'formation' || type === 'basic' || type === 'carrier') {
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
            'formation': 13 + (level - 1) * 2,
            'carrier': level >= 5 ? 5 + (level - 5) * 2 : 0 // Only appears at level 5+
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

