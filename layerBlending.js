/**
 * Layer Blending System
 * Composites multiple visualizers with various blend modes
 * Enables cross-fade transitions and multi-layer effects
 */

export class LayerBlendingSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Layer canvases for compositing
        this.layers = [];
        this.maxLayers = 4;

        // Transition state
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 1.5; // seconds
        this.transitionFrom = null;
        this.transitionTo = null;

        // Blend modes available
        this.blendModes = [
            'source-over', 'multiply', 'screen', 'overlay',
            'darken', 'lighten', 'color-dodge', 'color-burn',
            'hard-light', 'soft-light', 'difference', 'exclusion',
            'hue', 'saturation', 'color', 'luminosity'
        ];

        // Layer configuration
        this.layerConfig = [];

        this.initializeLayers();
    }

    initializeLayers() {
        for (let i = 0; i < this.maxLayers; i++) {
            const layerCanvas = document.createElement('canvas');
            layerCanvas.width = this.canvas.width;
            layerCanvas.height = this.canvas.height;

            this.layers.push({
                canvas: layerCanvas,
                ctx: layerCanvas.getContext('2d'),
                visualizer: null,
                blendMode: 'source-over',
                opacity: 1.0,
                enabled: false,
                params: {}
            });

            this.layerConfig.push({
                visualizerType: null,
                blendMode: 'source-over',
                opacity: 1.0,
                enabled: false
            });
        }
    }

    resize() {
        this.layers.forEach(layer => {
            layer.canvas.width = this.canvas.width;
            layer.canvas.height = this.canvas.height;
            if (layer.visualizer?.resize) layer.visualizer.resize();
        });
    }

    /**
     * Set a visualizer for a specific layer
     * @param {number} layerIndex - Layer index (0-3)
     * @param {object} visualizer - Visualizer instance with render() method
     * @param {object} options - { blendMode, opacity, enabled }
     */
    setLayer(layerIndex, visualizer, options = {}) {
        if (layerIndex < 0 || layerIndex >= this.maxLayers) return;

        const layer = this.layers[layerIndex];
        layer.visualizer = visualizer;
        layer.blendMode = options.blendMode || 'source-over';
        layer.opacity = options.opacity ?? 1.0;
        layer.enabled = options.enabled ?? true;
        layer.params = options.params || {};

        this.layerConfig[layerIndex] = {
            visualizerType: visualizer?.constructor?.name || null,
            blendMode: layer.blendMode,
            opacity: layer.opacity,
            enabled: layer.enabled
        };
    }

    /**
     * Update layer options
     */
    updateLayer(layerIndex, options) {
        if (layerIndex < 0 || layerIndex >= this.maxLayers) return;

        const layer = this.layers[layerIndex];
        if (options.blendMode !== undefined) layer.blendMode = options.blendMode;
        if (options.opacity !== undefined) layer.opacity = options.opacity;
        if (options.enabled !== undefined) layer.enabled = options.enabled;
        if (options.params) Object.assign(layer.params, options.params);

        this.layerConfig[layerIndex] = {
            ...this.layerConfig[layerIndex],
            blendMode: layer.blendMode,
            opacity: layer.opacity,
            enabled: layer.enabled
        };
    }

    /**
     * Remove a layer
     */
    removeLayer(layerIndex) {
        if (layerIndex < 0 || layerIndex >= this.maxLayers) return;

        const layer = this.layers[layerIndex];
        layer.visualizer = null;
        layer.enabled = false;
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

        this.layerConfig[layerIndex] = {
            visualizerType: null,
            blendMode: 'source-over',
            opacity: 1.0,
            enabled: false
        };
    }

    /**
     * Start a cross-fade transition between visualizers
     */
    startTransition(fromVisualizer, toVisualizer, duration = 1.5) {
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionDuration = duration;
        this.transitionFrom = fromVisualizer;
        this.transitionTo = toVisualizer;

        // Create temporary canvases for transition
        if (!this.transitionFromCanvas) {
            this.transitionFromCanvas = document.createElement('canvas');
            this.transitionFromCtx = this.transitionFromCanvas.getContext('2d');
            this.transitionToCanvas = document.createElement('canvas');
            this.transitionToCtx = this.transitionToCanvas.getContext('2d');
        }

        this.transitionFromCanvas.width = this.canvas.width;
        this.transitionFromCanvas.height = this.canvas.height;
        this.transitionToCanvas.width = this.canvas.width;
        this.transitionToCanvas.height = this.canvas.height;
    }

    /**
     * Update transition state
     */
    updateTransition(deltaTime) {
        if (!this.isTransitioning) return false;

        this.transitionProgress += deltaTime / this.transitionDuration;

        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            this.isTransitioning = false;
            return true; // Transition complete
        }

        return false;
    }

    /**
     * Render transition between two visualizers
     */
    renderTransition(audioData, metadata, deltaTime) {
        if (!this.isTransitioning) return false;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Render "from" visualizer
        if (this.transitionFrom) {
            this.transitionFromCtx.clearRect(0, 0, w, h);
            this.transitionFrom.render(audioData, metadata, deltaTime);
            // Capture current canvas state
            this.transitionFromCtx.drawImage(this.transitionFrom.canvas || this.canvas, 0, 0);
        }

        // Render "to" visualizer
        if (this.transitionTo) {
            this.transitionToCtx.clearRect(0, 0, w, h);
            this.transitionTo.render(audioData, metadata, deltaTime);
            this.transitionToCtx.drawImage(this.transitionTo.canvas || this.canvas, 0, 0);
        }

        // Apply easing function
        const t = this.easeInOutCubic(this.transitionProgress);

        // Composite with cross-fade
        ctx.clearRect(0, 0, w, h);

        if (this.transitionFrom) {
            ctx.globalAlpha = 1 - t;
            ctx.drawImage(this.transitionFromCanvas, 0, 0);
        }

        if (this.transitionTo) {
            ctx.globalAlpha = t;
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(this.transitionToCanvas, 0, 0);
        }

        ctx.globalAlpha = 1;

        return true;
    }

    /**
     * Easing function for smooth transitions
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Render all layers composited together
     */
    render(audioData, metadata, deltaTime = 0.016) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Handle transition if active
        if (this.isTransitioning) {
            const complete = this.updateTransition(deltaTime);
            this.renderTransition(audioData, metadata, deltaTime);
            return { transitioning: true, complete };
        }

        // Clear main canvas
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Render each enabled layer
        this.layers.forEach((layer, index) => {
            if (!layer.enabled || !layer.visualizer) return;

            // Clear layer canvas
            layer.ctx.clearRect(0, 0, w, h);

            // Render visualizer to layer canvas
            // Temporarily swap canvas context if visualizer uses it
            const originalCanvas = layer.visualizer.canvas;
            const originalCtx = layer.visualizer.ctx;

            layer.visualizer.canvas = layer.canvas;
            layer.visualizer.ctx = layer.ctx;

            try {
                layer.visualizer.render(audioData, metadata, deltaTime);
            } catch (e) {
                console.warn(`Layer ${index} render error:`, e);
            }

            // Restore original canvas
            layer.visualizer.canvas = originalCanvas;
            layer.visualizer.ctx = originalCtx;

            // Composite layer onto main canvas
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.drawImage(layer.canvas, 0, 0);
            ctx.restore();
        });

        return { transitioning: false, complete: false };
    }

    /**
     * Get current layer configuration
     */
    getLayerConfig() {
        return this.layerConfig;
    }

    /**
     * Load layer configuration
     */
    loadLayerConfig(config, visualizerFactory) {
        config.forEach((layerConf, index) => {
            if (layerConf.visualizerType && visualizerFactory) {
                const visualizer = visualizerFactory(layerConf.visualizerType);
                this.setLayer(index, visualizer, {
                    blendMode: layerConf.blendMode,
                    opacity: layerConf.opacity,
                    enabled: layerConf.enabled
                });
            }
        });
    }

    /**
     * Create preset layer configurations
     */
    static getPresets() {
        return {
            'psychedelicStack': [
                { visualizerType: 'shaderPsychedelicWaves', blendMode: 'source-over', opacity: 1.0, enabled: true },
                { visualizerType: 'gpuParticles', blendMode: 'screen', opacity: 0.6, enabled: true },
                { visualizerType: 'reactiveTypography', blendMode: 'overlay', opacity: 0.8, enabled: true }
            ],
            'cosmicDream': [
                { visualizerType: 'aiPsychedelicArt', blendMode: 'source-over', opacity: 1.0, enabled: true },
                { visualizerType: 'shaderSacredGeometry', blendMode: 'screen', opacity: 0.5, enabled: true },
                { visualizerType: 'gpuParticles', blendMode: 'lighten', opacity: 0.4, enabled: true }
            ],
            'electricVoid': [
                { visualizerType: 'shaderElectricStorm', blendMode: 'source-over', opacity: 1.0, enabled: true },
                { visualizerType: 'shaderKaleidoscope', blendMode: 'overlay', opacity: 0.4, enabled: true }
            ],
            'minimalParticles': [
                { visualizerType: 'gpuParticles', blendMode: 'source-over', opacity: 1.0, enabled: true }
            ]
        };
    }

    /**
     * Destroy all layers
     */
    destroy() {
        this.layers.forEach(layer => {
            if (layer.visualizer?.destroy) layer.visualizer.destroy();
            layer.visualizer = null;
        });
        this.isTransitioning = false;
        this.transitionFrom = null;
        this.transitionTo = null;
    }
}
