/**
 * Reactive Typography Module
 * Animated lyrics display synced with music
 * Supports Spotify lyrics API and manual lyrics input
 */

export class ReactiveTypography {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.lyrics = [];
        this.currentLineIndex = 0;
        this.time = 0;
        this.displayText = '';
        this.displayProgress = 0;
        this.particles = [];

        this.params = {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 72,
            color: '#ffffff',
            glowColor: '#ff00ff',
            style: 'wave', // wave, explode, typewriter, pulse, rainbow
            showParticles: true
        };

        // Demo lyrics for testing
        this.demoLyrics = [
            { time: 0, text: "Feel the rhythm" },
            { time: 3, text: "Let it flow through you" },
            { time: 6, text: "Dancing in the light" },
            { time: 9, text: "Colors all around" },
            { time: 12, text: "Lost in the sound" },
            { time: 15, text: "Music is the answer" },
            { time: 18, text: "To everything we need" },
            { time: 21, text: "Let your spirit free" }
        ];

        this.useDemoLyrics();
    }

    setLyrics(lyrics) {
        // lyrics: Array of { time: seconds, text: string }
        this.lyrics = lyrics.sort((a, b) => a.time - b.time);
        this.currentLineIndex = 0;
    }

    useDemoLyrics() {
        this.lyrics = this.demoLyrics;
    }

    async fetchSpotifyLyrics(trackId, accessToken) {
        try {
            const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch');
            // Note: Spotify doesn't provide lyrics directly in API
            // Would need to use a third-party lyrics service
            console.log('Spotify lyrics integration placeholder');
        } catch (error) {
            console.log('Using demo lyrics:', error.message);
            this.useDemoLyrics();
        }
    }

    setParams(params) {
        Object.assign(this.params, params);
    }

    update(deltaTime, audioMetadata) {
        this.time += deltaTime;

        // Find current lyric line based on time
        for (let i = this.lyrics.length - 1; i >= 0; i--) {
            if (this.time >= this.lyrics[i].time) {
                if (i !== this.currentLineIndex) {
                    this.currentLineIndex = i;
                    this.displayText = this.lyrics[i].text;
                    this.displayProgress = 0;
                    this.spawnTextParticles(audioMetadata);
                }
                break;
            }
        }

        // Animate display progress
        this.displayProgress = Math.min(1, this.displayProgress + deltaTime * 2);

        // Update particles
        this.updateParticles(deltaTime, audioMetadata);
    }

    spawnTextParticles(metadata) {
        if (!this.params.showParticles) return;

        const amplitude = metadata?.amplitude || 0.5;
        const count = Math.floor(20 + amplitude * 30);

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5,
                size: 3 + Math.random() * 5,
                life: 1,
                hue: Math.random() * 360,
                char: this.displayText[Math.floor(Math.random() * this.displayText.length)] || '*'
            });
        }
    }

    updateParticles(deltaTime, metadata) {
        const bass = metadata?.frequencyDistribution?.low || 0;

        this.particles = this.particles.filter(p => {
            p.x += p.vx * (1 + bass);
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= deltaTime * 0.5;
            p.hue += deltaTime * 100;
            return p.life > 0;
        });

        // Limit particle count
        if (this.particles.length > 200) {
            this.particles = this.particles.slice(-200);
        }
    }

    renderWaveStyle(ctx, text, cx, cy, metadata) {
        const amplitude = metadata?.amplitude || 0;
        const bass = metadata?.frequencyDistribution?.low || 0;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw each character with wave effect
        const chars = text.split('');
        const totalWidth = ctx.measureText(text).width;
        let x = cx - totalWidth / 2;

        chars.forEach((char, i) => {
            const charWidth = ctx.measureText(char).width;
            const wave = Math.sin(this.time * 3 + i * 0.5) * 20 * (1 + bass);
            const scale = 1 + Math.sin(this.time * 5 + i * 0.3) * 0.1 * amplitude;
            const hue = (this.time * 50 + i * 20) % 360;

            ctx.save();
            ctx.translate(x + charWidth / 2, cy + wave);
            ctx.scale(scale, scale);

            // Glow effect
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 20 + bass * 30;
            ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
            ctx.fillText(char, 0, 0);

            ctx.restore();
            x += charWidth;
        });

        ctx.restore();
    }

    renderExplodeStyle(ctx, text, cx, cy, metadata) {
        const amplitude = metadata?.amplitude || 0;
        const progress = this.displayProgress;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const chars = text.split('');
        const totalWidth = ctx.measureText(text).width;
        let x = cx - totalWidth / 2;

        chars.forEach((char, i) => {
            const charWidth = ctx.measureText(char).width;
            const delay = i / chars.length;
            const charProgress = Math.max(0, Math.min(1, (progress - delay * 0.5) * 2));

            // Explode in from random positions
            const startX = cx + (Math.random() - 0.5) * 500;
            const startY = cy + (Math.random() - 0.5) * 500;
            const currentX = startX + (x + charWidth / 2 - startX) * charProgress;
            const currentY = startY + (cy - startY) * charProgress;

            const scale = 0.5 + charProgress * 0.5 + amplitude * 0.2;
            const alpha = charProgress;
            const hue = (this.time * 30 + i * 25) % 360;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(currentX, currentY);
            ctx.scale(scale, scale);
            ctx.rotate((1 - charProgress) * Math.PI * 2);

            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 30;
            ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
            ctx.fillText(char, 0, 0);

            ctx.restore();
            x += charWidth;
        });

        ctx.restore();
    }

    renderPulseStyle(ctx, text, cx, cy, metadata) {
        const bass = metadata?.frequencyDistribution?.low || 0;
        const amplitude = metadata?.amplitude || 0;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pulsing scale based on bass
        const scale = 1 + bass * 0.5;
        const hue = (this.time * 40) % 360;

        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Multiple glow layers
        for (let i = 3; i >= 0; i--) {
            ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${0.3 - i * 0.05})`;
            ctx.shadowBlur = 20 + i * 20 + bass * 40;
            ctx.fillStyle = i === 0 ? '#fff' : `hsla(${hue}, 80%, 70%, 0.5)`;
            ctx.fillText(text, 0, 0);
        }

        ctx.restore();
    }

    renderRainbowStyle(ctx, text, cx, cy, metadata) {
        const amplitude = metadata?.amplitude || 0;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const chars = text.split('');
        const totalWidth = ctx.measureText(text).width;
        let x = cx - totalWidth / 2;

        chars.forEach((char, i) => {
            const charWidth = ctx.measureText(char).width;
            const hue = (i / chars.length * 360 + this.time * 100) % 360;
            const bounce = Math.abs(Math.sin(this.time * 4 + i * 0.4)) * 10 * amplitude;

            ctx.save();
            ctx.translate(x + charWidth / 2, cy - bounce);

            // Rainbow gradient per character
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 15 + amplitude * 20;
            ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
            ctx.fillText(char, 0, 0);

            ctx.restore();
            x += charWidth;
        });

        ctx.restore();
    }

    renderParticles(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.font = `${p.size * 3}px ${this.params.fontFamily}`;
            ctx.fillStyle = `hsl(${p.hue % 360}, 100%, 70%)`;
            ctx.shadowColor = `hsl(${p.hue % 360}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.fillText(p.char, p.x, p.y);
            ctx.restore();
        });
    }

    render(audioData, metadata, deltaTime = 0.016) {
        this.update(deltaTime, metadata);

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Semi-transparent background for trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, w, h);

        // Set font
        ctx.font = `bold ${this.params.fontSize}px ${this.params.fontFamily}`;

        // Render based on style
        switch (this.params.style) {
            case 'wave': this.renderWaveStyle(ctx, this.displayText, cx, cy, metadata); break;
            case 'explode': this.renderExplodeStyle(ctx, this.displayText, cx, cy, metadata); break;
            case 'pulse': this.renderPulseStyle(ctx, this.displayText, cx, cy, metadata); break;
            case 'rainbow': this.renderRainbowStyle(ctx, this.displayText, cx, cy, metadata); break;
            default: this.renderWaveStyle(ctx, this.displayText, cx, cy, metadata);
        }

        // Render particles
        if (this.params.showParticles) {
            this.renderParticles(ctx);
        }
    }

    resetTime() {
        this.time = 0;
        this.currentLineIndex = 0;
        this.displayProgress = 0;
    }

    resize() {
        // Font size scales with canvas
        this.params.fontSize = Math.min(72, this.canvas.width / 15);
    }

    destroy() {
        this.particles = [];
        this.lyrics = [];
    }
}
