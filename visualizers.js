/**
 * Visualizers Module (Integrated with MeshVisualizers, PremiumVisualizers, and FluidVisualizers)
 * Enhanced with Music Intelligence and Beat Effects
 */
import { MeshVisualizers } from './meshVisualizers.js';
import { PremiumVisualizers } from './premiumVisualizers.js';
import { FluidVisualizers } from './fluidVisualizers.js';
import { MusicIntelligence } from './musicIntelligence.js';
import { BeatEffects } from './beatEffects.js';

export class Visualizers {
    constructor(canvas, audioCapture, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioCapture = audioCapture;
        this.audioAnalyzer = audioAnalyzer;
        this.currentVisualizer = null;
        this.transitionProgress = 1;
        this.targetVisualizer = null;
        this.previousVisualizer = null;
        this.previousData = null;

        // Initialize MeshVisualizers
        this.meshVisualizer = new MeshVisualizers(canvas, audioCapture, audioAnalyzer);
        this.meshTypes = [
            'wave', 'bars', 'flowing', 'spiral', 'tornado', 'cyclone', 'ripple', 'morphing', 'trippy',
            'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid',
            'spiral1', 'spiral2', 'spiral3', 'spiral4', 'tracing', 'crossing', 'combined', 'kaleidoscope', 'mandala', 'fractal'
        ];

        // Initialize PremiumVisualizers
        this.premiumVisualizer = new PremiumVisualizers(canvas, audioCapture, audioAnalyzer);
        this.premiumTypes = [
            'appleWaveform', 'circularHarmonic', 'frequencyBarGalaxy', 'enhancedTunnel',
            'particleNebula', 'mathematicalSpiral', 'spectrumCircleHalo', 'fractalBloom',
            '3DGeometryShapeshifter', 'hinduGodPsychedelic'
        ];

        // Initialize FluidVisualizers (NEW - WebGL2 fluid simulation)
        this.fluidVisualizer = new FluidVisualizers(canvas, audioCapture, audioAnalyzer);
        this.fluidTypes = FluidVisualizers.getTypes();

        // Initialize Music Intelligence (NEW - predictive audio analysis)
        this.musicIntelligence = new MusicIntelligence(audioAnalyzer);
        this.intelligenceState = null;

        // Initialize Beat Effects (NEW - spectacular beat-synced effects)
        this.beatEffects = new BeatEffects(canvas);

        // Intelligent mode settings
        this.intelligentMode = true;
        this.lastVisualizerChange = 0;
        this.minVisualizerDuration = 8000; // Minimum 8 seconds per visualizer

        // Camera state for intelligent zoom/spread
        this.cameraState = {
            zoom: 1.0,
            targetZoom: 1.0,
            spread: 1.0,
            targetSpread: 1.0
        };

        // Resize canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    setVisualizer(type) {
        // Alias depthlines to new 3D tunnel
        if (type === 'depthlines') type = 'tunnel';

        if (this.currentVisualizer === type) return;

        this.previousVisualizer = this.currentVisualizer;
        this.targetVisualizer = type;
        this.currentVisualizer = type; // Set immediately so rendering starts
        this.transitionProgress = 0;

        const transitionDuration = 500; // Shorter transition
        const startTime = Date.now();

        const animateTransition = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = elapsed / transitionDuration;
            this.transitionProgress = this.easeInOutCubic(Math.min(rawProgress, 1));

            if (this.transitionProgress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.targetVisualizer = null;
                this.previousVisualizer = null;
                this.previousData = null;
            }
        };

