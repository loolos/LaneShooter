/**
 * Player class - Handles player movement, shooting, and powerups
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.laneIndex = 0;
        this.targetX = CONFIG.LANE_POSITIONS[this.laneIndex];
        this.moveSpeed = 25; // Increased for faster lane switching

        // Shooting
        this.baseShootCooldown = 300; // Base cooldown in milliseconds
        this.shootCooldown = this.baseShootCooldown;
        this.lastShootTime = 0;
        this.bullets = [];

        // Experience-based Upgrades System
        this.upgrades = {
            rapidfire: 0,      // Current level
            multishot: 0,
            speedboost: 0,
            lanespeed: 0
        };

        // Experience points for each upgrade type
        this.experience = {
            rapidfire: 0,
            multishot: 0,
            speedboost: 0,
            lanespeed: 0
        };

        // Base values
        this.baseMoveSpeed = 25;
        this.baseBulletSpeed = CONFIG.BULLET_SPEED;
    }

    /**
     * Switch to a different lane
     * @param {number} direction - -1 for left, 1 for right
     */
    switchLane(direction) {
        const newLaneIndex = this.laneIndex + direction;
        if (newLaneIndex >= 0 && newLaneIndex < CONFIG.LANE_COUNT) {
            this.laneIndex = newLaneIndex;
            this.targetX = CONFIG.LANE_POSITIONS[this.laneIndex];
        }
    }

    /**
     * Update player position and bullets
     */
    update() {
        // Update move speed based on upgrades
        this.moveSpeed = this.baseMoveSpeed * (1 + this.upgrades.lanespeed * 0.3);

        // Fast lane switching
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 0.5) {
            this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.moveSpeed);
        } else {
            this.x = this.targetX;
        }

        // Update bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => bullet.active);
    }

    /**
     * Shoot bullets
     * @param {AudioManager} audioManager
     */
    shoot(audioManager) {
        const now = Date.now();
        const cooldown = this.getEffectiveShootCooldown();

        if (now - this.lastShootTime < cooldown) {
            return;
        }

        this.lastShootTime = now;

        // Get bullet count from multishot upgrade
        const bulletCount = 1 + this.upgrades.multishot;
        const bulletSpeed = this.getEffectiveBulletSpeed();
        const speedboostLevel = this.upgrades.speedboost; // Pass to bullet for color

        // Create bullets
        if (bulletCount === 1) {
            this.bullets.push(new Bullet(this.x, this.y - this.height / 2, bulletSpeed, speedboostLevel));
        } else {
            // Multi-shot: spread bullets evenly
            const spread = 15;
            for (let i = 0; i < bulletCount; i++) {
                const offset = (i - (bulletCount - 1) / 2) * spread;
                this.bullets.push(new Bullet(this.x + offset, this.y - this.height / 2, bulletSpeed, speedboostLevel));
            }
        }

        // Use dynamic shoot sound that adjusts pitch based on fire rate
        if (audioManager.playShoot) {
            const fireRate = 300 / cooldown; // Calculate fire rate (shots per second normalized)
            audioManager.playShoot(fireRate);
        } else {
            audioManager.play('shoot'); // Fallback to regular play
        }
    }

    /**
     * Get effective shoot cooldown (affected by upgrades)
     */
    getEffectiveShootCooldown() {
        // Each level reduces current cooldown by 15% (compound reduction)
        let cooldown = this.baseShootCooldown;
        for (let i = 0; i < this.upgrades.rapidfire; i++) {
            cooldown = cooldown * 0.85; // Reduce by 15%
        }
        return cooldown;
    }

    /**
     * Get effective bullet speed (affected by upgrades)
     */
    getEffectiveBulletSpeed() {
        // Each level increases speed by 20%
        return this.baseBulletSpeed * (1 + this.upgrades.speedboost * 0.2);
    }

    /**
     * Get required experience for next level
     * @param {string} type - Upgrade type
     * @returns {number} - Required experience for next level
     */
    getRequiredExperience(type) {
        const currentLevel = this.upgrades[type] || 0;
        // Formula: level² × 3 + level × 10 + level³ / 3 + 5
        // Level 0->1: 0² × 3 + 0 × 10 + 0³/3 + 5 = 5
        // Level 1->2: 1² × 3 + 1 × 10 + 1³/3 + 5 = 3 + 10 + 0.33 + 5 = 18
        // Level 2->3: 2² × 3 + 2 × 10 + 2³/3 + 5 = 12 + 20 + 2.67 + 5 = 39
        // Level 3->4: 3² × 3 + 3 × 10 + 3³/3 + 5 = 27 + 30 + 9 + 5 = 71
        // Level 4->5: 4² × 3 + 4 × 10 + 4³/3 + 5 = 48 + 40 + 21.33 + 5 = 114
        return Math.floor((currentLevel * currentLevel * 3) + (currentLevel * 10) + (currentLevel * currentLevel * currentLevel / 3) + 10);
    }

    /**
     * Add experience to an upgrade type
     * @param {string} type - Upgrade type
     * @param {number} amount - Experience amount to add
     * @returns {boolean} - Returns true if level up occurred
     */
    addExperience(type, amount) {
        if (!this.experience.hasOwnProperty(type)) {
            return false;
        }

        this.experience[type] += amount;
        let leveledUp = false;

        // Check if enough experience to level up
        while (this.experience[type] >= this.getRequiredExperience(type)) {
            const required = this.getRequiredExperience(type);
            this.experience[type] -= required;
            this.upgrades[type]++;
            leveledUp = true;
        }

        return leveledUp;
    }

    /**
     * Get upgrade level
     * @param {string} type - Upgrade type
     * @returns {number} - Upgrade level
     */
    getUpgradeLevel(type) {
        return this.upgrades[type] || 0;
    }

    /**
     * Get experience for upgrade type
     * @param {string} type - Upgrade type
     * @returns {number} - Current experience
     */
    getExperience(type) {
        return this.experience[type] || 0;
    }

    /**
     * Get experience progress (0-1)
     * @param {string} type - Upgrade type
     * @returns {number} - Progress from 0 to 1
     */
    getExperienceProgress(type) {
        const current = this.getExperience(type);
        const required = this.getRequiredExperience(type);
        return required > 0 ? current / required : 0;
    }

    /**
     * Get all upgrades info
     * @returns {object} - Copy of upgrades object
     */
    getAllUpgrades() {
        return { ...this.upgrades };
    }

    /**
     * Get all experience info
     * @returns {object} - Copy of experience object
     */
    getAllExperience() {
        return { ...this.experience };
    }

    /**
     * Draw player
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Draw thrusters based on lane speed upgrade
        this.drawThrusters(ctx);

        // Determine ship color based on rapidfire upgrade
        const rapidfireLevel = this.upgrades.rapidfire;
        let shipColor = '#00d4ff';
        if (rapidfireLevel > 0) {
            // Color changes from cyan to yellow to red as level increases
            if (rapidfireLevel <= 3) {
                shipColor = `rgb(0, ${212 + rapidfireLevel * 14}, 255)`;
            } else if (rapidfireLevel <= 6) {
                const intensity = (rapidfireLevel - 3) * 85;
                shipColor = `rgb(${intensity}, 255, ${255 - intensity})`;
            } else {
                shipColor = `rgb(255, ${255 - (rapidfireLevel - 6) * 30}, 0)`;
            }
        }

        ctx.save();

        // Draw main ship body (more detailed spaceship design)
        ctx.shadowColor = shipColor;
        ctx.shadowBlur = 15;

        // Main hull (pointed up, like a fighter)
        ctx.fillStyle = shipColor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2); // Top point (nose)
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 4); // Bottom left
        ctx.lineTo(this.x - this.width / 3, this.y + this.height / 2); // Left wing tip
        ctx.lineTo(this.x, this.y + this.height / 3); // Center bottom
        ctx.lineTo(this.x + this.width / 3, this.y + this.height / 2); // Right wing tip
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 4); // Bottom right
        ctx.closePath();
        ctx.fill();

        // Draw cockpit/canopy (glowing center)
        ctx.fillStyle = 'rgba(200, 240, 255, 0.8)';
        ctx.shadowColor = 'rgba(200, 240, 255, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 6, this.width / 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw wing details (engines/panels)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;

        // Left wing detail
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 3, this.y);
        ctx.lineTo(this.x - this.width / 2.5, this.y + this.height / 3);
        ctx.stroke();

        // Right wing detail
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 3, this.y);
        ctx.lineTo(this.x + this.width / 2.5, this.y + this.height / 3);
        ctx.stroke();

        // Draw nose detail (sensor/weapon)
        ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
        ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height / 2.5, this.width / 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw side panels/armor
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 3;

        // Left panel
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 4, this.y - this.height / 4);
        ctx.lineTo(this.x - this.width / 3, this.y);
        ctx.stroke();

        // Right panel
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 4, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 3, this.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();

        // Draw additional triangles for multishot upgrade
        const multishotLevel = this.upgrades.multishot;
        if (multishotLevel > 0) {
            this.drawAdditionalTriangles(ctx, multishotLevel, shipColor);
        }

        // Lane indicators removed - no lines between lanes
    }

    /**
     * Draw thrusters based on lane speed upgrade
     * @param {CanvasRenderingContext2D} ctx
     */
    drawThrusters(ctx) {
        const lanespeedLevel = this.upgrades.lanespeed;
        if (lanespeedLevel > 0) {
            const thrusterCount = Math.min(3, lanespeedLevel); // Max 3 thrusters
            const thrusterSpacing = 8;
            const startX = this.x - (thrusterCount - 1) * thrusterSpacing / 2;

            for (let i = 0; i < thrusterCount; i++) {
                const thrusterX = startX + i * thrusterSpacing;
                const thrusterY = this.y + this.height / 2;

                // Draw thruster flame
                ctx.fillStyle = `rgba(255, ${100 + lanespeedLevel * 10}, 0, 0.8)`;
                ctx.shadowColor = '#ff6b00';
                ctx.shadowBlur = 10;

                // Draw flame shape
                ctx.beginPath();
                ctx.moveTo(thrusterX, thrusterY);
                ctx.lineTo(thrusterX - 4, thrusterY + 8 + lanespeedLevel * 2);
                ctx.lineTo(thrusterX + 4, thrusterY + 8 + lanespeedLevel * 2);
                ctx.closePath();
                ctx.fill();

                // Inner flame
                ctx.fillStyle = `rgba(255, 255, 0, 0.6)`;
                ctx.beginPath();
                ctx.moveTo(thrusterX, thrusterY);
                ctx.lineTo(thrusterX - 2, thrusterY + 5 + lanespeedLevel);
                ctx.lineTo(thrusterX + 2, thrusterY + 5 + lanespeedLevel);
                ctx.closePath();
                ctx.fill();
            }

            ctx.shadowBlur = 0;
        }
    }

    /**
     * Draw additional triangles for multishot upgrade
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} level - Multishot level
     * @param {string} color - Triangle color
     */
    drawAdditionalTriangles(ctx, level, color) {
        const smallTriangleSize = this.width * 0.6;
        const offset = this.width * 0.8;

        // Draw small triangles on sides
        for (let i = 0; i < Math.min(level, 2); i++) {
            const side = i === 0 ? -1 : 1; // Left or right
            const triangleX = this.x + side * offset;
            const triangleY = this.y;

            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(triangleX, triangleY - smallTriangleSize / 2);
            ctx.lineTo(triangleX - smallTriangleSize / 2, triangleY + smallTriangleSize / 2);
            ctx.lineTo(triangleX + smallTriangleSize / 2, triangleY + smallTriangleSize / 2);
            ctx.closePath();
            ctx.fill();
        }

        // If level 3+, draw one more triangle above
        if (level >= 3) {
            const triangleX = this.x;
            const triangleY = this.y - this.height * 0.8;

            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(triangleX, triangleY - smallTriangleSize / 2);
            ctx.lineTo(triangleX - smallTriangleSize / 2, triangleY + smallTriangleSize / 2);
            ctx.lineTo(triangleX + smallTriangleSize / 2, triangleY + smallTriangleSize / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.shadowBlur = 0;
    }

    /**
     * Draw lane indicators
     * @param {CanvasRenderingContext2D} ctx
     */
    drawLaneIndicators(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        CONFIG.LANE_POSITIONS.forEach((x, index) => {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();

            // Highlight current lane
            if (index === this.laneIndex) {
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
            }
        });
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

