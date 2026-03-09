/**
 * Gate system - Extensible lane gate framework
 */

class BaseGate {
    constructor(laneIndex, options = {}) {
        this.type = options.type || 'base';
        this.laneIndex = laneIndex;
        this.x = CONFIG.LANE_POSITIONS[laneIndex];
        this.y = options.startY ?? -70;
        this.width = options.width ?? Math.max(140, CONFIG.LANE_WIDTH * 0.6);
        this.height = options.height ?? 64;
        this.speed = options.speed ?? 2.6;
        this.color = options.color || '#ffffff';
        this.label = options.label || 'GATE';
        this.active = true;
    }

    update(canvasHeight) {
        this.y += this.speed;
        if (this.y - this.height / 2 > canvasHeight + 30) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const coreRadius = Math.max(16, this.height * 0.28);
        const pulse = Math.sin(Date.now() * 0.012) * 0.5 + 0.5;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;

        // Side emitters (enhancement device body)
        const emitterWidth = 22;
        const emitterHeight = this.height * 0.88;
        ctx.fillStyle = this.hexToRgba(this.color, 0.35 + pulse * 0.2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(this.x - halfW, this.y - emitterHeight / 2, emitterWidth, emitterHeight, 6);
            ctx.roundRect(this.x + halfW - emitterWidth, this.y - emitterHeight / 2, emitterWidth, emitterHeight, 6);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(this.x - halfW, this.y - emitterHeight / 2, emitterWidth, emitterHeight);
            ctx.fillRect(this.x + halfW - emitterWidth, this.y - emitterHeight / 2, emitterWidth, emitterHeight);
            ctx.strokeRect(this.x - halfW, this.y - emitterHeight / 2, emitterWidth, emitterHeight);
            ctx.strokeRect(this.x + halfW - emitterWidth, this.y - emitterHeight / 2, emitterWidth, emitterHeight);
        }

        // Energy bridge between emitters.
        const bridgeHeight = Math.max(16, this.height * 0.3);
        const bridgeGradient = ctx.createLinearGradient(this.x - halfW + emitterWidth, this.y, this.x + halfW - emitterWidth, this.y);
        bridgeGradient.addColorStop(0, this.hexToRgba(this.color, 0.15));
        bridgeGradient.addColorStop(0.5, this.hexToRgba(this.color, 0.7 + pulse * 0.2));
        bridgeGradient.addColorStop(1, this.hexToRgba(this.color, 0.15));
        ctx.fillStyle = bridgeGradient;
        ctx.fillRect(this.x - halfW + emitterWidth, this.y - bridgeHeight / 2, this.width - emitterWidth * 2, bridgeHeight);

        // Core energy ring.
        ctx.strokeStyle = this.hexToRgba(this.color, 0.9);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreRadius + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Inner core.
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, coreRadius);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGradient.addColorStop(0.35, this.hexToRgba(this.color, 0.85));
        coreGradient.addColorStop(1, this.hexToRgba(this.color, 0.1));
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x, this.y + halfH * 0.95);

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    onPass(game) {
        // Override in subclasses
    }

    hexToRgba(hex, alpha) {
        const normalized = hex.replace('#', '');
        const fullHex = normalized.length === 3
            ? normalized.split('').map(ch => ch + ch).join('')
            : normalized;
        const value = parseInt(fullHex, 16);
        if (Number.isNaN(value)) return `rgba(255, 255, 255, ${alpha})`;
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

class LaserGate extends BaseGate {
    constructor(laneIndex) {
        super(laneIndex, {
            type: 'laser',
            color: '#ff4d4f',
            label: 'LASER'
        });
    }

    onPass(game) {
        game.triggerGateSubtitle('LaserGate', this.color);
        game.fireLaneLaser(this.laneIndex);
    }
}

class ExperienceGate extends BaseGate {
    constructor(laneIndex) {
        super(laneIndex, {
            type: 'experience',
            color: '#4ecdc4',
            label: 'XP x2'
        });
    }

    onPass(game) {
        game.activateExperienceGateBoost(10000, 2);
        game.triggerGateSubtitle('ExperienceGate', this.color, 1000);
    }
}

class SlowGate extends BaseGate {
    constructor(laneIndex) {
        super(laneIndex, {
            type: 'slow',
            color: '#ffd93d',
            label: 'SLOW x0.5'
        });
    }

    onPass(game) {
        game.activateEnemySlowGate(10000, 0.5);
        game.triggerGateSubtitle('SlowGate', this.color, 1000);
    }
}

class GateRegistry {
    static register(type, definition) {
        if (!this.registry) this.registry = new Map();
        this.registry.set(type, definition);
    }

    static create(type, laneIndex) {
        if (!this.registry || !this.registry.has(type)) return null;
        const definition = this.registry.get(type);
        return definition.create(laneIndex);
    }

    static createRandom(laneIndex, context = {}) {
        if (!this.registry || this.registry.size === 0) return null;

        let totalWeight = 0;
        const weighted = [];
        for (const [type, definition] of this.registry.entries()) {
            const weight = Math.max(0, definition.getWeight ? definition.getWeight(context) : 1);
            if (weight <= 0) continue;
            totalWeight += weight;
            weighted.push({ type, weight });
        }

        if (weighted.length === 0) return null;

        let randomWeight = random(0, totalWeight);
        for (const item of weighted) {
            randomWeight -= item.weight;
            if (randomWeight <= 0) {
                return this.create(item.type, laneIndex);
            }
        }

        return this.create(weighted[weighted.length - 1].type, laneIndex);
    }
}

class GateManager {
    constructor() {
        this.gates = [];
        this.minSpawnInterval = 25000;
        this.maxSpawnInterval = 35000;
        this.nextSpawnTime = 0;
    }

    reset(now = Date.now()) {
        this.gates = [];
        this.scheduleNextSpawn(null, now);
    }

    scheduleNextSpawn(game, now) {
        const level = game && game.level ? game.level : 1;
        // Late game gets slightly more gates, but never faster than every 15s.
        const levelOffset = Math.max(0, level - 1);
        const minInterval = Math.max(15000, this.minSpawnInterval - levelOffset * 750);
        const maxInterval = Math.max(18000, this.maxSpawnInterval - levelOffset * 850);
        this.nextSpawnTime = now + randomInt(minInterval, Math.max(minInterval, maxInterval));
    }

    update(game, now = Date.now()) {
        if (!game || game.state !== 'playing') return;

        if (now >= this.nextSpawnTime) {
            this.trySpawnGate(game);
            this.scheduleNextSpawn(game, now);
        }

        for (const gate of this.gates) {
            if (!gate.active) continue;
            gate.update(game.canvas.height);
        }

        if (game.player) {
            for (const gate of this.gates) {
                if (!gate.active) continue;
                if (checkCollision(gate.getBounds(), game.player.getBounds())) {
                    gate.active = false;
                    gate.onPass(game);
                }
            }
        }

        this.gates = this.gates.filter(gate => gate.active);
    }

    draw(ctx) {
        for (const gate of this.gates) {
            gate.draw(ctx);
        }
    }

    trySpawnGate(game) {
        // Keep readability high: only one active gate on screen at a time.
        const hasActiveGate = this.gates.some(gate => gate.active);
        if (hasActiveGate) return;

        const activeEnemies = game.enemies.filter(enemy => enemy.active);
        const laneEnemyCounts = CONFIG.LANE_POSITIONS.map((_, index) =>
            activeEnemies.filter(enemy => enemy.laneIndex === index).length
        );
        const totalEnemies = activeEnemies.length;
        const laneWeights = laneEnemyCounts.map(count => 1 + count * 1.8);
        const totalLaneWeight = laneWeights.reduce((sum, weight) => sum + weight, 0);

        let laneIndex = 0;
        let laneRoll = random(0, totalLaneWeight);
        for (let i = 0; i < laneWeights.length; i++) {
            laneRoll -= laneWeights[i];
            if (laneRoll <= 0) {
                laneIndex = i;
                break;
            }
        }

        const enemiesInLane = laneEnemyCounts[laneIndex] || 0;
        const gate = GateRegistry.createRandom(laneIndex, { game, laneIndex, enemiesInLane, totalEnemies });
        if (gate) {
            this.gates.push(gate);
        }
    }
}

GateRegistry.register('laser', {
    create: (laneIndex) => new LaserGate(laneIndex),
    getWeight: (context) => {
        const inLane = Math.min(context.enemiesInLane || 0, 10);
        const totalEnemies = Math.min(context.totalEnemies || 0, 20);
        const levelBonus = Math.max(0, (context.game && context.game.level ? context.game.level : 1) - 1) * 0.08;
        return 1 + inLane * 1.1 + totalEnemies * 0.28 + levelBonus;
    }
});

GateRegistry.register('experience', {
    create: (laneIndex) => new ExperienceGate(laneIndex),
    getWeight: () => 1
});

GateRegistry.register('slow', {
    create: (laneIndex) => new SlowGate(laneIndex),
    getWeight: () => 1
});
