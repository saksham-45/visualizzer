/**
 * Visualizers Module (Integrated with MeshVisualizers, PremiumVisualizers, and FluidVisualizers)
 * Enhanced with Music Intelligence, Beat Effects, and NEW Premium Features
 */
import { MeshVisualizers } from './meshVisualizers.js';
import { PremiumVisualizers } from './premiumVisualizers.js';
import { FluidVisualizers } from './fluidVisualizers.js';
import { MusicIntelligence } from './musicIntelligence.js';
import { BeatEffects } from './beatEffects.js';
import { performanceOptimizer } from './performanceOptimizer.js';
import { sharedSettings } from './sharedSettings.js';

// NEW: Import enhanced visualizer modules
import { ShaderVisualizers } from './shaderVisualizers.js';
import { GPUParticleSystem } from './gpuParticles.js';
import { AIPsychedelicArt } from './aiPsychedelicArt.js';
import { ReactiveTypography } from './reactiveTypography.js';
import { LayerBlendingSystem } from './layerBlending.js';
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

        // Initialize PremiumVisualizers
        this.premiumVisualizer = new PremiumVisualizers(canvas, audioCapture, audioAnalyzer);
        this.premiumTypes = [
            'appleWaveform', 'circularHarmonic', 'frequencyBarGalaxy', 'enhancedTunnel',
            'particleNebula', 'mathematicalSpiral', 'spectrumCircleHalo', 'fractalBloom',
            '3DGeometryShapeshifter', 'hinduGodPsychedelic'
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

        // NEW: Initialize AI Psychedelic Art
        try {
            this.aiArt = new AIPsychedelicArt(canvas);
            console.log('✓ AI psychedelic art initialized');
        } catch (e) {
            console.warn('AI art unavailable:', e);
            this.aiArt = null;
        }

        // NEW: Initialize Reactive Typography
        try {
            this.typography = new ReactiveTypography(canvas);
            console.log('✓ Reactive typography initialized');
        } catch (e) {
            console.warn('Typography unavailable:', e);
            this.typography = null;
        }

        // NEW: Initialize Layer Blending System
        try {
            this.layerBlending = new LayerBlendingSystem(canvas);
            console.log('✓ Layer blending system initialized');
        } catch (e) {
            console.warn('Layer blending unavailable:', e);
            this.layerBlending = null;
        }

        // NEW: Initialize Parameter Control
        this.paramControl = new ParameterControl();
        this.paramControl.load();

        // NEW: Enhanced visualizer types
        this.enhancedTypes = [
            'shader_psychedelicWaves', 'shader_kaleidoscope', 'shader_hypnoticSpiral',
            'shader_electricStorm', 'shader_sacredGeometry',
            'gpuParticles', 'aiPsychedelicArt', 'reactiveTypography',
            'layered_psychedelicStack', 'layered_cosmicDream', 'layered_electricVoid'
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
        if (this.premiumVisualizer?.resize) this.premiumVisualizer.resize();
        if (this.fluidVisualizer?.resize) this.fluidVisualizer.resize();
        if (this.aiArt?.resize) this.aiArt.resize();
        if (this.typography?.resize) this.typography.resize();
        if (this.layerBlending?.resize) this.layerBlending.resize();
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
        
        const audioData = this.audioCapture.getAudioData();
        const metadata = this.audioAnalyzer?.analyze();

        if (!audioData) {
            // Show fallback idle animation (optimized)
            this.ctx.fillStyle = 'rgb(10, 10, 20)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            const now = Date.now() / 1000;
            const pulse = Math.sin(now * 2) * 0.5 + 0.5;
            const color = this.sharedSettings.calculateAudioReactiveColor(null);
            this.ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${pulse * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width / 2, this.height / 2, 50 + pulse * 30, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Waiting for audio...', this.width / 2, this.height - 30);
            
            this.performanceOptimizer.endFrame();
            return;
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

        // Calculate delta time for smooth animations
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        // Delegate based on visualizer type
        // NEW: Handle enhanced visualizers first
        if (visualizerType.startsWith('shader_')) {
            // GPU Shader visualizers
            const shaderType = visualizerType.replace('shader_', '');
            if (this.shaderVisualizer) {
                this.shaderVisualizer.setShader(shaderType);
                const params = this.paramControl.getParams(visualizerType);
                this.shaderVisualizer.setParams(params);
                this.shaderVisualizer.render(audioData, metadata, deltaTime);
                this.ctx.drawImage(this.shaderCanvas, 0, 0, this.width, this.height);
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
        } else if (visualizerType === 'aiPsychedelicArt') {
            // AI Psychedelic Art
            if (this.aiArt) {
                this.aiArt.render(audioData, metadata, deltaTime);
            }
        } else if (visualizerType === 'reactiveTypography') {
            // Reactive Typography
            if (this.typography) {
                const params = this.paramControl.getParams('reactiveTypography');
                this.typography.setParams(params);
                this.typography.render(audioData, metadata, deltaTime);
            }
        } else if (visualizerType.startsWith('layered_')) {
            // Layered presets
            const presetName = visualizerType.replace('layered_', '');
            this.renderLayeredPreset(presetName, audioData, metadata, deltaTime);
        } else if (this.fluidTypes.includes(visualizerType)) {
            // Fluid visualizers (WebGL2)
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
        
        // Performance optimization - end frame
        this.performanceOptimizer.endFrame();
    }

    /**
     * Render a layered preset combining multiple visualizers
     */
    renderLayeredPreset(presetName, audioData, metadata, deltaTime) {
        const presets = {
            psychedelicStack: [
                { type: 'shader', shader: 'psychedelicWaves', blend: 'source-over', opacity: 1.0 },
                { type: 'particles', blend: 'screen', opacity: 0.6 },
                { type: 'typography', blend: 'overlay', opacity: 0.5 }
            ],
            cosmicDream: [
                { type: 'shader', shader: 'hypnoticSpiral', blend: 'source-over', opacity: 1.0 },
                { type: 'particles', blend: 'screen', opacity: 0.5 }
            ],
            electricVoid: [
                { type: 'shader', shader: 'electricStorm', blend: 'source-over', opacity: 1.0 },
                { type: 'particles', blend: 'screen', opacity: 0.7 }
            ]
        };

        const layers = presets[presetName];
        if (!layers) {
            // Fallback
            if (this.shaderVisualizer) {
                this.shaderVisualizer.setShader('psychedelicWaves');
                this.shaderVisualizer.render(audioData, metadata, deltaTime);
                this.ctx.drawImage(this.shaderCanvas, 0, 0, this.width, this.height);
            }
            return;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Render each layer
        for (const layer of layers) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = layer.blend;
            this.ctx.globalAlpha = layer.opacity;

            switch (layer.type) {
                case 'shader':
                    if (this.shaderVisualizer) {
                        this.shaderVisualizer.setShader(layer.shader);
                        this.shaderVisualizer.render(audioData, metadata, deltaTime);
                        this.ctx.drawImage(this.shaderCanvas, 0, 0, this.width, this.height);
                    }
                    break;

                case 'particles':
                    if (this.gpuParticles) {
                        // Clear particle canvas before rendering
                        const pCtx = this.particleCanvas.getContext('2d');
                        if (pCtx) pCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
                        this.gpuParticles.render(audioData, metadata, deltaTime);
                        this.ctx.drawImage(this.particleCanvas, 0, 0, this.width, this.height);
                    }
                    break;

                case 'aiArt':
                    if (this.aiArt) {
                        this.aiArt.render(audioData, metadata, deltaTime);
                    }
                    break;

                case 'typography':
                    if (this.typography) {
                        this.typography.render(audioData, metadata, deltaTime);
                    }
                    break;
            }

            this.ctx.restore();
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
