/**
 * Audio Analyzer Module
 * Analyzes audio data to extract metadata for visualizer selection
 */
export class AudioAnalyzer {
    constructor(audioCapture) {
        this.audioCapture = audioCapture;
        this.history = [];
        this.historySize = 60; // Keep last 60 frames for analysis
    }

    /**
     * Analyze current audio data and extract metadata
     */
    analyze() {
        const audioData = this.audioCapture.getAudioData();
        if (!audioData) {
            return null;
        }

        const { frequencyData, timeData, bufferLength, sampleRate } = audioData;

        // Calculate amplitude (0-1)
        const amplitude = this.calculateAmplitude(timeData);
        
        // Calculate loudness in dB
        const loudness = this.calculateLoudness(amplitude);
        
        // Find dominant frequency
        const dominantFreq = this.findDominantFrequency(frequencyData, sampleRate, bufferLength);
        
        // Calculate frequency distribution
        const freqDistribution = this.analyzeFrequencyDistribution(frequencyData);
        
        // Calculate energy in different frequency bands
        const energyBands = this.calculateEnergyBands(frequencyData, bufferLength);
        
        // Calculate rhythm/tempo indicators
        const rhythm = this.calculateRhythm(amplitude);
        
        // Calculate spectral centroid
        const spectralCentroid = this.calculateSpectralCentroid(frequencyData, sampleRate, bufferLength);
        
        // Calculate spectral spread
        const spectralSpread = this.calculateSpectralSpread(frequencyData, spectralCentroid, sampleRate, bufferLength);

        const metadata = {
            amplitude,
            loudness,
            dominantFreq,
            freqDistribution,
            energyBands,
            rhythm,
            spectralCentroid,
            spectralSpread,
            timestamp: Date.now()
        };

        // Add to history
        this.history.push(metadata);
        if (this.history.length > this.historySize) {
            this.history.shift();
        }

        return metadata;
    }

    /**
     * Calculate amplitude from time domain data
     */
    calculateAmplitude(timeData) {
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sum += Math.abs(normalized);
        }
        return sum / timeData.length;
    }

    /**
     * Calculate loudness in dB
     */
    calculateLoudness(amplitude) {
        if (amplitude === 0) return -Infinity;
        return 20 * Math.log10(amplitude);
    }

    /**
     * Find dominant frequency
     */
    findDominantFrequency(frequencyData, sampleRate, bufferLength) {
        let maxIndex = 0;
        let maxValue = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }

        // Convert bin index to frequency
        const nyquist = sampleRate / 2;
        const frequency = (maxIndex * nyquist) / bufferLength;
        
        return {
            frequency,
            amplitude: maxValue / 255,
            index: maxIndex
        };
    }

    /**
     * Analyze frequency distribution
     */
    analyzeFrequencyDistribution(frequencyData) {
        const lowEnd = Math.floor(frequencyData.length * 0.1);
        const midEnd = Math.floor(frequencyData.length * 0.5);
        
        let lowSum = 0, midSum = 0, highSum = 0;
        
        for (let i = 0; i < lowEnd; i++) {
            lowSum += frequencyData[i];
        }
        for (let i = lowEnd; i < midEnd; i++) {
            midSum += frequencyData[i];
        }
        for (let i = midEnd; i < frequencyData.length; i++) {
            highSum += frequencyData[i];
        }
        
        const total = lowSum + midSum + highSum;
        
        return {
            low: total > 0 ? lowSum / total : 0,
            mid: total > 0 ? midSum / total : 0,
            high: total > 0 ? highSum / total : 0,
            distribution: total > 0 ? (lowSum > highSum ? 'bass' : highSum > midSum ? 'treble' : 'balanced') : 'silent'
        };
    }

    /**
     * Calculate energy in different frequency bands
     */
    calculateEnergyBands(frequencyData, bufferLength) {
        const bands = {
            subBass: 0,      // 20-60 Hz
            bass: 0,         // 60-250 Hz
            lowMid: 0,       // 250-500 Hz
            mid: 0,          // 500-2000 Hz
            highMid: 0,      // 2000-4000 Hz
            presence: 0,    // 4000-6000 Hz
            brilliance: 0   // 6000-20000 Hz
        };

        const nyquist = 22050; // Assuming 44.1kHz sample rate
        const binWidth = nyquist / bufferLength;

        for (let i = 0; i < frequencyData.length; i++) {
            const freq = i * binWidth;
            const energy = frequencyData[i] / 255;
            
            if (freq >= 20 && freq < 60) bands.subBass += energy;
            else if (freq >= 60 && freq < 250) bands.bass += energy;
            else if (freq >= 250 && freq < 500) bands.lowMid += energy;
            else if (freq >= 500 && freq < 2000) bands.mid += energy;
            else if (freq >= 2000 && freq < 4000) bands.highMid += energy;
            else if (freq >= 4000 && freq < 6000) bands.presence += energy;
            else if (freq >= 6000) bands.brilliance += energy;
        }

        return bands;
    }

    /**
     * Calculate rhythm indicators
     */
    calculateRhythm(amplitude) {
        if (this.history.length < 2) {
            return { variance: 0, beat: false };
        }

        // Calculate variance in amplitude
        const amplitudes = this.history.map(m => m.amplitude);
        const mean = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
        const variance = amplitudes.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amplitudes.length;
        
        // Detect beats (sudden amplitude increases)
        const recent = this.history.slice(-5);
        const avgRecent = recent.reduce((sum, m) => sum + m.amplitude, 0) / recent.length;
        const beat = amplitude > avgRecent * 1.5 && amplitude > 0.1;

        return {
            variance,
            beat,
            stability: 1 - Math.min(variance, 1)
        };
    }

    /**
     * Calculate spectral centroid (brightness indicator)
     */
    calculateSpectralCentroid(frequencyData, sampleRate, bufferLength) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        const nyquist = sampleRate / 2;

        for (let i = 0; i < frequencyData.length; i++) {
            const freq = (i * nyquist) / bufferLength;
            const magnitude = frequencyData[i] / 255;
            weightedSum += freq * magnitude;
            magnitudeSum += magnitude;
        }

        return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }

    /**
     * Calculate spectral spread (width of frequency distribution)
     */
    calculateSpectralSpread(frequencyData, centroid, sampleRate, bufferLength) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        const nyquist = sampleRate / 2;

        for (let i = 0; i < frequencyData.length; i++) {
            const freq = (i * nyquist) / bufferLength;
            const magnitude = frequencyData[i] / 255;
            weightedSum += Math.pow(freq - centroid, 2) * magnitude;
            magnitudeSum += magnitude;
        }

        return magnitudeSum > 0 ? Math.sqrt(weightedSum / magnitudeSum) : 0;
    }

    /**
     * Get average metadata over recent history
     */
    getAverageMetadata() {
        if (this.history.length === 0) return null;

        const recent = this.history.slice(-10); // Last 10 frames
        const avg = {
            amplitude: recent.reduce((sum, m) => sum + m.amplitude, 0) / recent.length,
            loudness: recent.reduce((sum, m) => sum + m.loudness, 0) / recent.length,
            spectralCentroid: recent.reduce((sum, m) => sum + m.spectralCentroid, 0) / recent.length,
            spectralSpread: recent.reduce((sum, m) => sum + m.spectralSpread, 0) / recent.length
        };

        return avg;
    }
}

