/**
 * Shared Settings Manager
 * Ensures all visualizers use consistent settings and parameters
 */

export class SharedSettings {
    constructor() {
        // Global visualizer settings
        this.global = {
            // Color settings
            colorMode: 'dynamic', // 'dynamic', 'static', 'gradient'
            baseHue: 200,
            hueRotation: true,
            hueSpeed: 1.0,
            saturation: 0.8,
            brightness: 0.7,
            
            // Animation settings
            timeScale: 1.0,
            smoothingFactor: 0.8,
            responseSpeed: 1.0,
            
            // Particle settings
            maxParticles: 500,
            particleSize: 1.0,
            particleOpacity: 0.8,
            particleTrail: true,
            particleGlow: true,
            
            // Effect settings
            bloomEnabled: true,
            bloomIntensity: 0.8,
            bloomRadius: 10,
            motionBlur: false,
            motionBlurStrength: 0.5,
            
            // Audio reactivity
            bassResponse: 1.0,
            midResponse: 1.0,
            trebleResponse: 1.0,
            beatResponse: 1.0,
            
            // Geometry settings
            complexity: 1.0,
            detailLevel: 1.0,
            smoothing: 0.8,
            
            // Transition settings
            transitionSpeed: 1.0,
            transitionType: 'smooth', // 'smooth', 'cut', 'fade'
            
            // Performance settings
            quality: 'high', // 'low', 'medium', 'high'
            targetFPS: 60
        };
        
        // Visualizer-specific overrides
        this.visualizerOverrides = {};
        
        // Event listeners for settings changes
        this.listeners = [];
        
        // Initialize with localStorage if available
        this.loadFromStorage();
    }
    
    getSetting(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.global;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    setSetting(path, value) {
        const keys = path.split('.');
        let obj = this.global;
        
        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!obj[key] || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = obj[lastKey];
        obj[lastKey] = value;
        
        // Notify listeners
        this.notifyListeners(path, value, oldValue);
        
        // Save to localStorage
        this.saveToStorage();
    }
    
    setVisualizerOverride(visualizerType, path, value) {
        if (!this.visualizerOverrides[visualizerType]) {
            this.visualizerOverrides[visualizerType] = {};
        }
        
        const keys = path.split('.');
        let obj = this.visualizerOverrides[visualizerType];
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!obj[key] || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }
        
        obj[keys[keys.length - 1]] = value;
    }
    
    getSettingForVisualizer(visualizerType, path, defaultValue = null) {
        // Check for visualizer-specific override first
        if (this.visualizerOverrides[visualizerType]) {
            const keys = path.split('.');
            let value = this.visualizerOverrides[visualizerType];
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    break;
                }
            }
            
            if (value !== undefined) {
                return value;
            }
        }
        
        // Fall back to global setting
        return this.getSetting(path, defaultValue);
    }
    
    getVisualizerSettings(visualizerType) {
        const settings = { ...this.global };
        
        // Apply visualizer-specific overrides
        if (this.visualizerOverrides[visualizerType]) {
            this.mergeOverrides(settings, this.visualizerOverrides[visualizerType]);
        }
        
        return settings;
    }
    
    mergeOverrides(target, overrides) {
        for (const key in overrides) {
            if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.mergeOverrides(target[key], overrides[key]);
            } else {
                target[key] = overrides[key];
            }
        }
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    notifyListeners(path, newValue, oldValue) {
        for (const listener of this.listeners) {
            try {
                listener(path, newValue, oldValue);
            } catch (error) {
                console.error('Settings listener error:', error);
            }
        }
    }
    
    // Audio-reactive color calculation
    calculateAudioReactiveColor(metadata, position = null) {
        const baseHue = this.getSetting('baseHue', 200);
        const hueRotation = this.getSetting('hueRotation', true);
        const hueSpeed = this.getSetting('hueSpeed', 1.0);
        let saturation = this.getSetting('saturation', 0.8);
        let brightness = this.getSetting('brightness', 0.7);
        
        let hue = baseHue;
        
        if (hueRotation && metadata) {
            // Rotate hue based on spectral centroid and time
            const timeOffset = Date.now() * 0.001 * hueSpeed;
            const spectralOffset = (metadata.spectralCentroid || 0) * 0.1;
            const amplitudeOffset = (metadata.amplitude || 0) * 60;
            
            hue = (baseHue + timeOffset + spectralOffset + amplitudeOffset) % 360;
        }
        
        // Position-based variation if provided
        if (position) {
            const posInfluence = ((position.x + position.y) / 1000) * 30;
            hue = (hue + posInfluence) % 360;
        }
        
        // Beat response
        if (metadata?.rhythm?.beat) {
            brightness = Math.min(1, brightness + 0.2);
            saturation = Math.min(1, saturation + 0.1);
        }
        
        return {
            h: hue,
            s: saturation * 100,
            l: brightness * 100,
            hsl: `hsl(${hue}, ${saturation * 100}%, ${brightness * 100}%)`
        };
    }
    
    // Performance-based quality adjustment
    adjustQualityForPerformance(fps, targetFPS = 60) {
        const performanceRatio = fps / targetFPS;
        
        if (performanceRatio < 0.5) {
            this.setSetting('quality', 'low');
            this.setSetting('maxParticles', 150);
            this.setSetting('bloomEnabled', false);
            this.setSetting('complexity', 0.5);
        } else if (performanceRatio < 0.8) {
            this.setSetting('quality', 'medium');
            this.setSetting('maxParticles', 300);
            this.setSetting('bloomIntensity', 0.5);
            this.setSetting('complexity', 0.7);
        } else {
            this.setSetting('quality', 'high');
            this.setSetting('maxParticles', 500);
            this.setSetting('bloomEnabled', true);
            this.setSetting('bloomIntensity', 0.8);
            this.setSetting('complexity', 1.0);
        }
    }
    
    saveToStorage() {
        try {
            const data = {
                global: this.global,
                overrides: this.visualizerOverrides
            };
            localStorage.setItem('visualizerSettings', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save settings to localStorage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('visualizerSettings');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.global) {
                    this.global = { ...this.global, ...data.global };
                }
                if (data.overrides) {
                    this.visualizerOverrides = data.overrides;
                }
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
    }
    
    resetToDefaults() {
        this.global = {
            colorMode: 'dynamic',
            baseHue: 200,
            hueRotation: true,
            hueSpeed: 1.0,
            saturation: 0.8,
            brightness: 0.7,
            timeScale: 1.0,
            smoothingFactor: 0.8,
            responseSpeed: 1.0,
            maxParticles: 500,
            particleSize: 1.0,
            particleOpacity: 0.8,
            particleTrail: true,
            particleGlow: true,
            bloomEnabled: true,
            bloomIntensity: 0.8,
            bloomRadius: 10,
            motionBlur: false,
            motionBlurStrength: 0.5,
            bassResponse: 1.0,
            midResponse: 1.0,
            trebleResponse: 1.0,
            beatResponse: 1.0,
            complexity: 1.0,
            detailLevel: 1.0,
            smoothing: 0.8,
            transitionSpeed: 1.0,
            transitionType: 'smooth',
            quality: 'high',
            targetFPS: 60
        };
        
        this.visualizerOverrides = {};
        this.saveToStorage();
        this.notifyListeners('reset', this.global, null);
    }
}

// Global shared settings instance
export const sharedSettings = new SharedSettings();
