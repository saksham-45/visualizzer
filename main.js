
import { AudioCapture } from './audioCapture.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { MeshVisualizers } from './meshVisualizers.js';
import { VisualizerSelector } from './visualizerSelector.js';

class VisualizerApp {
    constructor() {
        this.audioCapture = new AudioCapture();
        this.audioAnalyzer = null;
        this.visualizers = null;
        this.visualizerSelector = new VisualizerSelector();
        this.animationId = null;
        this.isRunning = false;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.audioSourceSelect = document.getElementById('audioSource');
        this.visualizerSelect = document.getElementById('visualizerSelect');
        this.autoModeCheckbox = document.getElementById('autoMode');
        this.canvas = document.getElementById('visualizerCanvas');
        this.container = document.querySelector('.container');
        
        // Info display elements
        this.currentVizSpan = document.getElementById('currentViz');
        this.freqPeakSpan = document.getElementById('freqPeak');
        this.amplitudeSpan = document.getElementById('amplitude');
        this.loudnessSpan = document.getElementById('loudness');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.visualizerSelect.addEventListener('change', (e) => {
            if (!this.autoModeCheckbox.checked) {
                this.visualizers?.setVisualizer(e.target.value);
            }
        });
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());
        
        // Add click handler for exit button (CSS ::before pseudo-element)
        // We'll use a different approach - add an actual exit button
        this.createExitButton();
    }

    createExitButton() {
        const exitBtn = document.createElement('button');
        exitBtn.id = 'exitFullscreenBtn';
        exitBtn.textContent = '✕';
        exitBtn.className = 'exit-fullscreen-btn';
        exitBtn.style.cssText = `
            display: none;
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.3);
            color: rgba(255, 255, 255, 0.3);
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        exitBtn.addEventListener('click', () => this.toggleFullscreen());
        exitBtn.addEventListener('mouseenter', () => {
            exitBtn.style.color = 'rgba(255, 255, 255, 0.9)';
            exitBtn.style.background = 'rgba(0, 0, 0, 0.6)';
        });
        exitBtn.addEventListener('mouseleave', () => {
            exitBtn.style.color = 'rgba(255, 255, 255, 0.3)';
            exitBtn.style.background = 'rgba(0, 0, 0, 0.3)';
        });
        document.body.appendChild(exitBtn);
        this.exitFullscreenBtn = exitBtn;
    }

    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.msFullscreenElement);
        
        if (this.exitFullscreenBtn) {
            this.exitFullscreenBtn.style.display = isFullscreen ? 'flex' : 'none';
        }
        
        // Resize canvas
        setTimeout(() => {
            if (this.visualizers) {
                this.visualizers.resize();
            }
        }, 100);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) {
                this.container.msRequestFullscreen();
            }
            document.body.style.overflow = 'hidden';
            
            // Resize canvas for fullscreen
            setTimeout(() => {
                if (this.visualizers) {
                    this.visualizers.resize();
                }
            }, 100);
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            document.body.style.overflow = '';
            
            // Resize canvas after exiting
            setTimeout(() => {
                if (this.visualizers) {
                    this.visualizers.resize();
                }
            }, 100);
        }
    }

    async start() {
        try {
            // Show loading state
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'Starting...';
            
            // Initialize audio capture
            const sourceType = this.audioSourceSelect.value;
            await this.audioCapture.start(sourceType);
            
            // Initialize analyzer
            this.audioAnalyzer = new AudioAnalyzer(this.audioCapture);
            
            // Initialize mesh visualizers (cloth-like flexible surfaces)
            this.visualizers = new MeshVisualizers(
                this.canvas,
                this.audioCapture,
                this.audioAnalyzer
            );
            
            // Set initial visualizer
            if (this.autoModeCheckbox.checked) {
                // Set a default visualizer, auto-selector will change it based on audio
                this.visualizers.setVisualizer('wave');
            } else {
                const selectedViz = this.visualizerSelect.value;
                if (selectedViz !== 'auto') {
                    this.visualizers.setVisualizer(selectedViz);
                } else {
                    this.visualizers.setVisualizer('wave');
                }
            }
            
            // Start animation loop
            this.isRunning = true;
            this.animate();
            
            // Update UI
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.startBtn.textContent = 'Start';
            
        } catch (error) {
            console.error('Error starting visualizer:', error);
            alert(`Error: ${error.message}\n\nPlease ensure you grant microphone permissions or select a tab/window for system audio.`);
            this.startBtn.disabled = false;
            this.startBtn.textContent = 'Start';
        }
    }

    stop() {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.audioCapture.stop();
        this.visualizers = null;
        this.audioAnalyzer = null;
        
        // Clear canvas
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update UI
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        
        // Reset info display
        this.currentVizSpan.textContent = 'None';
        this.freqPeakSpan.textContent = '0 Hz';
        this.amplitudeSpan.textContent = '0%';
        this.loudnessSpan.textContent = '0 dB';
    }

    animate() {
        if (!this.isRunning) return;
        
        // Analyze audio
        const metadata = this.audioAnalyzer?.analyze();
        
        // Auto-select visualizer if enabled - always use smooth transitions
        if (this.autoModeCheckbox.checked && metadata && this.visualizers) {
            const selectedViz = this.visualizerSelector.selectVisualizer(metadata);
            // Always trigger transition if different (will handle smooth morphing)
            if (selectedViz !== this.visualizers.currentVisualizer) {
                // Only set if not already transitioning to this one
                if (selectedViz !== this.visualizers.targetVisualizer || 
                    this.visualizers.transitionProgress >= 1) {
                    this.visualizers.setVisualizer(selectedViz);
                }
            }
        }
        
        // Render visualizer
        this.visualizers?.render();
        
        // Update info display
        this.updateInfoDisplay(metadata);
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateInfoDisplay(metadata) {
        if (!metadata) return;
        
        // Update current visualizer
        const currentViz = this.visualizers?.currentVisualizer || 'None';
        this.currentVizSpan.textContent = currentViz.charAt(0).toUpperCase() + currentViz.slice(1);
        
        // Update frequency peak
        if (metadata.dominantFreq) {
            const freq = metadata.dominantFreq.frequency;
            if (freq >= 1000) {
                this.freqPeakSpan.textContent = `${(freq / 1000).toFixed(1)} kHz`;
            } else {
                this.freqPeakSpan.textContent = `${Math.round(freq)} Hz`;
            }
        }
        
        // Update amplitude
        this.amplitudeSpan.textContent = `${Math.round(metadata.amplitude * 100)}%`;
        
        // Update loudness
        const loudness = metadata.loudness;
        if (loudness === -Infinity || isNaN(loudness)) {
            this.loudnessSpan.textContent = '-∞ dB';
        } else {
            this.loudnessSpan.textContent = `${Math.round(loudness)} dB`;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.visualizerApp = new VisualizerApp();
});

