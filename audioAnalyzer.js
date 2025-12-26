/**
 * Audio Analyzer Module
 * Analyzes audio data to extract metadata for visualizer selection
 * ENHANCED: Features transient detection and multi-band {avg, peak} tracking
 */
export class AudioAnalyzer {
    constructor(audioCapture) {
        this.audioCapture = audioCapture;
        this.history = [];
        this.historySize = 60;

        // Transient tracking
        this.bandHistory = {
            subBass: new Float32Array(10).fill(0),
            bass: new Float32Array(10).fill(0),
            mid: new Float32Array(10).fill(0),
            highMid: new Float32Array(10).fill(0),
            treble: new Float32Array(10).fill(0)
        };
    }

    /**
     * Analyze current audio data and extract metadata
     */
    analyze() {
        const audioData = this.audioCapture.getAudioData();
        if (!audioData) return null;

        const { frequencyData, timeData, bufferLength, sampleRate } = audioData;

        // Base metrics
        const amplitude = this.calculateAmplitude(timeData);
        const loudness = this.calculateLoudness(amplitude);
        const dominantFreq = this.findDominantFrequency(frequencyData, sampleRate, bufferLength);

        // Advanced metrics
        const energyBands = this.calculateEnergyBands(frequencyData, bufferLength);
        const rhythm = this.calculateRhythm(amplitude, energyBands.subBass.peak);
        const spectralCentroid = this.calculateSpectralCentroid(frequencyData, sampleRate, bufferLength);
        const spectralSpread = this.calculateSpectralSpread(frequencyData, spectralCentroid, sampleRate, bufferLength);

        const metadata = {
            amplitude,
            loudness,
            dominantFreq,
            energyBands,
            rhythm,
            spectralCentroid,
            spectralSpread,
            timestamp: Date.now()
        };

        // History management
        this.history.push(metadata);
        if (this.history.length > this.historySize) this.history.shift();

        return metadata;
    }

    calculateAmplitude(timeData) {
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / timeData.length);
    }

    calculateLoudness(amplitude) {
        if (amplitude <= 0) return -Infinity;
        return 20 * Math.log10(amplitude);
    }

    findDominantFrequency(frequencyData, sampleRate, bufferLength) {
        let maxIndex = 0;
        let maxValue = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        const nyquist = sampleRate / 2;
        return {
            frequency: (maxIndex * nyquist) / bufferLength,
            amplitude: maxValue / 255,
            index: maxIndex
        };
    }

    calculateEnergyBands(frequencyData, bufferLength) {
        const bands = {
            subBass: { avg: 0, peak: 0, transient: 0 },
            bass: { avg: 0, peak: 0, transient: 0 },
            mid: { avg: 0, peak: 0, transient: 0 },
            highMid: { avg: 0, peak: 0, transient: 0 },
            treble: { avg: 0, peak: 0, transient: 0 }
        };

        const counts = { subBass: 0, bass: 0, mid: 0, highMid: 0, treble: 0 };
        const nyquist = 22050;
        const binWidth = nyquist / bufferLength;

        for (let i = 0; i < frequencyData.length; i++) {
            const freq = i * binWidth;
            const energy = frequencyData[i] / 255;

            let band;
            if (freq < 60) band = 'subBass';
            else if (freq < 250) band = 'bass';
            else if (freq < 2000) band = 'mid';
            else if (freq < 6000) band = 'highMid';
            else band = 'treble';

            bands[band].avg += energy;
            bands[band].peak = Math.max(bands[band].peak, energy);
            counts[band]++;
        }

        for (const key in bands) {
            if (counts[key] > 0) bands[key].avg /= counts[key];

            // Transient / Flux detection
            const hist = this.bandHistory[key];
            const avgHist = hist.reduce((a, b) => a + b) / hist.length;
            bands[key].transient = Math.max(0, bands[key].peak - avgHist * 1.5);

            // Update history
            hist.copyWithin(1, 0);
            hist[0] = bands[key].peak;

            // Boost peak for more punchy response
            bands[key].peak = Math.min(1.0, Math.pow(bands[key].peak, 1.1) * 1.3);
        }

        return bands;
    }

    calculateRhythm(amplitude, subBassPeak) {
        if (this.history.length < 2) return { variance: 0, beat: false };

        const recent = this.history.slice(-10);
        const avgAmp = recent.reduce((sum, m) => sum + m.amplitude, 0) / recent.length;

        // Multi-stage beat detection: Loudness spike OR Bass spike
        const ampTrigger = amplitude > avgAmp * 1.4 && amplitude > 0.15;
        const bassTrigger = subBassPeak > 0.7; // Raw hit

        return {
            beat: ampTrigger || bassTrigger,
            intensity: Math.max(amplitude, subBassPeak),
            stability: 1.0 - (Math.abs(amplitude - avgAmp) / (avgAmp + 0.001))
        };
    }

    calculateSpectralCentroid(frequencyData, sampleRate, bufferLength) {
        let weightedSum = 0;
        let magnitudeSum = 0;
        const nyquist = sampleRate / 2;
        for (let i = 0; i < frequencyData.length; i++) {
            const magnitude = frequencyData[i] / 255;
            weightedSum += ((i * nyquist) / bufferLength) * magnitude;
            magnitudeSum += magnitude;
        }
        return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }

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
}
