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
        this.targetTimePerVisualizer = 8000; // Increased to 8s for stability
        this.switchCount = 0;

        // All available visualizers (classic + 3D + fluid visualizers)
        this.allVisualizers = [
            // Classic mesh visualizers
            'tornado', 'cyclone', 'spiral1', 'spiral2', 'spiral3', 'spiral4',
            'tracing', 'crossing', 'combined', 'kaleidoscope', 'mandala',
            'fractal', 'morphing',
            // 3D camera visualizers
            'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid',
            // Premium Fluid & 3D visualizers
            'mercuryOrbs', 'liquidMetal', 'metallicNebula', 'tunnel'
        ];

        // Shuffle initially for unique session experience
        this.shuffleVisualizers();

        this.currentIndex = 0;
    }

    shuffleVisualizers() {
        for (let i = this.allVisualizers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.allVisualizers[i], this.allVisualizers[j]] = [this.allVisualizers[j], this.allVisualizers[i]];
        }
    }

    /**
     * Select visualizer - cycles through shuffled list
     */
    selectVisualizer(metadata) {
        // Initialization check
        if (!this.lastSelection) {
            this.lastSelection = this.allVisualizers[0];
            this.lastSwitchTime = Date.now();
            return this.allVisualizers[0];
        }

        const timeSinceLastSwitch = Date.now() - this.lastSwitchTime;
        const shouldSwitchByTime = timeSinceLastSwitch >= this.targetTimePerVisualizer;

        // Check for beat detection - switch early on beats (but enforce min 3s)
        const hasBeat = metadata?.rhythm?.beat;
        const canSwitchOnBeat = hasBeat && timeSinceLastSwitch > 3000;

        if (shouldSwitchByTime || canSwitchOnBeat) {
            // Move to next visualizer in cycle
            this.currentIndex = (this.currentIndex + 1);

            // Reshuffle if we hit the end
            if (this.currentIndex >= this.allVisualizers.length) {
                this.shuffleVisualizers();
                this.currentIndex = 0;
            }

            const nextVisualizer = this.allVisualizers[this.currentIndex];

            this.lastSwitchTime = Date.now();
            this.switchCount++;
            this.lastSelection = nextVisualizer;
            return nextVisualizer;
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
