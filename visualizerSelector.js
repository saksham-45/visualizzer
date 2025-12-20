/**
 * Visualizer Selector Module
 * Intelligently selects the best visualizer based on audio metadata
 * Enhanced with fluid visualizer support
 */
export class VisualizerSelector {
    constructor() {
        this.lastSelection = null;
        this.selectionHistory = [];
        this.changeThreshold = 0.15;
        this.pendingChange = null;
        this.stabilityWindow = 10;
        this.stabilityHistory = [];
        this.lastSwitchTime = Date.now();
        this.targetTimePerVisualizer = 6500; // 6.5 seconds per visualizer
        this.switchCount = 0;

        // All available visualizers (classic + 3D + fluid visualizers)
        this.allVisualizers = [
            // Classic mesh visualizers
            'tornado', 'cyclone', 'spiral1', 'spiral2', 'spiral3', 'spiral4',
            'tracing', 'crossing', 'combined', 'kaleidoscope', 'mandala',
            'fractal', 'tunnel', 'morphing',
            // 3D camera visualizers
            'depthlines', 'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid',
            // NEW: Fluid visualizers (WebGL2)
            'mercuryOrbs', 'liquidMetal', 'metallicNebula'
        ];
        this.currentIndex = 0;
        this.cycleMode = true; // Always cycle through all

        // Fluid visualizers for special occasions (drops, high energy)
        this.fluidVisualizers = [
            'mercuryOrbs', 'liquidMetal', 'metallicNebula'
        ];
    }

    /**
     * Select visualizer - cycles through all equally
     */
    selectVisualizer(metadata) {
        if (!metadata || metadata.amplitude < 0.01) {
            // Keep current during silence, but still cycle
            const timeSinceLastSwitch = Date.now() - this.lastSwitchTime;
            if (timeSinceLastSwitch >= this.targetTimePerVisualizer) {
                this.currentIndex = (this.currentIndex + 1) % this.allVisualizers.length;
                this.lastSelection = this.allVisualizers[this.currentIndex];
                this.lastSwitchTime = Date.now();
            }
            return this.lastSelection || this.allVisualizers[0];
        }

        const timeSinceLastSwitch = Date.now() - this.lastSwitchTime;
        const shouldSwitchByTime = timeSinceLastSwitch >= this.targetTimePerVisualizer;

        // Check for beat detection - switch early on beats
        const hasBeat = metadata.rhythm && metadata.rhythm.beat;
        const canSwitchOnBeat = hasBeat && timeSinceLastSwitch > 2000; // At least 2 seconds before beat switch

        // Cycle through all visualizers EQUALLY - ignore scores, just cycle
        if (shouldSwitchByTime || canSwitchOnBeat) {
            // Move to next visualizer in cycle
            this.currentIndex = (this.currentIndex + 1) % this.allVisualizers.length;
            const nextVisualizer = this.allVisualizers[this.currentIndex];

            this.lastSwitchTime = Date.now();
            this.switchCount++;
            this.lastSelection = nextVisualizer;
            return nextVisualizer;
        }

        // Keep current visualizer
        if (!this.lastSelection) {
            this.lastSelection = this.allVisualizers[this.currentIndex];
            this.lastSwitchTime = Date.now();
        }

        return this.lastSelection;
    }

    /**
     * Check if current moment is relatively quiet (good for transitions)
     */
    isQuietMoment() {
        if (this.stabilityHistory.length < 3) return false;

        // Check if amplitude is below threshold (quieter moment)
        const recentAmplitudes = this.stabilityHistory.slice(-5).map(h => h.amplitude);
        const avgAmplitude = recentAmplitudes.reduce((a, b) => a + b, 0) / recentAmplitudes.length;

        return avgAmplitude < this.quietMomentThreshold;
    }

    /**
     * Check if current moment is stable (low variance, good for transitions)
     */
    isStableMoment() {
        if (this.stabilityHistory.length < 5) return false;

        const recent = this.stabilityHistory.slice(-5);
        const stabilities = recent.map(h => h.stability);
        const avgStability = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;

        // High stability means low variance - good for transitions
        return avgStability > 0.6;
    }

    /**
     * Score visualizers based on audio characteristics
     */
    scoreWave(metadata) {
        // Good for balanced audio with moderate dynamics
        let score = 0.5;

        // Prefer for rhythmic content
        if (metadata.rhythm && metadata.rhythm.variance > 0.1) {
            score += 0.2;
        }

        // Prefer for moderate amplitude
        if (metadata.amplitude > 0.2 && metadata.amplitude < 0.7) {
            score += 0.2;
        }

        return score;
    }

