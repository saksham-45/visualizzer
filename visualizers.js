/**
 * Visualizers Module (Integrated with MeshVisualizers)
 */
import { MeshVisualizers } from './meshVisualizers.js';

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
        this.meshTypes = ['wave', 'bars', 'flowing', 'spiral', 'tornado', 'cyclone', 'ripple', 'morphing', 'trippy'];

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
        if (this.currentVisualizer === type) return;

        this.previousVisualizer = this.currentVisualizer;
        this.targetVisualizer = type;
        this.transitionProgress = 0;

        const transitionDuration = 2000;
        const startTime = Date.now();

        const animateTransition = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = elapsed / transitionDuration;
            this.transitionProgress = this.easeInOutCubic(Math.min(rawProgress, 1));

            if (this.transitionProgress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.currentVisualizer = type;
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
        if (!audioData) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            return;
        }

        const metadata = this.audioAnalyzer.analyze();
        const visualizerType = this.targetVisualizer || this.currentVisualizer;

        // Clear canvas
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Mesh visualizers delegation
        if (this.meshTypes.includes(visualizerType)) {
            this.meshVisualizer.setVisualizer(visualizerType);
            this.meshVisualizer.render();
        } else {
            // Regular visualizers
            if (this.targetVisualizer && this.previousVisualizer && this.transitionProgress < 1) {
                this.renderMorphingTransition(audioData, metadata);
            } else {
                this.renderVisualizer(visualizerType, audioData, metadata);
            }
        }
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