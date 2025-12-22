/**
 * Effect System - Visual effects for enemy destruction
 */

/**
 * Base Effect Class
 */
class Effect {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.life = 0;
        this.maxLife = 30; // frames
    }

    update() {
        this.life++;
        if (this.life >= this.maxLife) {
            this.active = false;
        }
    }

    draw(ctx) {
        // Override in subclasses
    }
}

/**
 * Explosion Effect - For basic and tank enemies
 */
class ExplosionEffect extends Effect {
    constructor(x, y, size = 'normal') {
        super(x, y, 'explosion');
        this.size = size; // 'small', 'normal', 'large'
        this.maxLife = size === 'large' ? 40 : size === 'small' ? 20 : 30;
        this.particles = [];
        
        // Create particles
        const particleCount = size === 'large' ? 12 : size === 'small' ? 6 : 8;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                angle: (Math.PI * 2 * i) / particleCount + Math.random() * 0.5,
                speed: 2 + Math.random() * 3,
                size: 3 + Math.random() * 4,
                color: `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 30}%)` // Orange to red
            });
        }
    }

    update() {
        super.update();
        // Update particles
        this.particles.forEach(particle => {
            particle.speed *= 0.95; // Slow down
            particle.size *= 0.95; // Shrink
        });
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw particles
        this.particles.forEach(particle => {
            const px = this.x + Math.cos(particle.angle) * particle.speed * this.life;
            const py = this.y + Math.sin(particle.angle) * particle.speed * this.life;

            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw central flash
        const flashSize = (1 - progress) * (this.size === 'large' ? 40 : this.size === 'small' ? 15 : 25);
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, flashSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Flash Effect - For fast enemies
 */
class FlashEffect extends Effect {
    constructor(x, y) {
        super(x, y, 'flash');
        this.maxLife = 15;
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = progress < 0.5 ? progress * 2 : 2 - progress * 2;
        const size = progress < 0.5 ? progress * 50 : (1 - progress) * 50;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw bright flash
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw electric lines
        if (progress < 0.7) {
            ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 * i) / 4 + progress * Math.PI;
                const length = 15 + Math.random() * 10;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(angle) * length,
                    this.y + Math.sin(angle) * length
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

/**
 * Sparkle Effect - For swarm enemies
 */
class SparkleEffect extends Effect {
    constructor(x, y) {
        super(x, y, 'sparkle');
        this.maxLife = 25;
        this.sparks = [];
        
        // Create sparks
        for (let i = 0; i < 8; i++) {
            this.sparks.push({
                angle: Math.random() * Math.PI * 2,
                distance: Math.random() * 20,
                speed: 0.5 + Math.random() * 1,
                size: 2 + Math.random() * 3,
                color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 40}%)` // Yellow to orange
            });
        }
    }

    update() {
        super.update();
        this.sparks.forEach(spark => {
            spark.distance += spark.speed;
            spark.size *= 0.95;
        });
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw sparks
        this.sparks.forEach(spark => {
            const px = this.x + Math.cos(spark.angle) * spark.distance;
            const py = this.y + Math.sin(spark.angle) * spark.distance;

            ctx.fillStyle = spark.color;
            ctx.shadowColor = spark.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, spark.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw central glow
        const glowSize = (1 - progress) * 20;
        ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.6})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Multi Explosion Effect - For formation enemies (multiple small explosions)
 */
class MultiExplosionEffect extends Effect {
    constructor(x, y, count = 1) {
        super(x, y, 'multiExplosion');
        this.count = count;
        this.maxLife = 30;
        this.explosions = [];
        
        // Create multiple small explosions
        for (let i = 0; i < count; i++) {
            this.explosions.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                delay: i * 3, // Stagger explosions
                particles: []
            });
            
            // Create particles for each explosion
            for (let j = 0; j < 4; j++) {
                this.explosions[i].particles.push({
                    angle: (Math.PI * 2 * j) / 4 + Math.random() * 0.5,
                    speed: 1 + Math.random() * 2,
                    size: 2 + Math.random() * 2,
                    color: `hsl(${Math.random() * 40 + 10}, 100%, ${50 + Math.random() * 30}%)`
                });
            }
        }
    }

    update() {
        super.update();
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                particle.speed *= 0.95;
                particle.size *= 0.95;
            });
        });
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        this.explosions.forEach(explosion => {
            const explosionProgress = Math.max(0, (this.life - explosion.delay) / (this.maxLife - explosion.delay));
            if (explosionProgress <= 0 || explosionProgress >= 1) return;

            // Draw particles
            explosion.particles.forEach(particle => {
                const px = explosion.x + Math.cos(particle.angle) * particle.speed * (this.life - explosion.delay);
                const py = explosion.y + Math.sin(particle.angle) * particle.speed * (this.life - explosion.delay);

                ctx.fillStyle = particle.color;
                ctx.shadowColor = particle.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(px, py, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw central flash
            const flashSize = (1 - explosionProgress) * 12;
            ctx.fillStyle = `rgba(255, 150, 0, ${alpha * 0.7})`;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, flashSize, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}

/**
 * Effect Manager - Creates and manages effects
 */
class EffectManager {
    static createEffect(x, y, enemyType, size = 'normal') {
        switch (enemyType) {
            case 'basic':
                return new ExplosionEffect(x, y, 'normal');
            case 'fast':
                return new FlashEffect(x, y);
            case 'tank':
                return new ExplosionEffect(x, y, 'large');
            case 'formation':
                return new MultiExplosionEffect(x, y, 3);
            case 'swarm':
                return new SparkleEffect(x, y);
            default:
                return new ExplosionEffect(x, y, 'small');
        }
    }
}

