
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

        this.uiHideTimeout = null;
        this.uiVisible = true;
        this.UI_HIDE_DELAY = 3000;

        this.transitionParticles = [];
        this.isTransitioning = false;
        this.transitionDuration = 0.5;
        this.transitionProgress = 0;
        this.lastVizType = null;

        this.initializeElements();
        this.attachEventListeners();
        this.setupAutoHideUI();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.audioSourceSelect = document.getElementById('audioSource');
        this.visualizerSelect = document.getElementById('visualizerSelect');
        this.autoModeCheckbox = document.getElementById('autoMode');
        this.canvas = document.getElementById('visualizerCanvas');
        this.uiOverlay = document.getElementById('uiOverlay');
        this.header = document.querySelector('.header');
        this.infoPanel = document.querySelector('.info-panel');

        this.currentVizSpan = document.getElementById('currentViz');
        this.freqPeakSpan = document.getElementById('freqPeak');
        this.amplitudeSpan = document.getElementById('amplitude');
        this.loudnessSpan = document.getElementById('loudness');
    }

    setupAutoHideUI() {
        document.addEventListener('mousemove', () => this.onUserActivity());
        document.addEventListener('mousedown', () => this.onUserActivity());
        document.addEventListener('keydown', () => this.onUserActivity());
        document.addEventListener('touchstart', () => this.onUserActivity());
    }

    onUserActivity() {
        this.showUI();
        this.startUIHideTimer();
    }

    showUI() {
        if (!this.uiVisible) {
            this.uiVisible = true;
            if (this.uiOverlay) {
                this.uiOverlay.classList.remove('hidden');
            }
            document.body.classList.remove('hide-cursor');
        }
    }

    hideUI() {
        if (this.isRunning) {
            this.uiVisible = false;
            if (this.uiOverlay) {
                this.uiOverlay.classList.add('hidden');
            }
            document.body.classList.add('hide-cursor');
        }
    }

    startUIHideTimer() {
        if (this.uiHideTimeout) {
            clearTimeout(this.uiHideTimeout);
        }
        this.uiHideTimeout = setTimeout(() => this.hideUI(), this.UI_HIDE_DELAY);
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.visualizerSelect.addEventListener('change', (e) => {
            console.log('[main.js] Visualizer dropdown changed:', e.target.value);

            // Manual selection should disable Auto-Mode
            if (this.autoModeCheckbox) {
                this.autoModeCheckbox.checked = false;
            }

            if (!this.visualizers) {
                console.warn('[main.js] visualizers not initialized');
            } else {
                console.log('[main.js] Calling setVisualizer with', e.target.value);
                this.visualizers.setVisualizer(e.target.value);
            }
        });

        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());

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
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }

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

            // Initialize main Visualizers manager (supports mesh + premium visualizers)
            const { Visualizers } = await import('./visualizers.js');
            this.visualizers = new Visualizers(
                this.canvas,
                this.audioCapture,
                this.audioAnalyzer
            );

            // Set initial visualizer
            if (this.autoModeCheckbox.checked) {
                // Set a default classic visualizer, auto-selector will change it based on audio
                this.visualizers.setVisualizer('tornado');
            } else {
                const selectedViz = this.visualizerSelect.value;
                if (selectedViz !== 'auto') {
                    this.visualizers.setVisualizer(selectedViz);
                } else {
                    // Default to classic tornado
                    this.visualizers.setVisualizer('tornado');
                }
            }

            this.isRunning = true;

            // Start animation loop immediately (even without audio)
            this.animate();

            // UI stays visible - no auto-hide
            // this.startUIHideTimer();

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

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;

        this.currentVizSpan.textContent = 'None';
        this.freqPeakSpan.textContent = '0 Hz';
        this.amplitudeSpan.textContent = '0%';
        this.loudnessSpan.textContent = '0 dB';

        this.showUI();
        if (this.uiHideTimeout) {
            clearTimeout(this.uiHideTimeout);
        }
    }

    animate() {
        if (!this.isRunning) return;

        // Analyze audio (may be null if not started)
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

        // Render visualizer (will show idle animation if no audio)
        if (this.visualizers) {
            this.visualizers.render();
        }

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

