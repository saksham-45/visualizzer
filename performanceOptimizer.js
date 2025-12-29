/**
 * Performance Optimizer for Visualizers
 * Ensures smooth, lag-free rendering across all visualizers
 */

export class PerformanceOptimizer {
    constructor() {
        this.frameCount = 0;
        this.fps = 60;
        this.targetFPS = 60;
        this.lastFrameTime = performance.now();
        this.frameTimeHistory = [];
        this.maxFrameTimeHistory = 60;
        
        // Performance thresholds
        this.fpsThreshold = 30;
        this.frameTimeThreshold = 33; // ~30fps
        
        // Adaptive quality settings
        this.qualityLevel = 'high';
        this.particleCountMultiplier = 1.0;
        this.effectIntensityMultiplier = 1.0;
        this.resolutionMultiplier = 1.0;
        
        // Shared settings across all visualizers
        this.sharedSettings = {
            bloomIntensity: 0.8,
            particleDensity: 1.0,
            effectComplexity: 1.0,
            colorSaturation: 1.0,
            smoothingFactor: 0.8,
            maxParticles: 500,
            transitionSpeed: 1.0
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            averageFrameTime: 0,
            droppedFrames: 0,
            totalFrames: 0,
            memoryUsage: 0
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        setInterval(() => {
            this.updatePerformanceMetrics();
            this.adaptQuality();
        }, 1000);
    }
    
    updatePerformanceMetrics() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Update frame time history
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
            this.frameTimeHistory.shift();
        }
        
        // Calculate FPS
        this.fps = 1000 / this.getAverageFrameTime();
        
        // Update metrics
        this.performanceMetrics.averageFrameTime = this.getAverageFrameTime();
        this.performanceMetrics.totalFrames = this.frameCount;
        
        // Memory usage (if available)
        if (performance?.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
        }
    }
    
    getAverageFrameTime() {
        if (this.frameTimeHistory.length === 0) return 16.67; // 60fps
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameTimeHistory.length;
    }
    
    adaptQuality() {
        const avgFrameTime = this.getAverageFrameTime();
        const currentFPS = 1000 / avgFrameTime;
        
        // Adaptive quality based on performance
        if (currentFPS < this.fpsThreshold) {
            this.reduceQuality();
        } else if (currentFPS > 55 && this.qualityLevel !== 'high') {
            this.increaseQuality();
        }
        
        console.log(`[Performance] FPS: ${currentFPS.toFixed(1)}, Quality: ${this.qualityLevel}`);
    }
    
    reduceQuality() {
        const prevQuality = this.qualityLevel;
        
        if (this.qualityLevel === 'high') {
            this.qualityLevel = 'medium';
            this.particleCountMultiplier = 0.7;
            this.effectIntensityMultiplier = 0.8;
            this.sharedSettings.maxParticles = 300;
            this.sharedSettings.particleDensity = 0.7;
        } else if (this.qualityLevel === 'medium') {
            this.qualityLevel = 'low';
            this.particleCountMultiplier = 0.4;
            this.effectIntensityMultiplier = 0.6;
            this.sharedSettings.maxParticles = 150;
            this.sharedSettings.particleDensity = 0.4;
            this.sharedSettings.effectComplexity = 0.5;
        }
        
        if (prevQuality !== this.qualityLevel) {
            console.log(`[Performance] Reduced quality to ${this.qualityLevel}`);
        }
    }
    
    increaseQuality() {
        const prevQuality = this.qualityLevel;
        
        if (this.qualityLevel === 'low') {
            this.qualityLevel = 'medium';
            this.particleCountMultiplier = 0.7;
            this.effectIntensityMultiplier = 0.8;
            this.sharedSettings.maxParticles = 300;
            this.sharedSettings.particleDensity = 0.7;
            this.sharedSettings.effectComplexity = 0.8;
        } else if (this.qualityLevel === 'medium') {
            this.qualityLevel = 'high';
            this.particleCountMultiplier = 1.0;
            this.effectIntensityMultiplier = 1.0;
            this.sharedSettings.maxParticles = 500;
            this.sharedSettings.particleDensity = 1.0;
            this.sharedSettings.effectComplexity = 1.0;
        }
        
        if (prevQuality !== this.qualityLevel) {
            console.log(`[Performance] Increased quality to ${this.qualityLevel}`);
        }
    }
    
    getOptimizedParticleCount(baseCount) {
        return Math.floor(baseCount * this.particleCountMultiplier * this.sharedSettings.particleDensity);
    }
    
    getOptimizedEffectIntensity(baseIntensity) {
        return baseIntensity * this.effectIntensityMultiplier * this.sharedSettings.effectComplexity;
    }
    
    shouldSkipFrame() {
        const avgFrameTime = this.getAverageFrameTime();
        return avgFrameTime > this.frameTimeThreshold * 2; // Skip if running very slowly
    }
    
    beginFrame() {
        this.frameCount++;
        this.frameStartTime = performance.now();
        
        // Reset canvas transform for clean state
        const ctx = this.getContext();
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
    
    endFrame() {
        const frameTime = performance.now() - this.frameStartTime;
        
        if (frameTime > this.frameTimeThreshold) {
            this.performanceMetrics.droppedFrames++;
        }
    }
    
    getContext() {
        // This will be set by the main visualizer
        return this.canvasContext;
    }
    
    setCanvasContext(ctx) {
        this.canvasContext = ctx;
    }
    
    getSharedSettings() {
        return { ...this.sharedSettings };
    }
    
    updateSharedSettings(newSettings) {
        Object.assign(this.sharedSettings, newSettings);
    }
    
    // Performance profiling
    startProfile(label) {
        this.profiles = this.profiles || {};
        this.profiles[label] = performance.now();
    }
    
    endProfile(label) {
        if (this.profiles && this.profiles[label]) {
            const duration = performance.now() - this.profiles[label];
            console.log(`[Profile] ${label}: ${duration.toFixed(2)}ms`);
            delete this.profiles[label];
            return duration;
        }
        return 0;
    }
    
    getPerformanceReport() {
        return {
            fps: this.fps.toFixed(1),
            quality: this.qualityLevel,
            averageFrameTime: this.performanceMetrics.averageFrameTime.toFixed(2),
            droppedFrames: this.performanceMetrics.droppedFrames,
            totalFrames: this.performanceMetrics.totalFrames,
            memoryUsage: this.performanceMetrics.memoryUsage.toFixed(1),
            particleMultiplier: this.particleCountMultiplier,
            effectMultiplier: this.effectIntensityMultiplier
        };
    }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();
