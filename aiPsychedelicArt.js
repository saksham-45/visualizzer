/**
 * AI Psychedelic Art Generator
 * Generates psychedelic backgrounds using Stable Diffusion API
 * Falls back to procedural generation when API unavailable
 */

export class AIPsychedelicArt {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentImage = null;
        this.nextImage = null;
        this.transitionProgress = 0;
        this.isGenerating = false;
        this.lastGenerateTime = 0;
        this.generateInterval = 30000; // Generate new image every 30 seconds
        this.apiEndpoint = null; // Set via setApiEndpoint()
        this.apiKey = null;

        // Psychedelic prompt templates
        this.promptTemplates = [
            "psychedelic fractal mandala, vibrant neon colors, sacred geometry, cosmic energy, digital art, 8k",
            "trippy mushroom forest, bioluminescent, rainbow aurora, mystical atmosphere, highly detailed",
            "abstract liquid metal waves, iridescent colors, chrome reflections, surreal dreamscape",
            "cosmic eye of the universe, nebula colors, sacred geometry patterns, spiritual awakening",
            "DMT inspired visionary art, geometric patterns, Alex Grey style, vibrant energy",
            "psychedelic peacock feathers, fractal patterns, rainbow spectrum, macro photography",
            "melting reality, Salvador Dali style, surreal landscape, vivid colors, dreamlike",
            "sacred temple in hyperspace, geometric architecture, neon lights, otherworldly",
            "kaleidoscope of butterflies, prismatic colors, ethereal glow, fantasy art",
            "aurora borealis over crystal mountains, psychedelic sky, vibrant reflections"
        ];

        // Procedural generation state
        this.proceduralTime = 0;
        this.proceduralCanvas = document.createElement('canvas');
        this.proceduralCtx = this.proceduralCanvas.getContext('2d');

