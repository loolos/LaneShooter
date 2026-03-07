/**
 * Gate system - Extensible lane gate framework
 */

class BaseGate {
    constructor(laneIndex, options = {}) {
        this.type = options.type || 'base';
        this.laneIndex = laneIndex;
        this.x = CONFIG.LANE_POSITIONS[laneIndex];
        this.y = options.startY ?? -70;
        this.width = options.width ?? Math.max(120, CONFIG.LANE_WIDTH * 0.55);
        this.height = options.height ?? 46;
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

        const left = this.x - this.width / 2;
        const top = this.y - this.height / 2;

        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;

        // Outer frame
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.strokeRect(left, top, this.width, this.height);

        // Inner glowing strip
        const stripAlpha = 0.2 + (Math.sin(Date.now() * 0.01) * 0.5 + 0.5) * 0.35;
        ctx.fillStyle = this.hexToRgba(this.color, stripAlpha);
        ctx.fillRect(left + 6, top + 6, this.width - 12, this.height - 12);

        // Label
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x, this.y);

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
        this.scheduleNextSpawn(now);
    }

    scheduleNextSpawn(now) {
        this.nextSpawnTime = now + randomInt(this.minSpawnInterval, this.maxSpawnInterval);
    }

    update(game, now = Date.now()) {
        if (!game || game.state !== 'playing') return;

        if (now >= this.nextSpawnTime) {
            this.trySpawnGate(game);
            this.scheduleNextSpawn(now);
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

        const laneIndex = randomInt(0, CONFIG.LANE_COUNT - 1);
        const enemiesInLane = game.enemies.filter(enemy => enemy.active && enemy.laneIndex === laneIndex).length;
        const gate = GateRegistry.createRandom(laneIndex, { game, laneIndex, enemiesInLane });
        if (gate) {
            this.gates.push(gate);
        }
    }
}

GateRegistry.register('laser', {
    create: (laneIndex) => new LaserGate(laneIndex),
    getWeight: (context) => 1 + Math.min(context.enemiesInLane || 0, 8) * 0.8
});

GateRegistry.register('experience', {
    create: (laneIndex) => new ExperienceGate(laneIndex),
    getWeight: () => 1
});

