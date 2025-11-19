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
     * Start capturing from microphone
     */
    async startMicrophone() {
        try {
            if (!this.audioContext) {
                await this.initialize();
            }

            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                    channelCount: 1
                }
            });

            // Create source from microphone stream
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.gainNode);
            
            this.isCapturing = true;
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw new Error('Microphone access denied or unavailable');
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

            // Request screen capture with audio (system audio)
            // This is the closest we can get to system audio capture in browsers
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            });

            // Create source from system audio stream
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.gainNode);
            
            this.isCapturing = true;
            
            // Handle stream end (user stops sharing)
            this.stream.getAudioTracks()[0].addEventListener('ended', () => {
                this.stop();
            });
            
            return true;
        } catch (error) {
            console.error('Error accessing system audio:', error);
            throw new Error('System audio access denied or unavailable. Please select a tab/window to capture.');
        }
    }

    /**
     * Start capturing based on source type
     */
    async start(sourceType = 'mic') {
        if (this.isCapturing) {
            this.stop();
        }

        if (sourceType === 'mic') {
            await this.startMicrophone();
        } else if (sourceType === 'system') {
            await this.startSystemAudio();
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