        this.initialize();
    }

    initialize() {
        this.proceduralCanvas.width = this.canvas.width;
        this.proceduralCanvas.height = this.canvas.height;

        // Start with procedural art
        this.generateProceduralArt();
    }

    setApiEndpoint(endpoint, apiKey) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
    }

    getRandomPrompt(audioMetadata = null) {
        let prompt = this.promptTemplates[Math.floor(Math.random() * this.promptTemplates.length)];

        // Add audio-reactive modifiers
        if (audioMetadata) {
            const bass = audioMetadata.frequencyDistribution?.low || 0;
            const energy = audioMetadata.amplitude || 0;

            if (bass > 0.6) prompt += ", deep bass energy, pulsating, powerful";
            if (energy > 0.7) prompt += ", explosive energy, dynamic motion, intense";
            if (audioMetadata.frequencyDistribution?.high > 0.5) prompt += ", crystalline, sparkling, high frequency";
        }

        return prompt;
    }

    async generateFromAPI(prompt) {
        if (!this.apiEndpoint || !this.apiKey) return null;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    negative_prompt: "blurry, low quality, text, watermark, signature, realistic, photograph",
                    width: 1024,
                    height: 1024,
                    steps: 30,
                    guidance_scale: 7.5
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const imageData = data.images?.[0] || data.output?.[0];

            if (imageData) {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                return new Promise((resolve) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
                });
            }
        } catch (error) {
            console.log('AI generation unavailable, using procedural:', error.message);
        }

        return null;
    }

    generateProceduralArt(audioMetadata = null) {
        const ctx = this.proceduralCtx;
        const w = this.proceduralCanvas.width;
        const h = this.proceduralCanvas.height;
        const t = this.proceduralTime;

        // Create psychedelic gradient background
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
        const hue1 = (t * 10) % 360;
        const hue2 = (hue1 + 120) % 360;
        const hue3 = (hue1 + 240) % 360;

        gradient.addColorStop(0, `hsl(${hue1}, 100%, 50%)`);
        gradient.addColorStop(0.3, `hsl(${hue2}, 80%, 40%)`);
        gradient.addColorStop(0.6, `hsl(${hue3}, 90%, 30%)`);
        gradient.addColorStop(1, `hsl(${hue1}, 70%, 10%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Draw psychedelic patterns
        this.drawMandala(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, t);
        this.drawSpiralArms(ctx, w / 2, h / 2, Math.min(w, h) * 0.5, t);
        this.drawFractalCircles(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, 5, t);

        // Convert to image
        const imageData = this.proceduralCanvas.toDataURL();
        const img = new Image();
        img.src = imageData;

        return img;
    }

    drawMandala(ctx, cx, cy, radius, time) {
        const petals = 12;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.5);

        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const hue = (time * 20 + i * 30) % 360;

            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(radius * 0.5, radius * 0.3, radius, 0);
            ctx.quadraticCurveTo(radius * 0.5, -radius * 0.3, 0, 0);

            const grad = ctx.createLinearGradient(0, 0, radius, 0);
            grad.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
            grad.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    drawSpiralArms(ctx, cx, cy, radius, time) {
        const arms = 6;
        ctx.save();
        ctx.translate(cx, cy);

        for (let arm = 0; arm < arms; arm++) {
            const baseAngle = (arm / arms) * Math.PI * 2 + time;
            const hue = (time * 30 + arm * 60) % 360;

            ctx.beginPath();
            for (let i = 0; i < 100; i++) {
                const t = i / 100;
                const r = t * radius;
                const angle = baseAngle + t * Math.PI * 4;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.5 - time % 0.5})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    drawFractalCircles(ctx, cx, cy, radius, depth, time) {
        if (depth <= 0 || radius < 5) return;

        const hue = (time * 40 + depth * 50) % 360;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Recursive circles
        const childRadius = radius * 0.5;
        const positions = 6;
        for (let i = 0; i < positions; i++) {
            const angle = (i / positions) * Math.PI * 2 + time * 0.3;
            const x = cx + Math.cos(angle) * radius * 0.6;
            const y = cy + Math.sin(angle) * radius * 0.6;
            this.drawFractalCircles(ctx, x, y, childRadius, depth - 1, time);
        }
    }

    async generate(audioMetadata = null) {
        if (this.isGenerating) return;

        const now = Date.now();
        if (now - this.lastGenerateTime < this.generateInterval) return;

        this.isGenerating = true;
        this.lastGenerateTime = now;

        // Try API first, fall back to procedural
        const prompt = this.getRandomPrompt(audioMetadata);
        let newImage = await this.generateFromAPI(prompt);

        if (!newImage) {
            newImage = this.generateProceduralArt(audioMetadata);
        }

        if (newImage) {
            this.nextImage = newImage;
            this.transitionProgress = 0;
        }

        this.isGenerating = false;
    }

    update(deltaTime, audioMetadata = null) {
        this.proceduralTime += deltaTime;

        // Transition between images
        if (this.nextImage && this.transitionProgress < 1) {
            this.transitionProgress += deltaTime * 0.5; // 2 second transition
            if (this.transitionProgress >= 1) {
                this.currentImage = this.nextImage;
                this.nextImage = null;
            }
        }

        // Regenerate periodically
        this.generate(audioMetadata);
    }

    render(audioData, metadata, deltaTime = 0.016) {
        this.update(deltaTime, metadata);

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with dark background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Draw current procedural art with audio reactivity
        this.proceduralCanvas.width = w;
        this.proceduralCanvas.height = h;
        this.generateProceduralArt(metadata);

        // Apply audio-reactive effects
        const bass = metadata?.frequencyDistribution?.low || 0;
        const amplitude = metadata?.amplitude || 0;

        // Scale and pulse with bass
        const scale = 1 + bass * 0.1;
        const offsetX = (w - w * scale) / 2;
        const offsetY = (h - h * scale) / 2;

        ctx.save();
        ctx.globalAlpha = 0.7 + amplitude * 0.3;
        ctx.drawImage(this.proceduralCanvas, offsetX, offsetY, w * scale, h * scale);
        ctx.restore();

        // Draw static images if available (crossfade)
        if (this.currentImage) {
            ctx.save();
            ctx.globalAlpha = 0.3 * (1 - this.transitionProgress);
            ctx.drawImage(this.currentImage, 0, 0, w, h);
            ctx.restore();
        }

        if (this.nextImage && this.transitionProgress > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 * this.transitionProgress;
            ctx.drawImage(this.nextImage, 0, 0, w, h);
            ctx.restore();
        }
    }

    resize() {
        this.proceduralCanvas.width = this.canvas.width;
        this.proceduralCanvas.height = this.canvas.height;
    }

    destroy() {
        this.currentImage = null;
        this.nextImage = null;
    }
}
