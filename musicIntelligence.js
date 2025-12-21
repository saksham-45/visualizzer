/**
 * Music Intelligence Module
 * Predictive audio analysis for intelligent visualization control
 * Detects beats, drops, sections, and predicts upcoming intensity changes
 */

export class MusicIntelligence {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;

        // Beat detection
        this.beatHistory = [];
        this.beatHistorySize = 60;
        this.lastBeatTime = 0;
        this.beatInterval = 500; // Average time between beats (ms)
        this.beatConfidence = 0;

        // Energy tracking for drop detection
        this.energyHistory = [];
        this.energyHistorySize = 120; // 2 seconds at 60fps
        this.longEnergyHistory = [];
        this.longEnergyHistorySize = 600; // 10 seconds

        // Spectral flux for onset detection
        this.previousSpectrum = null;
        this.spectralFluxHistory = [];
        this.spectralFluxHistorySize = 30;

        // Section detection
        this.currentSection = 'unknown';
        this.sectionHistory = [];
        this.sectionConfidence = 0;

        // Drop prediction
        this.isBuildup = false;
        this.buildupStartTime = 0;
        this.buildupEnergy = 0;
        this.predictedDropTime = 0;
        this.dropProbability = 0;

        // Intensity curve
        this.intensityCurve = [];
        this.lookaheadFrames = 30; // Predict 0.5 seconds ahead

        // Pattern learning
        this.patterns = {
            beatPattern: [],
            energyPattern: [],
            spectralPattern: []
        };

        // Tempo detection
        this.tempo = 120;
        this.tempoConfidence = 0;
        this.tempoHistory = [];

        // Visualization recommendations
        this.recommendedVisualizer = null;
        this.recommendedZoom = 1.0;
        this.recommendedSpread = 1.0;
        this.recommendedIntensity = 1.0;