        animateTransition();
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    render() {
        const audioData = this.audioCapture.getAudioData();
        const metadata = this.audioAnalyzer?.analyze();

        if (!audioData) {
            // Show fallback idle animation
            this.ctx.fillStyle = 'rgb(10, 10, 20)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Draw idle pulsing circle
            const now = Date.now() / 1000;
            const pulse = Math.sin(now * 2) * 0.5 + 0.5;
            this.ctx.fillStyle = `rgba(100, 200, 255, ${pulse * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width / 2, this.height / 2, 50 + pulse * 30, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Waiting for audio...', this.width / 2, this.height - 30);
            return;
        }

        // Update Music Intelligence
        if (this.musicIntelligence && metadata) {
            this.intelligenceState = this.musicIntelligence.update(metadata);

            // Process pending effects from intelligence
            const pendingEffects = this.musicIntelligence.getPendingEffects();
            for (const effect of pendingEffects) {
                this.beatEffects.trigger(effect.type, effect.params);
            }

            // Trigger drop effect if drop detected
            if (this.intelligenceState?.currentSection === 'drop' &&
                this.intelligenceState?.sectionConfidence > 0.7) {
                if (!this._lastDropTime || Date.now() - this._lastDropTime > 2000) {
                    this.beatEffects.trigger('drop', {
                        intensity: this.intelligenceState.recommendedIntensity,
                        x: this.width / 2,
                        y: this.height / 2
                    });
                    this._lastDropTime = Date.now();
                }
            }

            // Update camera state based on intelligence recommendations
            const cameraRec = this.musicIntelligence.getCameraRecommendation(Date.now());
            this.cameraState.targetZoom = cameraRec.zoom;

            const spreadRec = this.musicIntelligence.getSpreadRecommendation();
            this.cameraState.targetSpread = spreadRec.spread;

            // Intelligent visualizer selection - DELEGATED TO VisualizerSelector via main.js
            // We expose intelligence data but don't switch autonomously to prevent conflicts.
            if (this.intelligentMode && this.intelligenceState?.recommendedVisualizer) {
                // Logic moved to VisualizerSelector
            }
        }

        // Smooth camera state transitions
        this.cameraState.zoom += (this.cameraState.targetZoom - this.cameraState.zoom) * 0.05;
        this.cameraState.spread += (this.cameraState.targetSpread - this.cameraState.spread) * 0.05;

        // Update beat effects
        this.beatEffects.update(0.016, metadata);
        this.beatEffects.resize(this.width, this.height);

        const visualizerType = this.targetVisualizer || this.currentVisualizer;

        // Clear canvas with slight trail
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Apply camera zoom transform if significant
        if (Math.abs(this.cameraState.zoom - 1.0) > 0.01) {
            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(this.cameraState.zoom, this.cameraState.zoom);
            this.ctx.translate(-this.width / 2, -this.height / 2);
        }

        // Delegate based on visualizer type
        if (this.fluidTypes.includes(visualizerType)) {
            // NEW: Fluid visualizers (WebGL2)
            this.fluidVisualizer.render(visualizerType, audioData, metadata);
        } else if (this.meshTypes.includes(visualizerType)) {
            // Mesh visualizers
            this.meshVisualizer.setVisualizer(visualizerType);
            this.meshVisualizer.render();
        } else if (this.premiumTypes.includes(visualizerType)) {
            // Premium visualizers
            this.premiumVisualizer.render(visualizerType, audioData, metadata);
        } else {
            // Regular/legacy visualizers
            if (this.targetVisualizer && this.previousVisualizer && this.transitionProgress < 1) {
                this.renderMorphingTransition(audioData, metadata);
            } else {
                try {
                    this.renderVisualizer(visualizerType, audioData, metadata);
                } catch (err) {
                    console.error('Visualizer render error:', visualizerType, err);
                    // Fallback to a fluid visualizer on error
                    this.fluidVisualizer.render('mercuryOrbs', audioData, metadata);
                }
            }
        }

        // Restore transform if applied
        if (Math.abs(this.cameraState.zoom - 1.0) > 0.01) {
            this.ctx.restore();
        }

        // Render beat effects on top of everything
        this.beatEffects.render(this.ctx);
    }

    renderMorphingTransition(audioData, metadata) {
        const t = this.transitionProgress;
        const from = this.previousVisualizer;
        const to = this.targetVisualizer;

        // If either is mesh, just delegate to mesh for simplicity
        if (this.meshTypes.includes(from) || this.meshTypes.includes(to)) {
            this.meshVisualizer.setVisualizer(to);
            this.meshVisualizer.render();
            return;
        }

        const fromPoints = this.getVisualizerPoints(from, audioData, metadata);
        const toPoints = this.getVisualizerPoints(to, audioData, metadata);

        if (!fromPoints || !toPoints) {
            this.ctx.globalAlpha = 1 - t;
            this.renderVisualizer(from, audioData, metadata);
            this.ctx.globalAlpha = t;
            this.renderVisualizer(to, audioData, metadata);
            this.ctx.globalAlpha = 1;
            return;
        }

        this.renderMorphedPoints(fromPoints, toPoints, t, metadata);
    }

    getVisualizerPoints(type, audioData, metadata) {
        const { timeData, frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const points = [];

        switch (type) {
            case 'wave': {
                const sliceWidth = this.width / bufferLength;
                for (let i = 0; i < bufferLength; i += 4) {
                    const v = timeData[i] / 128.0;
                    const x = (i / bufferLength) * this.width;
                    const y = (v * this.height) / 2;
                    points.push({ x, y, type: 'line' });
                }
                break;
            }
            case 'circle': {
                const baseRadius = Math.min(this.width, this.height) * 0.15;
                const samplePoints = 64;
                for (let i = 0; i < samplePoints; i++) {
                    const angle = (i / samplePoints) * Math.PI * 2;
                    const dataIndex = Math.floor((i / samplePoints) * bufferLength);
                    const amplitude = (timeData[dataIndex] / 128.0 - 1) * 50;
                    const radius = baseRadius + amplitude;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    points.push({ x, y, type: 'circle', radius });
                }
                break;
            }
            case 'bars': {
                const barCount = 64;
                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor((i / barCount) * bufferLength);
                    const barHeight = (frequencyData[dataIndex] / 255) * this.height * 0.8;
                    const x = (i / barCount) * this.width;
                    const y = this.height - barHeight;
                    points.push({ x, y, type: 'bar', height: barHeight });
                }
                break;
            }
            case 'spiral': {
                const maxRadius = Math.min(this.width, this.height) * 0.4;
                const turns = 3;
                const samplePoints = 128;
                for (let i = 0; i < samplePoints; i++) {
                    const progress = i / samplePoints;
                    const angle = progress * Math.PI * 2 * turns;
                    const radius = progress * maxRadius;
                    const amplitude = (timeData[i] / 128.0 - 1) * 30;
                    const currentRadius = radius + amplitude;
                    const x = centerX + Math.cos(angle) * currentRadius;
                    const y = centerY + Math.sin(angle) * currentRadius;
                    points.push({ x, y, type: 'spiral' });
                }
                break;
            }
            case 'spectrum': {
                const baseRadius = Math.min(this.width, this.height) * 0.2;
                const bands = 64;
                for (let i = 0; i < bands; i++) {
                    const freqIndex = Math.floor((i / bands) * bufferLength);
                    const energy = frequencyData[freqIndex] / 255;
                    const radius = baseRadius + (energy * baseRadius * 2);
                    const angle = (i / bands) * Math.PI * 2;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    points.push({ x, y, type: 'spectrum', radius: 3 + energy * 5 });
                }
                break;
            }
            case 'particles': {
                const particleCount = 100;
                for (let i = 0; i < particleCount; i++) {
                    const freqIndex = Math.floor((i / particleCount) * bufferLength);
                    const energy = frequencyData[freqIndex] / 255;
                    const angle = (i / particleCount) * Math.PI * 2;
                    const distance = (this.width * 0.3) + (energy * this.width * 0.2);
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;
                    points.push({ x, y, type: 'particle', size: 2 + energy * 8 });
                }
                break;
            }
        }

        return points;
    }

    renderMorphedPoints(fromPoints, toPoints, t, metadata) {
        const maxPoints = Math.max(fromPoints.length, toPoints.length);
        const morphedPoints = [];

        for (let i = 0; i < maxPoints; i++) {
            const fromIdx = Math.floor((i / maxPoints) * fromPoints.length);
            const toIdx = Math.floor((i / maxPoints) * toPoints.length);
            const from = fromPoints[fromIdx];
            const to = toPoints[toIdx];

            if (from && to) {
                const x = from.x + (to.x - from.x) * t;
                const y = from.y + (to.y - from.y) * t;
                const radius = from.radius !== undefined && to.radius !== undefined ? from.radius + (to.radius - from.radius) * t : undefined;
                const size = from.size !== undefined && to.size !== undefined ? from.size + (to.size - from.size) * t : undefined;
                const height = from.height !== undefined && to.height !== undefined ? from.height + (to.height - from.height) * t : undefined;

                morphedPoints.push({ x, y, radius, size, height, type: from.type || to.type });
            }
        }

        this.ctx.save();
        this.ctx.globalAlpha = 0.7 + t * 0.3;
        const gradient = this.getGradient(metadata, 0, 0, this.width, this.height);
        this.ctx.strokeStyle = gradient;
        this.ctx.fillStyle = gradient;

        this.ctx.beginPath();
        for (let i = 0; i < morphedPoints.length; i++) {
            const p = morphedPoints[i];
            if (i === 0) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        for (const p of morphedPoints) {
            if (p.type === 'particle' || p.type === 'spectrum') {
                const size = p.size || p.radius || 3;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'bar' && p.height !== undefined) {
                this.ctx.fillRect(p.x - 2, p.y, 4, p.height);
            }
        }
        this.ctx.restore();
    }

    renderVisualizer(type, audioData, metadata) {
        switch (type) {
            case 'wave': this.renderWave(audioData, metadata); break;
            case 'circle': this.renderCircleWave(audioData, metadata); break;
            case 'bars': this.renderBars(audioData, metadata); break;
            case 'particles': this.renderParticles(audioData, metadata); break;
            case 'spiral': this.renderSpiral(audioData, metadata); break;
            case 'spectrum': this.renderSpectrumCircle(audioData, metadata); break;
        }
    }

    getGradient(metadata, x1, y1, x2, y2) {
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        if (metadata) {
            const hue = (metadata.spectralCentroid / 1000) % 360;
            const saturation = 70 + (metadata.amplitude * 30);
            const lightness = 50 + (metadata.amplitude * 20);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(0.5, `hsl(${hue + 60}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(1, `hsl(${hue + 120}, ${saturation}%, ${lightness}%)`);
        } else {
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
        }
        return gradient;
    }

    // Existing renderWave, renderCircleWave, renderBars, renderParticles, renderSpiral, renderSpectrumCircle remain unchanged
}