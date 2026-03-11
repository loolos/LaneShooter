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
    
    /**
     * Get the bottom Y coordinate of the enemy (for optimized y-axis collision detection)
     * @returns {number} - Bottom Y coordinate
     */
    getBottomY() {
        return this.y + this.height / 2;
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

        // Polynomial health scaling to keep late-game pressure high.
        // Formula: A + B*LVL + C*LVL^2 + D*LVL^3
        const A = 3;
        const B = 0.55;
        const C = 1 / 85;
        const D = 1 / 2800;
        this.maxHealth = Math.max(3, Math.floor(A + B * level + C * level * level + D * level * level * level));
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
     * Draw basic enemy as a sleek fighter with enhanced visuals (optimized for performance)
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Reduced glow effect for better performance
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8; // Reduced from 15

        // Use solid color instead of gradient for better performance
        // Safely parse color values for darker shade
        let darkerColor = this.color;
        const colorMatch = this.color.match(/\d+/g);
        if (colorMatch && colorMatch.length >= 3) {
            const [r, g, b] = colorMatch.map(Number);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                darkerColor = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
            }
        }
        
        // Draw main body with enhanced shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 6, this.y - this.height / 3);
        ctx.lineTo(this.x, this.y - this.height / 2 + 3);
        ctx.lineTo(this.x + this.width / 6, this.y - this.height / 3);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Draw darker bottom section for depth (instead of gradient)
        ctx.fillStyle = darkerColor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 6, this.y);
        ctx.lineTo(this.x, this.y + this.height / 3);
        ctx.lineTo(this.x + this.width / 6, this.y);
        ctx.closePath();
        ctx.fill();

        // Draw wing details (reduced shadow)
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0; // Removed shadow for performance
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 3);
        ctx.moveTo(this.x + this.width / 3, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 3);
        ctx.stroke();

        // Simplified cockpit (solid color instead of gradient)
        ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
        ctx.shadowBlur = 6; // Reduced from 12
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 4, this.width / 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw engine glow (simplified)
        ctx.fillStyle = `rgba(255, 100, 50, 0.5)`;
        ctx.shadowColor = 'rgba(255, 100, 50, 0.8)';
        ctx.shadowBlur = 6; // Reduced from 10
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 8, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 2 + 4);
        ctx.lineTo(this.x + this.width / 8, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Fast Enemy - Moves faster but worth more points
 */
class FastEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1) {
        super(x, y, laneIndex);
        this.type = 'fast';
        this.color = '#ff6348';
        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * 1.5; // Override base speed
        this.speed = this.baseSpeed;
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * 2;
        this.width = 35; // Slightly smaller, more agile
        this.height = 35;

        // Fast enemies are no longer 1-hit forever; they scale into mid/late game.
        const A = 2;
        const B = 0.4;
        const C = 1 / 180;
        const D = 1 / 4200;
        this.maxHealth = Math.max(2, Math.floor(A + B * level + C * level * level + D * level * level * level));
        this.health = this.maxHealth;
    }

    /**
     * Draw fast enemy as a sleek interceptor with speed effects
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Enhanced glow for speed
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;

        // Create vibrant gradient
        const gradient = ctx.createLinearGradient(
            this.x, this.y - this.height / 2,
            this.x, this.y + this.height / 2
        );
        gradient.addColorStop(0, '#ff6348');
        gradient.addColorStop(0.3, '#ff8c69');
        gradient.addColorStop(0.7, '#ff4500');
        gradient.addColorStop(1, '#cc3300');

        // Draw sleek pointed fighter with enhanced shape
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2.5, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 8, this.y - this.height / 3);
        ctx.lineTo(this.x - this.width / 6, this.y - this.height / 4);
        ctx.lineTo(this.x, this.y - this.height / 2 + 2);
        ctx.lineTo(this.x + this.width / 6, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 8, this.y - this.height / 3);
        ctx.lineTo(this.x + this.width / 2.5, this.y - this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Draw speed lines (trailing effect)
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 4 + i * 2, this.y + this.height / 2 - i * 3);
            ctx.lineTo(this.x - this.width / 6 + i * 2, this.y + this.height / 2 + 2 - i * 3);
            ctx.moveTo(this.x + this.width / 4 - i * 2, this.y + this.height / 2 - i * 3);
            ctx.lineTo(this.x + this.width / 6 - i * 2, this.y + this.height / 2 + 2 - i * 3);
            ctx.stroke();
        }

        // Enhanced afterburner effect with multiple layers
        const time = Date.now() * 0.01;
        const burnIntensity = 0.7 + Math.sin(time) * 0.3;
        
        // Outer flame
        ctx.fillStyle = `rgba(255, 200, 0, ${0.6 * burnIntensity})`;
        ctx.shadowColor = 'rgba(255, 200, 0, 0.9)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 6, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 2 + 6);
        ctx.lineTo(this.x + this.width / 6, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Inner flame
        ctx.fillStyle = `rgba(255, 255, 200, ${0.8 * burnIntensity})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 10, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 2 + 4);
        ctx.lineTo(this.x + this.width / 10, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Enhanced cockpit with glow
        const cockpitGradient = ctx.createRadialGradient(
            this.x, this.y - this.height / 5, 0,
            this.x, this.y - this.height / 5, this.width / 8
        );
        cockpitGradient.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
        cockpitGradient.addColorStop(0.5, 'rgba(150, 200, 255, 0.6)');
        cockpitGradient.addColorStop(1, 'rgba(100, 150, 255, 0.3)');
        ctx.fillStyle = cockpitGradient;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 5, this.width / 8, 0, Math.PI * 2);
        ctx.fill();

        // Wing tips with glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x - this.width / 2.5, this.y - this.height / 2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width / 2.5, this.y - this.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Splinter Enemy - Splits into smaller shards on destruction
 */