        // Effect triggers
        this.pendingEffects = [];
    }

    /**
     * Main update function - call every frame
     */
    update(metadata) {
        if (!metadata) return;

        const now = performance.now();

        // Update all tracking
        this.updateBeatDetection(metadata, now);
        this.updateEnergyTracking(metadata);
        this.updateSpectralFlux(metadata);
        this.updateSectionDetection(metadata);
        this.updateDropPrediction(metadata, now);
        this.updateTempoDetection(now);
        this.updateIntensityCurve(metadata);
        this.updateRecommendations(metadata, now);

        return this.getState();
    }

    /**
     * Enhanced beat detection with prediction
     */
    updateBeatDetection(metadata, now) {
        const amplitude = metadata.amplitude || 0;
        const bass = metadata.energyBands?.bass || 0;
        const rhythm = metadata.rhythm || {};

        // Store beat history
        this.beatHistory.push({
            time: now,
            amplitude,
            bass,
            isBeat: rhythm.beat || false
        });

        if (this.beatHistory.length > this.beatHistorySize) {
            this.beatHistory.shift();
        }

        // Detect beat using multiple indicators
        const recentBeats = this.beatHistory.filter(b => b.isBeat);

        if (rhythm.beat && now - this.lastBeatTime > 150) {
            // Calculate beat interval
            const timeSinceLast = now - this.lastBeatTime;
            this.beatInterval = this.beatInterval * 0.7 + timeSinceLast * 0.3;
            this.lastBeatTime = now;

            // Store for tempo calculation
            this.tempoHistory.push(timeSinceLast);
            if (this.tempoHistory.length > 16) {
                this.tempoHistory.shift();
            }
        }

        // Predict next beat
        const timeSinceLastBeat = now - this.lastBeatTime;
        const beatPhase = (timeSinceLastBeat % this.beatInterval) / this.beatInterval;

        // High confidence when we're close to expected beat time
        this.beatConfidence = beatPhase > 0.8 ? (beatPhase - 0.8) * 5 : 0;

        // Predict if beat is imminent
        this.nextBeatPrediction = this.lastBeatTime + this.beatInterval;
        this.beatImminent = (this.nextBeatPrediction - now) < 100 && this.beatInterval < 1000;
    }

    /**
     * Track energy over time for drop detection
     */
    updateEnergyTracking(metadata) {
        const totalEnergy = this.calculateTotalEnergy(metadata);

        this.energyHistory.push(totalEnergy);
        if (this.energyHistory.length > this.energyHistorySize) {
            this.energyHistory.shift();
        }

        this.longEnergyHistory.push(totalEnergy);
        if (this.longEnergyHistory.length > this.longEnergyHistorySize) {
            this.longEnergyHistory.shift();
        }
    }

    calculateTotalEnergy(metadata) {
        const bands = metadata.energyBands || {};
        return (
            (bands.subBass || 0) * 1.5 +
            (bands.bass || 0) * 1.3 +
            (bands.lowMid || 0) +
            (bands.mid || 0) +
            (bands.highMid || 0) * 0.8 +
            (bands.presence || 0) * 0.6 +
            (bands.brilliance || 0) * 0.4
        );
    }

    /**
     * Spectral flux for onset/transition detection
     */
    updateSpectralFlux(metadata) {
        const currentSpectrum = metadata.energyBands || {};

        if (this.previousSpectrum) {
            let flux = 0;

            for (const band in currentSpectrum) {
                const diff = (currentSpectrum[band] || 0) - (this.previousSpectrum[band] || 0);
                flux += Math.max(0, diff); // Only positive changes (onsets)
            }

            this.spectralFluxHistory.push(flux);
            if (this.spectralFluxHistory.length > this.spectralFluxHistorySize) {
                this.spectralFluxHistory.shift();
            }
        }

        this.previousSpectrum = { ...currentSpectrum };
    }

    /**
     * Detect music sections (verse, chorus, drop, buildup)
     */
    updateSectionDetection(metadata) {
        const energy = this.calculateTotalEnergy(metadata);
        const avgEnergy = this.getAverageEnergy(this.energyHistory);
        const longAvgEnergy = this.getAverageEnergy(this.longEnergyHistory);
        const energyVariance = this.getEnergyVariance();

        const bass = metadata.energyBands?.bass || 0;
        const treble = metadata.energyBands?.brilliance || 0;
        const amplitude = metadata.amplitude || 0;

        let newSection = this.currentSection;
        let confidence = 0;

        // Drop detection - high energy, strong bass, high amplitude
        if (energy > longAvgEnergy * 1.5 && bass > 0.3 && amplitude > 0.5) {
            newSection = 'drop';
            confidence = 0.8;
        }
        // Buildup detection - rising energy, moderate amplitude, high treble
        else if (this.isEnergyRising() && treble > bass * 1.2 && amplitude > 0.2) {
            newSection = 'buildup';
            confidence = 0.7;
        }
        // Chorus detection - high energy but not as extreme as drop
        else if (energy > longAvgEnergy * 1.2 && amplitude > 0.35) {
            newSection = 'chorus';
            confidence = 0.6;
        }
        // Breakdown/Bridge - low energy, atmospheric
        else if (energy < longAvgEnergy * 0.5 && amplitude < 0.2) {
            newSection = 'breakdown';
            confidence = 0.5;
        }
        // Verse - moderate energy
        else if (energy > longAvgEnergy * 0.7 && energy < longAvgEnergy * 1.2) {
            newSection = 'verse';
            confidence = 0.4;
        }
        // Intro/Outro - very low energy
        else if (energy < longAvgEnergy * 0.3) {
            newSection = 'intro';
            confidence = 0.3;
        }

        // Only update if confidence is higher than current
        if (confidence > this.sectionConfidence * 0.8) {
            this.currentSection = newSection;
            this.sectionConfidence = confidence;

            // Track section changes
            if (this.sectionHistory.length === 0 ||
                this.sectionHistory[this.sectionHistory.length - 1].section !== newSection) {
                this.sectionHistory.push({
                    section: newSection,
                    time: performance.now(),
                    confidence
                });
            }
        }

        // Decay confidence over time
        this.sectionConfidence *= 0.99;
    }

    /**
     * Predict upcoming drops
     */
    updateDropPrediction(metadata, now) {
        const energy = this.calculateTotalEnergy(metadata);
        const avgEnergy = this.getAverageEnergy(this.energyHistory);

        // Detect buildup pattern
        if (this.isEnergyRising() && energy > avgEnergy * 0.5) {
            if (!this.isBuildup) {
                this.isBuildup = true;
                this.buildupStartTime = now;
                this.buildupEnergy = energy;
            }

            // Calculate how long buildup has been going
            const buildupDuration = now - this.buildupStartTime;

            // Buildups typically last 4-16 seconds before drop
            if (buildupDuration > 2000 && buildupDuration < 20000) {
                // Rising energy suggests drop is coming
                const energyRise = energy / this.buildupEnergy;

                // Typical drop happens after 4-8 beats of buildup
                const expectedDropTime = this.buildupStartTime + 8000; // 8 seconds average

                this.dropProbability = Math.min(1, (buildupDuration / 6000) * energyRise * 0.5);
                this.predictedDropTime = expectedDropTime;

                // Check for sudden energy increase (possible filter sweep end)
                const fluxAvg = this.getAverageFlux();
                if (fluxAvg > 0.5) {
                    this.dropProbability = Math.min(1, this.dropProbability + 0.3);
                }
            }
        } else if (energy > avgEnergy * 1.5) {
            // Drop happened!
            if (this.isBuildup && this.dropProbability > 0.3) {
                this.triggerEffect('drop', {
                    intensity: this.dropProbability,
                    duration: 1000
                });
            }
            this.isBuildup = false;
            this.dropProbability = 0;
        } else if (energy < avgEnergy * 0.7) {
            this.isBuildup = false;
            this.dropProbability *= 0.95;
        }
    }

    /**
     * Detect tempo from beat intervals
     */
    updateTempoDetection(now) {
        if (this.tempoHistory.length < 4) return;

        // Calculate average beat interval
        const avgInterval = this.tempoHistory.reduce((a, b) => a + b, 0) / this.tempoHistory.length;

        // Convert to BPM
        const bpm = 60000 / avgInterval;

        // Filter out unrealistic tempos
        if (bpm >= 60 && bpm <= 200) {
            this.tempo = this.tempo * 0.9 + bpm * 0.1;
            this.tempoConfidence = Math.min(1, this.tempoHistory.length / 8);
        }
    }

    /**
     * Generate intensity curve for lookahead
     */
    updateIntensityCurve(metadata) {
        const currentIntensity = this.calculateIntensity(metadata);

        this.intensityCurve.push(currentIntensity);
        if (this.intensityCurve.length > this.lookaheadFrames) {
            this.intensityCurve.shift();
        }

        // Predict future intensity based on trend
        if (this.intensityCurve.length >= 10) {
            const recentTrend = this.calculateTrend(this.intensityCurve.slice(-10));

            // If we're in a buildup and approaching predicted drop
            if (this.isBuildup && this.dropProbability > 0.5) {
                // Exponentially increase predicted intensity
                this.predictedIntensity = currentIntensity * (1 + this.dropProbability);
            } else {
                // Linear prediction based on trend
                this.predictedIntensity = currentIntensity + recentTrend * 10;
            }
        }
    }

    calculateIntensity(metadata) {
        const energy = this.calculateTotalEnergy(metadata);
        const amplitude = metadata.amplitude || 0;
        const beat = metadata.rhythm?.beat ? 0.3 : 0;

        return (energy * 0.4 + amplitude * 0.4 + beat) * 10;
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        const n = values.length;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    /**
     * Update visualization recommendations
     */
    updateRecommendations(metadata, now) {
        const intensity = this.calculateIntensity(metadata);
        const predictedIntensity = this.predictedIntensity || intensity;
        const section = this.currentSection;

        // Zoom recommendation
        // Zoom in during calm/buildup, zoom out on drops
        if (section === 'drop') {
            this.recommendedZoom = 0.7 - intensity * 0.1; // Zoom out, wide view
        } else if (section === 'buildup') {
            // Gradually zoom in during buildup
            const buildupProgress = Math.min(1, (now - this.buildupStartTime) / 8000);
            this.recommendedZoom = 1.0 + buildupProgress * 0.5; // Zoom in
        } else if (section === 'breakdown' || section === 'intro') {
            this.recommendedZoom = 1.2; // Close, intimate
        } else {
            this.recommendedZoom = 1.0;
        }

        // Spread recommendation
        // Spread on high energy, contract on low energy
        this.recommendedSpread = 0.5 + intensity * 0.5;

        // If drop is imminent, prepare for explosion
        if (this.dropProbability > 0.7) {
            this.recommendedSpread *= 0.7; // Contract before explosion
        }

        // Intensity recommendation
        this.recommendedIntensity = Math.max(0.3, Math.min(2.0, intensity));

        // Visualizer recommendation
        this.recommendedVisualizer = this.selectVisualizerForSection(section, metadata);

        // Effect triggers
        if (metadata.rhythm?.beat) {
            this.triggerEffect('beat', { intensity: metadata.amplitude });
        }

        // Only trigger anticipation ring during buildups and rarely to avoid clutter
        /* Disabled per user request (concentric lines appearing too often)
        if (this.beatImminent && this.beatConfidence > 0.8 && this.isBuildup && Math.random() > 0.9) {
            this.triggerEffect('beatAnticipation', {
                timeUntilBeat: this.nextBeatPrediction - now,
                // Pass a random color parameter to avoid the "yellow ring" monotony
                color: null
            });
        }
        */
    }

    selectVisualizerForSection(section, metadata) {
        const bass = metadata.energyBands?.bass || 0;
        const treble = metadata.energyBands?.brilliance || 0;

        const visualizerMappings = {
            drop: ['mercuryOrbs', 'liquidMetal', 'starburst', 'combined'],
            buildup: ['tunnel', 'spiral1', 'warptunnel', 'nestedSpirals'],
            chorus: ['kaleidoscope', 'mandala', 'circularHarmonic', 'tornado'],
            verse: ['flowing', 'wave', 'appleWaveform', 'ripple'],
            breakdown: ['particleNebula', 'fractal', 'mathematicalSpiral'],
            intro: ['depthlines', 'horizongrid', 'flowing'],
            unknown: ['tornado', 'cyclone', 'wave']
        };

        const options = visualizerMappings[section] || visualizerMappings.unknown;

        // Weight selection by frequency characteristics
        if (bass > treble * 1.5) {
            // Bass-heavy: prefer spirals and vortex
            return options.find(v => v.includes('spiral') || v.includes('tornado')) || options[0];
        } else if (treble > bass * 1.2) {
            // Treble-heavy: prefer particles and fractals
            return options.find(v => v.includes('particle') || v.includes('fractal')) || options[0];
        }

        // Random selection from appropriate options
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * Queue an effect to be triggered
     */
    triggerEffect(type, params = {}) {
        this.pendingEffects.push({
            type,
            params,
            time: performance.now()
        });

        // Clean old effects
        this.pendingEffects = this.pendingEffects.filter(e =>
            performance.now() - e.time < 1000
        );
    }

    /**
     * Get pending effects and clear them
     */
    getPendingEffects() {
        const effects = [...this.pendingEffects];
        this.pendingEffects = [];
        return effects;
    }

    // Helper methods
    getAverageEnergy(history) {
        if (history.length === 0) return 0;
        return history.reduce((a, b) => a + b, 0) / history.length;
    }

    getAverageFlux() {
        if (this.spectralFluxHistory.length === 0) return 0;
        return this.spectralFluxHistory.reduce((a, b) => a + b, 0) / this.spectralFluxHistory.length;
    }

    getEnergyVariance() {
        const avg = this.getAverageEnergy(this.energyHistory);
        if (this.energyHistory.length === 0) return 0;

        const sumSquaredDiff = this.energyHistory.reduce((sum, e) =>
            sum + Math.pow(e - avg, 2), 0
        );

        return sumSquaredDiff / this.energyHistory.length;
    }

    isEnergyRising() {
        if (this.energyHistory.length < 20) return false;

        const recent = this.energyHistory.slice(-10);
        const older = this.energyHistory.slice(-20, -10);

        const recentAvg = this.getAverageEnergy(recent);
        const olderAvg = this.getAverageEnergy(older);

        return recentAvg > olderAvg * 1.1;
    }

    /**
     * Get the current intelligence state
     */
    getState() {
        return {
            // Beat info
            beatConfidence: this.beatConfidence,
            beatInterval: this.beatInterval,
            beatImminent: this.beatImminent,
            nextBeatPrediction: this.nextBeatPrediction,
            tempo: this.tempo,
            tempoConfidence: this.tempoConfidence,

            // Section info
            currentSection: this.currentSection,
            sectionConfidence: this.sectionConfidence,

            // Drop prediction
            isBuildup: this.isBuildup,
            dropProbability: this.dropProbability,
            predictedDropTime: this.predictedDropTime,

            // Intensity
            intensityCurve: this.intensityCurve,
            predictedIntensity: this.predictedIntensity,

            // Recommendations
            recommendedVisualizer: this.recommendedVisualizer,
            recommendedZoom: this.recommendedZoom,
            recommendedSpread: this.recommendedSpread,
            recommendedIntensity: this.recommendedIntensity,

            // Effects
            pendingEffects: this.pendingEffects
        };
    }

    /**
     * Get camera movement recommendations
     */
    getCameraRecommendation(currentTime) {
        const state = this.getState();

        return {
            // Zoom factor (1.0 = normal, <1 = zoomed out, >1 = zoomed in)
            zoom: state.recommendedZoom,

            // Camera movement speed multiplier
            movementSpeed: state.currentSection === 'drop' ? 2.0 :
                state.currentSection === 'buildup' ? 0.5 : 1.0,

            // Orbit speed multiplier
            orbitSpeed: state.currentSection === 'drop' ? 1.5 :
                state.currentSection === 'breakdown' ? 0.3 : 1.0,

            // Camera shake intensity
            shakeIntensity: state.currentSection === 'drop' ? 0.3 : 0,

            // FOV adjustment (for dramatic effect)
            fovMultiplier: state.currentSection === 'drop' ? 1.2 :
                state.currentSection === 'buildup' ? 0.9 : 1.0,

            // Should camera do a dramatic fly-through?
            doFlyThrough: state.dropProbability > 0.9,

            // Time until next major beat
            timeUntilBeat: state.beatImminent ? state.nextBeatPrediction - currentTime : null
        };
    }

    /**
     * Get spread animation recommendations  
     */
    getSpreadRecommendation() {
        return {
            // How spread out elements should be (0 = contracted, 1 = normal, 2 = expanded)
            spread: this.recommendedSpread,

            // Should elements be contracting (pre-drop) or expanding (post-drop)?
            direction: this.isBuildup ? 'contract' :
                this.currentSection === 'drop' ? 'expand' : 'neutral',

            // Animation speed
            animationSpeed: this.currentSection === 'drop' ? 3.0 : 1.0,

            // Pulse with beat?
            pulseWithBeat: this.currentSection !== 'breakdown'
        };
    }
}
