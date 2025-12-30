/**
 * Visualizers Module (Integrated with MeshVisualizers, PremiumVisualizers, and FluidVisualizers)
 * Enhanced with Music Intelligence, Beat Effects, and NEW Premium Features
 */
import { MeshVisualizers } from './meshVisualizers.js';
import { FluidVisualizers } from './fluidVisualizers.js';
import { MusicIntelligence } from './musicIntelligence.js';
import { BeatEffects } from './beatEffects.js';
import { performanceOptimizer } from './performanceOptimizer.js';
import { sharedSettings } from './sharedSettings.js';

// NEW: Import enhanced visualizer modules
import { ShaderVisualizers } from './shaderVisualizers.js';
import { GPUParticleSystem } from './gpuParticles.js';
import { ParameterControl } from './parameterControl.js';

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

        // Performance optimization
        this.performanceOptimizer = performanceOptimizer;
        this.performanceOptimizer.setCanvasContext(this.ctx);
        
        // Shared settings
        this.sharedSettings = sharedSettings;
        
        // Initialize MeshVisualizers
        this.meshVisualizer = new MeshVisualizers(canvas, audioCapture, audioAnalyzer);
        this.meshTypes = [
            'wave', 'bars', 'flowing', 'spiral', 'tornado', 'cyclone', 'ripple', 'morphing', 'trippy',
            'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid',
            'spiral1', 'spiral2', 'spiral3', 'spiral4', 'tracing', 'crossing', 'combined', 'kaleidoscope', 'mandala', 'fractal'
        ];

        // Initialize FluidVisualizers (WebGL2 fluid simulation)
        this.fluidVisualizer = new FluidVisualizers(canvas, audioCapture, audioAnalyzer);
        this.fluidTypes = FluidVisualizers.getTypes();

        // Initialize Music Intelligence (predictive audio analysis)
        this.musicIntelligence = new MusicIntelligence(audioAnalyzer);
        this.intelligenceState = null;

        // Initialize Beat Effects (spectacular beat-synced effects)
        this.beatEffects = new BeatEffects(canvas);

        // NEW: Initialize GPU Shader Visualizers
        this.shaderCanvas = document.createElement('canvas');
        this.shaderCanvas.width = canvas.width;
        this.shaderCanvas.height = canvas.height;
        try {
            this.shaderVisualizer = new ShaderVisualizers(this.shaderCanvas);
            this.shaderTypes = this.shaderVisualizer.getAvailableShaders();
            console.log('✓ Shader visualizers initialized:', this.shaderTypes);
        } catch (e) {
            console.warn('Shader visualizers unavailable:', e);
            this.shaderVisualizer = null;
            this.shaderTypes = [];
        }

        // NEW: Initialize GPU Particle System
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.width = canvas.width;
        this.particleCanvas.height = canvas.height;
        try {
            this.gpuParticles = new GPUParticleSystem(this.particleCanvas);
            console.log('✓ GPU particle system initialized');
        } catch (e) {
            console.warn('GPU particles unavailable:', e);
            this.gpuParticles = null;
        }

        // NEW: Initialize Parameter Control
        this.paramControl = new ParameterControl();
        this.paramControl.load();

        // NEW: Enhanced visualizer types
        this.enhancedTypes = [
            'shader_psychedelicWaves', 'shader_kaleidoscope', 'shader_hypnoticSpiral',
            'shader_electricStorm',
            'gpuParticles'
        ];

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

        // Last frame time for delta calculation
        this.lastFrameTime = performance.now();

        // Resize canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this._syntheticAudio = null;

        this._postCanvas = document.createElement('canvas');
        this._postCtx = this._postCanvas.getContext('2d');
        this._grainCanvas = document.createElement('canvas');
        this._grainCanvas.width = 128;
        this._grainCanvas.height = 128;
        this._grainCtx = this._grainCanvas.getContext('2d');
        this._grainFrame = 0;
    }

    _updateGrain() {
        this._grainFrame++;
        if (this._grainFrame % 3 !== 0) return;
        const w = this._grainCanvas.width;
        const h = this._grainCanvas.height;
        const img = this._grainCtx.createImageData(w, h);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
        }
        this._grainCtx.putImageData(img, 0, 0);
    }

    _applyUnifiedGrade(metadata) {
        if (!this._postCtx) return;

        const w = this.width;
        const h = this.height;
        const dpr = window.devicePixelRatio || 1;

        this._postCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._postCtx.clearRect(0, 0, this._postCanvas.width, this._postCanvas.height);
        this._postCtx.drawImage(this.canvas, 0, 0);

        const amp = metadata?.amplitude || 0;
        const bass = metadata?.energyBands?.bass?.peak || 0;
        const centroid = metadata?.spectralCentroid || 2000;
        const hue = (centroid / 20) % 360;

        this._updateGrain();

        this.ctx.save();
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const bloomBlur = 10 + amp * 18 + bass * 10;
        const bloomAlpha = 0.14 + amp * 0.22;
        const sat = 1.15 + amp * 0.9;

        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.globalAlpha = bloomAlpha;
        this.ctx.filter = `blur(${bloomBlur}px) saturate(${sat}) contrast(1.08)`;
        this.ctx.drawImage(this._postCanvas, 0, 0, w, h);

        this.ctx.globalAlpha = 0.05 + amp * 0.06;
        this.ctx.filter = `blur(1px) saturate(1.2) hue-rotate(18deg)`;
        this.ctx.drawImage(this._postCanvas, -1, 0, w, h);
        this.ctx.filter = `blur(1px) saturate(1.2) hue-rotate(-18deg)`;
        this.ctx.drawImage(this._postCanvas, 1, 0, w, h);

        this.ctx.filter = 'none';
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.globalAlpha = 0.9;
        const vignette = this.ctx.createRadialGradient(
            w / 2,
            h / 2,
            Math.min(w, h) * 0.15,
            w / 2,
            h / 2,
            Math.max(w, h) * 0.75
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(0.75, 'rgba(0,0,0,0.08)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.70)');
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.globalCompositeOperation = 'soft-light';
        this.ctx.globalAlpha = 0.10 + amp * 0.06;
        const grade = this.ctx.createLinearGradient(0, 0, w, h);
        grade.addColorStop(0, `hsla(${(hue + 20) % 360}, 90%, 60%, 0.15)`);
        grade.addColorStop(0.5, `hsla(${(hue + 120) % 360}, 95%, 55%, 0.12)`);
        grade.addColorStop(1, `hsla(${(hue + 220) % 360}, 90%, 50%, 0.15)`);
        this.ctx.fillStyle = grade;
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.035;
        this.ctx.drawImage(this._grainCanvas, 0, 0, w, h);

        this.ctx.restore();
    }

    _getSyntheticAudioData() {
        // Lightweight always-available audio buffer for rendering when capture is unavailable.
        const bufferLength = 1024;
        if (!this._syntheticAudio || this._syntheticAudio.bufferLength !== bufferLength) {
            this._syntheticAudio = {
                bufferLength,
                frequencyData: new Uint8Array(bufferLength),
                timeData: new Uint8Array(bufferLength),
                sampleRate: 44100,
                fftSize: 2048
            };
        }

        const t = performance.now() * 0.001;
        for (let i = 0; i < bufferLength; i++) {
            const phase = (i / bufferLength) * Math.PI * 2;
            const wave = Math.sin(phase * 2 + t * 2);
            this._syntheticAudio.timeData[i] = 128 + Math.floor(wave * 20);

            const band = Math.max(0, Math.sin(phase * 6 + t * 1.5));
            this._syntheticAudio.frequencyData[i] = Math.floor(band * 90);
        }

        return this._syntheticAudio;
    }

    _deriveMetadataFromAudioData(audioData) {
        const { frequencyData, timeData, bufferLength } = audioData;
        let amp = 0;
        for (let i = 0; i < bufferLength; i += 4) {
            amp += Math.abs((timeData[i] - 128) / 128);
        }
        const amplitude = Math.min(1, amp / (bufferLength / 4));

        const bandPeak = (startFrac, endFrac) => {
            const start = Math.floor(bufferLength * startFrac);
            const end = Math.floor(bufferLength * endFrac);
            let peak = 0;
            let sum = 0;
            let n = 0;
            for (let i = start; i < end; i++) {
                const v = (frequencyData[i] || 0) / 255;
                if (v > peak) peak = v;
                sum += v;
                n++;
            }
            return { peak, avg: n ? sum / n : 0, transient: 0 };
        };

        return {
            amplitude,
            spectralCentroid: 2000,
            rhythm: { beat: false },
            energyBands: {
                subBass: bandPeak(0.00, 0.08),
                bass: bandPeak(0.08, 0.20),
                mid: bandPeak(0.20, 0.55),
                treble: bandPeak(0.55, 1.00)
            }
        };
    }

    resize() {
        // Force the visualizer to always match the full viewport instead of
        // relying on layout / bounding boxes, which could make it appear as
        // a smaller canvas in the top‑left on some setups.
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Ensure CSS also matches full‑screen so getBoundingClientRect stays consistent
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0px';
        this.canvas.style.left = '0px';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';

        // Reset transform before setting new dimensions to prevent accumulation
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = width;
        this.height = height;

        if (this._postCanvas) {
            this._postCanvas.width = this.canvas.width;
            this._postCanvas.height = this.canvas.height;
        }

        // Resize enhanced visualizer canvases
        if (this.shaderCanvas) {
            this.shaderCanvas.width = this.canvas.width;
            this.shaderCanvas.height = this.canvas.height;
        }
        if (this.particleCanvas) {
            this.particleCanvas.width = this.canvas.width;
            this.particleCanvas.height = this.canvas.height;
        }
        
        // Resize sub-visualizers
        if (this.meshVisualizer?.resize) this.meshVisualizer.resize();
        if (this.fluidVisualizer?.resize) this.fluidVisualizer.resize();
    }

    setVisualizer(type) {
        // Alias depthlines to new 3D tunnel
        if (type === 'depthlines') type = 'tunnel';

        if (this.currentVisualizer === type) return;

        // FIX: If already transitioning, snap to the current target immediately 
        // to prevent "flickering" or a "third visualizer" showing during overlapping transitions.
        if (this.transitionProgress < 1 && this.targetVisualizer) {
            this._snapToVisualizer();
        }

        this.previousVisualizer = this.currentVisualizer;
        this.targetVisualizer = type;
        this.currentVisualizer = type; // Set immediately so rendering starts
        this.transitionProgress = 0;

        const transitionDuration = 500; // Shorter transition
        const startTime = Date.now();

        const animateTransition = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = elapsed / transitionDuration;

            // If target changed while in transition, this loop might be orphaned.
            // Check if we are still working on the correct target.
            if (this.currentVisualizer !== type) return;

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

    _snapToVisualizer() {
        this.transitionProgress = 1;
        this.targetVisualizer = null;
        this.previousVisualizer = null;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    render() {
        // Ensure we have sane dimensions before rendering
        if (!Number.isFinite(this.width) || this.width <= 0 ||
            !Number.isFinite(this.height) || this.height <= 0) {
            this.resize();
        }

        // Performance optimization - begin frame
        this.performanceOptimizer.beginFrame();

        // CRITICAL: Keep DPR scaling stable.
        // Some sub-systems apply transforms (shake/zoom). Always reset to DPR at frame start.
        // If we reset to identity, the browser will render into a DPR-sized backing store
        // but with CSS pixels, causing the "top-left / overflow" bug.
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        let audioData = this.audioCapture.getAudioData();
        let metadata = this.audioAnalyzer?.analyze();

        // If capture is unavailable, keep rendering using synthetic audio.
        if (!audioData) {
            audioData = this._getSyntheticAudioData();
            metadata = metadata || this._deriveMetadataFromAudioData(audioData);
        }

        // Update shared settings based on performance
        const fps = this.performanceOptimizer.fps;
        this.sharedSettings.adjustQualityForPerformance(fps);

        // Update Music Intelligence (if enabled)
        if (this.musicIntelligence && metadata) {
            this.intelligenceState = this.musicIntelligence.update(metadata);

            // Process pending effects from intelligence
            const pendingEffects = this.musicIntelligence.getPendingEffects();
            for (const effect of pendingEffects) {
                this.beatEffects.trigger(effect.type, effect.params);
            }

            // Optimized responsiveness based on performance
            const now = Date.now();
            const intensity = this.intelligenceState.recommendedIntensity;
            const energy = this.intelligenceState.dropProbability || 0;
            const performanceMultiplier = this.performanceOptimizer.effectIntensityMultiplier;

            // Screen Shake on heavy hits (performance-adjusted)
            if (metadata?.energyBands?.bass?.transient > 0.6 || this.intelligenceState.currentSection === 'drop') {
                const shake = ((metadata.energyBands.bass.transient * 15) + (energy * 20)) * performanceMultiplier;
                this.ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
            }

            // Beat effects with performance consideration
            if (metadata?.rhythm?.beat && (now - (this.lastBeatTime || 0) > 300)) {
                this.beatEffects.trigger('beat', {
                    intensity: (metadata.amplitude || 0.5) * 1.5 * performanceMultiplier,
                    x: this.width / 2,
                    y: this.height / 2
                });
                this.lastBeatTime = now;
            }

            // High amplitude triggers flash (performance-adjusted)
            if (metadata?.energyBands?.bass?.transient > 0.8 || metadata?.amplitude > 0.9) {
                const color = this.sharedSettings.calculateAudioReactiveColor(metadata);
                this.beatEffects.trigger('flash', {
                    intensity: metadata.amplitude * 0.4 * performanceMultiplier,
                    color: { h: color.h, s: color.s, l: color.l }
                });
            }

            // Significant bass triggers shockwave (performance-adjusted)
            if (metadata?.energyBands?.bass?.peak > 0.95) {
                if (now - (this.lastShockwaveTime || 0) > 1000) {
                    this.beatEffects.trigger('shockwave', {
                        intensity: 0.8 * performanceMultiplier,
                        x: this.width / 2,
                        y: this.height / 2
                    });
                    this.lastShockwaveTime = now;
                }
            }

            // Trigger drop effect if drop detected
            if (this.intelligenceState?.currentSection === 'drop') {
                if (!this._lastDropTime || Date.now() - this._lastDropTime > 500) {
                    this.beatEffects.trigger('drop', {
                        intensity: 1.0,
                        x: this.width / 2,
                        y: this.height / 2
                    });
                    this._lastDropTime = Date.now();
                }
            }

            // Update camera state based on intelligence recommendations
            const cameraRec = this.musicIntelligence.getCameraRecommendation(Date.now());
            // Boost zoom for dramatic effect
            this.cameraState.targetZoom = cameraRec.zoom * (1 + (metadata.amplitude * 0.2));

            const spreadRec = this.musicIntelligence.getSpreadRecommendation();
            this.cameraState.targetSpread = spreadRec.spread;
        }

        // Smooth camera state transitions with NaN safety
        this.cameraState.zoom += (this.cameraState.targetZoom - this.cameraState.zoom) * 0.05;
        this.cameraState.spread += (this.cameraState.targetSpread - this.cameraState.spread) * 0.05;

        if (isNaN(this.cameraState.zoom)) this.cameraState.zoom = 1.0;
        if (isNaN(this.cameraState.spread)) this.cameraState.spread = 1.0;

        // Update beat effects
        this.beatEffects.update(0.016, metadata);
        this.beatEffects.resize(this.width, this.height);

        // Ensure we always have a valid visualizer type.
        // If this is null/undefined, string ops like startsWith() will throw and the app will render nothing.
        let visualizerType = this.targetVisualizer || this.currentVisualizer;
        if (typeof visualizerType !== 'string' || visualizerType.length === 0) {
            // Prefer a shader ONLY if we actually have a WebGL context.
            // (ShaderVisualizers can exist with gl=null; in that case shaders render nothing.)
            const hasWebGL = !!(this.shaderVisualizer && this.shaderVisualizer.gl);
            visualizerType = hasWebGL ? 'shader_psychedelicWaves' : 'wave';
            this.currentVisualizer = visualizerType;
        }

        // Clear canvas.
        // For Three.js fluid visualizers, the background is rendered on a separate WebGL canvas
        // behind this 2D canvas. Painting a black trail here would hide the 3D scene.
        if (this.fluidTypes.includes(visualizerType)) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        } else {
            // Slight trail for 2D-only visualizers
            this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Apply camera zoom transform if significant
        if (Math.abs(this.cameraState.zoom - 1.0) > 0.01) {
            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(this.cameraState.zoom, this.cameraState.zoom);
            this.ctx.translate(-this.width / 2, -this.height / 2);
        }

        // Calculate delta time for smooth animations
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        // Delegate based on visualizer type
        // NEW: Handle enhanced visualizers first
        if (typeof visualizerType === 'string' && visualizerType.startsWith('shader_') && this.shaderVisualizer?.gl) {
            // GPU Shader visualizers
            const shaderType = visualizerType.replace('shader_', '');
            if (this.shaderVisualizer) {
                this.shaderVisualizer.setShader(shaderType);
                const params = this.paramControl.getParams(visualizerType);
                this.shaderVisualizer.setParams(params);
                try {
                    this.shaderVisualizer.render(audioData, metadata, deltaTime);
                    this.ctx.drawImage(this.shaderCanvas, 0, 0, this.width, this.height);
                } catch (e) {
                    console.error('[Visualizers] Shader render failed:', shaderType, e);
                }
            }
        } else if (visualizerType === 'gpuParticles') {
            // GPU Particle system
            if (this.gpuParticles) {
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, this.width, this.height);
                const params = this.paramControl.getParams('gpuParticles');
                this.gpuParticles.setParams(params);
                this.gpuParticles.render(audioData, metadata, deltaTime);
                this.ctx.drawImage(this.particleCanvas, 0, 0, this.width, this.height);
            }
        } else if (typeof visualizerType === 'string' && visualizerType.startsWith('shader_') && !this.shaderVisualizer?.gl) {
            // Shader selected but WebGL is unavailable: fall back to a 2D mesh visualizer.
            this.meshVisualizer.setVisualizer('wave');
            this.meshVisualizer.render();
        } else if (this.fluidTypes.includes(visualizerType)) {
            // Fluid visualizers (WebGL2)
            this.fluidVisualizer.render(visualizerType, audioData, metadata);
        } else if (this.meshTypes.includes(visualizerType)) {
            // Mesh visualizers
            this.meshVisualizer.setVisualizer(visualizerType);
            this.meshVisualizer.render();
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

        this._applyUnifiedGrade(metadata);
        
        // Performance optimization - end frame
        this.performanceOptimizer.endFrame();
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

    // ============================================
    // BASIC VISUALIZER RENDER METHODS
    // ============================================

    renderWave(audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const amplitude = (metadata?.amplitude || 0.5) * this.height * 0.4;
        const centerY = this.height / 2;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.getGradient(metadata, 0, 0, this.width, 0);
        this.ctx.lineWidth = 3;
        
        for (let i = 0; i < bufferLength; i++) {
            const x = (i / bufferLength) * this.width;
            const v = timeData[i] / 128.0 - 1;
            const y = centerY + v * amplitude;
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        
        this.ctx.stroke();
    }

    renderCircleWave(audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const baseRadius = Math.min(this.width, this.height) * 0.2;
        const amplitude = (metadata?.amplitude || 0.5) * baseRadius;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.getGradient(metadata, centerX - baseRadius, centerY, centerX + baseRadius, centerY);
        this.ctx.lineWidth = 3;
        
        for (let i = 0; i <= bufferLength; i++) {
            const angle = (i / bufferLength) * Math.PI * 2;
            const dataIndex = i % bufferLength;
            const v = (timeData[dataIndex] / 128.0 - 1) * amplitude;
            const radius = baseRadius + v;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }

    renderBars(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const barCount = 64;
        const barWidth = this.width / barCount * 0.8;
        const gap = this.width / barCount * 0.2;
        
        const gradient = this.getGradient(metadata, 0, this.height, 0, 0);
        this.ctx.fillStyle = gradient;
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
            const barHeight = (frequencyData[dataIndex] / 255) * this.height * 0.8;
            const x = i * (barWidth + gap);
            const y = this.height - barHeight;
            
            this.ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    renderParticles(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            const dataIndex = Math.floor((i / particleCount) * (bufferLength / 2));
            const energy = frequencyData[dataIndex] / 255;
            const angle = (i / particleCount) * Math.PI * 2 + (metadata?.spectralCentroid || 0) * 0.001;
            const distance = (this.width * 0.15) + (energy * this.width * 0.25);
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const size = 2 + energy * 8;
            
            const hue = ((i / particleCount) * 360 + (metadata?.spectralCentroid || 0) / 10) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + energy * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderSpiral(audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.4;
        const turns = 3;
        const points = 200;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.getGradient(metadata, centerX - maxRadius, centerY, centerX + maxRadius, centerY);
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < points; i++) {
            const progress = i / points;
            const angle = progress * Math.PI * 2 * turns;
            const baseRadius = progress * maxRadius;
            const dataIndex = Math.floor(progress * bufferLength);
            const amplitude = (timeData[dataIndex] / 128.0 - 1) * maxRadius * 0.2;
            const radius = baseRadius + amplitude;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        
        this.ctx.stroke();
    }

    renderSpectrumCircle(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const baseRadius = Math.min(this.width, this.height) * 0.15;
        const bands = 64;
        
        for (let i = 0; i < bands; i++) {
            const dataIndex = Math.floor((i / bands) * (bufferLength / 2));
            const energy = frequencyData[dataIndex] / 255;
            const angle = (i / bands) * Math.PI * 2;
            const barLength = energy * Math.min(this.width, this.height) * 0.3;
            
            const x1 = centerX + Math.cos(angle) * baseRadius;
            const y1 = centerY + Math.sin(angle) * baseRadius;
            const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
            const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);
            
            const hue = ((i / bands) * 360 + (metadata?.spectralCentroid || 0) / 10) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.7 + energy * 0.3})`;
            this.ctx.lineWidth = 3 + energy * 5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
}
