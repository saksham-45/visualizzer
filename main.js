
import { AudioCapture } from './audioCapture.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { Visualizers } from './visualizers.js';
import { VisualizerSelector } from './visualizerSelector.js';

class VisualizerApp {
    constructor() {
        this.audioCapture = new AudioCapture();
        this.audioAnalyzer = new AudioAnalyzer(this.audioCapture);
        this.visualizers = null;
        this.visualizerSelector = new VisualizerSelector();
        this.animationId = null;
        this.isRunning = false;
        this.isAnimating = false;

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

        // Always initialize and render visualizers so you see something immediately.
        // Audio capture is still started/stopped via the Start/Stop buttons.
        this.visualizers = new Visualizers(
            this.canvas,
            this.audioCapture,
            this.audioAnalyzer
        );
        this.isAnimating = true;
        this.animate();
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

        this.populateVisualizerDropdown();
    }

    populateVisualizerDropdown() {
        if (!this.visualizerSelector || !this.visualizerSelect) return;

        const structure = this.visualizerSelector.getVisualizerList();

        // Keep the "Auto" option
        const autoOption = this.visualizerSelect.querySelector('option[value="auto"]');
        this.visualizerSelect.innerHTML = '';
        if (autoOption) this.visualizerSelect.appendChild(autoOption);

        structure.forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.category;

            group.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.label;
                optgroup.appendChild(option);
            });

            this.visualizerSelect.appendChild(optgroup);
        });
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

        // Micro-Interaction: 3D Tilt Effect
        document.addEventListener('mousemove', (e) => {
            if (!this.uiOverlay) return;

            // Normalize coordinates -1 to 1
            const x = (e.clientX / window.innerWidth) - 0.5;
            const y = (e.clientY / window.innerHeight) - 0.5;

            // Max tilt angle (degrees)
            const strength = 10;
            const tiltX = x * strength;
            const tiltY = -y * strength; // Inverted Y for natural feel

            this.uiOverlay.style.setProperty('--tilt-x', `${tiltX}deg`);
            this.uiOverlay.style.setProperty('--tilt-y', `${tiltY}deg`);
        });
    }

    createExitButton() {
        const exitBtn = document.createElement('button');
        exitBtn.id = 'exitFullscreenBtn';
        exitBtn.textContent = 'X';
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
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'Starting...';

            const sourceType = this.audioSourceSelect.value;

            // Attempt primary source; if it fails, fall back to DEMO MODE automatically.
            // This prevents the app from appearing "dead" when permissions/devices are missing.
            try {
                await this.audioCapture.start(sourceType);
            } catch (captureError) {
                const name = captureError?.name || 'Error';
                const message = captureError?.message || String(captureError);
                console.warn('[VisualizerApp] Audio start failed, falling back to demo mode:', name, message);

                await this.audioCapture.start('demo');
                this.startBtn.textContent = 'Demo Mode';
            }

            // Core systems are initialized at boot; at this point we only start audio.

            // Set initial visualizer
            if (this.autoModeCheckbox.checked) {
                this.visualizers.setVisualizer('tornado');
            } else {
                const selectedViz = this.visualizerSelect.value;
                this.visualizers.setVisualizer(selectedViz === 'auto' ? 'tornado' : selectedViz);
            }

            this.isRunning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            // Only reset text if we didn't set it to 'Demo Mode' earlier
            if (this.startBtn.textContent !== 'Demo Mode') {
                this.startBtn.textContent = 'running...';
            }

        } catch (error) {
            const name = error?.name || 'Error';
            const message = error?.message || String(error);
            console.error('Fatal Start Error:', name, message, error);
            alert(`Could not start visualizer: ${message}`);
            this.startBtn.disabled = false;
            this.startBtn.textContent = 'Start';
            this.stop(); // Ensure clean state
        }
    }

    stop() {
        this.isRunning = false;

        this.audioCapture.stop();

        // Keep the render loop alive so you still see the idle visualizer.
        // Do not null out visualizers/analyzer; they are needed for rendering.

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
        if (!this.isAnimating) return;

        // Analyze audio (may be null if not started)
        const metadata = this.audioAnalyzer?.analyze();

        // Auto-select visualizer only when audio is actually running
        if (this.isRunning && this.autoModeCheckbox.checked && metadata && this.visualizers) {
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

        // Update current visualizer name (Clean up prefixes)
        let currentViz = this.visualizers?.currentVisualizer || 'None';
        currentViz = currentViz.replace('shader_', '').replace('layered_', '');

        // Handle CamelCase -> Spaces
        currentViz = currentViz.replace(/([A-Z])/g, ' $1').trim();
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

