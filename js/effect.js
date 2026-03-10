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
    constructor(x, y, size = 'normal', scale = 1) {
        super(x, y, 'explosion');
        this.size = size; // 'small', 'normal', 'large'
        this.scale = Math.max(0.8, scale || 1);
        const baseLife = size === 'large' ? 40 : size === 'small' ? 20 : 30;
        const lifeScale = Math.min(1.6, 0.9 + this.scale * 0.22);
        this.maxLife = Math.round(baseLife * lifeScale);
        this.particles = [];
        
        // Create particles
        const baseParticleCount = size === 'large' ? 12 : size === 'small' ? 6 : 8;
        const particleCount = Math.max(4, Math.round(baseParticleCount * Math.min(this.scale, 2.6)));
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                angle: (Math.PI * 2 * i) / particleCount + Math.random() * 0.5,
                speed: (2 + Math.random() * 3) * Math.min(this.scale, 2.8),
                size: (3 + Math.random() * 4) * (0.75 + this.scale * 0.35),
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
        const baseFlashSize = this.size === 'large' ? 40 : this.size === 'small' ? 15 : 25;
        const flashSize = (1 - progress) * baseFlashSize * Math.min(this.scale, 2.8);
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = Math.min(30, 15 * this.scale);
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
            const denom = this.maxLife - explosion.delay;
            if (denom <= 0) return;
            const explosionProgress = Math.max(0, (this.life - explosion.delay) / denom);
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
        this.maxLife = 60; // Longer duration for portal effect
        this.particles = [];
        this.energyRings = [];
        this.sparks = [];
        this.lightning = [];
        this.portalRings = []; // Portal rings for portal effect
        this.portalPulse = 0; // Portal pulse animation
        this.portalRotation = 0; // Portal rotation
        
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
        
        // Create portal rings for portal effect (large portal)
        const portalSize = 60; // Large portal size
        for (let i = 0; i < 6; i++) {
            this.portalRings.push({
                radius: portalSize * (0.3 + i * 0.1),
                baseRadius: portalSize * (0.3 + i * 0.1),
                pulseSpeed: 0.05 + i * 0.02,
                pulseAmount: 5 + i * 2,
                rotation: (Math.PI * 2 * i) / 6,
                rotationSpeed: 0.02 + i * 0.01,
                opacity: 0.9 - i * 0.12,
                color: `hsl(${200 + i * 20}, 100%, ${60 + i * 5}%)`,
                thickness: 4 - i * 0.5,
                delay: i * 2
            });
        }
    }

    update() {
        super.update();
        
        // Update portal animation
        this.portalPulse += 0.15; // Faster pulse
        this.portalRotation += 0.03; // Rotate portal
        
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
        
        // Update portal rings
        this.portalRings.forEach(ring => {
            if (this.life > ring.delay) {
                ring.rotation += ring.rotationSpeed;
                // Pulse effect
                ring.radius = ring.baseRadius + Math.sin(this.portalPulse + ring.delay) * ring.pulseAmount;
            }
        });
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

        // Draw large portal effect (flashing portal)
        const portalSize = 60;
        const portalProgress = Math.min(1, this.life / 30); // Portal appears in first half
        const portalAlpha = portalProgress < 0.5 ? portalProgress * 2 : (1 - (portalProgress - 0.5) * 2);
        const flashIntensity = Math.sin(this.portalPulse * 2) * 0.3 + 0.7; // Flashing effect
        
        // Draw portal rings (rotating and pulsing)
        this.portalRings.forEach(ring => {
            if (this.life > ring.delay) {
                const ringAlpha = ring.opacity * portalAlpha * flashIntensity * alpha;
                const hslMatch = ring.color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(ring.rotation);
                
                // Outer portal ring
                ctx.strokeStyle = hslMatch ? `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${ringAlpha})` : `rgba(100, 200, 255, ${ringAlpha})`;
                ctx.lineWidth = ring.thickness;
                ctx.shadowColor = ring.color;
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner portal ring (brighter)
                ctx.strokeStyle = hslMatch ? `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${Math.min(100, parseInt(hslMatch[3]) + 30)}%, ${ringAlpha * 0.8})` : `rgba(200, 240, 255, ${ringAlpha * 0.8})`;
                ctx.lineWidth = ring.thickness * 0.6;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius * 0.85, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }
        });
        
        // Draw portal center (flashing core)
        const coreSize = portalSize * 0.4 * (1 + Math.sin(this.portalPulse * 3) * 0.2);
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, coreSize);
        coreGradient.addColorStop(0, `rgba(255, 255, 255, ${portalAlpha * flashIntensity * alpha * 0.95})`);
        coreGradient.addColorStop(0.3, `rgba(200, 240, 255, ${portalAlpha * flashIntensity * alpha * 0.8})`);
        coreGradient.addColorStop(0.6, `rgba(100, 200, 255, ${portalAlpha * flashIntensity * alpha * 0.5})`);
        coreGradient.addColorStop(1, `rgba(0, 100, 200, 0)`);
        
        ctx.fillStyle = coreGradient;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.globalAlpha = portalAlpha * flashIntensity * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw portal inner vortex (spiraling effect)
        if (portalProgress < 0.8) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.portalRotation * 2);
            
            const vortexGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 0.7);
            vortexGradient.addColorStop(0, `rgba(255, 255, 255, ${portalAlpha * flashIntensity * alpha * 0.6})`);
            vortexGradient.addColorStop(0.5, `rgba(150, 220, 255, ${portalAlpha * flashIntensity * alpha * 0.4})`);
            vortexGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
            
            ctx.fillStyle = vortexGradient;
            ctx.shadowBlur = 25;
            ctx.globalAlpha = portalAlpha * flashIntensity * alpha;
            ctx.beginPath();
            ctx.arc(0, 0, coreSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw spiral lines
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8 + this.portalRotation;
                ctx.strokeStyle = `rgba(255, 255, 255, ${portalAlpha * flashIntensity * alpha * 0.4})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * coreSize * 0.6, Math.sin(angle) * coreSize * 0.6);
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        // Draw central glow (spawn point) - multiple layers (enhanced)
        const glowSize = (1 - progress * 0.7) * 35;
        const innerGlow = glowSize * 0.6;
        
        // Outer glow
        const outerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
        outerGradient.addColorStop(0, `rgba(150, 220, 255, ${alpha * flashIntensity * 0.8})`);
        outerGradient.addColorStop(0.4, `rgba(100, 180, 255, ${alpha * flashIntensity * 0.6})`);
        outerGradient.addColorStop(0.7, `rgba(50, 150, 255, ${alpha * flashIntensity * 0.3})`);
        outerGradient.addColorStop(1, `rgba(0, 100, 200, 0)`);
        
        ctx.fillStyle = outerGradient;
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 35;
        ctx.globalAlpha = alpha * flashIntensity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        const innerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, innerGlow);
        innerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * flashIntensity * 0.9})`);
        innerGradient.addColorStop(0.5, `rgba(200, 240, 255, ${alpha * flashIntensity * 0.7})`);
        innerGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
        
        ctx.fillStyle = innerGradient;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 25;
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
 * Shockwave Effect - Epic level up shockwave from bottom center
 */