    scoreCircle(metadata) {
        // Good for bass-heavy or low-frequency content
        let score = 0.4;

        if (metadata.freqDistribution) {
            // Prefer for bass-heavy music
            if (metadata.freqDistribution.low > 0.4) {
                score += 0.4;
            }

            // Prefer for balanced distribution
            if (metadata.freqDistribution.distribution === 'balanced') {
                score += 0.2;
            }
        }

        // Prefer for higher amplitude
        if (metadata.amplitude > 0.3) {
            score += 0.2;
        }

        return score;
    }

    scoreBars(metadata) {
        // Good for complex frequency content
        let score = 0.5;

        if (metadata.energyBands) {
            // Prefer when multiple bands have energy
            const activeBands = Object.values(metadata.energyBands).filter(e => e > 0.1).length;
            if (activeBands >= 4) {
                score += 0.3;
            }
        }

        // Prefer for wide spectral spread
        if (metadata.spectralSpread > 2000) {
            score += 0.2;
        }

        // Prefer for moderate to high amplitude
        if (metadata.amplitude > 0.25) {
            score += 0.2;
        }

        return score;
    }

    scoreParticles(metadata) {
        // Good for high-frequency, bright content
        let score = 0.4;

        // Prefer for high spectral centroid (brightness)
        if (metadata.spectralCentroid > 3000) {
            score += 0.4;
        }

        if (metadata.freqDistribution) {
            // Prefer for treble-heavy content
            if (metadata.freqDistribution.high > 0.4) {
                score += 0.3;
            }
        }

        // Prefer for dynamic content
        if (metadata.rhythm && metadata.rhythm.variance > 0.15) {
            score += 0.2;
        }

        return score;
    }

    scoreSpiral(metadata) {
        // Good for melodic, flowing content
        let score = 0.4;

        // Prefer for moderate spectral spread
        if (metadata.spectralSpread > 1000 && metadata.spectralSpread < 3000) {
            score += 0.3;
        }

        // Prefer for stable, flowing audio
        if (metadata.rhythm && metadata.rhythm.stability > 0.7) {
            score += 0.3;
        }

        // Prefer for mid-range frequencies
        if (metadata.freqDistribution && metadata.freqDistribution.mid > 0.35) {
            score += 0.2;
        }

        return score;
    }

    scoreSpectrum(metadata) {
        // Good for complex, full-spectrum content
        let score = 0.5;

        if (metadata.energyBands) {
            // Prefer when all bands have significant energy
            const totalEnergy = Object.values(metadata.energyBands).reduce((a, b) => a + b, 0);
            if (totalEnergy > 2.0) {
                score += 0.3;
            }
        }

        // Prefer for wide frequency range
        if (metadata.spectralSpread > 2500) {
            score += 0.2;
        }

        // Prefer for high amplitude
        if (metadata.amplitude > 0.4) {
            score += 0.2;
        }

        // Prefer for balanced distribution
        if (metadata.freqDistribution && metadata.freqDistribution.distribution === 'balanced') {
            score += 0.2;
        }

        return score;
    }

    scoreTornado(metadata) {
        // Good for dynamic, energetic content
        let score = 0.4;

        // Prefer for high amplitude and energy
        if (metadata.amplitude > 0.4) {
            score += 0.4;
        }

        if (metadata.energyBands) {
            const totalEnergy = Object.values(metadata.energyBands).reduce((a, b) => a + b, 0);
            if (totalEnergy > 2.5) {
                score += 0.3;
            }
        }

        // Prefer for dynamic rhythm
        if (metadata.rhythm && metadata.rhythm.variance > 0.2) {
            score += 0.3;
        }

        return score;
    }

    scoreCyclone(metadata) {
        // Good for swirling, rotating content
        let score = 0.4;

        // Prefer for balanced frequency distribution
        if (metadata.freqDistribution && metadata.freqDistribution.distribution === 'balanced') {
            score += 0.4;
        }

        // Prefer for moderate to high amplitude
        if (metadata.amplitude > 0.3) {
            score += 0.3;
        }

        // Prefer for wide spectral spread
        if (metadata.spectralSpread > 2000) {
            score += 0.3;
        }

        return score;
    }

    scoreFlowing(metadata) {
        // Good for smooth, flowing content
        let score = 0.5;

        // Prefer for stable, flowing audio
        if (metadata.rhythm && metadata.rhythm.stability > 0.7) {
            score += 0.4;
        }

        // Prefer for moderate amplitude
        if (metadata.amplitude > 0.25 && metadata.amplitude < 0.7) {
            score += 0.3;
        }

        // Prefer for balanced distribution
        if (metadata.freqDistribution && metadata.freqDistribution.distribution === 'balanced') {
            score += 0.3;
        }

        return score;
    }

