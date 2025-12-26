/**
 * Audio Capture Module
 * Handles microphone and system audio capture using Web Audio API
 */
export class AudioCapture {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.source = null;
        this.stream = null;
        this.isCapturing = false;
    }

    /**
     * Initialize audio context and analyser
     */
    async initialize() {
        try {
            // Create audio context with optimal settings for low latency
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100,
                latencyHint: 'interactive'
            });

            // Create analyser node with high resolution
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048; // Higher resolution for smoother visualization
            this.analyser.smoothingTimeConstant = 0.8; // Smooth transitions

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;

            // Connect gain to analyser
            this.gainNode.connect(this.analyser);

            return true;
        } catch (error) {
            console.error('Error initializing audio context:', error);
            throw error;
        }
    }

    /**
     * Start capturing from microphone with fallback strategy
     */
    async startMicrophone() {
        if (!this.audioContext) {
            await this.initialize();
        }

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const constraintsHighQuality = {
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 44100,
                channelCount: 1
            }
        };

        const constraintsBasic = {
            audio: true // Fallback: Let the browser decide
        };

        try {
            console.log('[AudioCapture] Attempting High-Quality/Raw capture...');
            this.stream = await navigator.mediaDevices.getUserMedia(constraintsHighQuality);
        } catch (err) {
            console.warn(`[AudioCapture] HQ Capture failed (${err.name}). Retrying with basic settings...`);

            try {
                // FALLBACK: Try basic audio processing if hardware doesn't support raw
                this.stream = await navigator.mediaDevices.getUserMedia(constraintsBasic);
                console.log('[AudioCapture] Basic capture successful.');
            } catch (retryErr) {
                console.error('[AudioCapture] All capture attempts failed:', retryErr);

                // Propagate specific error for UI handling
                if (retryErr.name === 'NotAllowedError' || retryErr.name === 'PermissionDeniedError') {
                    throw new Error('Permission denied. Please allow microphone access in your browser settings (Lock icon in URL bar) and System Preferences.');
                } else if (retryErr.name === 'NotFoundError') {
                    throw new Error('No microphone found. Please connect an audio input device.');
                } else {
                    throw new Error(`Microphone access failed: ${retryErr.name} - ${retryErr.message}`);
                }
            }
        }

        // Create source from the successful stream
        if (this.stream) {
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.gainNode);
            this.isCapturing = true;
            return true;
        }
    }

    /**
     * Start capturing system audio (experimental)
     * Note: This requires browser extensions or special permissions
     * For Chrome/Edge, users need to use screen capture API
     */
    async startSystemAudio() {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            console.log('Requesting system audio via getDisplayMedia...');
            // Request screen capture with audio
            // IMPORTANT: 'video: true' is REQUIRED for getDisplayMedia to work in most browsers,
            // even if we only want audio. The user must select "Share Audio" in the browser prompt.
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            });

            // Check if we actually got an audio track
            const audioTracks = this.stream.getAudioTracks();
            if (audioTracks.length === 0) {
                // User didn't check "Share Audio"
                this.stop();
                throw new Error('No audio track found. Please ensure you checked "Share tab audio" or "Share system audio" in the popup.');
            }

            // Create source from system audio stream
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.gainNode);

            this.isCapturing = true;

            // Handle stream end (user stops sharing via browser UI)
            this.stream.getVideoTracks()[0].onended = () => {
                console.log('Screen sharing stopped by user');
                this.stop();
            };

            return true;
        } catch (error) {
            console.error('Error accessing system audio:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Permission denied. You cancelled the screen sharing prompt.');
            }
            throw error;
        }
    }

    /**
     * Start "Demo Mode" with synthetic audio
     * Useful when mic access is blocked or unavailable
     */
    async startDemoMode() {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            console.log('Starting Demo Mode (Synthetic Audio)...');
            this.createSyntheticAudio();
            this.isCapturing = true;
            return true;
        } catch (error) {
            console.error('Error starting demo mode:', error);
            throw error;
        }
    }

    /**
     * Create synthetic audio graph for demo mode
     *Generates a rich spectrum: Sub-bass, Mid-range rhythmic pulses, High-freq shimmers
     */
    createSyntheticAudio() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        this.demoNodes = [];

        // 1. Sub-Bass Oscillator (60Hz) - Sawtooth for harmonics
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 60;

        const bassGain = ctx.createGain();
        bassGain.gain.value = 0.5;

        // LFO for Bass pulsing (simulating a beat)
        const bassLFO = ctx.createOscillator();
        bassLFO.type = 'sine';
        bassLFO.frequency.value = 2; // 120 BPMish
        const bassLFOAmp = ctx.createGain();
        bassLFOAmp.gain.value = 0.5; // Depth of pulse

        bassOsc.connect(bassGain);
        bassLFO.connect(bassLFOAmp);
        bassLFOAmp.connect(bassGain.gain);
        bassGain.connect(this.gainNode);

        bassOsc.start(now);
        bassLFO.start(now);
        this.demoNodes.push(bassOsc, bassGain, bassLFO, bassLFOAmp);

        // 2. Mid-Range Drone (300Hz) - Sine
        const midOsc = ctx.createOscillator();
        midOsc.type = 'sine';
        midOsc.frequency.value = 300;

        const midGain = ctx.createGain();
        midGain.gain.value = 0.3;

        // FM Synthesis for movement
        const midFM = ctx.createOscillator();
        midFM.frequency.value = 0.5;
        const midFMGain = ctx.createGain();
        midFMGain.gain.value = 50;

        midFM.connect(midFMGain);
        midFMGain.connect(midOsc.frequency);
        midOsc.connect(midGain);
        midGain.connect(this.gainNode);

        midOsc.start(now);
        midFM.start(now);
        this.demoNodes.push(midOsc, midGain, midFM, midFMGain);

        // 3. High Frequency Shimmer (3000Hz)
        const highOsc = ctx.createOscillator();
        highOsc.type = 'triangle';
        highOsc.frequency.value = 3000;

        const highGain = ctx.createGain();
        highGain.gain.value = 0.15;

        // Fast tremolo
        const highLFO = ctx.createOscillator();
        highLFO.frequency.value = 8;
        const highLFOGain = ctx.createGain();
        highLFOGain.gain.value = 0.5;

        highOsc.connect(highGain);
        highLFO.connect(highLFOGain);
        highLFOGain.connect(highGain.gain);
        highGain.connect(this.gainNode);

        highOsc.start(now);
        highLFO.start(now);
        this.demoNodes.push(highOsc, highGain, highLFO, highLFOGain);
    }
    async start(sourceType = 'mic') {
        if (this.isCapturing) {
            this.stop();
        }

        if (sourceType === 'mic') {
            await this.startMicrophone();
        } else if (sourceType === 'system') {
            await this.startSystemAudio();
        } else if (sourceType === 'demo') {
            await this.startDemoMode();
        }
    }

    /**
     * Stop capturing
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        // Cleanup demo nodes
        if (this.demoNodes) {
            this.demoNodes.forEach(node => {
                try {
                    node.stop();
                    node.disconnect();
                } catch (e) { }
            });
            this.demoNodes = [];
        }

        this.isCapturing = false;
    }

    /**
     * Get audio data arrays
     */
    getAudioData() {
        if (!this.analyser || !this.isCapturing) {
            return null;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const frequencyData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);

        // Get frequency domain data
        this.analyser.getByteFrequencyData(frequencyData);

        // Get time domain data (waveform)
        this.analyser.getByteTimeDomainData(timeData);

        return {
            frequencyData,
            timeData,
            bufferLength,
            sampleRate: this.audioContext.sampleRate,
            fftSize: this.analyser.fftSize
        };
    }

    /**
     * Get analyser node for direct access
     */
    getAnalyser() {
        return this.analyser;
    }

    /**
     * Get audio context
     */
    getAudioContext() {
        return this.audioContext;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