class SplinterEnemy extends Enemy {
    constructor(x, y, laneIndex, level = 1, isChild = false, childConfig = null) {
        super(x, y, laneIndex);
        this.type = 'splinter';
        this.isChild = isChild;
        this.level = level;

        this.baseSpeed = CONFIG.ENEMY_BASE_SPEED * (isChild ? 0.85 : 0.7);
        this.speed = this.baseSpeed;

        // Parent uses tank-like scaling (1/3), children use swarm-like scaling (total 1/3)
        if (isChild) {
            let totalUnits, healthPerUnitValue, rowsValue, unitsPerRowValue;
            
            if (childConfig) {
                totalUnits = childConfig.totalUnits;
                healthPerUnitValue = childConfig.healthPerUnit;
                // Calculate rows and cols from totalUnits
                const maxRows = Math.min(3, Math.floor(level / 10) + 1);
                rowsValue = Math.min(maxRows, Math.floor(Math.sqrt(totalUnits)) || 1);
                unitsPerRowValue = Math.ceil(totalUnits / rowsValue);
            } else {
                // Fallback: swarm-like unit health formula (total 1/3)
                const A = 5;
                const B = 6;
                const C = 1 / 8;
                const D = 1 / 32;
                const totalHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);
                const childTotalHealth = Math.max(1, Math.floor(totalHealth / 2));
                const maxRows = Math.min(3, Math.floor(level / 10) + 1);
                rowsValue = randomInt(1, maxRows);
                const minCols = 4;
                const maxCols = 8;
                unitsPerRowValue = randomInt(minCols, maxCols);
                totalUnits = rowsValue * unitsPerRowValue;
                healthPerUnitValue = Math.max(1, Math.floor(childTotalHealth / totalUnits));
            }
            
            this.maxUnits = totalUnits;
            this.healthPerUnit = healthPerUnitValue;
            this.rows = rowsValue;
            this.unitsPerRow = unitsPerRowValue;
            
            // Recalculate actual total health
            const actualTotalHealth = this.healthPerUnit * totalUnits;
            this.maxHealth = actualTotalHealth;
            this.health = actualTotalHealth;
            
            // Initialize units array - each unit has individual health and position (like swarm)
            this.units = [];
            this.unitSize = 12; // Size of each unit
            this.spread = 80; // Spread between units
            
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.unitsPerRow; col++) {
                    const unitIndex = row * this.unitsPerRow + col;
                    if (unitIndex >= totalUnits) break;
                    
                    const rowSpread = row === 0 ? this.spread : this.spread * 0.85;
                    const spacingMultiplier = row === 0 ? 1.2 : 1.0;
                    const offsetX = (col - (this.unitsPerRow - 1) / 2) * (rowSpread / this.unitsPerRow) * spacingMultiplier;
                    const offsetY = (row - (this.rows - 1) / 2) * (this.spread / this.unitsPerRow);
                    
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
            
            this.unitCount = this.maxUnits;
            
            this.width = 28;
            this.height = 28;
            // Swarm-like score formula, scaled to 1/3
            const baseTotalHealth = 5;
            const baseScoreMultiplier = 2;
            const scoreBonus = (actualTotalHealth - baseTotalHealth) * 0.1 + (totalUnits - 3) * 0.2;
            this.scoreValue = Math.floor((CONFIG.SCORE_PER_ENEMY * (baseScoreMultiplier + scoreBonus)) / 3);
            
            // Initialize cache flags
            this._needsBottomYUpdate = true;
            this._cachedBottomY = undefined;
            this._needsCacheUpdate = false;
        } else {
            // Tank-like health scaling
            const A = 14;
            const B = 5;
            const C = 1 / 8;
            const D = 1 / 35;
            const tankHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);
            this.maxHealth = Math.max(1, Math.floor(tankHealth / 3));
            // Scale parent splinter size with total health, but keep it smaller than tank.
            const level1Health = Math.max(1, Math.floor((A + B + C + D) / 3));
            const baseSize = 38;
            const sizeMultiplier = Math.pow(this.maxHealth / level1Health, 0.26);
            const scaledSize = Math.floor(baseSize * sizeMultiplier);
            this.width = clamp(scaledSize, 34, 66);
            this.height = this.width;
            // Tank-like score formula, scaled to 1/3
            this.scoreValue = (CONFIG.SCORE_PER_ENEMY * (5 + (level - 1) * 1)) / 3;

