/**
 * Fluid Visualizers Module
 * Premium 3D liquid metal/mercury simulation using Three.js
 */

import { ThreeJSVisualizer } from './ThreeJSVisualizer.js';
import { BeatEffects } from './beatEffects.js';

export class FluidVisualizers {
    constructor(canvas, audioCapture, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioCapture = audioCapture;
        this.audioAnalyzer = audioAnalyzer;

        this.width = canvas.width;
        this.height = canvas.height;
        this.time = 0;

        // Premium 3D Engine
        this.threeVisualizer = new ThreeJSVisualizer(canvas);

        // 2D Beat Effects overlay (flashes, shockwaves)
        this.beatEffects = new BeatEffects(canvas);

        // State tracking
        this.currentVisualizer = null;
        this.isActive = false;
        this.lastBeatTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initialize() {
        if (!this.isActive) {
            try {
                this.threeVisualizer.initialize();
                this.isActive = true;
                console.log('[FluidVisualizers] 3D Engine initialized successfully');
            } catch (error) {
                console.error('[FluidVisualizers] Failed to initialize 3D engine:', error);
            }
        }
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        if (this.threeVisualizer && this.isActive) {
            this.threeVisualizer.resize();
        }

        this.beatEffects.resize(rect.width, rect.height);
    }

    setVisualizer(type) {
        this.initialize();
        this.currentVisualizer = type;

        if (this.threeVisualizer && this.isActive) {
            this.threeVisualizer.setMode(type);
        }

        console.log('[FluidVisualizers] Set visualizer:', type);
    }

    render(type, audioData, metadata) {
        // Ensure 3D engine is active
        if (!this.isActive) {
            this.initialize();
        }

        // Update 3D mercury scene
        if (this.threeVisualizer && this.isActive) {
            this.threeVisualizer.update(metadata);
        }

        // Clear 2D canvas to transparent so 3D shows through
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Trigger beat effects
        const now = Date.now();
        if (metadata?.rhythm?.beat && now - this.lastBeatTime > 150) {
            this.beatEffects.trigger('beat', {
                intensity: (metadata.amplitude || 0.5) * 1.2,
                x: this.width / 2,
                y: this.height / 2
            });
            this.lastBeatTime = now;
        }

        // High amplitude triggers flash
        if (metadata?.amplitude > 0.75) {
            const hue = (metadata.spectralCentroid / 30) % 360 || 0;
            this.beatEffects.trigger('flash', {
                intensity: metadata.amplitude * 0.4,
                color: { h: hue, s: 100, l: 70 }
            });
        }

        // Drop detection
        if (metadata?.energyBands?.bass > 0.8 && metadata?.amplitude > 0.7) {
            if (now - this.lastBeatTime > 500) {
                this.beatEffects.trigger('shockwave', {
                    intensity: metadata.energyBands.bass,
                    x: this.width / 2,
                    y: this.height / 2
                });
            }
        }

        this.beatEffects.update(0.016, metadata);
        this.beatEffects.render(this.ctx);
    }

    /**
     * Get available visualizer types
     */
    static getTypes() {
        return [
            'mercuryOrbs',
            'liquidMetal',
            'metallicNebula',
            'tunnel'
        ];
    }
}
