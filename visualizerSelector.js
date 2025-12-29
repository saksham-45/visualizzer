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

        // All available visualizers (classic + 3D + fluid + enhanced + layered)
        this.allVisualizers = [
            // ⚡ Enhanced GPU Shaders (most impressive first)
            'shader_psychedelicWaves', 'shader_neonVortex', 'shader_kaleidoscope',
            'shader_hypnoticSpiral', 'shader_electricStorm', 'shader_sacredGeometry',
            // 🌊 Premium Mercury/Fluid
            'mercuryOrbs', 'liquidMetal', 'metallicNebula', 'liquidGeometry', 'tunnel',
            // ✨ Particles
            'gpuParticles',
            // 🌀 Classic Effects
            'tornado', 'cyclone', 'spiral1', 'spiral2', 'spiral3', 'spiral4',
            'kaleidoscope', 'mandala', 'fractal', 'wave', 'bars',
            // 🔷 3D Geometry
            'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid',
            // Extra Classic
            'tracing', 'crossing', 'combined', 'morphing'
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
        const canSwitchOnBeat = hasBeat && timeSinceLastSwitch > 4000;

        if (shouldSwitchByTime || canSwitchOnBeat) {
            // Move to next visualizer in cycle
            this.currentIndex++;

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

        return avgAmplitude < 0.05;
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
        const reasons = {
            // ✨ Particles & AI
            'gpuParticles': '✨ Stellar Forge - 60,000 hyper-reactive sentient particles',
            'aiPsychedelicArt': '🧠 Neural Dream - AI-generated hallucinatory landscapes',
            'reactiveTypography': '🔡 Kinetic Verse - semantic rhythm-driven typography',

            // ⚡ Enhanced GPU Shaders
            'shader_psychedelicWaves': '🌈 Harmonic Flux - fluid GPU-accelerated wave interference',
            'shader_neonVortex': '🌀 Singularity - high-velocity neon event horizon',
            'shader_kaleidoscope': '💎 Prism Core - infinite shimmering geometric mirrors',
            'shader_hypnoticSpiral': '🌀 Trance state - deep recursive mathematical tunnel',
            'shader_electricStorm': '⚡ High Voltage - plasma discharge and electric arcs',
            'shader_sacredGeometry': '📐 Monad - ancient geometry pulsed by pure energy',

            // 🌊 Premium Mercury/Fluid
            'mercuryOrbs': '💿 Liquid Mirror - fluid metal orbs with chromatic drift',
            'liquidMetal': '🔮 Ferrofluid - magnetically controlled metallic surface',
            'metallicNebula': '🌌 Star Dust - cosmic metallic dust in a gravity well',
            'liquidGeometry': '💎 Chrome Morph - shapeshifting liquid crystals',
            'tunnel': '🕳️ Wormhole - infinite folding passage through space-time',

            // 📚 Layered Masterpieces
            'layered_psychedelicStack': '📚 The God Stack - the ultimate multi-layered visual odyssey',
            'layered_cosmicDream': '🌠 Astral Plane - ethereal fusion of particles and voids',
            'layered_electricVoid': '🖤 Dark Matter - violent high-energy particle emission',

            // 🌀 Classic Effects (Overhauled)
            'tornado': '🌪️ Vortex - a violent upward spiral of audio energy',
            'cyclone': '🌀 Maelstrom - rotating storm of frequency-driven mesh',
            'spiral1': '🐚 Fibonacci - logarithmic golden ratio spiral',
            'spiral2': '🕸️ Web - complex web of intersecting harmonic lines',
            'spiral3': '🏮 Lantern - glowing nested geometric enclosures',
            'spiral4': '☄️ Trails - long-exposure kinetic motion paths',
            'tracing': '✒️ Vector Flow - tracing the invisible lines of music',
            'crossing': '⚔️ Conflict - planes of data colliding into light',
            'combined': '🌀 Chaos Theory - all systems pushing to the limit',
            'kaleidoscope': '💎 Glass - traditional mirrored symmetry refraction',
            'mandala': '☸️ Zen - radial meditative frequency meditation',
            'fractal': '🌲 Growth - recursive branching audio mathematics',
            'morphing': '🧪 Alchemy - the transition of matter between states',

            // 🔷 3D Geometry
            'warptunnel': '🚀 Warp Speed - rushing through a grid of pure frequency',
            '3dbars': '📊 Data Scraper - 3D spectrum analysis in physical space',
            'orbitlines': '🪐 Satellites - points of light orbiting a musical sun',
            'starburst': '💥 Supernova - explosive expansion from a central peak',
            'horizongrid': '🛣️ Synthwave - driving into an infinite digital horizon'
        };

        return reasons[visualizer] || visualizer;
    }

    /**
     * Get structured list of all visualizers for UI population
     */
    getVisualizerList() {
        const categories = {
            '⚡ Enhanced GPU': [
                'shader_psychedelicWaves', 'shader_neonVortex', 'shader_kaleidoscope',
                'shader_hypnoticSpiral', 'shader_electricStorm', 'shader_sacredGeometry'
            ],
            '✨ Particles & AI': [
                'gpuParticles', 'aiPsychedelicArt', 'reactiveTypography',
                'layered_psychedelicStack', 'layered_cosmicDream', 'layered_electricVoid'
            ],
            '🌊 Premium Fluid': [
                'mercuryOrbs', 'liquidMetal', 'metallicNebula', 'liquidGeometry', 'tunnel'
            ],
            '🔷 3D Geometry': [
                'warptunnel', '3dbars', 'orbitlines', 'starburst', 'horizongrid'
            ],
            '🌀 Classic Effects': [
                'tornado', 'cyclone', 'spiral1', 'spiral2', 'spiral3', 'spiral4',
                'tracing', 'crossing', 'combined', 'kaleidoscope', 'mandala',
                'fractal', 'morphing', 'wave', 'bars'
            ]
        };

        const list = [];
        for (const [category, keys] of Object.entries(categories)) {
            list.push({
                category,
                items: keys.map(key => {
                    const desc = this.getSelectionReason(null, key);
                    // Extract name from "key: Name - Description" format or just "Name - Description"
                    // The getSelectionReason returns "Name - Description" usually.
                    let name = desc.split(' - ')[0] || key;
                    // Remove emojis for cleaner UI if needed, or keep them.
                    return { value: key, label: name };
                })
            });
        }
        return list;
    }
}