class ShockwaveEffect extends Effect {
    constructor(game) {
        const startX = CONFIG.CANVAS_WIDTH / 2;
        const startY = CONFIG.CANVAS_HEIGHT;
        super(startX, startY, 'shockwave');
        
        this.game = game;
        this.startX = startX;
        this.startY = startY;
        this.currentY = startY;
        this.speed = 8; // Pixels per frame
        // Continue beyond screen and fade out
        const extraDistance = 200; // Extra distance beyond screen
        this.maxLife = Math.ceil((CONFIG.CANVAS_HEIGHT + extraDistance) / this.speed) + 30; // Time to reach beyond screen + fade
        
        // Semi-circle shape parameters (180 degrees)
        this.fanAngle = Math.PI; // 180 degrees (semi-circle)
        this.maxRadius = Math.sqrt(CONFIG.CANVAS_WIDTH * CONFIG.CANVAS_WIDTH + (CONFIG.CANVAS_HEIGHT + extraDistance) * (CONFIG.CANVAS_HEIGHT + extraDistance));
        
        // Track which enemies have been hit (to avoid multiple hits)
        this.hitEnemies = new Set();
        this.hitUnits = new Map(); // Map of enemy -> Set of unit indices
        
        // Particles array
        this.particles = [];
        
        // Shockwave rings (expanding from center)
        this.shockwaveRings = [];
        for (let i = 0; i < 5; i++) {
            this.shockwaveRings.push({
                radius: 0,
                maxRadius: 150 + i * 30,
                speed: 3 + i * 0.5,
                delay: i * 5,
                opacity: 0.8 - i * 0.15,
                y: startY
            });
        }
        
        // Bottom flash effect
        this.bottomFlash = {
            life: 0,
            maxLife: 15,
            intensity: 1.0
        };
        
        // Generate initial particles
        this.generateParticles();
    }
    
