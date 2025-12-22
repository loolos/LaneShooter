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
 * Carrier Explosion Effect - Epic explosion for carrier enemies
 */
class CarrierExplosionEffect extends Effect {
    constructor(x, y) {
        super(x, y, 'carrierExplosion');
        this.maxLife = 80; // Longer duration for epic effect
        this.particles = [];
        this.shockwaves = [];
        this.debris = [];
        
        // Create massive particle explosion
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                angle: (Math.PI * 2 * i) / particleCount + Math.random() * 0.3,
                speed: 3 + Math.random() * 5,
                size: 4 + Math.random() * 6,
                color: `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 50}%)`, // Orange to yellow
                life: 40 + Math.random() * 40
            });
        }
        
        // Create multiple shockwaves
        for (let i = 0; i < 3; i++) {
            this.shockwaves.push({
                radius: 0,
                maxRadius: 100 + i * 50,
                speed: 2 + i * 0.5,
                delay: i * 10,
                opacity: 0.8 - i * 0.2
            });
        }
        
        // Create debris pieces
        for (let i = 0; i < 20; i++) {
            this.debris.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                size: 3 + Math.random() * 5,
                color: `hsl(${Math.random() * 30 + 20}, 100%, ${30 + Math.random() * 20}%)`, // Dark orange to red
                life: 50 + Math.random() * 30
            });
        }
    }

    update() {
        super.update();
        
        // Update particles
        this.particles.forEach(particle => {
            particle.speed *= 0.97;
            particle.size *= 0.98;
            particle.life--;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        
        // Update shockwaves
        this.shockwaves.forEach(wave => {
            if (this.life > wave.delay) {
                wave.radius += wave.speed;
                wave.opacity = Math.max(0, wave.opacity - 0.02);
            }
        });
        
        // Update debris
        this.debris.forEach(d => {
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.1; // Gravity
            d.rotation += d.rotationSpeed;
            d.life--;
            d.size *= 0.99;
        });
        this.debris = this.debris.filter(d => d.life > 0);
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = 1 - progress * 0.5; // Fade slower

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw shockwaves
        this.shockwaves.forEach(wave => {
            if (this.life > wave.delay && wave.radius < wave.maxRadius) {
                const waveAlpha = wave.opacity * (1 - wave.radius / wave.maxRadius);
                ctx.strokeStyle = `rgba(255, 200, 100, ${waveAlpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, wave.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner shockwave
                ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.x, this.y, wave.radius * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        // Draw debris
        this.debris.forEach(d => {
            const debrisAlpha = Math.min(1, d.life / 30);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.fillStyle = d.color;
            ctx.shadowColor = d.color;
            ctx.shadowBlur = 5;
            ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
            ctx.restore();
        });

        // Draw massive central explosion
        const flashSize = (1 - progress) * 80;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, flashSize);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(this.x, this.y, flashSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw particles
        this.particles.forEach(particle => {
            const px = this.x + Math.cos(particle.angle) * particle.speed * (this.maxLife - particle.life);
            const py = this.y + Math.sin(particle.angle) * particle.speed * (this.maxLife - particle.life);
            const particleAlpha = particle.life / 40;

            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 15;
            ctx.globalAlpha = alpha * particleAlpha;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw secondary explosions
        if (progress < 0.5) {
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i) / 5 + progress * Math.PI;
                const dist = 30 + progress * 40;
                const ex = this.x + Math.cos(angle) * dist;
                const ey = this.y + Math.sin(angle) * dist;
                const size = (1 - progress * 2) * 15;
                
                ctx.fillStyle = `rgba(255, 150, 0, ${alpha * 0.6})`;
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(ex, ey, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

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
 * Spawn Effect - For carrier spawning enemies
 */
class SpawnEffect extends Effect {
    constructor(x, y) {
        super(x, y, 'spawn');
        this.maxLife = 30; // Longer duration for more spectacular effect
        this.particles = [];
        this.energyRings = [];
        this.sparks = [];
        this.lightning = [];
        
        // Create upward particles (enemy emerging) - more particles
        const particleCount = 24;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                angle: Math.PI / 2 + (Math.random() - 0.5) * 1.2, // Wider spread
                speed: 1.5 + Math.random() * 3,
                size: 2 + Math.random() * 4,
                color: `hsl(${180 + Math.random() * 60}, 100%, ${50 + Math.random() * 40}%)`, // Cyan to purple
                life: 20 + Math.random() * 10,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
        
        // Create energy rings (expanding from spawn point) - more rings
        for (let i = 0; i < 4; i++) {
            this.energyRings.push({
                radius: 0,
                maxRadius: 25 + i * 20,
                speed: 2.5 + i * 1.5,
                delay: i * 2,
                opacity: 0.8 - i * 0.15,
                color: `hsl(${200 + i * 15}, 100%, ${60 + i * 10}%)`,
                thickness: 3 - i * 0.5
            });
        }
        
        // Create sparks (bright flashes)
        for (let i = 0; i < 16; i++) {
            this.sparks.push({
                angle: (Math.PI * 2 * i) / 16 + Math.random() * 0.3,
                distance: 0,
                maxDistance: 20 + Math.random() * 30,
                speed: 1.5 + Math.random() * 2,
                size: 3 + Math.random() * 4,
                color: `hsl(${Math.random() * 60 + 180}, 100%, ${60 + Math.random() * 40}%)`, // Cyan to blue to purple
                life: 10 + Math.random() * 10,
                delay: Math.random() * 5
            });
        }
        
        // Create lightning effects
        for (let i = 0; i < 6; i++) {
            this.lightning.push({
                angle: (Math.PI * 2 * i) / 6 + Math.random() * 0.5,
                length: 0,
                maxLength: 25 + Math.random() * 20,
                speed: 3 + Math.random() * 2,
                segments: [],
                life: 8 + Math.random() * 5,
                delay: Math.random() * 3
            });
        }
    }

    update() {
        super.update();
        
        // Update particles
        this.particles.forEach(particle => {
            particle.speed *= 0.94;
            particle.size *= 0.96;
            particle.life--;
            particle.rotation += particle.rotationSpeed;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        
        // Update energy rings
        this.energyRings.forEach(ring => {
            if (this.life > ring.delay) {
                ring.radius += ring.speed;
                ring.opacity = Math.max(0, ring.opacity - 0.04);
            }
        });
        
        // Update sparks
        this.sparks.forEach(spark => {
            if (this.life > spark.delay) {
                spark.distance += spark.speed;
                spark.size *= 0.95;
                spark.life--;
            }
        });
        this.sparks = this.sparks.filter(s => s.life > 0 && s.distance < s.maxDistance);
        
        // Update lightning
        this.lightning.forEach(bolt => {
            if (this.life > bolt.delay && bolt.length < bolt.maxLength) {
                bolt.length += bolt.speed;
                bolt.life--;
            }
        });
        this.lightning = this.lightning.filter(l => l.life > 0);
    }

    draw(ctx) {
        if (!this.active) return;

        const progress = this.life / this.maxLife;
        const alpha = 1 - progress * 0.8; // Fade slower

        ctx.save();

        // Draw energy rings with glow
        this.energyRings.forEach(ring => {
            if (this.life > ring.delay && ring.radius < ring.maxRadius) {
                const ringAlpha = ring.opacity * (1 - ring.radius / ring.maxRadius) * alpha;
                const hslMatch = ring.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (hslMatch) {
                    ctx.strokeStyle = `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${ringAlpha})`;
                } else {
                    ctx.strokeStyle = `rgba(100, 200, 255, ${ringAlpha})`;
                }
                ctx.lineWidth = ring.thickness;
                ctx.shadowColor = ring.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner ring for depth
                ctx.strokeStyle = `hsla(${hslMatch ? hslMatch[1] : 200}, ${hslMatch ? hslMatch[2] : 100}%, ${hslMatch ? Math.min(100, parseInt(hslMatch[3]) + 20) : 80}%, ${ringAlpha * 0.6})`;
                ctx.lineWidth = ring.thickness * 0.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, ring.radius * 0.9, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        // Draw lightning bolts
        this.lightning.forEach(bolt => {
            if (this.life > bolt.delay && bolt.length > 0) {
                const boltAlpha = (bolt.life / 10) * alpha;
                ctx.strokeStyle = `rgba(150, 200, 255, ${boltAlpha})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = '#aaccff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                const endX = this.x + Math.cos(bolt.angle) * bolt.length;
                const endY = this.y + Math.sin(bolt.angle) * bolt.length;
                // Create jagged lightning effect
                const segments = 5;
                let lastX = this.x;
                let lastY = this.y;
                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const x = this.x + (endX - this.x) * t + (Math.random() - 0.5) * 5;
                    const y = this.y + (endY - this.y) * t + (Math.random() - 0.5) * 5;
                    ctx.lineTo(x, y);
                    lastX = x;
                    lastY = y;
                }
                ctx.stroke();
            }
        });

        // Draw sparks (radial bursts)
        this.sparks.forEach(spark => {
            if (this.life > spark.delay && spark.distance < spark.maxDistance) {
                const sparkAlpha = (spark.life / 20) * alpha;
                const px = this.x + Math.cos(spark.angle) * spark.distance;
                const py = this.y + Math.sin(spark.angle) * spark.distance;
                
                ctx.fillStyle = spark.color;
                ctx.shadowColor = spark.color;
                ctx.shadowBlur = 12;
                ctx.globalAlpha = sparkAlpha;
                ctx.beginPath();
                ctx.arc(px, py, spark.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw particles (upward motion with rotation)
        this.particles.forEach(particle => {
            const px = this.x + Math.cos(particle.angle) * particle.speed * (this.maxLife - particle.life);
            const py = this.y + Math.sin(particle.angle) * particle.speed * (this.maxLife - particle.life);
            const particleAlpha = (particle.life / 30) * alpha;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = particleAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw central glow (spawn point) - multiple layers
        const glowSize = (1 - progress * 0.7) * 25;
        const innerGlow = glowSize * 0.6;
        
        // Outer glow
        const outerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        outerGradient.addColorStop(0, `rgba(150, 220, 255, ${alpha * 0.8})`);
        outerGradient.addColorStop(0.4, `rgba(100, 180, 255, ${alpha * 0.6})`);
        outerGradient.addColorStop(0.7, `rgba(50, 150, 255, ${alpha * 0.3})`);
        outerGradient.addColorStop(1, `rgba(0, 100, 200, 0)`);
        
        ctx.fillStyle = outerGradient;
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 25;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        const innerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, innerGlow);
        innerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        innerGradient.addColorStop(0.5, `rgba(200, 240, 255, ${alpha * 0.7})`);
        innerGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
        
        ctx.fillStyle = innerGradient;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerGlow, 0, Math.PI * 2);
        ctx.fill();

        // Draw energy beam (from carrier to spawn point) - enhanced
        if (progress < 0.7) {
            const beamAlpha = alpha * (1 - progress / 0.7);
            // Outer beam
            ctx.strokeStyle = `rgba(150, 220, 255, ${beamAlpha * 0.6})`;
            ctx.lineWidth = 5;
            ctx.shadowColor = '#66ccff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 40);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            
            // Inner bright beam
            ctx.strokeStyle = `rgba(255, 255, 255, ${beamAlpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 40);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }

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
            case 'carrier':
                return new CarrierExplosionEffect(x, y);
            case 'spawn':
                return new SpawnEffect(x, y);
            default:
                return new ExplosionEffect(x, y, 'small');
        }
    }
}

