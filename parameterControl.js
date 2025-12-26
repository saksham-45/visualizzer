/**
 * Parameter Control System
 * Customizable parameters per visualizer with UI generation
 * Supports speed, intensity, color, and custom parameters
 */

export class ParameterControl {
    constructor() {
        this.visualizerParams = {};
        this.globalParams = {
            masterSpeed: 1.0,
            masterIntensity: 1.0,
            masterBrightness: 1.0,
            colorShift: 0.0,
            transitionDuration: 1.5,
            autoSwitch: true,
            autoSwitchInterval: 30
        };

        this.parameterDefinitions = this.getParameterDefinitions();
        this.listeners = [];
        this.uiContainer = null;
    }

    /**
     * Define available parameters for each visualizer type
     */
    getParameterDefinitions() {
        const common = [
            { name: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3.0, step: 0.1, default: 1.0 },
            { name: 'intensity', label: 'Intensity', type: 'range', min: 0.1, max: 2.0, step: 0.1, default: 1.0 },
            { name: 'colorShift', label: 'Color Shift', type: 'range', min: 0, max: 1, step: 0.01, default: 0 }
        ];

        return {
            // Shader visualizers
            psychedelicWaves: [
                ...common,
                { name: 'complexity', label: 'Complexity', type: 'range', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
                { name: 'waveCount', label: 'Wave Layers', type: 'range', min: 1, max: 8, step: 1, default: 5 }
            ],
            kaleidoscope: [
                ...common,
                { name: 'segments', label: 'Segments', type: 'range', min: 3, max: 16, step: 1, default: 6 },
                { name: 'complexity', label: 'Complexity', type: 'range', min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
            ],
            hypnoticSpiral: [
                ...common,
                { name: 'spiralArms', label: 'Spiral Arms', type: 'range', min: 1, max: 10, step: 1, default: 3 },
                { name: 'complexity', label: 'Complexity', type: 'range', min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
            ],
            electricStorm: [
                ...common,
                { name: 'lightningFreq', label: 'Lightning', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5 },
                { name: 'complexity', label: 'Complexity', type: 'range', min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
            ],
            sacredGeometry: [
                ...common,
                { name: 'layers', label: 'Layers', type: 'range', min: 3, max: 12, step: 1, default: 6 },
                { name: 'rotationSpeed', label: 'Rotation', type: 'range', min: 0, max: 2, step: 0.1, default: 0.5 }
            ],

            // GPU Particles
            gpuParticles: [
                ...common,
                { name: 'particleCount', label: 'Particles (k)', type: 'range', min: 10, max: 100, step: 10, default: 50 },
                { name: 'size', label: 'Size', type: 'range', min: 0.5, max: 3.0, step: 0.1, default: 1.0 },
                { name: 'spread', label: 'Spread', type: 'range', min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
            ],

            // AI Art
            aiPsychedelicArt: [
                ...common,
                { name: 'regenerateInterval', label: 'Regen (s)', type: 'range', min: 10, max: 120, step: 5, default: 30 },
                { name: 'proceduralOnly', label: 'Procedural Only', type: 'checkbox', default: false }
            ],

            // Typography
            reactiveTypography: [
                ...common,
                { name: 'fontSize', label: 'Font Size', type: 'range', min: 24, max: 120, step: 4, default: 72 },
                { name: 'style', label: 'Style', type: 'select', options: ['wave', 'explode', 'pulse', 'rainbow'], default: 'wave' },
                { name: 'showParticles', label: 'Particles', type: 'checkbox', default: true }
            ],

            // Layer blending
            layerBlending: [
                { name: 'layer0Opacity', label: 'Layer 1 Opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 1.0 },
                { name: 'layer1Opacity', label: 'Layer 2 Opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6 },
                { name: 'layer2Opacity', label: 'Layer 3 Opacity', type: 'range', min: 0, max: 1, step: 0.05, default: 0.4 },
                { name: 'layer0Blend', label: 'Layer 1 Blend', type: 'select', options: ['source-over', 'screen', 'overlay', 'multiply', 'lighten'], default: 'source-over' },
                { name: 'layer1Blend', label: 'Layer 2 Blend', type: 'select', options: ['source-over', 'screen', 'overlay', 'multiply', 'lighten'], default: 'screen' },
                { name: 'layer2Blend', label: 'Layer 3 Blend', type: 'select', options: ['source-over', 'screen', 'overlay', 'multiply', 'lighten'], default: 'overlay' }
            ],

            // Default for unknown visualizers
            default: common
        };
    }

    /**
     * Get parameters for a visualizer type
     */
    getParams(visualizerType) {
        if (!this.visualizerParams[visualizerType]) {
            const definitions = this.parameterDefinitions[visualizerType] || this.parameterDefinitions.default;
            this.visualizerParams[visualizerType] = {};

            definitions.forEach(def => {
                this.visualizerParams[visualizerType][def.name] = def.default;
            });
        }

        // Apply master modifiers
        const params = { ...this.visualizerParams[visualizerType] };
        if (params.speed !== undefined) params.speed *= this.globalParams.masterSpeed;
        if (params.intensity !== undefined) params.intensity *= this.globalParams.masterIntensity;

        return params;
    }

    /**
     * Set a parameter value
     */
    setParam(visualizerType, paramName, value) {
        if (!this.visualizerParams[visualizerType]) {
            this.getParams(visualizerType); // Initialize
        }

        this.visualizerParams[visualizerType][paramName] = value;
        this.notifyListeners(visualizerType, paramName, value);
    }

    /**
     * Set global parameter
     */
    setGlobalParam(paramName, value) {
        this.globalParams[paramName] = value;
        this.notifyListeners('global', paramName, value);
    }

    /**
     * Add change listener
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove change listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify listeners of parameter change
     */
    notifyListeners(visualizerType, paramName, value) {
        this.listeners.forEach(listener => {
            listener({ visualizerType, paramName, value });
        });
    }

    /**
     * Generate UI for parameters
     */
    createUI(container, visualizerType) {
        this.uiContainer = container;
        container.innerHTML = '';

        const definitions = this.parameterDefinitions[visualizerType] || this.parameterDefinitions.default;
        const params = this.getParams(visualizerType);

        // Create panel
        const panel = document.createElement('div');
        panel.className = 'param-panel';
        panel.innerHTML = `
            <style>
                .param-panel {
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 16px;
                    min-width: 280px;
                    font-family: system-ui, sans-serif;
                    color: white;
                }
                .param-panel h3 {
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #888;
                }
                .param-group {
                    margin-bottom: 12px;
                }
                .param-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 12px;
                }
                .param-value {
                    color: #00ffff;
                    font-weight: bold;
                }
                .param-range {
                    width: 100%;
                    height: 6px;
                    -webkit-appearance: none;
                    background: linear-gradient(to right, #333, #666);
                    border-radius: 3px;
                    outline: none;
                }
                .param-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: linear-gradient(135deg, #00ffff, #ff00ff);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                }
                .param-select {
                    width: 100%;
                    padding: 8px;
                    background: #222;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: white;
                    font-size: 12px;
                }
                .param-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .param-checkbox input {
                    width: 18px;
                    height: 18px;
                    accent-color: #00ffff;
                }
            </style>
            <h3>${visualizerType.replace(/([A-Z])/g, ' $1').trim()}</h3>
        `;

        definitions.forEach(def => {
            const group = document.createElement('div');
            group.className = 'param-group';

            const value = params[def.name] ?? def.default;

            switch (def.type) {
                case 'range':
                    group.innerHTML = `
                        <div class="param-label">
                            <span>${def.label}</span>
                            <span class="param-value" id="value-${def.name}">${value.toFixed(def.step < 1 ? 2 : 0)}</span>
                        </div>
                        <input type="range" class="param-range" id="param-${def.name}"
                            min="${def.min}" max="${def.max}" step="${def.step}" value="${value}">
                    `;
                    group.querySelector('input').addEventListener('input', (e) => {
                        const newValue = parseFloat(e.target.value);
                        this.setParam(visualizerType, def.name, newValue);
                        group.querySelector('.param-value').textContent = newValue.toFixed(def.step < 1 ? 2 : 0);
                    });
                    break;

                case 'select':
                    group.innerHTML = `
                        <div class="param-label"><span>${def.label}</span></div>
                        <select class="param-select" id="param-${def.name}">
                            ${def.options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    `;
                    group.querySelector('select').addEventListener('change', (e) => {
                        this.setParam(visualizerType, def.name, e.target.value);
                    });
                    break;

                case 'checkbox':
                    group.innerHTML = `
                        <div class="param-checkbox">
                            <input type="checkbox" id="param-${def.name}" ${value ? 'checked' : ''}>
                            <label for="param-${def.name}">${def.label}</label>
                        </div>
                    `;
                    group.querySelector('input').addEventListener('change', (e) => {
                        this.setParam(visualizerType, def.name, e.target.checked);
                    });
                    break;
            }

            panel.appendChild(group);
        });

        container.appendChild(panel);
    }

    /**
     * Save parameters to localStorage
     */
    save() {
        const data = {
            global: this.globalParams,
            visualizers: this.visualizerParams
        };
        localStorage.setItem('visualizzerParams', JSON.stringify(data));
    }

    /**
     * Load parameters from localStorage
     */
    load() {
        try {
            const data = JSON.parse(localStorage.getItem('visualizzerParams'));
            if (data) {
                if (data.global) Object.assign(this.globalParams, data.global);
                if (data.visualizers) Object.assign(this.visualizerParams, data.visualizers);
            }
        } catch (e) {
            console.warn('Failed to load saved parameters:', e);
        }
    }

    /**
     * Reset to defaults
     */
    reset(visualizerType = null) {
        if (visualizerType) {
            delete this.visualizerParams[visualizerType];
        } else {
            this.visualizerParams = {};
            this.globalParams = {
                masterSpeed: 1.0,
                masterIntensity: 1.0,
                masterBrightness: 1.0,
                colorShift: 0.0,
                transitionDuration: 1.5,
                autoSwitch: true,
                autoSwitchInterval: 30
            };
        }
    }

    /**
     * Export current configuration as preset
     */
    exportPreset(name) {
        return {
            name,
            timestamp: Date.now(),
            global: { ...this.globalParams },
            visualizers: JSON.parse(JSON.stringify(this.visualizerParams))
        };
    }

    /**
     * Import preset
     */
    importPreset(preset) {
        if (preset.global) Object.assign(this.globalParams, preset.global);
        if (preset.visualizers) Object.assign(this.visualizerParams, preset.visualizers);
    }
}