    scoreRipple(metadata) {
        // Good for percussive, rhythmic content
        let score = 0.4;

        // Prefer for rhythmic beats
        if (metadata.rhythm && metadata.rhythm.beat) {
            score += 0.4;
        }

        // Prefer for moderate amplitude
        if (metadata.amplitude > 0.2 && metadata.amplitude < 0.6) {
            score += 0.3;
        }

        // Prefer for bass content
        if (metadata.freqDistribution && metadata.freqDistribution.low > 0.3) {
            score += 0.3;
        }

        return score;
    }

    scoreKaleidoscope(metadata) {
        // Good for complex, full-spectrum content
        let score = 0.5;
        if (metadata.energyBands) {
            const totalEnergy = Object.values(metadata.energyBands).reduce((a, b) => a + b, 0);
            if (totalEnergy > 2.0) score += 0.4;
        }
        if (metadata.amplitude > 0.3) score += 0.3;
        return score;
    }

    scoreMandala(metadata) {
        // Good for balanced, stable content
        let score = 0.5;
        if (metadata.rhythm && metadata.rhythm.stability > 0.6) score += 0.4;
        if (metadata.freqDistribution && metadata.freqDistribution.distribution === 'balanced') score += 0.3;
        return score;
    }

    scoreFractal(metadata) {
        // Good for complex frequency content
        let score = 0.4;
        if (metadata.spectralSpread > 2000) score += 0.4;
        if (metadata.amplitude > 0.25) score += 0.3;
        return score;
    }

    scoreTunnel(metadata) {
        // Good for dynamic, energetic content
        let score = 0.4;
        if (metadata.amplitude > 0.35) score += 0.4;
        if (metadata.rhythm && metadata.rhythm.variance > 0.15) score += 0.3;
        return score;
    }

    scoreMorphing(metadata) {
        // Good for changing, dynamic content
        let score = 0.5;
        if (metadata.rhythm && metadata.rhythm.variance > 0.1) score += 0.4;
        if (metadata.amplitude > 0.3) score += 0.3;
        return score;
    }

    scoreTracing(metadata) {
        // Good for dynamic, moving content
        let score = 0.5;
        if (metadata.amplitude > 0.25) score += 0.4;
        if (metadata.rhythm && metadata.rhythm.variance > 0.1) score += 0.3;
        return score;
    }

    scoreCrossing(metadata) {
        // Good for complex, multi-layered content
        let score = 0.5;
        if (metadata.energyBands) {
            const activeBands = Object.values(metadata.energyBands).filter(e => e > 0.1).length;
            if (activeBands >= 4) score += 0.4;
        }
        if (metadata.amplitude > 0.3) score += 0.3;
        return score;
    }

    scoreCombined(metadata) {
        // Good for high-energy, complex content (combines bars + trippy features)
        let score = 0.5;
        if (metadata.amplitude > 0.35) score += 0.4;
        if (metadata.spectralSpread > 2000) score += 0.3;
        if (metadata.energyBands) {
            const totalEnergy = Object.values(metadata.energyBands).reduce((a, b) => a + b, 0);
            if (totalEnergy > 2.0) score += 0.3;
        }
        return score;
    }

    /**
     * Get explanation for why a visualizer was selected
     */
    getSelectionReason(metadata, visualizer) {
        if (!metadata) return 'No audio data available';

        const reasons = {
            tornado: 'Tornado spiral - perfect for energetic, dynamic tracks',
            cyclone: 'Cyclone vortex - ideal for swirling, balanced audio',
            spiral1: 'Double spiral - counter-rotating spirals',
            spiral2: 'Chaotic spiral - unpredictable patterns',
            spiral3: 'Nested spirals - spirals within spirals',
            spiral4: 'Spiral trails - trailing spiral effects',
            tracing: 'Tracing waves - waves in random directions',
            crossing: 'Crossing planes - planes intersecting',
            combined: 'Combined effects - all effects merged',
            kaleidoscope: 'Kaleidoscope - psychedelic mirror patterns',
            mandala: 'Mandala - radial symmetric patterns',
            fractal: 'Fractal - recursive geometric patterns',
            tunnel: 'Tunnel portal - 3D depth effect',
            morphing: 'Morphing shapes - geometric shape transformations',
            depthlines: 'Depth Lines - 3D lines with camera movement',
            warptunnel: 'Warp Tunnel - rushing 3D tunnel',
            '3dbars': '3D Spectrum Bars - frequency bars in 3D',
            orbitlines: 'Orbit Lines - 3D orbiting trail particles',
            starburst: 'Starburst - lines exploding with 3D depth',
            horizongrid: 'Horizon Grid - 3D perspective grid',
            // Premium Mercury/Fluid visualizers
            mercuryOrbs: '💿 True Mercury - liquid metal orb with chromatic reflections',
            liquidMetal: '🔮 Liquid Metal - flowing metallic surface simulation',
            metallicNebula: '🌌 Chromium Nebula - cosmic metallic particles'
        };

        return reasons[visualizer] || 'Unknown visualizer';
    }
}

