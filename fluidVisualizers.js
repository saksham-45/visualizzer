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

        // Sync mode if it changed (Fixes the issue where tunnel wasn't rendering)
        if (this.currentVisualizer !== type) {
            this.setVisualizer(type);
        }

        // Update 3D scene
        if (this.threeVisualizer && this.isActive) {
            this.threeVisualizer.update(metadata);
        }

        // Clear 2D canvas to transparent so 3D shows through
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // DAMPENED: Trigger beat effects less frequently in 3D to maintain stability
        const now = Date.now();
        if (metadata?.rhythm?.beat && (now - this.lastBeatTime > 400)) {
            this.beatEffects.trigger('beat', {
                intensity: (metadata.amplitude || 0.5) * 0.8,
                x: this.width / 2,
                y: this.height / 2
            });
            this.lastBeatTime = now;
        }

        // DAMPENED: High amplitude triggers subtle flash
        if (metadata?.amplitude > 0.85) {
            const hue = (metadata.spectralCentroid / 30) % 360 || 0;
            this.beatEffects.trigger('flash', {
                intensity: metadata.amplitude * 0.2,
                color: { h: hue, s: 80, l: 60 }
            });
        }

        // DAMPENED: Significant bass triggers shockwave
        if (metadata?.energyBands?.bass > 0.9 && metadata?.amplitude > 0.8) {
            if (now - (this.lastShockwaveTime || 0) > 2000) {
                this.beatEffects.trigger('shockwave', {
                    intensity: 0.5,
                    x: this.width / 2,
                    y: this.height / 2
                });
                this.lastShockwaveTime = now;
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
