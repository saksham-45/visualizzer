/**
 * Enhanced Visualizer System
 * Integrates all new premium features: shaders, GPU particles, AI art, typography, layer blending
 */

import { ShaderVisualizers } from './shaderVisualizers.js';
import { GPUParticleSystem } from './gpuParticles.js';
import { AIPsychedelicArt } from './aiPsychedelicArt.js';
import { ReactiveTypography } from './reactiveTypography.js';
import { LayerBlendingSystem } from './layerBlending.js';
import { ParameterControl } from './parameterControl.js';

export class EnhancedVisualizerSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Initialize subsystems
        this.shaderViz = null;
        this.gpuParticles = null;
        this.aiArt = null;
        this.typography = null;
        this.layerBlending = null;
        this.paramControl = new ParameterControl();

        // State
        this.currentMode = 'shader'; // shader, particles, aiArt, typography, layered
        this.currentSubType = 'psychedelicWaves';
        this.isInitialized = false;
        this.animationId = null;
        this.lastTime = 0;

        // Shader canvas (separate WebGL context)
        this.shaderCanvas = document.createElement('canvas');
        this.particleCanvas = document.createElement('canvas');

        // Available visualizers
        this.visualizerTypes = {
            shaders: ['psychedelicWaves', 'kaleidoscope', 'hypnoticSpiral', 'electricStorm', 'sacredGeometry'],
            other: ['gpuParticles', 'aiPsychedelicArt', 'reactiveTypography'],
            layered: ['psychedelicStack', 'cosmicDream', 'electricVoid']
        };

        // Load saved parameters
        this.paramControl.load();
    }

    async initialize() {
        if (this.isInitialized) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Set up shader canvas
        this.shaderCanvas.width = w;
        this.shaderCanvas.height = h;

        // Set up particle canvas
        this.particleCanvas.width = w;
        this.particleCanvas.height = h;

        try {
            // Initialize shader visualizers
            this.shaderViz = new ShaderVisualizers(this.shaderCanvas);
            console.log('✓ Shader visualizers initialized');
            console.log('  Available shaders:', this.shaderViz.getAvailableShaders());
        } catch (e) {
            console.warn('Shader visualizers unavailable:', e);
        }

        try {
            // Initialize GPU particle system
            this.gpuParticles = new GPUParticleSystem(this.particleCanvas);
            console.log('✓ GPU particle system initialized');
        } catch (e) {
            console.warn('GPU particles unavailable:', e);
        }

        try {
            // Initialize AI art generator
            this.aiArt = new AIPsychedelicArt(this.canvas);
            console.log('✓ AI psychedelic art initialized');
        } catch (e) {
            console.warn('AI art unavailable:', e);
        }

        try {
            // Initialize reactive typography
            this.typography = new ReactiveTypography(this.canvas);
            console.log('✓ Reactive typography initialized');
        } catch (e) {
            console.warn('Typography unavailable:', e);
        }

        try {
            // Initialize layer blending system
            this.layerBlending = new LayerBlendingSystem(this.canvas);
            console.log('✓ Layer blending system initialized');
        } catch (e) {
            console.warn('Layer blending unavailable:', e);
        }

        this.isInitialized = true;
        console.log('✓ Enhanced visualizer system ready');
    }

    resize() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.shaderCanvas.width = w;
        this.shaderCanvas.height = h;
        this.particleCanvas.width = w;
        this.particleCanvas.height = h;

        if (this.shaderViz) this.shaderViz.resize?.();
        if (this.gpuParticles) this.gpuParticles.resize?.();
        if (this.aiArt) this.aiArt.resize?.();
        if (this.typography) this.typography.resize?.();
        if (this.layerBlending) this.layerBlending.resize?.();
    }

    /**
     * Set the current visualizer mode
     * @param {string} mode - shader, particles, aiArt, typography, layered
     * @param {string} subType - specific visualizer within mode
     */
    setMode(mode, subType = null) {
        this.currentMode = mode;

        switch (mode) {
            case 'shader':
                if (subType && this.shaderViz) {
                    this.shaderViz.setShader(subType);
                    this.currentSubType = subType;
                }
                break;

            case 'particles':
                this.currentSubType = 'gpuParticles';
                break;

            case 'aiArt':
                this.currentSubType = 'aiPsychedelicArt';
                break;

            case 'typography':
                if (subType && this.typography) {
                    this.typography.setParams({ style: subType });
                }
                this.currentSubType = 'reactiveTypography';
                break;

            case 'layered':
                this.setupLayeredMode(subType || 'psychedelicStack');
                this.currentSubType = subType || 'psychedelicStack';
                break;
        }

        // Apply parameters
        this.applyCurrentParams();
    }

    /**
     * Set up layered mode with preset
     */
    setupLayeredMode(presetName) {
        if (!this.layerBlending) return;

        const presets = LayerBlendingSystem.getPresets();
        const preset = presets[presetName];

        if (!preset) return;

        // Clear existing layers
        for (let i = 0; i < 4; i++) {
            this.layerBlending.removeLayer(i);
        }

        // Set up layers based on preset
        preset.forEach((config, index) => {
            let visualizer = null;

            switch (config.visualizerType) {
                case 'shaderPsychedelicWaves':
                case 'shaderKaleidoscope':
                case 'shaderElectricStorm':
                case 'shaderSacredGeometry':
                    if (this.shaderViz) {
                        // Create a wrapper for shader visualizer
                        const shaderType = config.visualizerType.replace('shader', '').charAt(0).toLowerCase() +
                            config.visualizerType.replace('shader', '').slice(1);
                        visualizer = {
                            canvas: this.shaderCanvas,
                            render: (audioData, metadata, dt) => {
                                this.shaderViz.setShader(shaderType);
                                this.shaderViz.render(audioData, metadata, dt);
                            }
                        };
                    }
                    break;

                case 'gpuParticles':
                    if (this.gpuParticles) {
                        visualizer = {
                            canvas: this.particleCanvas,
                            render: (audioData, metadata, dt) => {
                                this.gpuParticles.render(audioData, metadata, dt);
                            }
                        };
                    }
                    break;

                case 'aiPsychedelicArt':
                    visualizer = this.aiArt;
                    break;

                case 'reactiveTypography':
                    visualizer = this.typography;
                    break;
            }

            if (visualizer) {
                this.layerBlending.setLayer(index, visualizer, {
                    blendMode: config.blendMode,
                    opacity: config.opacity,
                    enabled: config.enabled
                });
            }
        });
    }

    /**
     * Apply current parameters to active visualizer
     */
    applyCurrentParams() {
        const params = this.paramControl.getParams(this.currentSubType);

        switch (this.currentMode) {
            case 'shader':
                if (this.shaderViz) this.shaderViz.setParams(params);
                break;
            case 'particles':
                if (this.gpuParticles) this.gpuParticles.setParams(params);
                break;
            case 'aiArt':
                // AI art params are applied during render
                break;
            case 'typography':
                if (this.typography) this.typography.setParams(params);
                break;
        }
    }

    /**
     * Start cross-fade transition to new visualizer
     */
    transitionTo(mode, subType, duration = 1.5) {
        if (!this.layerBlending) {
            this.setMode(mode, subType);
            return;
        }

        // Create wrapper for current visualizer
        const fromViz = this.createVisualizerWrapper(this.currentMode, this.currentSubType);

        // Set new mode
        this.setMode(mode, subType);

        // Create wrapper for new visualizer
        const toViz = this.createVisualizerWrapper(mode, subType);

        // Start transition
        this.layerBlending.startTransition(fromViz, toViz, duration);
    }

    /**
     * Create a wrapper object for a visualizer
     */
    createVisualizerWrapper(mode, subType) {
        const self = this;
        return {
            canvas: this.canvas,
            render: (audioData, metadata, dt) => {
                self.renderSingle(mode, subType, audioData, metadata, dt);
            }
        };
    }

    /**
     * Render a single visualizer mode
     */
    renderSingle(mode, subType, audioData, metadata, deltaTime) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        switch (mode) {
            case 'shader':
                if (this.shaderViz) {
                    this.shaderViz.setShader(subType);
                    this.shaderViz.render(audioData, metadata, deltaTime);
                    ctx.drawImage(this.shaderCanvas, 0, 0, w, h);
                }
                break;

            case 'particles':
                if (this.gpuParticles) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, w, h);
                    this.gpuParticles.render(audioData, metadata, deltaTime);
                    ctx.drawImage(this.particleCanvas, 0, 0, w, h);
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
    }

    /**
     * Main render function
     */
    render(audioData, metadata, deltaTime = 0.016) {
        if (!this.isInitialized) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Handle layered mode
        if (this.currentMode === 'layered' && this.layerBlending) {
            this.layerBlending.render(audioData, metadata, deltaTime);
            return;
        }

        // Handle transition
        if (this.layerBlending?.isTransitioning) {
            this.layerBlending.render(audioData, metadata, deltaTime);
            return;
        }

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Render current mode
        this.renderSingle(this.currentMode, this.currentSubType, audioData, metadata, deltaTime);
    }

    /**
     * Get all available visualizer options
     */
    getAvailableVisualizers() {
        return {
            shaders: this.shaderViz?.getAvailableShaders() || [],
            particles: this.gpuParticles ? ['gpuParticles'] : [],
            aiArt: this.aiArt ? ['aiPsychedelicArt'] : [],
            typography: this.typography ? ['wave', 'explode', 'pulse', 'rainbow'] : [],
            layered: Object.keys(LayerBlendingSystem.getPresets())
        };
    }

    /**
     * Create parameter UI
     */
    createParameterUI(container) {
        this.paramControl.createUI(container, this.currentSubType);

        // Add listener to update visualizer when params change
        this.paramControl.addListener((change) => {
            if (change.visualizerType === this.currentSubType) {
                this.applyCurrentParams();
            }
        });
    }

    /**
     * Set AI API configuration
     */
    setAIConfig(endpoint, apiKey) {
        if (this.aiArt) {
            this.aiArt.setApiEndpoint(endpoint, apiKey);
        }
    }

    /**
     * Set lyrics for typography
     */
    setLyrics(lyrics) {
        if (this.typography) {
            this.typography.setLyrics(lyrics);
        }
    }

    /**
     * Save current configuration
     */
    saveConfig() {
        this.paramControl.save();
    }

    /**
     * Destroy all resources
     */
    destroy() {
        if (this.shaderViz) this.shaderViz.destroy();
        if (this.gpuParticles) this.gpuParticles.destroy();
        if (this.aiArt) this.aiArt.destroy();
        if (this.typography) this.typography.destroy();
        if (this.layerBlending) this.layerBlending.destroy();

        this.isInitialized = false;
    }
}

// Export individual modules for direct use
export { ShaderVisualizers } from './shaderVisualizers.js';
export { GPUParticleSystem } from './gpuParticles.js';
export { AIPsychedelicArt } from './aiPsychedelicArt.js';
export { ReactiveTypography } from './reactiveTypography.js';
export { LayerBlendingSystem } from './layerBlending.js';
export { ParameterControl } from './parameterControl.js';
