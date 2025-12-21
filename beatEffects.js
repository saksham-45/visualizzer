/**
 * Beat Effects Module
 * Spectacular visual effects synchronized to beats and drops
 * Includes shockwaves, explosions, flashes, and ripples
 */

export class BeatEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Active effects
        this.shockwaves = [];
        this.explosions = [];
        this.flashes = [];
        this.ripples = [];
        this.streaks = [];
        this.particles = [];
        this.colorPulses = [];
        this.distortions = [];

        // Configuration
        this.config = {
            maxShockwaves: 5,
            maxExplosions: 3,
            maxParticles: 500,
            maxRipples: 10,
            maxStreaks: 30
        };

        // Color palette for effects
        this.colorPalette = [
            { h: 280, s: 100, l: 60 }, // Magenta
            { h: 180, s: 100, l: 50 }, // Cyan
            { h: 320, s: 100, l: 55 }, // Pink
            { h: 200, s: 100, l: 55 }, // Blue
            { h: 40, s: 100, l: 55 },  // Orange
            { h: 140, s: 100, l: 50 }  // Green
        ];

        this.time = 0;
        this.currentHueOffset = 0;
    }

    /**
     * Update canvas size
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Trigger effect based on type
     */
    trigger(effectType, options = {}) {
        const centerX = options.x ?? this.width / 2;
        const centerY = options.y ?? this.height / 2;
        const intensity = options.intensity ?? 1.0;
        const color = options.color ?? this.getRandomColor();

        switch (effectType) {
            case 'beat':
                this.triggerBeatPulse(centerX, centerY, intensity, color);
                break;
            case 'drop':
                this.triggerDrop(centerX, centerY, intensity);
                break;
            case 'shockwave':
                this.triggerShockwave(centerX, centerY, intensity, color);
                break;
            case 'explosion':
                this.triggerExplosion(centerX, centerY, intensity, color);
                break;
            case 'flash':
                this.triggerFlash(intensity, color);
                break;
            case 'ripple':
                this.triggerRipple(centerX, centerY, intensity, color);
                break;
            case 'streak':
                this.triggerStreaks(intensity, color);
                break;
            case 'colorPulse':
                this.triggerColorPulse(intensity, color);
                break;
            case 'distortion':
                this.triggerDistortion(centerX, centerY, intensity);
                break;
            case 'beatAnticipation':
                this.triggerBeatAnticipation(options.timeUntilBeat || 100, color);
                break;
        }
    }

    /**
     * Beat pulse - subtle ring expansion
     */
    triggerBeatPulse(x, y, intensity, color) {
        const count = Math.floor(1 + intensity * 2);

        for (let i = 0; i < count; i++) {
            if (this.shockwaves.length < this.config.maxShockwaves) {
                this.shockwaves.push({
                    x, y,
                    radius: 10 + i * 20,
                    maxRadius: 200 + intensity * 200,
                    speed: 8 + intensity * 4,
                    thickness: 2 + intensity * 3,
                    color,
                    alpha: 0.6 + intensity * 0.3,
                    decay: 0.015
                });
            }
        }

        // Small particle burst
        this.spawnParticles(x, y, 10 + intensity * 20, intensity, color);
    }

    /**
     * Drop effect - massive multi-layered explosion
     */
    triggerDrop(x, y, intensity) {
        // Multiple shockwaves
        for (let i = 0; i < 5; i++) {
            const color = this.colorPalette[i % this.colorPalette.length];

            this.shockwaves.push({
                x, y,
                radius: 5,
                maxRadius: 400 + i * 100,
                speed: 15 + i * 3,
                thickness: 8 - i,
                color,
                alpha: 1.0,
                decay: 0.008
            });
        }

        // Massive explosion
        this.triggerExplosion(x, y, intensity * 2, this.getRandomColor());

        // Flash
        this.triggerFlash(intensity * 1.5, { h: 0, s: 0, l: 100 });

        // Radial streaks
        this.triggerStreaks(intensity * 2, this.getRandomColor());

        // Color pulse
        this.triggerColorPulse(intensity, this.getRandomColor());

        // Screen distortion
        this.triggerDistortion(x, y, intensity);
    }

    /**
     * Shockwave - expanding ring
     */
    triggerShockwave(x, y, intensity, color) {
        if (this.shockwaves.length < this.config.maxShockwaves) {
            this.shockwaves.push({
                x, y,
                radius: 0,
                maxRadius: 300 + intensity * 200,
                speed: 10 + intensity * 5,
                thickness: 3 + intensity * 4,
                color,
                alpha: 0.8,
                decay: 0.012
            });
        }
    }

    /**
     * Explosion - particle burst
     */
    triggerExplosion(x, y, intensity, color) {
        const particleCount = 50 + Math.floor(intensity * 100);
        this.spawnParticles(x, y, particleCount, intensity, color);

        // Add explosion flash at center
        if (this.explosions.length < this.config.maxExplosions) {
            this.explosions.push({
                x, y,
                radius: 10,
                maxRadius: 100 + intensity * 100,
                alpha: 1.0,
                decay: 0.05,
                color
            });
        }
    }

    /**
     * Flash - full screen brightness
     */
    triggerFlash(intensity, color) {
        this.flashes.push({
            alpha: Math.min(1, 0.5 + intensity * 0.5),
            decay: 0.08 + intensity * 0.02,
            color
        });
    }

    /**
     * Ripple - concentric waves
     */
    triggerRipple(x, y, intensity, color) {
        const rippleCount = 3 + Math.floor(intensity * 3);

        for (let i = 0; i < rippleCount; i++) {
            if (this.ripples.length < this.config.maxRipples) {
                this.ripples.push({
                    x, y,
                    radius: i * 30,
                    speed: 5 + intensity * 3,
                    amplitude: 5 + intensity * 10,
                    wavelength: 50 + intensity * 30,
                    alpha: 0.5,
                    decay: 0.01,
                    color,
                    phase: i * 0.5
                });
            }
        }
    }

    /**
     * Streaks - radial lines shooting outward
     */
    triggerStreaks(intensity, color) {
        const streakCount = 10 + Math.floor(intensity * 20);
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for (let i = 0; i < streakCount; i++) {
            if (this.streaks.length < this.config.maxStreaks) {
                const angle = (i / streakCount) * Math.PI * 2 + Math.random() * 0.2;

                this.streaks.push({
                    x: centerX,
                    y: centerY,
                    angle,
                    length: 50 + Math.random() * 100,
                    speed: 20 + intensity * 20 + Math.random() * 10,
                    distance: 0,
                    maxDistance: 500 + Math.random() * 300,
                    thickness: 2 + Math.random() * 3,
                    alpha: 0.8 + Math.random() * 0.2,
                    decay: 0.02,
                    color: { ...color, h: color.h + Math.random() * 30 - 15 }
                });
            }
        }
    }

    /**
     * Color pulse - screen-wide color wash
     */
    triggerColorPulse(intensity, color) {
        this.colorPulses.push({
            alpha: 0.3 + intensity * 0.3,
            decay: 0.02,
            color,
            mode: 'screen' // blend mode
        });
    }

    /**
     * Distortion - warping effect from center
     */
    triggerDistortion(x, y, intensity) {
        this.distortions.push({
            x, y,
            radius: 0,
            maxRadius: 400 + intensity * 300,
            speed: 15 + intensity * 10,
            strength: intensity,
            alpha: 1.0,
            decay: 0.03
        });
    }

    /**
     * Beat anticipation - contracting ring before beat
     */
    triggerBeatAnticipation(timeUntilBeat, color) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Contracting circle that reaches center at beat time
        this.shockwaves.push({
            x: centerX,
            y: centerY,
            radius: 300,
            maxRadius: 0, // Contracts inward
            speed: -300 / (timeUntilBeat / 16.67), // Frames until beat
            thickness: 2,
            color: color || { h: 60, s: 100, l: 70 },
            alpha: 0.5,
            decay: 0,
            contracting: true
        });
    }

    /**
     * Spawn particles
     */
    spawnParticles(x, y, count, intensity, color) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.config.maxParticles) {
                this.particles.shift(); // Remove oldest
            }

            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 10 * intensity;
            const size = 2 + Math.random() * 4 * intensity;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                alpha: 0.8 + Math.random() * 0.2,
                decay: 0.01 + Math.random() * 0.02,
                color: { ...color, h: color.h + Math.random() * 40 - 20 },
                gravity: 0.1 + Math.random() * 0.1,
                friction: 0.98,
                trail: [],
                trailLength: 5
            });
        }
    }

    /**
     * Get random color from palette
     */
    getRandomColor() {
        const color = this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
        return { ...color, h: (color.h + this.currentHueOffset) % 360 };
    }

    /**
     * Update all effects
     */
    update(deltaTime, audioMetadata = null) {
        this.time += deltaTime;

        // Shift color palette based on audio
        if (audioMetadata?.spectralCentroid) {
            this.currentHueOffset = (audioMetadata.spectralCentroid / 20) % 360;
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];

            if (sw.contracting) {
                sw.radius += sw.speed;
                if (sw.radius <= 0) {
                    this.shockwaves.splice(i, 1);
                    continue;
                }
            } else {
                sw.radius += sw.speed;
                sw.alpha -= sw.decay;

                if (sw.alpha <= 0 || sw.radius > sw.maxRadius) {
                    this.shockwaves.splice(i, 1);
                    continue;
                }
            }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.radius += 10;
            exp.alpha -= exp.decay;

            if (exp.alpha <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // Update flashes
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            const flash = this.flashes[i];
            flash.alpha -= flash.decay;

            if (flash.alpha <= 0) {
                this.flashes.splice(i, 1);
            }
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            ripple.radius += ripple.speed;
            ripple.phase += 0.1;
            ripple.alpha -= ripple.decay;

            if (ripple.alpha <= 0 || ripple.radius > this.width) {
                this.ripples.splice(i, 1);
            }
        }

        // Update streaks
        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const streak = this.streaks[i];
            streak.distance += streak.speed;
            streak.alpha -= streak.decay;

            if (streak.alpha <= 0 || streak.distance > streak.maxDistance) {
                this.streaks.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Store trail position
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > p.trailLength) {
                p.trail.shift();
            }

            // Physics
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update color pulses
        for (let i = this.colorPulses.length - 1; i >= 0; i--) {
            const pulse = this.colorPulses[i];
            pulse.alpha -= pulse.decay;

            if (pulse.alpha <= 0) {
                this.colorPulses.splice(i, 1);
            }
        }

        // Update distortions
        for (let i = this.distortions.length - 1; i >= 0; i--) {
            const dist = this.distortions[i];
            dist.radius += dist.speed;
            dist.alpha -= dist.decay;

            if (dist.alpha <= 0 || dist.radius > dist.maxRadius) {
                this.distortions.splice(i, 1);
            }
        }
    }

    /**
     * Render all effects
     */
    render(ctx = null) {
        const c = ctx || this.ctx;

        c.save();

        // Render color pulses (background)
        for (const pulse of this.colorPulses) {
            c.globalCompositeOperation = 'screen';
            c.fillStyle = `hsla(${pulse.color.h}, ${pulse.color.s}%, ${pulse.color.l}%, ${pulse.alpha})`;
            c.fillRect(0, 0, this.width, this.height);
            c.globalCompositeOperation = 'source-over';
        }

        // Render ripples
        for (const ripple of this.ripples) {
            c.strokeStyle = `hsla(${ripple.color.h}, ${ripple.color.s}%, ${ripple.color.l}%, ${ripple.alpha})`;
            c.lineWidth = 2;
            c.beginPath();

            const segments = 64;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const wave = Math.sin(angle * 8 + ripple.phase) * ripple.amplitude;
                const r = ripple.radius + wave;
                const x = ripple.x + Math.cos(angle) * r;
                const y = ripple.y + Math.sin(angle) * r;

                if (i === 0) {
                    c.moveTo(x, y);
                } else {
                    c.lineTo(x, y);
                }
            }

            c.closePath();
            c.stroke();
        }

        // Render shockwaves
        for (const sw of this.shockwaves) {
            if (sw.radius <= 0) continue;

            const gradient = c.createRadialGradient(
                sw.x, sw.y, Math.max(0, sw.radius - sw.thickness),
                sw.x, sw.y, sw.radius + sw.thickness
            );

            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.3, `hsla(${sw.color.h}, ${sw.color.s}%, ${sw.color.l}%, ${sw.alpha * 0.5})`);
            gradient.addColorStop(0.5, `hsla(${sw.color.h}, ${sw.color.s}%, ${sw.color.l + 20}%, ${sw.alpha})`);
            gradient.addColorStop(0.7, `hsla(${sw.color.h}, ${sw.color.s}%, ${sw.color.l}%, ${sw.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            c.fillStyle = gradient;
            c.beginPath();
            c.arc(sw.x, sw.y, sw.radius + sw.thickness, 0, Math.PI * 2);
            c.fill();
        }

        // Render explosions
        for (const exp of this.explosions) {
            const gradient = c.createRadialGradient(
                exp.x, exp.y, 0,
                exp.x, exp.y, exp.radius
            );

            gradient.addColorStop(0, `hsla(${exp.color.h}, ${exp.color.s}%, 90%, ${exp.alpha})`);
            gradient.addColorStop(0.3, `hsla(${exp.color.h}, ${exp.color.s}%, ${exp.color.l}%, ${exp.alpha * 0.7})`);
            gradient.addColorStop(1, `hsla(${exp.color.h}, ${exp.color.s}%, ${exp.color.l}%, 0)`);

            c.fillStyle = gradient;
            c.beginPath();
            c.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            c.fill();
        }

        // Render streaks
        c.lineCap = 'round';
        for (const streak of this.streaks) {
            const startX = streak.x + Math.cos(streak.angle) * streak.distance;
            const startY = streak.y + Math.sin(streak.angle) * streak.distance;
            const endX = streak.x + Math.cos(streak.angle) * (streak.distance + streak.length);
            const endY = streak.y + Math.sin(streak.angle) * (streak.distance + streak.length);

            const gradient = c.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `hsla(${streak.color.h}, ${streak.color.s}%, ${streak.color.l}%, 0)`);
            gradient.addColorStop(0.5, `hsla(${streak.color.h}, ${streak.color.s}%, ${streak.color.l}%, ${streak.alpha})`);
            gradient.addColorStop(1, `hsla(${streak.color.h}, ${streak.color.s}%, ${streak.color.l + 20}%, ${streak.alpha})`);

            c.strokeStyle = gradient;
            c.lineWidth = streak.thickness;
            c.beginPath();
            c.moveTo(startX, startY);
            c.lineTo(endX, endY);
            c.stroke();
        }

        // Render particles
        c.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            // Draw trail
            if (p.trail.length > 1) {
                c.beginPath();
                c.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    c.lineTo(p.trail[i].x, p.trail[i].y);
                }
                c.lineTo(p.x, p.y);
                c.strokeStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.alpha * 0.3})`;
                c.lineWidth = p.size * 0.5;
                c.stroke();
            }

            // Draw particle
            const gradient = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            gradient.addColorStop(0, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l + 30}%, ${p.alpha})`);
            gradient.addColorStop(0.5, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.alpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, 0)`);

            c.fillStyle = gradient;
            c.beginPath();
            c.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            c.fill();
        }
        c.globalCompositeOperation = 'source-over';

        // Render flashes (on top)
        for (const flash of this.flashes) {
            c.fillStyle = `hsla(${flash.color.h}, ${flash.color.s}%, ${flash.color.l}%, ${flash.alpha})`;
            c.fillRect(0, 0, this.width, this.height);
        }

        c.restore();
    }

    /**
     * Get distortion data for shader-based effects
     */
    getDistortionData() {
        return this.distortions.map(d => ({
            x: d.x / this.width,
            y: d.y / this.height,
            radius: d.radius / Math.max(this.width, this.height),
            strength: d.strength * d.alpha
        }));
    }

    /**
     * Check if any effects are active
     */
    hasActiveEffects() {
        return this.shockwaves.length > 0 ||
            this.explosions.length > 0 ||
            this.flashes.length > 0 ||
            this.particles.length > 0 ||
            this.ripples.length > 0 ||
            this.streaks.length > 0 ||
            this.colorPulses.length > 0 ||
            this.distortions.length > 0;
    }

    /**
     * Clear all effects
     */
    clear() {
        this.shockwaves = [];
        this.explosions = [];
        this.flashes = [];
        this.ripples = [];
        this.streaks = [];
        this.particles = [];
        this.colorPulses = [];
        this.distortions = [];
    }
}