    generateParticles() {
        // Generate particles from bottom center area
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.6; // Upward angle with some spread
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: this.startX + (Math.random() - 0.5) * 100,
                y: this.startY,
                vx: Math.sin(angle) * (Math.random() - 0.5) * 2,
                vy: -Math.cos(angle) * speed,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 20}, 100%, ${50 + Math.random() * 40}%)`, // Orange to yellow
                life: 20 + Math.random() * 30,
                maxLife: 20 + Math.random() * 30
            });
        }
    }
    
    update() {
        super.update();
        
        // Move shockwave upward
        const previousY = this.currentY;
        this.currentY -= this.speed;
        
        // Calculate current shockwave radius (distance from start to current position)
        const distanceFromStart = this.startY - this.currentY;
        const currentRadius = distanceFromStart;
        
        // Check for enemy collisions in the current shockwave area
        if (this.game && this.game.enemies) {
            const canvasHeight = CONFIG.CANVAS_HEIGHT;
            const bottom40PercentY = canvasHeight * 0.6;
            
            this.game.enemies.forEach((enemy, enemyIndex) => {
                if (!enemy.active) return;
                
                // Handle multi-unit enemies (formation, swarm, splinter child)
                if (enemy.type === 'formation' || enemy.type === 'swarm' || (enemy.type === 'splinter' && enemy.isChild && enemy.units)) {
                    if (this.hitEnemies.has(enemyIndex)) return; // Already hit
                    
                    // Check if any unit of the enemy is in the semi-circle shockwave area
                    // For multi-unit enemies, check each unit's position
                    let enemyHit = false;
                    let minUnitY = Infinity;
                    
                    enemy.units.forEach(unit => {
                        if (unit.health <= 0) return;
                        
                        let unitY, unitX;
                        if (enemy.type === 'formation') {
                            const totalHeight = (enemy.rows * enemy.enemyHeight) + ((enemy.rows - 1) * enemy.rowSpacing);
                            const startY = enemy.y - totalHeight / 2;
                            unitY = startY + (unit.row * (enemy.enemyHeight + enemy.rowSpacing)) + (enemy.enemyHeight / 2);
                            const totalWidth = (enemy.cols * enemy.enemyWidth) + ((enemy.cols - 1) * enemy.spacing);
                            const startX = enemy.x - totalWidth / 2;
                            unitX = startX + (unit.col * (enemy.enemyWidth + enemy.spacing)) + (enemy.enemyWidth / 2);
                        } else {
                            unitY = enemy.y + unit.offsetY;
                            unitX = enemy.x + unit.offsetX;
                        }
                        
                        if (unitY < minUnitY) minUnitY = unitY;
                        
                        const dx = unitX - this.startX;
                        const dy = unitY - this.startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Check if unit is within current radius (all enemies are affected, not just semi-circle)
                        if (distance <= currentRadius && distance >= currentRadius - this.speed) {
                            enemyHit = true;
                        }
                    });
                    
                    if (enemyHit && !this.hitEnemies.has(enemyIndex)) {
                        this.hitEnemies.add(enemyIndex);
                        
                        // Calculate damage based on enemy's lowest unit Y position (or center Y for formation)
                        const enemyY = minUnitY < Infinity ? minUnitY : enemy.y;
                        let damagePercent;
                        
                        if (enemyY >= bottom40PercentY) {
                            // Bottom 40%: destroy completely (100% damage)
                            damagePercent = 1.0;
                        } else {
                            // Above bottom 40%: damage based on distance from bottom
                            // distanceRatio: 0 at bottom 40% threshold, 1 at top
                            const distanceFromBottom = canvasHeight - enemyY;
                            const distanceRatio = Math.min(1, distanceFromBottom / (canvasHeight * 0.6));
                            // Damage percentage: 5% at top to 45% at bottom 40% threshold
                            const baseDamagePercent = 0.05 + ((1 - distanceRatio) * 0.4);
                            // Random factor: 0.8 to 1.2
                            const randomFactor = 0.8 + Math.random() * 0.4;
                            damagePercent = baseDamagePercent * randomFactor;
                        }
                        
                        // Calculate damage based on total health (maxHealth for multi-unit enemies)
                        const totalDamage = enemy.maxHealth * damagePercent;
                        
                        // Use takeDamage method (same as bullet damage logic)
                        const result = enemy.takeDamage(totalDamage);
                        const unitsKilled = result.unitsKilled || 0;
                        
                        // Handle score and experience (same as bullet logic)
                        if (unitsKilled > 0) {
                            const unitScore = enemy.healthPerUnit * CONFIG.SCORE_PER_ENEMY;
                            this.game.score += unitScore * unitsKilled;
                            
                            const experienceChance = 0.5;
                            const maxAccents = Math.min(unitsKilled, 3);
                            for (let i = 0; i < maxAccents; i++) {
                                this.game.audioManager.queueKillAccent(enemy.type, 0.5);
                            }
                            
                            for (let i = 0; i < unitsKilled; i++) {
                                if (Math.random() < experienceChance) {
                                    this.game.gainExperienceFromEnemy(enemy, i);
                                }
                            }
                        }
                        
                        if (result.destroyed) {
                            // Play death sound
                            this.game.playEnemyDeathSound(enemy.type);
                        }
                    }
                } else {
                    // Regular enemies
                    if (this.hitEnemies.has(enemyIndex)) return; // Already hit
                    
                    const dx = enemy.x - this.startX;
                    const dy = enemy.y - this.startY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Check if within current radius (all enemies are affected, not just semi-circle)
                    if (distance <= currentRadius && distance >= currentRadius - this.speed) {
                        this.hitEnemies.add(enemyIndex);
                        
                        // Calculate damage based on enemy's Y position
                        let damagePercent;
                        if (enemy.y >= bottom40PercentY) {
                            // Bottom 40%: destroy completely
                            damagePercent = 1.0;
                        } else {
                            // Above bottom 40%: damage based on distance from bottom
                            // distanceRatio: 0 at bottom 40% threshold, 1 at top
                            const distanceFromBottom = canvasHeight - enemy.y;
                            const distanceRatio = Math.min(1, distanceFromBottom / (canvasHeight * 0.6));
                            // Damage percentage: 5% at top to 45% at bottom 40% threshold
                            const baseDamagePercent = 0.05 + ((1 - distanceRatio) * 0.4);
                            // Random factor: 0.8 to 1.2
                            const randomFactor = 0.8 + Math.random() * 0.4;
                            damagePercent = baseDamagePercent * randomFactor;
                        }
                        
                        // Calculate damage based on max health
                        const damage = enemy.maxHealth * damagePercent;
                        
                        const result = enemy.takeDamage(damage);
                        
                        if (result.destroyed) {
                            // Give score and experience (same as bullet logic)
                            this.game.score += enemy.scoreValue;
                            
                            let dropRate = 0.2;
                            if (enemy.type === 'basic') dropRate = 0.2;
                            else if (enemy.type === 'fast') dropRate = 0.3;
                            else if (enemy.type === 'tank') dropRate = 0.5;
                            else if (enemy.type === 'splinter') dropRate = enemy.isChild ? 0.1 : 0.25;
                            else if (enemy.type === 'carrier') dropRate = 1.0;
                            
                            if (Math.random() < dropRate) {
                                this.game.gainExperienceFromEnemy(enemy, 0);
                            }
                            
                            this.game.playEnemyDeathSound(enemy.type);
                            
                            const effectScale = enemy.type === 'tank'
                                ? Math.max(1, Math.max(enemy.width || 0, enemy.height || 0) / 50)
                                : 1;
                            const effect = EffectManager.createEffect(enemy.x, enemy.y, enemy.type, 'normal', effectScale);
                            this.game.effects.push(effect);
                        }
                    }
                }
            });
        }
        
        // Update bottom flash
        this.bottomFlash.life++;
        if (this.bottomFlash.life < this.bottomFlash.maxLife) {
            this.bottomFlash.intensity = 1 - (this.bottomFlash.life / this.bottomFlash.maxLife);
        } else {
            this.bottomFlash.intensity = 0;
        }
        
        // Update shockwave rings
        this.shockwaveRings.forEach(ring => {
            if (this.life > ring.delay) {
                ring.radius += ring.speed;
                ring.opacity = Math.max(0, ring.opacity - 0.015);
                ring.y = this.currentY; // Move ring with shockwave
            }
        });
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy *= 0.98; // Slight gravity/friction
            particle.vx *= 0.99;
            particle.life--;
            particle.size *= 0.98;
        });
        this.particles = this.particles.filter(p => p.life > 0);
        
        // Generate new particles occasionally
        if (this.life % 3 === 0 && this.currentY > 0) {
            const newParticle = {
                x: this.startX + (Math.random() - 0.5) * 80,
                y: this.currentY,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -2 - Math.random() * 3,
                size: 1.5 + Math.random() * 2.5,
                color: `hsl(${Math.random() * 60 + 20}, 100%, ${50 + Math.random() * 40}%)`,
                life: 15 + Math.random() * 20,
                maxLife: 15 + Math.random() * 20
            };
            this.particles.push(newParticle);
        }
        
        // End effect when shockwave reaches beyond screen and fades out
        if (this.currentY <= -200) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        const distanceFromStart = this.startY - this.currentY;
        const currentRadius = distanceFromStart;
        
        // Calculate fade out when beyond screen
        const fadeStartY = 0;
        const fadeDistance = 200;
        let fadeAlpha = 1.0;
        if (this.currentY < fadeStartY) {
            fadeAlpha = Math.max(0, 1 - (fadeStartY - this.currentY) / fadeDistance);
        }
        
        ctx.save();
        ctx.globalAlpha = fadeAlpha;
        
        // Draw bottom flash
        if (this.bottomFlash.intensity > 0) {
            const flashSize = 80 * this.bottomFlash.intensity;
            const flashGradient = ctx.createRadialGradient(
                this.startX, this.startY, 0,
                this.startX, this.startY, flashSize
            );
            flashGradient.addColorStop(0, `rgba(255, 255, 200, ${this.bottomFlash.intensity})`);
            flashGradient.addColorStop(0.3, `rgba(255, 200, 0, ${this.bottomFlash.intensity * 0.8})`);
            flashGradient.addColorStop(0.6, `rgba(255, 100, 0, ${this.bottomFlash.intensity * 0.5})`);
            flashGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = flashGradient;
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.arc(this.startX, this.startY, flashSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw shockwave rings
        this.shockwaveRings.forEach(ring => {
            if (this.life > ring.delay && ring.radius < ring.maxRadius && ring.opacity > 0) {
                const ringAlpha = ring.opacity * (1 - ring.radius / ring.maxRadius) * fadeAlpha;
                ctx.strokeStyle = `rgba(255, 200, 100, ${ringAlpha})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = 'rgba(255, 200, 100, 0.5)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(this.startX, ring.y, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner ring
                ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.startX, ring.y, ring.radius * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
        
        // Draw semi-circle shockwave (semi-transparent with glow)
        if (currentRadius > 0) {
            const startAngle = -this.fanAngle / 2; // -90 degrees
            const endAngle = this.fanAngle / 2; // 90 degrees
            
            // Create radial gradient for the semi-circle
            const fanGradient = ctx.createRadialGradient(
                this.startX, this.startY, 0,
                this.startX, this.startY, currentRadius
            );
            fanGradient.addColorStop(0, `rgba(255, 255, 200, ${0.4 * fadeAlpha})`); // Center - gold/white, semi-transparent
            fanGradient.addColorStop(0.3, `rgba(255, 200, 0, ${0.35 * fadeAlpha})`); // Orange
            fanGradient.addColorStop(0.6, `rgba(255, 100, 0, ${0.3 * fadeAlpha})`); // Red-orange
            fanGradient.addColorStop(0.9, `rgba(200, 0, 200, ${0.2 * fadeAlpha})`); // Purple
            fanGradient.addColorStop(1, 'rgba(200, 0, 200, 0)'); // Edge - transparent
            
            ctx.fillStyle = fanGradient;
            ctx.shadowColor = 'rgba(255, 200, 100, 0.6)';
            ctx.shadowBlur = 30;
            
            // Draw semi-circle shape
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            // Draw arc from left (-90 degrees) to right (90 degrees)
            ctx.arc(this.startX, this.startY, currentRadius, startAngle - Math.PI / 2, endAngle - Math.PI / 2);
            ctx.closePath();
            ctx.fill();
            
            // Draw outer glow edge
            ctx.strokeStyle = `rgba(255, 255, 200, ${0.5 * fadeAlpha})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.startX, this.startY, currentRadius, startAngle - Math.PI / 2, endAngle - Math.PI / 2);
            ctx.stroke();
            
            // Draw inner glow edge
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * fadeAlpha})`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.startX, this.startY, currentRadius * 0.95, startAngle - Math.PI / 2, endAngle - Math.PI / 2);
            ctx.stroke();
        }
        
        // Draw particles
        this.particles.forEach(particle => {
            const particleAlpha = (particle.life / particle.maxLife) * fadeAlpha;
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particleAlpha;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

/**
 * Effect Manager - Creates and manages effects
 */
class EffectManager {
    static createEffect(x, y, enemyType, size = 'normal', effectScale = 1) {
        switch (enemyType) {
            case 'basic':
                return new ExplosionEffect(x, y, 'normal');
            case 'fast':
                return new FlashEffect(x, y);
            case 'tank':
                return new ExplosionEffect(x, y, 'large', effectScale);
            case 'formation':
                return new MultiExplosionEffect(x, y, 3);
            case 'swarm':
                return new SparkleEffect(x, y);
            case 'carrier':
                return new CarrierExplosionEffect(x, y);
            case 'spawn':
                return new SpawnEffect(x, y);
            case 'shockwave':
                // Shockwave effect doesn't use x, y - it starts from bottom center
                // Pass game instance if needed
                return new ShockwaveEffect(size); // size parameter used as game instance
            default:
                return new ExplosionEffect(x, y, 'small');
        }
    }
}