            // Precompute split configuration using swarm-like algorithm (total 1/3)
            const swarmA = 10;
            const swarmB = 3;
            const swarmC = 1 / 14;
            const swarmD = 1 / 35;
            const swarmTotalHealth = Math.floor(swarmA + swarmB * level + swarmC * level * level + swarmD * level * level * level);
            const childTotalHealth = Math.max(1, Math.floor(swarmTotalHealth / 3));
            const maxRows = Math.min(3, Math.floor(level / 10) + 1);
            const rows = randomInt(1, maxRows);
            const minCols = 4;
            const maxCols = 8;
            const unitsPerRow = randomInt(minCols, maxCols);
            const totalUnits = rows * unitsPerRow;
            const healthPerUnit = Math.max(1, Math.floor(childTotalHealth / totalUnits));
            this.splitConfig = {
                totalUnits,
                healthPerUnit
            };
        }
        this.health = this.maxHealth;

        this.updateColor();
    }

    /**
     * Update color based on remaining health
     */
    updateColor() {
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        this.color = this.getSplinterColor(healthPercent);
    }

    /**
     * Blend splinter color toward grayscale as health drops (tank-like damage readability)
     * @param {number} healthPercent
     * @returns {string}
     */
    getSplinterColor(healthPercent) {
        const clampedHealth = Math.max(0, Math.min(1, healthPercent));

        // High-health base tint: bright violet crystal.
        const baseR = Math.floor(120 + 110 * clampedHealth);
        const baseG = Math.floor(40 + 80 * clampedHealth);
        const baseB = Math.floor(140 + 90 * clampedHealth);

        // At low health, aggressively desaturate toward dark grayscale.
        const grayscale = Math.floor(55 + 145 * clampedHealth);
        const grayscaleMix = Math.pow(1 - clampedHealth, 0.8);

        const r = Math.floor(baseR * (1 - grayscaleMix) + grayscale * grayscaleMix);
        const g = Math.floor(baseG * (1 - grayscaleMix) + grayscale * grayscaleMix);
        const b = Math.floor(baseB * (1 - grayscaleMix) + grayscale * grayscaleMix);
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Take damage and update color
     */
    takeDamage(damage) {
        // Child splinters use unit system with random death (like swarm/formation)
        if (this.isChild && this.units) {
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
            this.unitCount = this.units.filter(u => u.health > 0).length;

            const newAliveCount = this.unitCount;
            const unitsKilled = oldAliveCount - newAliveCount;

            // Invalidate bottom Y cache and alive units cache when units are killed
            if (unitsKilled > 0) {
                this._needsBottomYUpdate = true;
                this._needsCacheUpdate = true;
            }

            // Update color based on remaining health
            this.updateColor();

            if (this.health <= 0 || this.unitCount === 0) {
                this.active = false;
                return { destroyed: true, unitsKilled: unitsKilled };
            }

            return { destroyed: false, unitsKilled: unitsKilled };
        }
        
        // Parent splinter uses simple health system
        this.health -= damage;
        this.updateColor();

        if (this.health <= 0) {
            this.active = false;
            const result = { destroyed: true, unitsKilled: 1 };
            if (!this.isChild) {
                result.spawnChildren = true;
                result.childConfig = {
                    totalUnits: this.splitConfig.totalUnits,
                    healthPerUnit: this.splitConfig.healthPerUnit
                };
                result.childCount = this.splitConfig.totalUnits;
            }
            return result;
        }
        return { destroyed: false, unitsKilled: 0 };
    }

    /**
     * Update enemy position and invalidate bottom Y cache when moving (for child splinters)
     */
    update() {
        super.update(); // Call parent update to move enemy
        if (this.isChild) {
            // Invalidate bottom Y cache since y position changed
            this._needsBottomYUpdate = true;
        }
    }

    /**
     * Get color for a unit based on its health (for child splinters)
     */
    getUnitColor(unit) {
        const healthPercent = unit.health / unit.maxHealth;
        return this.getSplinterColor(healthPercent);
    }

    /**
     * Draw splinter enemy with fracture seams
     */
    draw(ctx) {
        if (!this.active) return;

        // Child splinters draw multiple units (like swarm/formation)
        if (this.isChild && this.units) {
            ctx.save();
            
            // Draw each unit
            for (const unit of this.units) {
                if (unit.health <= 0) continue; // Skip dead units
                
                const unitX = this.x + unit.offsetX;
                const unitY = this.y + unit.offsetY;
                const unitColor = this.getUnitColor(unit);
                
                ctx.shadowColor = unitColor;
                ctx.shadowBlur = 6;
                
                // Main body (diamond)
                ctx.fillStyle = unitColor;
                ctx.beginPath();
                ctx.moveTo(unitX, unitY - this.unitSize / 2);
                ctx.lineTo(unitX + this.unitSize / 2, unitY);
                ctx.lineTo(unitX, unitY + this.unitSize / 2);
                ctx.lineTo(unitX - this.unitSize / 2, unitY);
                ctx.closePath();
                ctx.fill();
                
                // Inner core
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(unitX, unitY, this.unitSize / 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Fracture seams
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(unitX - this.unitSize / 6, unitY - this.unitSize / 6);
                ctx.lineTo(unitX + this.unitSize / 6, unitY + this.unitSize / 6);
                ctx.moveTo(unitX + this.unitSize / 6, unitY - this.unitSize / 6);
                ctx.lineTo(unitX - this.unitSize / 6, unitY + this.unitSize / 6);
                ctx.stroke();
            }
            
            ctx.restore();
            return;
        }

        // Parent splinter draws single unit
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        // Main body (diamond)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y);
        ctx.closePath();
        ctx.fill();

        // Inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 8, 0, Math.PI * 2);
        ctx.fill();

        // Fracture seams
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 6, this.y - this.height / 6);
        ctx.lineTo(this.x + this.width / 6, this.y + this.height / 6);
        ctx.moveTo(this.x + this.width / 6, this.y - this.height / 6);
        ctx.lineTo(this.x - this.width / 6, this.y + this.height / 6);
        ctx.stroke();

        if (!this.isChild) {
            // Tank-like health bar for parent
            const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
            const barWidth = this.width;
            const barHeight = 6;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.height / 2 - 12;

            ctx.fillStyle = '#111';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
            if (healthPercent > 0.5) {
                healthGradient.addColorStop(0, '#00ff00');
                healthGradient.addColorStop(1, '#00cc00');
            } else if (healthPercent > 0.25) {
                healthGradient.addColorStop(0, '#ffff00');
                healthGradient.addColorStop(1, '#ffcc00');
            } else {
                healthGradient.addColorStop(0, '#ff0000');
                healthGradient.addColorStop(1, '#cc0000');
            }
            ctx.fillStyle = healthGradient;
            ctx.shadowBlur = 8;
            ctx.shadowColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }
    
    /**
     * Get the bottom Y coordinate of the bottommost row (for child splinters)
     * Uses cached value that's updated when enemy takes damage
     * @returns {number} - Bottom Y coordinate
     */
    getBottomY() {
        if (this.isChild && this.units) {
            // Use cached value if available and valid
            if (this._cachedBottomY !== undefined && !this._needsBottomYUpdate) {
                return this._cachedBottomY;
            }
            
            // Calculate and cache
            const aliveUnits = this.units.filter(u => u.health > 0);
            if (aliveUnits.length === 0) {
                this._cachedBottomY = this.y + this.height / 2;
                this._needsBottomYUpdate = false;
                return this._cachedBottomY;
            }
            
            const maxRow = Math.max(...aliveUnits.map(u => u.row));
            const maxRowUnits = aliveUnits.filter(u => u.row === maxRow);
            if (maxRowUnits.length === 0) {
                this._cachedBottomY = this.y + this.height / 2;
                this._needsBottomYUpdate = false;
                return this._cachedBottomY;
            }
            
            // Find the bottommost unit in the bottommost row
            const bottommostUnit = maxRowUnits.reduce((bottom, unit) => {
                const unitY = this.y + unit.offsetY;
                const bottomY = this.y + bottom.offsetY;
                return unitY > bottomY ? unit : bottom;
            });
            
            this._cachedBottomY = this.y + bottommostUnit.offsetY + this.unitSize / 2;
            this._needsBottomYUpdate = false;
            return this._cachedBottomY;
        }
        
        // Parent splinter uses standard bottom Y
        return super.getBottomY();
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

        // Health increases with level using stronger late-game polynomial scaling.
        const A = 14;    // Constant term
        const B = 6;    // Linear coefficient
        const C = 1 / 7;  // Quadratic coefficient
        const D = 1 / 35; // Cubic coefficient
        const maxHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);
        this.maxHealth = Math.floor(maxHealth);
        this.health = this.maxHealth;
        // Calculate initial health using same formula (Level 1)
        const level1Health = A + B * 1 + C * 1 * 1;
        this.initialHealth = Math.floor(level1Health); // Base health for color calculation (Level 1: 8.25 -> 8)

        // Increased score value for more experience
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (5 + (level - 1) * 1); // More score (increased from 3 + 0.5)

        // Size scales with sqrt of maxHealth: base 50x50, proportional to sqrt(maxHealth)
        // Use sqrt of maxHealth relative to base size
        const baseSize = 50;
        const baseHealthForSize = Math.floor(level1Health); // Level 1 health (8)
        const sizeMultiplier = Math.pow(this.maxHealth / baseHealthForSize, 0.3);
        this.width = Math.floor(baseSize * sizeMultiplier);
        this.height = Math.floor(baseSize * sizeMultiplier);

        // Update color based on health
        this.updateColor();
    }

    /**
     * Update color based on current health (not max health)
     * Color changes from red/orange (healthy) to darker red/gray as health decreases
     */
    updateColor() {
        // Use current health percentage, not max health ratio
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));

        // Color changes from bright red/orange (healthy) to dark red/brown (damaged)
        // Ensure no green color is produced
        if (healthPercent > 0.7) {
            // Bright red to orange-red (healthy)
            const intensity = (healthPercent - 0.7) / 0.3; // 0 to 1 as health goes from 0.7 to 1.0
            const r = 255;
            const g = Math.floor(50 + intensity * 100); // 50 to 150 (red to orange-red)
            const b = 0;
            this.color = `rgb(${r}, ${g}, ${b})`;
        } else if (healthPercent > 0.4) {
            // Orange-red to dark red (moderately damaged)
            const intensity = (healthPercent - 0.4) / 0.3; // 0 to 1 as health goes from 0.4 to 0.7
            const r = 255;
            const g = Math.floor(30 + intensity * 20); // 30 to 50
            const b = 0;
            this.color = `rgb(${r}, ${g}, ${b})`;
        } else {
            // Dark red to brown-red (heavily damaged)
            const intensity = healthPercent / 0.4; // 0 to 1 as health goes from 0 to 0.4
            const r = Math.floor(180 + intensity * 75); // 180 to 255
            const g = Math.floor(30 * intensity); // 0 to 30
            const b = 0;
            this.color = `rgb(${r}, ${g}, ${b})`;
        }
    }
    
    /**
     * Take damage and update color
     */
    takeDamage(damage) {
        this.health -= damage;
        this.updateColor(); // Update color when health changes

        if (this.health <= 0) {
            this.active = false;
            return { destroyed: true, unitsKilled: 1 };
        }
        return { destroyed: false, unitsKilled: 0 };
    }

    /**
     * Draw tank enemy as a heavy battleship with enhanced armor
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // Calculate health percentage for color fading
        const healthPercent = this.health / this.maxHealth;
        
        // Helper function to blend color with gray based on health
        const blendWithGray = (r, g, b, grayValue = 128) => {
            const blendedR = Math.floor(r * healthPercent + grayValue * (1 - healthPercent));
            const blendedG = Math.floor(g * healthPercent + grayValue * (1 - healthPercent));
            const blendedB = Math.floor(b * healthPercent + grayValue * (1 - healthPercent));
            return [blendedR, blendedG, blendedB];
        };
        
        // Parse original color and blend with gray
        const colorMatch = this.color.match(/\d+/g);
        let baseR, baseG, baseB;
        if (colorMatch && colorMatch.length >= 3) {
            [baseR, baseG, baseB] = colorMatch.map(Number);
            if (isNaN(baseR) || isNaN(baseG) || isNaN(baseB)) {
                baseR = 255; baseG = 0; baseB = 0; // Default red
            }
        } else {
            baseR = 255; baseG = 0; baseB = 0; // Default red
        }
        
        // Blend base color with gray
        const [blendedR, blendedG, blendedB] = blendWithGray(baseR, baseG, baseB);
        const blendedColor = `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
        
        ctx.shadowColor = blendedColor;
        ctx.shadowBlur = 20;

        // Create gradient for main body with health-based color fading
        const gradient = ctx.createLinearGradient(
            this.x, this.y - this.height / 2,
            this.x, this.y + this.height / 2
        );
        
        // Top color (lighter, more original)
        const [topR, topG, topB] = blendWithGray(baseR, baseG, baseB, 100);
        gradient.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
        
        // Middle colors with gradient effect
        const [mid1R, mid1G, mid1B] = blendWithGray(
            Math.max(0, baseR - 30), 
            Math.max(0, baseG - 20), 
            Math.max(0, baseB - 20),
            90
        );
        gradient.addColorStop(0.3, `rgb(${mid1R}, ${mid1G}, ${mid1B})`);
        
        const [mid2R, mid2G, mid2B] = blendWithGray(
            Math.max(0, baseR - 50), 
            Math.max(0, baseG - 30), 
            Math.max(0, baseB - 30),
            80
        );
        gradient.addColorStop(0.7, `rgb(${mid2R}, ${mid2G}, ${mid2B})`);
        
        // Bottom color (darker, more gray)
        const [bottomR, bottomG, bottomB] = blendWithGray(
            Math.max(0, baseR - 70), 
            Math.max(0, baseG - 40), 
            Math.max(0, baseB - 40),
            70
        );
        gradient.addColorStop(1, `rgb(${bottomR}, ${bottomG}, ${bottomB})`);

        // Draw main body (wider, more armored) with enhanced shape
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 3);
        ctx.lineTo(this.x - this.width / 3, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 6, this.y - this.height / 2 + 2);
        ctx.lineTo(this.x, this.y - this.height / 2 + 5);
        ctx.lineTo(this.x + this.width / 6, this.y - this.height / 2 + 2);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 3);
        ctx.closePath();
        ctx.fill();

        // Draw enhanced armor plates with highlights (fade with health)
        const armorAlpha = 0.3 + healthPercent * 0.3; // Fade from 0.3 to 0.6
        const armorGray = Math.floor(128 + (255 - 128) * healthPercent);
        ctx.strokeStyle = `rgba(${armorGray}, ${armorGray}, ${armorGray}, ${armorAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 4);
        ctx.moveTo(this.x - this.width / 4, this.y);
        ctx.lineTo(this.x + this.width / 4, this.y);
        ctx.stroke();

        // Draw armor plate highlights (fade with health)
        const highlightGray = Math.floor(100 + (200 - 100) * healthPercent);
        ctx.strokeStyle = `rgba(${highlightGray}, ${highlightGray}, ${highlightGray}, ${armorAlpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y - this.height / 4 - 1);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 4 - 1);
        ctx.stroke();

        // Draw side armor panels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 4, this.width / 8, this.height / 4);
        ctx.fillRect(this.x + this.width / 2 - this.width / 8, this.y - this.height / 4, this.width / 8, this.height / 4);

        // Enhanced cannon/weapon mount with glow
        const cannonGradient = ctx.createRadialGradient(
            this.x, this.y - this.height / 3, 0,
            this.x, this.y - this.height / 3, this.width / 6
        );
        cannonGradient.addColorStop(0, 'rgba(150, 150, 150, 0.9)');
        cannonGradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.8)');
        cannonGradient.addColorStop(1, 'rgba(50, 50, 50, 0.6)');
        ctx.fillStyle = cannonGradient;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 3, this.width / 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw cannon barrel
        ctx.fillStyle = 'rgba(80, 80, 80, 0.9)';
        ctx.fillRect(this.x - this.width / 12, this.y - this.height / 2 - 3, this.width / 6, 6);

        // Draw corner reinforcements (fade with health)
        const reinforcementGray = Math.floor(128 + (255 - 128) * healthPercent);
        ctx.fillStyle = `rgba(${reinforcementGray}, ${reinforcementGray}, ${reinforcementGray}, ${0.2 + healthPercent * 0.1})`;
        ctx.beginPath();
        ctx.arc(this.x - this.width / 2, this.y - this.height / 3, 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.width / 2, this.y - this.height / 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Enhanced health bar with glow
        const barWidth = this.width;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height / 2 - 12;

        // Background with border
        ctx.fillStyle = '#111';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health with gradient (healthPercent already calculated above)
        const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
        if (healthPercent > 0.5) {
            healthGradient.addColorStop(0, '#00ff00');
            healthGradient.addColorStop(1, '#00cc00');
        } else if (healthPercent > 0.25) {
            healthGradient.addColorStop(0, '#ffff00');
            healthGradient.addColorStop(1, '#ffcc00');
        } else {
            healthGradient.addColorStop(0, '#ff0000');
            healthGradient.addColorStop(1, '#cc0000');
        }
        ctx.fillStyle = healthGradient;
        ctx.shadowBlur = 8;
        ctx.shadowColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
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
        // Total health increases with level: A + B*LVL + C*LVL^2 + D*LVL^3
        // Formula: 5 + 1*LVL + (1/4)*LVL^2 + (1/25)*LVL^3
        const A = 10;    // Constant term
        const B = 6;    // Linear coefficient
        const C = 1 / 20;  // Quadratic coefficient
        const D = 1 / 35; // Cubic coefficient
        const totalHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);

        // Randomly determine rows and columns within reasonable ranges
        // Rows: random from 1 to min(4, floor(level/5)+1), Columns: 3-6 (fixed)
        const maxRows = Math.min(4, Math.floor(level / 5) + 1);
        this.rows = randomInt(1, maxRows);
        const minCols = 3;
        const maxCols = 6;

        // Randomly select columns
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
        
        // Initialize cache flags
        this._needsBottomYUpdate = true;
        this._cachedBottomY = undefined;
    }

    /**
     * Update enemy position and invalidate bottom Y cache when moving
     */
    update() {
        super.update(); // Call parent update to move enemy
        // Invalidate bottom Y cache since y position changed
        this._needsBottomYUpdate = true;
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

        const totalWidth = (this.cols * this.enemyWidth) + ((this.cols - 1) * this.spacing);
        const totalHeight = (this.rows * this.enemyHeight) + ((this.rows - 1) * this.rowSpacing);
        const startX = this.x - totalWidth / 2;
        const startY = this.y - totalHeight / 2;

        const aliveCount = this.units.filter(u => u.health > 0).length;
        const useSimpleDraw = aliveCount > 10;

        for (const unit of this.units) {
            if (unit.health <= 0) continue;

            const unitX = startX + (unit.col * (this.enemyWidth + this.spacing)) + (this.enemyWidth / 2);
            const unitY = startY + (unit.row * (this.enemyHeight + this.rowSpacing)) + (this.enemyHeight / 2);
            const unitColor = this.getUnitColor(unit);

            if (useSimpleDraw) {
                // Simplified drawing: no shadowBlur, just the ship shape and cockpit
                ctx.fillStyle = unitColor;
                ctx.beginPath();
                ctx.moveTo(unitX, unitY + this.enemyHeight / 2);
                ctx.lineTo(unitX - this.enemyWidth / 2, unitY - this.enemyHeight / 2);
                ctx.lineTo(unitX, unitY - this.enemyHeight / 2 + 4);
                ctx.lineTo(unitX + this.enemyWidth / 2, unitY - this.enemyHeight / 2);
                ctx.closePath();
                ctx.fill();

                // Cockpit dot
                ctx.fillStyle = 'rgba(255, 240, 200, 0.8)';
                ctx.beginPath();
                ctx.arc(unitX, unitY - this.enemyHeight / 4, this.enemyWidth / 7, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }

            // Full detail drawing for low unit counts
            ctx.shadowColor = unitColor;
            ctx.shadowBlur = 6;

            let darkerColor = unitColor;
            const colorMatch = unitColor.match(/\d+/g);
            if (colorMatch && colorMatch.length >= 3) {
                const [r, g, b] = colorMatch.map(Number);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    darkerColor = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 15)}, ${Math.max(0, b - 15)})`;
                }
            }
            
            ctx.fillStyle = unitColor;
            ctx.beginPath();
            ctx.moveTo(unitX, unitY + this.enemyHeight / 2);
            ctx.lineTo(unitX - this.enemyWidth / 2, unitY - this.enemyHeight / 2);
            ctx.lineTo(unitX - this.enemyWidth / 6, unitY - this.enemyHeight / 3);
            ctx.lineTo(unitX, unitY - this.enemyHeight / 2 + 2);
            ctx.lineTo(unitX + this.enemyWidth / 6, unitY - this.enemyHeight / 3);
            ctx.lineTo(unitX + this.enemyWidth / 2, unitY - this.enemyHeight / 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = darkerColor;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(unitX, unitY + this.enemyHeight / 2);
            ctx.lineTo(unitX - this.enemyWidth / 6, unitY);
            ctx.lineTo(unitX, unitY + this.enemyHeight / 3);
            ctx.lineTo(unitX + this.enemyWidth / 6, unitY);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(unitX - this.enemyWidth / 4, unitY);
            ctx.lineTo(unitX - this.enemyWidth / 2, unitY - this.enemyHeight / 3);
            ctx.moveTo(unitX + this.enemyWidth / 4, unitY);
            ctx.lineTo(unitX + this.enemyWidth / 2, unitY - this.enemyHeight / 3);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 240, 200, 0.8)';
            ctx.beginPath();
            ctx.arc(unitX, unitY - this.enemyHeight / 4, this.enemyWidth / 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 100, 50, 0.4)`;
            ctx.beginPath();
            ctx.moveTo(unitX - this.enemyWidth / 10, unitY + this.enemyHeight / 2);
            ctx.lineTo(unitX, unitY + this.enemyHeight / 2 + 2);
            ctx.lineTo(unitX + this.enemyWidth / 10, unitY + this.enemyHeight / 2);
            ctx.closePath();
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

        // Invalidate bottom Y cache when units are killed
        if (unitsKilled > 0) {
            this._needsBottomYUpdate = true;
        }

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
    
    /**
     * Get the bottom Y coordinate of the bottommost row (for optimized y-axis collision detection)
     * Uses cached value that's updated when enemy takes damage
     * @returns {number} - Bottom Y coordinate of the bottommost row
     */
    getBottomY() {
        // Use cached value if available and valid
        if (this._cachedBottomY !== undefined && !this._needsBottomYUpdate) {
            return this._cachedBottomY;
        }
        
        // Calculate and cache
        const aliveUnits = this.units.filter(u => u.health > 0);
        if (aliveUnits.length === 0) {
            this._cachedBottomY = this.y + this.height / 2;
            this._needsBottomYUpdate = false;
            return this._cachedBottomY;
        }
        
        const maxRow = Math.max(...aliveUnits.map(u => u.row));
        const totalHeight = (this.rows * this.enemyHeight) + ((this.rows - 1) * this.rowSpacing);
        const startY = this.y - totalHeight / 2;
        const rowY = startY + (maxRow * (this.enemyHeight + this.rowSpacing)) + (this.enemyHeight / 2);
        this._cachedBottomY = rowY + this.enemyHeight / 2;
        this._needsBottomYUpdate = false;
        return this._cachedBottomY;
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
        // Total health increases with level: A + B*LVL + C*LVL^2 + D*LVL^3
        // Formula: 5 + 1*LVL + (1/4)*LVL^2 + (1/25)*LVL^3
        const A = 14;    // Constant term
        const B = 4;    // Linear coefficient
        const C = 1 / 14;  // Quadratic coefficient
        const D = 1 / 35; // Cubic coefficient
        const totalHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);

        // Randomly determine rows and columns within reasonable ranges
        // Rows: random from 1 to min(4, floor(level/5)+1), Columns: 3-6 (fixed)
        const maxRows = Math.min(3, Math.floor(level / 10) + 1);
        this.rows = randomInt(1, maxRows);
        const minCols = 4;
        const maxCols = 8;

        // Randomly select columns
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
        
        // Initialize cache flags
        this._needsBottomYUpdate = true;
        this._cachedBottomY = undefined;
    }

    /**
     * Update enemy position and invalidate bottom Y cache when moving
     */
    update() {
        super.update(); // Call parent update to move enemy
        // Invalidate bottom Y cache since y position changed
        this._needsBottomYUpdate = true;
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
     * Draw swarm as multiple small units, each with individual color (insect-like design)
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        const aliveCount = this.units.filter(u => u.health > 0).length;
        const useSimpleDraw = aliveCount > 12;

        const time = Date.now() * 0.01;
        
        for (const unit of this.units) {
            if (unit.health <= 0) continue;

            const unitX = this.x + unit.offsetX;
            const unitY = this.y + unit.offsetY;
            const unitColor = this.getUnitColor(unit);

            if (useSimpleDraw) {
                // Simplified drawing for high unit counts — wings (static), body, head, eyes; no shadowBlur or animation
                const wingY = unitY; // Static wings, no wingOffset
                ctx.strokeStyle = `rgba(255, 220, 120, 0.5)`;
                ctx.fillStyle = `rgba(255, 220, 120, 0.35)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(unitX - this.unitSize * 0.3, wingY, this.unitSize * 0.45, this.unitSize * 0.3, -0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(unitX + this.unitSize * 0.3, wingY, this.unitSize * 0.45, this.unitSize * 0.3, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = unitColor;
                ctx.beginPath();
                ctx.ellipse(unitX, unitY, this.unitSize * 0.35, this.unitSize * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = unitColor;
                ctx.beginPath();
                ctx.arc(unitX, unitY - this.unitSize * 0.25, this.unitSize * 0.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(200, 240, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(unitX - this.unitSize * 0.12, unitY - this.unitSize * 0.25, this.unitSize * 0.06, 0, Math.PI * 2);
                ctx.arc(unitX + this.unitSize * 0.12, unitY - this.unitSize * 0.25, this.unitSize * 0.06, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }

            // Full detail drawing for lower unit counts
            const wingOffset = Math.sin(time + unit.offsetX * 0.1) * 2;

            ctx.strokeStyle = `rgba(255, 220, 120, 0.6)`;
            ctx.fillStyle = `rgba(255, 220, 120, 0.4)`;
            ctx.lineWidth = 1.5;

            // Left wing
            ctx.beginPath();
            ctx.ellipse(unitX - this.unitSize * 0.3, unitY - wingOffset, this.unitSize * 0.45, this.unitSize * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.ellipse(unitX + this.unitSize * 0.3, unitY - wingOffset, this.unitSize * 0.45, this.unitSize * 0.3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = unitColor;
            ctx.shadowColor = unitColor;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.ellipse(unitX, unitY, this.unitSize * 0.35, this.unitSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Darker center
            let darkerColor = unitColor;
            const colorMatch = unitColor.match(/\d+/g);
            if (colorMatch && colorMatch.length >= 3) {
                const [r, g, b] = colorMatch.map(Number);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    darkerColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 25)}, ${Math.max(0, b - 10)})`;
                }
            }
            ctx.fillStyle = darkerColor;
            ctx.beginPath();
            ctx.ellipse(unitX, unitY, this.unitSize * 0.25, this.unitSize * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body segments
            ctx.strokeStyle = `rgba(0, 0, 0, 0.3)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(unitX - this.unitSize * 0.2, unitY - this.unitSize * 0.2);
            ctx.lineTo(unitX + this.unitSize * 0.2, unitY - this.unitSize * 0.2);
            ctx.moveTo(unitX - this.unitSize * 0.2, unitY);
            ctx.lineTo(unitX + this.unitSize * 0.2, unitY);
            ctx.moveTo(unitX - this.unitSize * 0.2, unitY + this.unitSize * 0.2);
            ctx.lineTo(unitX + this.unitSize * 0.2, unitY + this.unitSize * 0.2);
            ctx.stroke();

            // Head
            ctx.fillStyle = unitColor;
            ctx.beginPath();
            ctx.arc(unitX, unitY - this.unitSize * 0.25, this.unitSize * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = 'rgba(200, 240, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(unitX - this.unitSize * 0.15, unitY - this.unitSize * 0.25, this.unitSize * 0.08, 0, Math.PI * 2);
            ctx.arc(unitX + this.unitSize * 0.15, unitY - this.unitSize * 0.25, this.unitSize * 0.08, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye pupils
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(unitX - this.unitSize * 0.15, unitY - this.unitSize * 0.25, this.unitSize * 0.04, 0, Math.PI * 2);
            ctx.arc(unitX + this.unitSize * 0.15, unitY - this.unitSize * 0.25, this.unitSize * 0.04, 0, Math.PI * 2);
            ctx.fill();

            // Antennae
            ctx.strokeStyle = unitColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(unitX - this.unitSize * 0.1, unitY - this.unitSize * 0.35);
            ctx.lineTo(unitX - this.unitSize * 0.2, unitY - this.unitSize * 0.45);
            ctx.moveTo(unitX + this.unitSize * 0.1, unitY - this.unitSize * 0.35);
            ctx.lineTo(unitX + this.unitSize * 0.2, unitY - this.unitSize * 0.45);
            ctx.stroke();

            // Antenna tips
            ctx.fillStyle = unitColor;
            ctx.beginPath();
            ctx.arc(unitX - this.unitSize * 0.2, unitY - this.unitSize * 0.45, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(unitX + this.unitSize * 0.2, unitY - this.unitSize * 0.45, 1.5, 0, Math.PI * 2);
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

        // Invalidate bottom Y cache when units are killed
        if (unitsKilled > 0) {
            this._needsBottomYUpdate = true;
        }

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
    
    /**
     * Get the bottom Y coordinate of the bottommost row (for optimized y-axis collision detection)
     * Uses cached value that's updated when enemy takes damage
     * @returns {number} - Bottom Y coordinate of the bottommost row
     */
    getBottomY() {
        // Use cached value if available and valid
        if (this._cachedBottomY !== undefined && !this._needsBottomYUpdate) {
            return this._cachedBottomY;
        }
        
        // Calculate and cache
        const aliveUnits = this.units.filter(u => u.health > 0);
        if (aliveUnits.length === 0) {
            this._cachedBottomY = this.y + this.height / 2;
            this._needsBottomYUpdate = false;
            return this._cachedBottomY;
        }
        
        const maxRow = Math.max(...aliveUnits.map(u => u.row));
        const rowUnits = this.units.filter(u => u.row === maxRow);
        if (rowUnits.length > 0) {
            const firstUnit = rowUnits[0];
            const rowY = this.y + firstUnit.offsetY;
            this._cachedBottomY = rowY + this.unitSize / 2;
            this._needsBottomYUpdate = false;
            return this._cachedBottomY;
        }
        this._cachedBottomY = this.y + this.height / 2;
        this._needsBottomYUpdate = false;
        return this._cachedBottomY;
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

        // Very high health that increases aggressively in late game.
        const A = 160;    // Constant term
        const B = 48;    // Linear coefficient
        const C = 2 / 5;  // Quadratic coefficient
        const D = 1 / 8; // Cubic coefficient
        this.maxHealth = Math.floor(A + B * level + C * level * level + D * level * level * level);

        this.health = this.maxHealth;
        this.initialHealth = 200;

        // High score value
        this.scoreValue = CONFIG.SCORE_PER_ENEMY * (10 + (level - 5) * 2);
        this.width = 80;
        this.height = 60;

        // Spawning system
        this.spawnCooldown = 0;
        this.spawnInterval = Math.max(150, 280 - level * 4); // Late game carriers spawn escorts faster
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
     * Draw carrier as a large stationary ship with enhanced visuals
     */
    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 25;

        // Create gradient for main body
        const bodyGradient = ctx.createLinearGradient(
            this.x, this.y - this.height / 2,
            this.x, this.y + this.height / 2
        );
        bodyGradient.addColorStop(0, '#5a6578');
        bodyGradient.addColorStop(0.3, '#4a5568');
        bodyGradient.addColorStop(0.7, '#3a4558');
        bodyGradient.addColorStop(1, '#2a3548');

        // Draw main carrier body with rounded corners effect
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2 + 5, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2 - 5, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2 + 5);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x + this.width / 2 - 5, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2 + 5, this.y + this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2 + 5);
        ctx.closePath();
        ctx.fill();

        // Draw carrier deck with enhanced details
        const deckGradient = ctx.createLinearGradient(
            this.x - this.width / 2, this.y - this.height / 2,
            this.x - this.width / 2, this.y - this.height / 2 + this.height / 3
        );
        deckGradient.addColorStop(0, 'rgba(120, 120, 140, 0.9)');
        deckGradient.addColorStop(1, 'rgba(80, 80, 100, 0.8)');
        ctx.fillStyle = deckGradient;
        ctx.fillRect(
            this.x - this.width / 2 + 5,
            this.y - this.height / 2 + 5,
            this.width - 10,
            this.height / 3
        );

        // Draw deck lines
        ctx.strokeStyle = 'rgba(200, 200, 220, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2 + 10, this.y - this.height / 2 + 10 + i * 5);
            ctx.lineTo(this.x + this.width / 2 - 10, this.y - this.height / 2 + 10 + i * 5);
            ctx.stroke();
        }

        // Enhanced launch bay with inner glow
        const bayGradient = ctx.createLinearGradient(
            this.x - this.width / 2, this.y - this.height / 4,
            this.x - this.width / 2 + this.width / 4, this.y + this.height / 4
        );
        bayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        bayGradient.addColorStop(0.5, 'rgba(50, 0, 50, 0.6)');
        bayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = bayGradient;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(100, 0, 150, 0.5)';
        ctx.fillRect(
            this.x - this.width / 2,
            this.y - this.height / 4,
            this.width / 4,
            this.height / 2
        );

        // Draw launch bay inner details
        ctx.fillStyle = 'rgba(150, 0, 200, 0.3)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x - this.width / 2 + this.width / 8, this.y, this.width / 12, 0, Math.PI * 2);
        ctx.fill();

        // Enhanced side details with glow
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(200, 200, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.stroke();

        // Draw side panels
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 3, 8, this.height / 1.5);
        ctx.fillRect(this.x + this.width / 2 - 8, this.y - this.height / 3, 8, this.height / 1.5);

        // Draw corner reinforcements
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 5;
        for (let i = 0; i < 4; i++) {
            const cornerX = i % 2 === 0 ? this.x - this.width / 2 : this.x + this.width / 2;
            const cornerY = i < 2 ? this.y - this.height / 2 : this.y + this.height / 2;
            ctx.beginPath();
            ctx.arc(cornerX, cornerY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enhanced health bar with glow (always visible for carrier)
        const barWidth = this.width + 10;
        const barHeight = 7;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.height / 2 - 18;

        // Background with border
        ctx.fillStyle = '#111';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health with gradient
        const healthPercent = this.health / this.maxHealth;
        const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
        if (healthPercent > 0.6) {
            healthGradient.addColorStop(0, '#00ff00');
            healthGradient.addColorStop(1, '#00cc00');
        } else if (healthPercent > 0.3) {
            healthGradient.addColorStop(0, '#ffff00');
            healthGradient.addColorStop(1, '#ffcc00');
        } else {
            healthGradient.addColorStop(0, '#ff0000');
            healthGradient.addColorStop(1, '#cc0000');
        }
        ctx.fillStyle = healthGradient;
        ctx.shadowBlur = 12;
        ctx.shadowColor = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Health text with glow
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(
            `${Math.ceil(this.health)}/${this.maxHealth}`,
            this.x,
            barY - 10
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
            'splinter': SplinterEnemy,
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
        if (type === 'tank' || type === 'swarm' || type === 'formation' || type === 'basic' || type === 'carrier' || type === 'splinter' || type === 'fast') {
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
     * @param {boolean} excludeCarrier - If true, carrier won't be spawned (lane already has one)
     * @returns {Enemy}
     */
    static createRandom(x, y, laneIndex, level = 1, excludeCarrier = false) {
        const isEarlyGame = level <= 3;
        const weights = {
            // Early game rebalanced for visible variety while keeping basic dominant.
            'basic': isEarlyGame ? 15: 8,
            'fast': isEarlyGame ?  15: 8,
            'splinter': isEarlyGame ?  2: 5,
            'tank': isEarlyGame ? 2: 5,
            'swarm': isEarlyGame ?  2: 5,
            'formation': isEarlyGame ? 2: 5,
            'carrier': (!excludeCarrier && level >= 5) ? 1 : 0
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

    /**
     * Create a splinter child (does not split again)
     */
    static createSplinterChild(x, y, laneIndex, level = 1, childConfig = null) {
        return new SplinterEnemy(x, y, laneIndex, level, true, childConfig);
    }
}

