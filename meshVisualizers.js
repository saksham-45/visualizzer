import { CameraController } from './cameraController.js';

/**
 * Mesh-Based Visualizers Module
 * Creates cloth-like flexible 2D surfaces that fill the screen
 * OPTIMIZED: Cached meshes, typed arrays, reduced per-frame allocations
 */
export class MeshVisualizers {
    constructor(canvas, audioCapture, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.audioCapture = audioCapture;
        this.audioAnalyzer = audioAnalyzer;
        this.currentVisualizer = null;
        this.transitionProgress = 1;
        this.targetVisualizer = null;
        this.previousVisualizer = null;

        this.meshResolution = 40;
        this.time = 0;
        this.lastFrameTime = performance.now();

        this.cachedMesh = null;
        this.cachedMeshCols = 0;
        this.cachedMeshRows = 0;

        this.camera = new CameraController();

        this.particles = [];
        this.maxParticles = 30;
        this.meltingDisturbances = new Map();

        this.lastAudioCharacteristics = null;
        this.lastTransitionTime = 0;
        this.minTransitionInterval = 8000;

        this.sinLUT = new Float32Array(1024);
        this.cosLUT = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
            const angle = (i / 1024) * Math.PI * 2;
            this.sinLUT[i] = Math.sin(angle);
            this.cosLUT[i] = Math.cos(angle);
        }

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    fastSin(angle) {
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor((normalized / (Math.PI * 2)) * 1024) & 1023;
        return this.sinLUT[index];
    }

    fastCos(angle) {
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.floor((normalized / (Math.PI * 2)) * 1024) & 1023;
        return this.cosLUT[index];
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
        this.cachedMesh = null;
    }

    setVisualizer(type, forceTransition = false) {
        if (this.currentVisualizer === type) return;

        const now = Date.now();
        if (!forceTransition && now - this.lastTransitionTime < this.minTransitionInterval) {
            return; // Prevent frequent transitions
        }

        // Clear particles when switching away from bars
        if (this.currentVisualizer === 'bars' && type !== 'bars') {
            this.particles = [];
            this.meltingDisturbances.clear();
        }

        // If no current visualizer, set it directly without transition
        if (!this.currentVisualizer) {
            this.currentVisualizer = type;
            this.lastTransitionTime = now;
            return;
        }

        this.previousVisualizer = this.currentVisualizer;
        this.targetVisualizer = type;
        this.transitionProgress = 0;
        this.lastTransitionTime = now;
        this.transitionParticles = []; // Clear old particles

        const transitionDuration = 800; // Faster transitions
        const startTime = Date.now();

        const animateTransition = () => {
            const elapsed = Date.now() - startTime;
            const rawProgress = elapsed / transitionDuration;
            this.transitionProgress = this.easeInOutCubic(Math.min(rawProgress, 1));

            if (this.transitionProgress < 1) {
                requestAnimationFrame(animateTransition);
            } else {
                this.currentVisualizer = type;
                this.targetVisualizer = null;
                this.previousVisualizer = null;
                this.transitionParticles = [];
            }
        };

        animateTransition();
    }

    selectVisualizerByFrequency(metadata) {
        // Smart visualizer selection based on frequency characteristics
        const energyBands = metadata.energyBands || {};
        const bass = energyBands.bass || 0;
        const mid = energyBands.mid || 0;
        const treble = energyBands.treble || 0;

        // Normalize energy
        const total = bass + mid + treble + 0.001;
        const bassRatio = bass / total;
        const midRatio = mid / total;
        const trebleRatio = treble / total;

        // Analyze dominant frequency range
        let selectedViz = 'wave';

        // Bass-heavy: spirals and vortex effects (low frequency responsiveness)
        if (bassRatio > 0.5) {
            const options = ['spiral1', 'tornado', 'cyclone'];
            selectedViz = options[Math.floor(Math.random() * options.length)];
        }
        // Treble-heavy: fractals and kaleidoscope (high frequency responsiveness)
        else if (trebleRatio > 0.4) {
            const options = ['kaleidoscope', 'fractal', 'mandala'];
            selectedViz = options[Math.floor(Math.random() * options.length)];
        }
        // Balanced: waves and complex patterns
        else if (midRatio > 0.45) {
            const options = ['wave', 'flowing', 'ripple'];
            selectedViz = options[Math.floor(Math.random() * options.length)];
        }
        // Complex mix: combined effects
        else {
            const options = ['combined', 'tracing', 'crossing'];
            selectedViz = options[Math.floor(Math.random() * options.length)];
        }

        // Occasional random pick for variety
        if (Math.random() < 0.15) {
            const allVizs = ['spiral1', 'spiral2', 'spiral3', 'spiral4', 'kaleidoscope', 'mandala', 'fractal', 'tunnel', 'wave', 'flowing', 'cyclone', 'tornado', 'mandala', 'combined'];
            selectedViz = allVizs[Math.floor(Math.random() * allVizs.length)];
        }

        return selectedViz;
    }

    isSignificantAudioChange(metadata) {
        if (!this.lastAudioCharacteristics) {
            this.lastAudioCharacteristics = {
                bassEnergy: metadata.energyBands?.bass || 0,
                trebleEnergy: metadata.energyBands?.treble || 0,
                amplitude: metadata.amplitude
            };
            return false;
        }

        const bassDelta = Math.abs((metadata.energyBands?.bass || 0) - this.lastAudioCharacteristics.bassEnergy);
        const trebleDelta = Math.abs((metadata.energyBands?.treble || 0) - this.lastAudioCharacteristics.trebleEnergy);
        const ampDelta = Math.abs(metadata.amplitude - this.lastAudioCharacteristics.amplitude);

        // Significant change if any band shifts substantially
        const significantChange = bassDelta > 1500 || trebleDelta > 1500 || ampDelta > 0.35;

        if (significantChange) {
            this.lastAudioCharacteristics = {
                bassEnergy: metadata.energyBands?.bass || 0,
                trebleEnergy: metadata.energyBands?.treble || 0,
                amplitude: metadata.amplitude
            };
        }

        return significantChange;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    render() {
        const audioData = this.audioCapture.getAudioData();
        if (!audioData) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        const now = performance.now();
        const deltaTime = Math.min(0.05, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;
        this.time += deltaTime;

        const metadata = this.audioAnalyzer.analyze() || { amplitude: 0, energyBands: {}, rhythm: {} };
        const visualizerType = this.targetVisualizer || this.currentVisualizer || 'wave';

        try {
            this.camera.update(metadata, deltaTime);
        } catch (e) {
            console.error('Camera update error:', e);
        }

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        try {
            if (this.targetVisualizer && this.previousVisualizer && this.transitionProgress < 1) {
                this.renderMorphingMesh(this.previousVisualizer, this.targetVisualizer,
                    this.transitionProgress, audioData, metadata);
            } else {
                this.renderMeshVisualizer(visualizerType, audioData, metadata);
            }
        } catch (e) {
            console.error('Render error for', visualizerType, ':', e);
            this.renderMeshVisualizer('wave', audioData, metadata);
        }
    }

    /**
     * Create or retrieve cached mesh grid for cloth-like rendering
     * OPTIMIZED: Reuses mesh between frames, only recreates on resize
     */
    createMesh(cols, rows) {
        if (this.cachedMesh && this.cachedMeshCols === cols && this.cachedMeshRows === rows) {
            for (let y = 0; y <= rows; y++) {
                for (let x = 0; x <= cols; x++) {
                    const point = this.cachedMesh[y][x];
                    point.x = point.baseX;
                    point.y = point.baseY;
                    point.z = 0;
                }
            }
            return this.cachedMesh;
        }

        const mesh = [];
        for (let y = 0; y <= rows; y++) {
            const row = [];
            for (let x = 0; x <= cols; x++) {
                row.push({
                    x: (x / cols) * this.width,
                    y: (y / rows) * this.height,
                    z: 0,
                    baseX: (x / cols) * this.width,
                    baseY: (y / rows) * this.height
                });
            }
            mesh.push(row);
        }

        this.cachedMesh = mesh;
        this.cachedMeshCols = cols;
        this.cachedMeshRows = rows;
        return mesh;
    }

    /**
     * Render mesh as filled cloth-like surface
     */
    renderMeshAsCloth(mesh, audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const cols = mesh[0].length - 1;
        const rows = mesh.length - 1;

        // Draw filled triangles for cloth effect
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const p1 = mesh[y][x];
                const p2 = mesh[y][x + 1];
                const p3 = mesh[y + 1][x];
                const p4 = mesh[y + 1][x + 1];

                // Calculate color based on position and audio
                const freqIndex = Math.floor(((x + y) / (cols + rows)) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;
                const hue = ((x + y) / (cols + rows)) * 360 +
                    (metadata?.spectralCentroid || 0) / 20 +
                    this.time * 10;

                const saturation = 80 + energy * 20;
                const lightness = 40 + energy * 40;
                const alpha = 0.6 + energy * 0.4;

                // Draw two triangles per quad
                this.drawFilledTriangle(p1, p2, p3, hue, saturation, lightness, alpha);
                this.drawFilledTriangle(p2, p4, p3, hue, saturation, lightness, alpha);
            }
        }

        // REMOVED: Mesh lines loop. 
        // We want pure abstract forms, not wireframes.
    }

    drawFilledTriangle(p1, p2, p3, hue, saturation, lightness, alpha) {
        const gradient = this.ctx.createLinearGradient(
            (p1.x + p2.x + p3.x) / 3,
            (p1.y + p2.y + p3.y) / 3,
            p3.x, p3.y
        );

        // More vibrant alpha and gradients
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 1.2})`);
        gradient.addColorStop(0.5, `hsla(${hue + 30}, ${saturation}%, ${lightness + 20}%, ${alpha * 0.9})`);
        gradient.addColorStop(1, `hsla(${hue + 60}, ${saturation}%, ${lightness}%, ${alpha * 0.4})`);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Render different mesh visualizer types
     */
    renderMeshVisualizer(type, audioData, metadata) {
        const cols = this.meshResolution;
        const rows = Math.floor(this.meshResolution * (this.height / this.width));
        let mesh = this.createMesh(cols, rows);

        switch (type) {
            case 'wave':
                mesh = this.deformWaveMesh(mesh, audioData, metadata);
                break;
            case 'circle':
                mesh = this.deformCircleMesh(mesh, audioData, metadata);
                break;
            case 'bars':
                mesh = this.deformBarsMesh(mesh, audioData, metadata);
                break;
            case 'tornado':
                mesh = this.deformTornadoMesh(mesh, audioData, metadata);
                break;
            case 'cyclone':
                mesh = this.deformCycloneMesh(mesh, audioData, metadata);
                break;
            case 'flowing':
                mesh = this.deformFlowingMesh(mesh, audioData, metadata);
                break;
            case 'ripple':
                mesh = this.deformRippleMesh(mesh, audioData, metadata);
                break;
            case 'spiral':
                mesh = this.deformSpiralMesh(mesh, audioData, metadata);
                break;
            case 'spiral1':
                this.renderDoubleSpiral(audioData, metadata);
                return;
            case 'spiral2':
                this.renderChaoticSpiral(audioData, metadata);
                return;
            case 'spiral3':
                this.renderNestedSpirals(audioData, metadata);
                return;
            case 'spiral4':
                this.renderSpiralTrails(audioData, metadata);
                return;
            case 'tracing':
                this.renderTracingWaves(audioData, metadata);
                return;
            case 'crossing':
                this.renderCrossingPlanes(audioData, metadata);
                return;
            case 'combined':
                this.renderCombinedEffects(audioData, metadata);
                return;
            case 'spectrum':
                mesh = this.deformSpectrumMesh(mesh, audioData, metadata);
                break;
            case 'particles':
                mesh = this.deformParticlesMesh(mesh, audioData, metadata);
                break;
            case 'kaleidoscope':
                this.renderKaleidoscope(audioData, metadata);
                return;
            case 'mandala':
                this.renderMandala(audioData, metadata);
                return;
            case 'fractal':
                this.renderFractal(audioData, metadata);
                return;
            case 'tunnel':
                this.renderTunnel(audioData, metadata);
                return;
            case 'depthlines':
                this.renderDepthLines(audioData, metadata);
                return;
            case 'warptunnel':
                this.renderWarpTunnel(audioData, metadata);
                return;
            case '3dbars':
                this.render3DSpectrumBars(audioData, metadata);
                return;
            case 'orbitlines':
                this.renderOrbitLines(audioData, metadata);
                return;
            case 'starburst':
                this.renderStarburst(audioData, metadata);
                return;
            case 'horizongrid':
                this.renderHorizonGrid(audioData, metadata);
                return;
            case 'morphing':
                mesh = this.deformMorphingMesh(mesh, audioData, metadata);
                break;
            case 'trippy':
                mesh = this.deformTrippyMesh(mesh, audioData, metadata);
                break;
            default:
                mesh = this.deformWaveMesh(mesh, audioData, metadata);
        }

        this.renderMeshAsCloth(mesh, audioData, metadata);
    }

    /**
     * Wave deformation - flowing horizontal waves with random disturbances
     */
    deformWaveMesh(mesh, audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        // BOOSTED: Significantly more responsive
        const amplitude = metadata.amplitude * 250;
        const bass = (metadata.energyBands?.bass || 0) * 100;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dataIndex = Math.floor((x / mesh[y].length) * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;
                const wave2 = Math.sin((point.baseX / this.width) * Math.PI * 4 + this.time * 2) * (amplitude * 0.5 + bass * 0.2);

                // Random disturbances for more organic feel
                const randomDisturbance = Math.random() < 0.1
                    ? (Math.random() - 0.5) * amplitude * 0.3
                    : 0;
                const randomX = Math.random() < 0.05
                    ? (Math.random() - 0.5) * amplitude * 0.2
                    : 0;

                point.y = point.baseY + wave + wave2 + randomDisturbance;
                point.x = point.baseX + randomX;
                point.z = wave * 0.3 + Math.abs(randomDisturbance) * 0.2;
            }
        }
        return mesh;
    }

    /**
     * Circle deformation - expanding circles from center
     */
    deformCircleMesh(mesh, audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 150;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                const dataIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;
                const radialWave = Math.sin(dist * 0.02 + this.time * 3) * amplitude * 0.5;

                point.x = centerX + Math.cos(angle) * (dist + wave + radialWave);
                point.y = centerY + Math.sin(angle) * (dist + wave + radialWave);
                point.z = wave * 0.2;
            }
        }
        return mesh;
    }

    /**
     * Tornado deformation - spiraling upward
     */
    deformTornadoMesh(mesh, audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        // BOOSTED: Massive amplitude for tornado
        const amplitude = metadata.amplitude * 350;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                const heightFactor = point.baseY / this.height;
                const freqIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                // Spiral effect
                const spiralAngle = angle + heightFactor * Math.PI * 4 + this.time * 2;
                const spiralRadius = dist * (0.3 + heightFactor * 0.7) + energy * amplitude;

                point.x = centerX + Math.cos(spiralAngle) * spiralRadius;
                point.y = centerY + Math.sin(spiralAngle) * spiralRadius + heightFactor * amplitude * 0.5;
                point.z = energy * amplitude * 0.5;
            }
        }
        return mesh;
    }

    /**
     * Cyclone deformation - rotating vortex
     */
    deformCycloneMesh(mesh, audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 180;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                const freqIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                // Vortex rotation
                const rotationSpeed = this.time * (2 + energy * 3);
                const vortexAngle = angle + rotationSpeed / (1 + dist * 0.01);
                const vortexRadius = dist * (0.5 + energy * 0.5) + Math.sin(dist * 0.05 + this.time) * amplitude;

                point.x = centerX + Math.cos(vortexAngle) * vortexRadius;
                point.y = centerY + Math.sin(vortexAngle) * vortexRadius;
                point.z = (1 - dist / Math.max(this.width, this.height)) * amplitude * energy;
            }
        }
        return mesh;
    }

    /**
     * Flowing deformation - organic flowing waves
     */
    deformFlowingMesh(mesh, audioData, metadata) {
        const { timeData, frequencyData, bufferLength } = audioData;
        // BOOSTED: Much more fluid motion
        const amplitude = metadata.amplitude * 220;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const freqIndex = Math.floor((x / mesh[y].length) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                // Multiple wave layers with extra frequency energy injection
                const wave1 = Math.sin((point.baseX / this.width) * Math.PI * 6 + this.time * 2) * (amplitude * (1 + energy));
                const wave2 = Math.sin((point.baseY / this.height) * Math.PI * 4 + this.time * 1.5) * amplitude * 0.8;
                const wave3 = (timeData[freqIndex] / 128.0 - 1) * amplitude * energy * 2.0;

                point.x = point.baseX + wave2 * 0.3;
                point.y = point.baseY + wave1 + wave3;
                point.z = (wave1 + wave2) * 0.2;
            }
        }
        return mesh;
    }

    /**
     * Ripple deformation - expanding ripples
     */
    deformRippleMesh(mesh, audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 100;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const dataIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;

                // Multiple ripple rings
                const ripple1 = Math.sin(dist * 0.1 - this.time * 4) * amplitude;
                const ripple2 = Math.sin(dist * 0.15 - this.time * 3) * amplitude * 0.6;

                const angle = Math.atan2(dy, dx);
                point.x = centerX + Math.cos(angle) * (dist + wave + ripple1 + ripple2);
                point.y = centerY + Math.sin(angle) * (dist + wave + ripple1 + ripple2);
                point.z = (ripple1 + ripple2) * 0.3;
            }
        }
        return mesh;
    }

    /**
     * Spiral deformation - expanding spiral
     */
    deformSpiralMesh(mesh, audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 140;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                const dataIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;

                // Spiral pattern
                const spiralAngle = angle + dist * 0.02 + this.time * 2;
                const spiralRadius = dist + wave + Math.sin(dist * 0.05) * amplitude * 0.5;

                point.x = centerX + Math.cos(spiralAngle) * spiralRadius;
                point.y = centerY + Math.sin(spiralAngle) * spiralRadius;
                point.z = wave * 0.25;
            }
        }
        return mesh;
    }

    /**
     * Bars deformation - vertical frequency bars with physics-based melting disturbances
     */
    deformBarsMesh(mesh, audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const amplitude = metadata.amplitude * 150;

        // Update physics particles and create disturbances from waveform
        this.updatePhysicsParticles(audioData, metadata);

        // Apply base bar deformation
        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const freqIndex = Math.floor((x / mesh[y].length) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                const barHeight = energy * amplitude;
                const wave = Math.sin((point.baseY / this.height) * Math.PI * 8 + this.time * 3) * amplitude * 0.3;

                // Base position
                let finalY = point.baseY - barHeight + wave;
                let finalX = point.baseX;

                // Apply melting disturbances from particles
                const meltingEffect = this.getMeltingEffect(point.baseX, point.baseY);
                finalY += meltingEffect.y;
                finalX += meltingEffect.x;

                // Apply waveform-based random disturbances
                const waveformDisturbance = this.getWaveformDisturbance(x, mesh[y].length, timeData, bufferLength, metadata);
                finalY += waveformDisturbance.y;
                finalX += waveformDisturbance.x;

                point.y = finalY;
                point.x = finalX;
                point.z = energy * amplitude * 0.2 + meltingEffect.z;
            }
        }

        // Propagate melting effects to surrounding points
        this.propagateMelting(mesh);

        return mesh;
    }

    /**
     * Update physics particles - spawn from waveform peaks, collide, interact
     */
    updatePhysicsParticles(audioData, metadata) {
        const { timeData, bufferLength } = audioData;
        const dt = 0.016; // Frame time

        // Spawn new particles from waveform peaks with more randomness
        if (this.particles.length < this.maxParticles) {
            for (let i = 0; i < bufferLength; i += 15) {
                const waveValue = timeData[i] / 128.0;
                // More random spawning - lower threshold, higher chance
                if (waveValue > 0.5 && Math.random() < 0.15) {
                    const spawnX = (i / bufferLength) * this.width + (Math.random() - 0.5) * 50;
                    const spawnY = this.height * (0.25 + Math.random() * 0.5); // Wider middle area
                    this.spawnParticle(spawnX, spawnY, waveValue);
                }
            }
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Apply physics
            p.vx *= 0.98; // Friction
            p.vy *= 0.98;
            p.vy += 0.2; // Gravity

            // Random disturbances
            p.vx += (Math.random() - 0.5) * 0.5;
            p.vy += (Math.random() - 0.5) * 0.3;

            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Boundary collisions
            if (p.x < 0 || p.x > this.width) {
                p.vx *= -0.8;
                p.x = Math.max(0, Math.min(this.width, p.x));
            }
            if (p.y < 0 || p.y > this.height) {
                p.vy *= -0.8;
                p.y = Math.max(0, Math.min(this.height, p.y));
            }

            // Particle-particle collisions
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p2.x - p.x;
                const dy = p2.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = p.radius + p2.radius;

                if (dist < minDist && dist > 0) {
                    // Collision response
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotate velocities
                    const vx1 = p.vx * cos + p.vy * sin;
                    const vy1 = p.vy * cos - p.vx * sin;
                    const vx2 = p2.vx * cos + p2.vy * sin;
                    const vy2 = p2.vy * cos - p2.vx * sin;

                    // Swap velocities (elastic collision)
                    p.vx = vx2 * cos - vy1 * sin;
                    p.vy = vy1 * cos + vx2 * sin;
                    p2.vx = vx1 * cos - vy2 * sin;
                    p2.vy = vy2 * cos + vx1 * sin;

                    // Separate particles
                    const overlap = minDist - dist;
                    const separationX = cos * overlap * 0.5;
                    const separationY = sin * overlap * 0.5;
                    p.x -= separationX;
                    p.y -= separationY;
                    p2.x += separationX;
                    p2.y += separationY;
                }
            }

            // Create melting disturbance at particle location
            this.createMeltingDisturbance(p.x, p.y, p.radius, p.energy);

            // Remove old particles
            p.life -= dt;
            if (p.life <= 0 || p.y > this.height + 50) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Spawn a new physics particle
     */
    spawnParticle(x, y, energy) {
        const angle = (Math.random() - 0.5) * Math.PI * 0.5; // Random upward angle
        const speed = 50 + Math.random() * 100;

        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed * (Math.random() - 0.5),
            vy: -Math.abs(Math.sin(angle) * speed),
            radius: 8 + Math.random() * 12,
            energy: energy,
            life: 2 + Math.random() * 3,
            id: Math.random()
        });
    }

    /**
     * Create melting disturbance at particle location
     */
    createMeltingDisturbance(x, y, radius, intensity) {
        const key = `${Math.floor(x / 10)}_${Math.floor(y / 10)}`;
        const existing = this.meltingDisturbances.get(key) || { intensity: 0, x: 0, y: 0 };

        const dist = Math.sqrt((x - existing.x) ** 2 + (y - existing.y) ** 2);
        const newIntensity = intensity * (radius / 20);

        if (newIntensity > existing.intensity || dist > radius) {
            this.meltingDisturbances.set(key, {
                x: x,
                y: y,
                intensity: newIntensity,
                radius: radius,
                decay: 0.95,
                time: this.time
            });
        }
    }

    /**
     * Get melting effect at a point
     */
    getMeltingEffect(x, y) {
        let totalX = 0;
        let totalY = 0;
        let totalZ = 0;
        let totalWeight = 0;

        for (const [key, disturbance] of this.meltingDisturbances.entries()) {
            const dx = x - disturbance.x;
            const dy = y - disturbance.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < disturbance.radius * 2) {
                const falloff = 1 - (dist / (disturbance.radius * 2));
                const weight = falloff * falloff * disturbance.intensity;

                // Melting effect - pull downward and outward
                const angle = Math.atan2(dy, dx);
                const meltStrength = weight * 30;

                totalX += Math.cos(angle) * meltStrength * 0.3;
                totalY += Math.sin(angle) * meltStrength + weight * 20; // Downward pull
                totalZ += weight * 15;
                totalWeight += weight;
            }

            // Decay disturbance
            disturbance.intensity *= disturbance.decay;
            if (disturbance.intensity < 0.01) {
                this.meltingDisturbances.delete(key);
            }
        }

        if (totalWeight > 0) {
            return {
                x: totalX / totalWeight,
                y: totalY / totalWeight,
                z: totalZ / totalWeight
            };
        }

        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Get waveform-based random disturbances
     */
    getWaveformDisturbance(x, totalX, timeData, bufferLength, metadata) {
        const dataIndex = Math.floor((x / totalX) * bufferLength);
        const waveValue = timeData[dataIndex] / 128.0;

        // Random disturbances based on waveform
        if (waveValue > 0.6 && Math.random() < 0.3) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomStrength = (waveValue - 0.6) * 20 * Math.random();

            return {
                x: Math.cos(randomAngle) * randomStrength,
                y: Math.sin(randomAngle) * randomStrength
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Propagate melting effects to surrounding mesh points
     */
    propagateMelting(mesh) {
        const propagationRadius = 3;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];

                // Check surrounding points for melting
                let neighborInfluence = 0;
                let neighborX = 0;
                let neighborY = 0;

                for (let dy = -propagationRadius; dy <= propagationRadius; dy++) {
                    for (let dx = -propagationRadius; dx <= propagationRadius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (ny >= 0 && ny < mesh.length && nx >= 0 && nx < mesh[ny].length) {
                            const neighbor = mesh[ny][nx];
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist > 0 && dist <= propagationRadius) {
                                const influence = (1 - dist / propagationRadius) * 0.3;
                                neighborInfluence += influence;
                                neighborX += (neighbor.x - neighbor.baseX) * influence;
                                neighborY += (neighbor.y - neighbor.baseY) * influence;
                            }
                        }
                    }
                }

                // Apply propagated melting
                if (neighborInfluence > 0) {
                    point.x += neighborX / neighborInfluence * 0.5;
                    point.y += neighborY / neighborInfluence * 0.5;
                }
            }
        }
    }

    /**
     * Render particles for debugging (optional)
     */
    renderParticles() {
        for (const p of this.particles) {
            this.ctx.fillStyle = `hsla(${p.energy * 360}, 100%, 60%, ${p.life / 3})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * Spectrum deformation - circular spectrum
     */
    deformSpectrumMesh(mesh, audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 160;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                const freqIndex = Math.floor((angle / (Math.PI * 2) + 0.5) * bufferLength) % bufferLength;
                const energy = frequencyData[freqIndex] / 255;

                const radius = dist + energy * amplitude;
                point.x = centerX + Math.cos(angle) * radius;
                point.y = centerY + Math.sin(angle) * radius;
                point.z = energy * amplitude * 0.3;
            }
        }
        return mesh;
    }

    /**
     * Particles deformation - scattered particles
     */
    deformParticlesMesh(mesh, audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const amplitude = metadata.amplitude * 100;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const freqIndex = Math.floor(((x + y) / (mesh[y].length + mesh.length)) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                const noiseX = Math.sin((x + y) * 0.1 + this.time * 2) * amplitude * energy;
                const noiseY = Math.cos((x + y) * 0.1 + this.time * 1.8) * amplitude * energy;

                point.x = point.baseX + noiseX;
                point.y = point.baseY + noiseY;
                point.z = energy * amplitude * 0.4;
            }
        }
        return mesh;
    }

    /**
     * Morph between two mesh visualizers
     */
    renderMorphingMesh(fromType, toType, t, audioData, metadata) {
        const { frequencyData } = audioData;

        // Initialize transition particles on first call
        if (!this.transitionParticles || this.transitionParticles.length === 0) {
            this.generateTransitionParticles(fromType, toType, audioData, metadata);
        }

        // Render old visualizer fading out
        try {
            this.ctx.globalAlpha = 1 - t;
            if (fromType) this.renderMeshVisualizer(fromType, audioData, metadata);
            this.ctx.globalAlpha = 1;
        } catch (e) {
            console.error('Error rendering from visualizer:', fromType, e);
            this.ctx.globalAlpha = 1;
        }

        // Render new visualizer fading in
        try {
            this.ctx.globalAlpha = t;
            if (toType) this.renderMeshVisualizer(toType, audioData, metadata);
            this.ctx.globalAlpha = 1;
        } catch (e) {
            console.error('Error rendering to visualizer:', toType, e);
            this.ctx.globalAlpha = 1;
        }

        // Update and render transition particles as a smooth bridge
        this.updateTransitionParticles(t, audioData, metadata);
        this.renderTransitionParticles(t, audioData, metadata);
    }

    generateTransitionParticles(fromType, toType, audioData, metadata) {
        this.transitionParticles = [];
        const particleCount = 500; // Optimized density for smooth performance

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Pre-generate particle pool
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = Math.min(this.width, this.height) * (0.15 + Math.random() * 0.4);

            const startX = centerX + Math.cos(angle) * radius * (0.3 + Math.random() * 0.7);
            const startY = centerY + Math.sin(angle) * radius * (0.3 + Math.random() * 0.7);

            const targetRadius = Math.min(this.width, this.height) * (0.05 + Math.random() * 0.35);
            const targetAngle = angle + (Math.random() - 0.5) * Math.PI * 1.5;
            const targetX = centerX + Math.cos(targetAngle) * targetRadius;
            const targetY = centerY + Math.sin(targetAngle) * targetRadius;

            this.transitionParticles.push({
                x: startX,
                y: startY,
                targetX: targetX,
                targetY: targetY,
                size: 1.5 + Math.random() * 2.5,
                hue: Math.random() * 360,
                wave: Math.random() * Math.PI * 2
            });
        }
    }

    updateTransitionParticles(t, audioData, metadata) {
        const { frequencyData } = audioData;
        const energy = (frequencyData[50] + frequencyData[100] + frequencyData[200] + frequencyData[500]) / 1020;
        const rhythmEnergy = metadata.rhythmEnergy || energy;

        // Super fast quadratic easing - particles zoom to target
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const audioBoost = 1 + energy * 6 + rhythmEnergy * 4;
        const baseSpeed = 0.12 + easeT * 0.35; // Even faster base movement

        for (let i = 0; i < this.transitionParticles.length; i++) {
            const p = this.transitionParticles[i];

            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const distSq = dx * dx + dy * dy;

            // Direct movement without sqrt for speed
            if (distSq > 1) {
                const dist = Math.sqrt(distSq);
                const speed = (baseSpeed * audioBoost) / dist;
                p.x += dx * speed;
                p.y += dy * speed;
            }

            // Wave motion simplified
            p.wave += 0.12 + energy * 0.25;
            const waveInfluence = Math.sin(p.wave) * 3 * energy;
            p.x += waveInfluence;
            p.y += Math.cos(p.wave) * 3 * energy;

            // Hue shift
            p.hue = (p.hue + energy * 12) % 360;
        }
    }

    renderTransitionParticles(t, audioData, metadata) {
        const { frequencyData } = audioData;
        const baseAlpha = 0.5 + t * 0.5;

        // Batch render particles - no per-particle shadow overhead
        this.ctx.shadowBlur = 0;

        for (let i = 0; i < this.transitionParticles.length; i++) {
            const p = this.transitionParticles[i];

            // Quick bounds check
            if (p.x < -30 || p.x > this.width + 30 || p.y < -30 || p.y > this.height + 30) {
                continue;
            }

            const energy = frequencyData[Math.floor((i / this.transitionParticles.length) * 255)] / 255;
            const size = p.size * (1 + energy * 0.4);
            const alpha = (baseAlpha + energy * 0.2) * 0.85;

            // Simple, fast rendering - no glow overhead
            this.ctx.fillStyle = `hsla(${p.hue}, 85%, ${55 + energy * 25}%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    getDeformedMesh(type, mesh, audioData, metadata) {
        switch (type) {
            case 'wave': return this.deformWaveMesh(mesh, audioData, metadata);
            case 'circle': return this.deformCircleMesh(mesh, audioData, metadata);
            case 'bars': return this.deformBarsMesh(mesh, audioData, metadata);
            case 'tornado': return this.deformTornadoMesh(mesh, audioData, metadata);
            case 'cyclone': return this.deformCycloneMesh(mesh, audioData, metadata);
            case 'flowing': return this.deformFlowingMesh(mesh, audioData, metadata);
            case 'ripple': return this.deformRippleMesh(mesh, audioData, metadata);
            case 'spiral': return this.deformSpiralMesh(mesh, audioData, metadata);
            case 'spectrum': return this.deformSpectrumMesh(mesh, audioData, metadata);
            case 'particles': return this.deformParticlesMesh(mesh, audioData, metadata);
            case 'morphing': return this.deformMorphingMesh(mesh, audioData, metadata);
            case 'trippy': return this.deformTrippyMesh(mesh, audioData, metadata);
            default: return this.deformWaveMesh(mesh, audioData, metadata);
        }
    }

    /**
     * Kaleidoscope - Mirror/symmetry effect
     */
    renderKaleidoscope(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const segments = 8; // Number of mirror segments
        const segmentAngle = (Math.PI * 2) / segments;

        // Draw base pattern in one segment
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.time * 0.5);

        for (let seg = 0; seg < segments; seg++) {
            this.ctx.save();
            this.ctx.rotate(seg * segmentAngle);

            // Draw pattern
            const points = 100;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * segmentAngle;
                const freqIndex = Math.floor((i / points) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;
                const radius = 50 + energy * Math.min(this.width, this.height) * 0.4;

                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const hue = (seg / segments) * 360 + this.time * 50 + energy * 60;
                const size = 3 + energy * 15;

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${50 + energy * 30}%, ${0.7 + energy * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw connecting lines
            this.ctx.strokeStyle = `hsla(${(seg / segments) * 360 + this.time * 50}, 100%, 60%, 0.3)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * segmentAngle;
                const freqIndex = Math.floor((i / points) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;
                const radius = 50 + energy * Math.min(this.width, this.height) * 0.4;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    /**
     * Mandala - Radial symmetric pattern
     */
    renderMandala(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.45;
        const rings = 20;
        const segments = 16;

        for (let ring = 0; ring < rings; ring++) {
            const radius = (ring / rings) * maxRadius;
            const freqIndex = Math.floor((ring / rings) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            for (let seg = 0; seg < segments; seg++) {
                const angle = (seg / segments) * Math.PI * 2 + this.time * (0.5 + ring * 0.1);
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                const hue = (ring / rings) * 360 + (seg / segments) * 60 + this.time * 30;
                const size = Math.abs(2 + energy * 20 + Math.sin(ring * 2 + this.time) * 5);

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${50 + energy * 30}%, ${0.6 + energy * 0.4})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();

                // Draw connecting lines
                if (seg > 0) {
                    const prevAngle = ((seg - 1) / segments) * Math.PI * 2 + this.time * (0.5 + ring * 0.1);
                    const prevX = centerX + Math.cos(prevAngle) * radius;
                    const prevY = centerY + Math.sin(prevAngle) * radius;

                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + energy * 0.2})`;
                    this.ctx.lineWidth = 1 + energy * 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevX, prevY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                }
            }
        }
    }

    /**
     * Fractal - Recursive patterns
     */
    renderFractal(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const drawFractal = (x, y, size, depth, maxDepth, energy) => {
            if (depth > maxDepth || size < 2) return;

            const hue = (depth / maxDepth) * 360 + this.time * 20 + energy * 60;
            const alpha = 0.3 + (depth / maxDepth) * 0.7;

            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
            this.ctx.lineWidth = 2 - depth * 0.2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.stroke();

            // Recursive calls
            const angleStep = Math.PI * 2 / 6; // Hexagon pattern
            for (let i = 0; i < 6; i++) {
                const angle = i * angleStep + this.time * 0.5;
                const newX = x + Math.cos(angle) * size * 0.6;
                const newY = y + Math.sin(angle) * size * 0.6;
                const freqIndex = Math.floor((i / 6) * bufferLength);
                const newEnergy = frequencyData[freqIndex] / 255;
                drawFractal(newX, newY, size * 0.5, depth + 1, maxDepth, newEnergy);
            }
        };

        const baseEnergy = metadata.amplitude;
        drawFractal(centerX, centerY, Math.min(this.width, this.height) * 0.3, 0, 4, baseEnergy);
    }

    /**
     * Tunnel Portal - 3D tunnel effect
     */
    renderTunnel(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rings = 30;
        const segments = 32;

        for (let ring = 0; ring < rings; ring++) {
            const depth = ring / rings;
            const radius = depth * Math.min(this.width, this.height) * 0.5;
            const z = depth * 10;
            const scale = 1 / (1 + z * 0.1);

            const freqIndex = Math.floor((ring / rings) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 50;

            for (let seg = 0; seg < segments; seg++) {
                const angle = (seg / segments) * Math.PI * 2 + this.time * 2 + depth * Math.PI;
                const baseRadius = radius + wave * scale;
                const x = centerX + Math.cos(angle) * baseRadius * scale;
                const y = centerY + Math.sin(angle) * baseRadius * scale;

                const hue = (ring / rings) * 360 + (seg / segments) * 60 + this.time * 40;
                const size = (3 + energy * 12) * scale;

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${50 + energy * 30}%, ${0.5 + depth * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();

                // Connect segments
                if (seg > 0) {
                    const prevAngle = ((seg - 1) / segments) * Math.PI * 2 + this.time * 2 + depth * Math.PI;
                    const prevX = centerX + Math.cos(prevAngle) * baseRadius * scale;
                    const prevY = centerY + Math.sin(prevAngle) * baseRadius * scale;

                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + depth * 0.3})`;
                    this.ctx.lineWidth = (1 + energy) * scale;
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevX, prevY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                }
            }
        }
    }

    /**
     * Morphing Shapes - Geometric shapes that morph
     */
    deformMorphingMesh(mesh, audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude * 200;

        // Number of sides morphs based on frequency
        const baseSides = 3;
        const maxSides = 12;
        const freqIndex = Math.floor(metadata.spectralCentroid / 1000) % bufferLength;
        const sides = baseSides + Math.floor((frequencyData[freqIndex] / 255) * (maxSides - baseSides));

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                // Morph between shapes
                const morphFactor = Math.sin(this.time * 0.5) * 0.5 + 0.5;
                const shape1Radius = dist * (0.5 + Math.sin(angle * sides + this.time) * 0.3);
                const shape2Radius = dist * (0.7 + Math.cos(angle * (sides + 2) + this.time * 1.5) * 0.2);
                const radius = shape1Radius + (shape2Radius - shape1Radius) * morphFactor;

                const dataIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength);
                const energy = frequencyData[dataIndex] / 255;
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude * energy;

                point.x = centerX + Math.cos(angle) * (radius + wave);
                point.y = centerY + Math.sin(angle) * (radius + wave);
                point.z = energy * amplitude * 0.3;
            }
        }
        return mesh;
    }

    /**
     * Trippy Distortion - Warped, distorted patterns
     */
    deformTrippyMesh(mesh, audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const amplitude = metadata.amplitude * 180;

        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const freqIndex = Math.floor(((x + y) / (mesh[y].length + mesh.length)) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                const distortion1 = Math.sin(point.baseX * 0.01 + this.time * 2) * amplitude * energy;
                const distortion2 = Math.cos(point.baseY * 0.01 + this.time * 1.5) * amplitude * energy;
                const distortion3 = Math.sin((point.baseX + point.baseY) * 0.02 + this.time * 3) * amplitude * energy * 0.5;
                const wave = (timeData[freqIndex] / 128.0 - 1) * amplitude * energy;

                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const dx = point.baseX - centerX;
                const dy = point.baseY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const radialDistortion = Math.sin(dist * 0.05 + this.time * 2) * amplitude * energy * 0.3;

                point.x = point.baseX + distortion1 + distortion3 + Math.cos(Math.atan2(dy, dx)) * radialDistortion;
                point.y = point.baseY + distortion2 + distortion3 + Math.sin(Math.atan2(dy, dx)) * radialDistortion + wave;
                point.z = (distortion1 + distortion2) * 0.2;
            }
        }
        return mesh;
    }

    /**
     * Hyper-Vortex (spiral1) - UNDENIABLE REWORK
     * Featuring 64-arm multi-layered geometry, explosive singularities, and chromatic trails
     */
    renderDoubleSpiral(audioData, metadata) {
        if (!this._notifiedSpiral1) {
            console.log("ANTIGRAVITY: Hyper-Vortex 64 (Spiral 1) ACTIVATED");
            this._notifiedSpiral1 = true;
        }

        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.9;
        const bass = metadata.energyBands?.bass / 100 || 0;
        const amp = metadata.amplitude || 0;
        const isBeat = metadata.rhythm?.beat;

        // Clear with a stronger trailing effect
        this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 1. DYNAMIC NEBULA FIELD
        const particleCount = 120;
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < particleCount; i++) {
            const t = (this.time * 0.4 + i * 0.01) % 1;
            const angle = i * 2.4 + this.time * 0.5;
            const radius = t * maxRadius * 2.0;
            const size = (1 - t) * (4 + amp * 15);
            this.ctx.fillStyle = `hsla(${(this.time * 40 + i * 3) % 360}, 100%, 70%, ${(1 - t) * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();

        // 2. THE 64-ARM MONSTER VORTEX
        const armCount = 64;
        const pointsPerArm = 65;

        this.ctx.save();
        for (let arm = 0; arm < armCount; arm++) {
            const armAngle = (arm / armCount) * Math.PI * 2;
            const layer = arm % 4;
            const direction = (layer % 2 === 0) ? 1 : -1;
            const speed = (0.6 + layer * 0.7) * direction;

            this.ctx.beginPath();
            this.ctx.lineWidth = 1.5 + amp * (8 - layer * 1.5);

            const hue = (arm * (360 / armCount) + this.time * 70) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + layer * 10}%, ${0.5 + amp * 0.5})`;

            for (let i = 0; i < pointsPerArm; i++) {
                const t = i / pointsPerArm;
                const freqIdx = Math.floor(t * bufferLength * 0.2);
                const energy = frequencyData[freqIdx] / 255;

                const rotation = this.time * speed;
                const twist = t * Math.PI * (12 + layer * 3);
                const angle = armAngle + rotation + twist + (energy * 0.5);

                const r = t * maxRadius * (1.1 + energy * 0.35);
                const wave = Math.sin(t * 12 - this.time * 10 + arm * 0.3) * (5 + energy * 40);

                const x = centerX + Math.cos(angle) * (r + wave);
                const y = centerY + Math.sin(angle) * (r + wave);

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);

                if (arm % 16 === 0 && i % 20 === 0) {
                    this.ctx.save();
                    this.ctx.fillStyle = '#fff';
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#fff';
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 3 + amp * 12, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }

            if (layer === 0) {
                this.ctx.shadowBlur = 15 + amp * 25;
                this.ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        this.ctx.restore();

        // 3. CORE SINGULARITY
        const coreSize = 30 + bass * 80 + (isBeat ? 40 : 0);
        const grad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.2, `hsla(${(this.time * 100) % 360}, 100%, 75%, 1)`);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. BEAT SURGES (Lightning Bolts)
        if (isBeat && amp > 0.6) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2 + amp * 4;
            for (let b = 0; b < 5; b++) {
                const a = Math.random() * Math.PI * 2;
                const r1 = Math.random() * 50;
                const r2 = 100 + Math.random() * maxRadius;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX + Math.cos(a) * r1, centerY + Math.sin(a) * r1);
                this.ctx.lineTo(centerX + Math.cos(a) * r2, centerY + Math.sin(a) * r2);
                this.ctx.stroke();
            }
        }
    }

    /**
     * Chaotic Spiral - Explosive, unpredictable particle spiral
     */
    renderChaoticSpiral(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.55;
        const particleCount = 600;

        for (let i = 0; i < particleCount; i++) {
            const freqIndex = Math.floor((i / particleCount) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 40;

            const baseAngle = (i / particleCount) * Math.PI * 10 + this.time * 4;
            const chaos = Math.sin(i * 0.3 + this.time * 6) * 0.7 + Math.cos(i * 0.2 + this.time * 5) * 0.7;
            const angle = baseAngle + chaos * Math.PI * 0.8;

            const baseRadius = (i / particleCount) * maxRadius;
            const radiusChaos = Math.sin(i * 0.15 + this.time * 7) * maxRadius * 0.3 * energy;
            const radius = baseRadius + radiusChaos + wave * energy;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const hue = (i + this.time * 120) % 360;
            const size = Math.abs(2 + energy * 18 + Math.abs(chaos) * 8);

            this.ctx.fillStyle = `hsla(${hue}, 100%, ${55 + energy * 35}%, ${0.5 + energy * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();

            if (energy > 0.3) {
                const lineAlpha = (energy - 0.3) * 0.5;
                this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${lineAlpha})`;
                this.ctx.lineWidth = 1 + energy;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
        }
    }

    /**
     * Nested Spirals - Concentric spiral rings
     */
    renderNestedSpirals(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rings = 16;
        const maxRadius = Math.min(this.width, this.height) * 0.5;

        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = (ring + 1) / rings * maxRadius;
            const segments = 120 + ring * 15;
            const direction = ring % 2 === 0 ? 1 : -1;
            const speed = 1.2 + ring * 0.4;

            this.ctx.beginPath();

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const freqIndex = Math.floor(t * bufferLength);
                const energy = frequencyData[freqIndex] / 255;
                const wave = (timeData[freqIndex] / 128.0 - 1) * 60;

                const angle = t * Math.PI * 2 + this.time * speed * direction;
                const radiusOffset = Math.sin(t * Math.PI * 6 + this.time * 3 + ring * 0.5) * 50 * energy;
                const radius = ringRadius + wave + radiusOffset;

                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.closePath();
            const hue = (ring * 22 + this.time * 30) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.9)`;
            this.ctx.lineWidth = 2 + metadata.amplitude * 4;
            this.ctx.stroke();

            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.15)`;
            this.ctx.fill();
        }
    }

    /**
     * Spiral Trails - Particles leaving spiral trails
     */
    renderSpiralTrails(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.5;
        const numTrails = 12;
        const trailLength = 50;

        for (let trail = 0; trail < numTrails; trail++) {
            const trailOffset = (trail / numTrails) * Math.PI * 2;
            const freqIndex = Math.floor((trail / numTrails) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            const headAngle = this.time * 2.5 + trailOffset;
            const headRadius = maxRadius * (0.2 + energy * 0.9);

            for (let i = 0; i < trailLength; i++) {
                const age = i / trailLength;
                const pastAngle = headAngle - age * Math.PI * 0.6;
                const pastRadius = headRadius * (1 - age * 0.25);

                const waveIndex = Math.floor(age * bufferLength);
                const wave = (timeData[waveIndex] / 128.0 - 1) * 40;

                const x = centerX + Math.cos(pastAngle) * (pastRadius + wave);
                const y = centerY + Math.sin(pastAngle) * (pastRadius + wave);

                const size = Math.abs((1 - age) * (6 + energy * 20));
                const alpha = (1 - age) * (0.6 + energy * 0.4);
                const hue = (trail * 30 + age * 40 + this.time * 50) % 360;

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${55 + energy * 35}%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            const headX = centerX + Math.cos(headAngle) * headRadius;
            const headY = centerY + Math.sin(headAngle) * headRadius;
            const headHue = (trail * 30 + this.time * 50) % 360;

            this.ctx.fillStyle = `hsla(${headHue}, 100%, 85%, 1)`;
            this.ctx.shadowColor = `hsla(${headHue}, 100%, 70%, 1)`;
            this.ctx.shadowBlur = 25;
            this.ctx.beginPath();
            this.ctx.arc(headX, headY, 10 + energy * 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    /**
     * Tracing Waves - Horizontal waveforms that flow across screen
     */
    renderTracingWaves(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const numWaves = 16;
        const amplitude = this.height * 0.15;

        for (let wave = 0; wave < numWaves; wave++) {
            const yBase = (wave + 1) / (numWaves + 1) * this.height;
            const freqBand = Math.floor((wave / numWaves) * bufferLength);
            const energy = frequencyData[freqBand] / 255;

            this.ctx.beginPath();

            for (let x = 0; x <= this.width; x += 2) {
                const t = x / this.width;
                const dataIndex = Math.floor(t * bufferLength);
                const waveData = (timeData[dataIndex] / 128.0 - 1);

                const flow = Math.sin(t * Math.PI * 6 + this.time * 4 + wave * 0.3) * amplitude * energy;
                const secondary = Math.sin(t * Math.PI * 10 + this.time * 6 - wave * 0.7) * amplitude * 0.5 * energy;
                const audioWave = waveData * amplitude * energy * 1.5;
                const tertiary = Math.cos(t * Math.PI * 3 + this.time * 3 + wave) * amplitude * 0.3 * energy;

                const y = yBase + flow + secondary + audioWave + tertiary;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            const hue = (wave * 22 + this.time * 35) % 360;
            const gradient = this.ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
            gradient.addColorStop(0.5, `hsla(${(hue + 45) % 360}, 100%, 60%, 1)`);
            gradient.addColorStop(1, `hsla(${(hue + 90) % 360}, 100%, 50%, 0.8)`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3 + energy * 6;
            this.ctx.stroke();
            this.ctx.fillStyle = gradient.toString().replace('1)', '0.2)');
            this.ctx.fill();
        }
    }

    /**
     * Crossing Planes - Intersecting grid lines that warp
     */
    renderCrossingPlanes(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const gridLines = 30;
        const amplitude = 80 + metadata.amplitude * 150;

        for (let i = 0; i < gridLines; i++) {
            const t = (i + 1) / (gridLines + 1);
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            this.ctx.beginPath();
            for (let x = 0; x <= this.width; x += 2) {
                const xt = x / this.width;
                const dataIndex = Math.floor(xt * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;

                const warp = Math.sin(xt * Math.PI * 5 + this.time * 2.5 + i * 0.3) * amplitude * energy;
                const tertiary = Math.cos(xt * Math.PI * 3 + this.time * 1.5) * amplitude * energy * 0.4;
                const y = t * this.height + wave + warp + tertiary;

                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            const hue = (i * 12 + this.time * 30) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            this.ctx.lineWidth = 2 + energy * 4;
            this.ctx.stroke();
        }

        for (let i = 0; i < gridLines; i++) {
            const t = (i + 1) / (gridLines + 1);
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            this.ctx.beginPath();
            for (let y = 0; y <= this.height; y += 2) {
                const yt = y / this.height;
                const dataIndex = Math.floor(yt * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;

                const warp = Math.cos(yt * Math.PI * 5 + this.time * 3 + i * 0.3) * amplitude * energy;
                const tertiary = Math.sin(yt * Math.PI * 3 + this.time * 1.8) * amplitude * energy * 0.4;
                const x = t * this.width + wave + warp + tertiary;

                if (y === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            const hue = (i * 12 + 180 + this.time * 30) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            this.ctx.lineWidth = 2 + energy * 4;
            this.ctx.stroke();
        }

        for (let i = 0; i < gridLines; i++) {
            for (let j = 0; j < gridLines; j++) {
                const ti = (i + 1) / (gridLines + 1);
                const tj = (j + 1) / (gridLines + 1);

                const freqIndex = Math.floor(((ti + tj) / 2) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;

                if (energy > 0.2) {
                    const x = ti * this.width + Math.sin(this.time * 2.5 + i * 0.2 + j * 0.3) * amplitude * energy;
                    const y = tj * this.height + Math.cos(this.time * 3 + i * 0.3 - j * 0.2) * amplitude * energy;

                    const hue = ((i + j) * 10 + this.time * 40) % 360;
                    const size = Math.abs(2 + energy * 12);
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${energy * 0.8})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    /**
     * Combined Effects - Mix of spirals, waves, and particles
     */
    renderCombinedEffects(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.min(this.width, this.height) * 0.45;

        const rings = 12;
        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = (ring + 1) / rings * maxRadius * 0.8;
            const segments = 80 + ring * 5;
            let avgEnergy = 0;
            let energyCount = 0;

            this.ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const freqIndex = Math.max(0, Math.min(bufferLength - 1, Math.floor(t * bufferLength)));
                const energy = frequencyData[freqIndex] / 255;
                avgEnergy += energy;
                energyCount++;

                const angle = t * Math.PI * 2 + this.time * (1.2 + ring * 0.25) * (ring % 2 === 0 ? 1 : -1);
                const radius = Math.max(0, ringRadius + Math.sin(t * Math.PI * 8 + this.time * 4) * 35 * energy);

                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();

            avgEnergy = avgEnergy / energyCount;
            const hue = (ring * 30 + this.time * 30) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            this.ctx.lineWidth = Math.max(1, 2 + avgEnergy * 3);
            this.ctx.stroke();
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.08)`;
            this.ctx.fill();
        }

        const numWaves = 8;
        for (let wave = 0; wave < numWaves; wave++) {
            const yBase = this.height * (0.1 + wave * 0.11);

            this.ctx.beginPath();
            let waveEnergy = 0;
            let waveCount = 0;
            for (let x = 0; x <= this.width; x += 2) {
                const t = x / this.width;
                const dataIndex = Math.max(0, Math.min(bufferLength - 1, Math.floor(t * bufferLength)));
                const energy = frequencyData[dataIndex] / 255;
                const waveData = (timeData[dataIndex] / 128.0 - 1);
                waveEnergy += energy;
                waveCount++;

                const y = yBase + Math.sin(t * Math.PI * 8 + this.time * 3 + wave * 0.4) * 50 * energy + waveData * 60;

                if (x === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }

            waveEnergy = waveEnergy / waveCount;
            const hue = (wave * 45 + this.time * 40) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 90%, 55%, 0.7)`;
            this.ctx.lineWidth = Math.max(1, 3 + waveEnergy * 5);
            this.ctx.stroke();
        }

        const particleCount = 200;
        for (let i = 0; i < particleCount; i++) {
            const freqIndex = Math.floor((i / particleCount) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            if (energy > 0.15) {
                const angle = (i / particleCount) * Math.PI * 2 + this.time * 1.8;
                const radius = maxRadius * (0.5 + energy * 0.8 + Math.sin(this.time * 2 + i * 0.1) * 0.3);

                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                const hue = (i * 2 + this.time * 60) % 360;
                const size = Math.abs(2 + energy * 15);
                this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${energy * 0.7})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /**
     * Authentic Tunnel Journey - Travel through a dynamic music-reactive tunnel
     * Tunnel narrows/broadens and pulses with the music
     */
    renderDepthLines(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;
        const travelSpeed = 80;
        const tunnelRings = 60;
        const segmentsPerRing = 32;
        const maxTunnelRadius = Math.min(this.width, this.height) * 0.4;
        const ringSpacing = 25;

        const travelDistance = this.time * travelSpeed;

        for (let ring = 0; ring < tunnelRings; ring++) {
            const zPos = ring * ringSpacing - (travelDistance % (tunnelRings * ringSpacing));
            const z3d = zPos - 300;

            if (z3d > 200 || z3d < -1500) continue;

            const distanceFromViewer = Math.abs(z3d);
            const ringDepth = (z3d + 1500) / 1700;
            const freqIndex = Math.floor(ringDepth * bufferLength * 0.8) % bufferLength;
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1);

            const bassEnergy = (metadata.energyBands?.bass || 0) / 5000;
            const midEnergy = (metadata.energyBands?.mid || 0) / 3000;

            const tunnelPulse = this.fastSin(this.time * 2.5 + ring * 0.3) * 0.25 + 1;
            const beatPulse = this.fastSin(this.time * 8) * 0.2 * bassEnergy + 0.9;
            const audioNarrow = 0.65 + energy * 0.6 + Math.abs(wave) * 0.25;
            const dynamicScale = tunnelPulse * beatPulse * audioNarrow;

            const depthFactor = Math.max(0.2, 1 - Math.abs(z3d) / 1200);
            const baseRadius = maxTunnelRadius * dynamicScale * depthFactor;

            const waveRipple = this.fastSin(ring * 0.6 + this.time * 4) * 40 * energy * intensity;
            const disturbance = this.fastCos(ring * 0.9 + this.time * 3.5) * 35 * midEnergy * intensity;
            const tunnelRadius = baseRadius + waveRipple + disturbance + wave * 60 * energy;

            const points = [];
            for (let seg = 0; seg <= segmentsPerRing; seg++) {
                const angle = (seg / segmentsPerRing) * Math.PI * 2;

                const segFreqIndex = Math.floor((seg / segmentsPerRing) * bufferLength) % bufferLength;
                const segEnergy = frequencyData[segFreqIndex] / 255;

                const localWobble = this.fastSin(angle * 4 + this.time * 5 + ring * 0.2) * 25 * segEnergy * intensity;
                const radius = Math.max(5, tunnelRadius + localWobble);

                const x3d = this.fastCos(angle) * radius;
                const y3d = this.fastSin(angle) * radius;

                const projected = this.camera ?
                    this.camera.project(x3d, y3d, z3d, centerX, centerY) :
                    {
                        x: centerX + (x3d / (1 + Math.abs(z3d) / 500)),
                        y: centerY + (y3d / (1 + Math.abs(z3d) / 500)),
                        scale: Math.max(0.1, 1 / (1 + Math.abs(z3d) / 400))
                    };

                if (!projected || projected.scale < 0.02) continue;

                points.push({
                    ...projected,
                    angle,
                    segEnergy,
                    radius,
                    z: z3d
                });
            }

            if (points.length > 2) {
                const hue = (ring * 7 + this.time * 70 + energy * 80) % 360;
                const brightness = 40 + energy * 50 + (1 - Math.abs(z3d) / 1500) * 20;
                const alpha = Math.min(1, (0.35 + energy * 0.6 + depthFactor * 0.25) * intensity);
                const avgScale = points.reduce((s, p) => s + p.scale, 0) / points.length;

                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
                this.ctx.lineWidth = Math.max(2, (2.5 + energy * 7) * avgScale * intensity);
                this.ctx.shadowColor = `hsla(${hue}, 100%, 65%, ${alpha * 0.6})`;
                this.ctx.shadowBlur = 12 * energy * intensity;

                this.ctx.beginPath();
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    if (i === 0) this.ctx.moveTo(p.x, p.y);
                    else this.ctx.lineTo(p.x, p.y);
                }
                this.ctx.closePath();
                this.ctx.stroke();

                this.ctx.shadowBlur = 0;

                if (ring % 3 === 0 && z3d > -800) {
                    for (let i = 0; i < points.length; i += 2) {
                        const p = points[i];
                        const size = Math.max(1.5, (2 + p.segEnergy * 14) * p.scale * intensity);
                        const particleHue = (hue + i * 12) % 360;

                        this.ctx.fillStyle = `hsla(${particleHue}, 100%, ${70 + p.segEnergy * 25}%, ${alpha * 0.85})`;
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }

            if (ring > 0 && ring % 5 === 0 && z3d > -1200) {
                const prevRing = ring - 1;
                const prevZPos = prevRing * ringSpacing - (travelDistance % (tunnelRings * ringSpacing));
                const prevZ3d = prevZPos - 300;

                if (prevZ3d > -1500) {
                    const prevFreqIndex = Math.floor(((prevZ3d + 1500) / 1700) * bufferLength * 0.8) % bufferLength;
                    const prevEnergy = frequencyData[prevFreqIndex] / 255;

                    const prevBassEnergy = (metadata.energyBands?.bass || 0) / 5000;
                    const prevTunnelPulse = this.fastSin(this.time * 2.5 + prevRing * 0.3) * 0.25 + 1;
                    const prevBeatPulse = this.fastSin(this.time * 8) * 0.2 * prevBassEnergy + 0.9;
                    const prevAudioNarrow = 0.65 + prevEnergy * 0.6;
                    const prevDynamicScale = prevTunnelPulse * prevBeatPulse * prevAudioNarrow;
                    const prevDepthFactor = Math.max(0.2, 1 - Math.abs(prevZ3d) / 1200);
                    const prevBaseRadius = maxTunnelRadius * prevDynamicScale * prevDepthFactor;

                    for (let seg = 0; seg < segmentsPerRing; seg += 6) {
                        const angle = (seg / segmentsPerRing) * Math.PI * 2;

                        const segFreqIndex = Math.floor((seg / segmentsPerRing) * bufferLength) % bufferLength;
                        const segEnergy = frequencyData[segFreqIndex] / 255;

                        const localWobble = this.fastSin(angle * 4 + this.time * 5 + ring * 0.2) * 25 * segEnergy * intensity;
                        const prevLocalWobble = this.fastSin(angle * 4 + this.time * 5 + prevRing * 0.2) * 25 * segEnergy * intensity;

                        const radius = Math.max(5, baseRadius + localWobble);
                        const prevRadius = Math.max(5, prevBaseRadius + prevLocalWobble);

                        const x3d = this.fastCos(angle) * radius;
                        const y3d = this.fastSin(angle) * radius;
                        const prevX3d = this.fastCos(angle) * prevRadius;
                        const prevY3d = this.fastSin(angle) * prevRadius;

                        const projected = this.camera ? this.camera.project(x3d, y3d, z3d, centerX, centerY) : null;
                        const prevProjected = this.camera ? this.camera.project(prevX3d, prevY3d, prevZ3d, centerX, centerY) : null;

                        if (projected && prevProjected && segEnergy > 0.2) {
                            const connectionHue = (ring * 7 + seg * 8 + this.time * 85) % 360;
                            const connectionAlpha = (0.2 + segEnergy * 0.35) * intensity;

                            this.ctx.strokeStyle = `hsla(${connectionHue}, 90%, ${50 + segEnergy * 40}%, ${connectionAlpha})`;
                            this.ctx.lineWidth = Math.max(1.2, (1.5 + segEnergy * 3.5) * projected.scale);
                            this.ctx.beginPath();
                            this.ctx.moveTo(prevProjected.x, prevProjected.y);
                            this.ctx.lineTo(projected.x, projected.y);
                            this.ctx.stroke();
                        }
                    }
                }
            }
        }

        const coreEnergy = metadata.amplitude * intensity;
        const coreSize = 15 + coreEnergy * 40;
        const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
        coreGradient.addColorStop(0, `hsla(${(this.time * 110) % 360}, 100%, 99%, 1)`);
        coreGradient.addColorStop(0.3, `hsla(${(this.time * 110 + 25) % 360}, 100%, 80%, 0.7)`);
        coreGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Apple Music Style: Warp Tunnel - 3D tunnel rushing towards viewer
     */
    renderWarpTunnel(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rings = 25;
        const segments = 36;

        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;
        const speed = this.time * 3.5 + (this.camera ? this.camera.z * 0.02 : 0);
        const maxRadius = Math.max(this.width, this.height) * 0.7;

        for (let ring = 0; ring < rings; ring++) {
            const zProgress = ((ring / rings) + speed * 0.2) % 1;
            const z3d = (1 - zProgress) * 800 - 300;

            const freqIndex = Math.floor((ring / rings) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 60;

            const baseRadius = 40 + zProgress * maxRadius * (0.9 + energy * 0.4);

            const points = [];
            for (let seg = 0; seg <= segments; seg++) {
                const angle = (seg / segments) * Math.PI * 2 + this.time * 0.6 + ring * 0.2;

                const segFreqIndex = Math.floor((seg / segments) * bufferLength);
                const segEnergy = frequencyData[segFreqIndex] / 255;

                const wobble = this.fastSin(angle * 4 + this.time * 5) * 40 * segEnergy * intensity;
                const radius = baseRadius + wobble + wave * energy;

                const x3d = this.fastCos(angle) * radius;
                const y3d = this.fastSin(angle) * radius;

                const projected = this.camera ? this.camera.project(x3d, y3d, z3d, centerX, centerY) : { x: centerX + x3d * 0.5, y: centerY + y3d * 0.5, scale: 1 };
                if (projected) points.push({ ...projected, angle, segEnergy });
            }

            if (points.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    this.ctx.lineTo(points[i].x, points[i].y);
                }

                const hue = (ring * 7 + this.time * 80) % 360;
                const brightness = 55 + energy * 30;
                const alpha = Math.min(1, (0.35 + zProgress * 0.5 + energy * 0.25) * intensity);
                const avgScale = points.reduce((s, p) => s + p.scale, 0) / points.length;

                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
                this.ctx.lineWidth = Math.max(1.5, (2 + energy * 4) * avgScale);
                this.ctx.stroke();

                if (zProgress > 0.6 && energy > 0.2) {
                    for (let i = 0; i < points.length; i += 3) {
                        const p = points[i];
                        const size = (3 + p.segEnergy * 12) * p.scale * intensity;
                        this.ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.9})`;
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }

        const coreEnergy = metadata.amplitude * intensity;
        const coreSize = 25 + coreEnergy * 70;
        const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
        coreGradient.addColorStop(0, `hsla(${(this.time * 100) % 360}, 100%, 98%, 1)`);
        coreGradient.addColorStop(0.3, `hsla(${(this.time * 100 + 30) % 360}, 100%, 75%, 0.7)`);
        coreGradient.addColorStop(0.7, `hsla(${(this.time * 100 + 60) % 360}, 100%, 55%, 0.3)`);
        coreGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Apple Music Style: 3D Spectrum Bars - Frequency bars with 3D perspective
     */
    render3DSpectrumBars(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height * 0.95;
        const barCount = 48;
        const rows = 6;

        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;
        const cameraOffset = this.camera ? this.camera.x * 0.3 : 0;

        for (let row = rows - 1; row >= 0; row--) {
            const z3d = row * 120 - 200;

            for (let i = 0; i < barCount; i++) {
                const freqIndex = Math.floor((i / barCount) * bufferLength * 0.75);
                const energy = frequencyData[freqIndex] / 255;
                const wave = (timeData[freqIndex] / 128.0 - 1);

                const xPos = (i / barCount - 0.5) * this.width * 1.2 + cameraOffset;
                const projected = this.camera ? this.camera.project(xPos, 0, z3d, centerX, centerY) : { x: centerX + xPos * 0.5, y: centerY, scale: 1 };
                if (!projected || projected.scale < 0.1) continue;

                const barWidth = (this.width / barCount) * projected.scale * 1.1;
                const x = projected.x - barWidth / 2;

                const maxHeight = this.height * 0.85;
                const barHeight = (energy * maxHeight * intensity + Math.abs(wave) * 60) * projected.scale;
                const y = centerY - barHeight - row * 40 * projected.scale;

                const hue = (i * 7 + row * 25 + this.time * 50) % 360;
                const saturation = 95;
                const brightness = 50 + energy * 40;
                const alpha = Math.min(1, (0.7 + energy * 0.3) * intensity * (1 - row * 0.1));

                this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${alpha})`;
                this.ctx.fillRect(x, y, barWidth, barHeight);

                const topDepth = 12 * projected.scale;
                this.ctx.fillStyle = `hsla(${hue + 25}, ${saturation}%, ${brightness + 20}%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + barWidth, y);
                this.ctx.lineTo(x + barWidth + topDepth, y - topDepth);
                this.ctx.lineTo(x + topDepth, y - topDepth);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = `hsla(${hue - 15}, ${saturation}%, ${brightness - 15}%, ${alpha * 0.85})`;
                this.ctx.beginPath();
                this.ctx.moveTo(x + barWidth, y);
                this.ctx.lineTo(x + barWidth + topDepth, y - topDepth);
                this.ctx.lineTo(x + barWidth + topDepth, y + barHeight - topDepth);
                this.ctx.lineTo(x + barWidth, y + barHeight);
                this.ctx.closePath();
                this.ctx.fill();

                if (energy > 0.5) {
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 85%, ${(energy - 0.5) * 0.9})`;
                    this.ctx.fillRect(x - 2, y - 3, barWidth + 4, Math.min(barHeight * 0.1, 15));
                }
            }
        }
    }

    /**
     * Apple Music Style: Orbit Lines - 3D orbiting line trails
     */
    renderOrbitLines(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const orbits = 8;
        const pointsPerOrbit = 100;

        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;
        const maxRadius = Math.min(this.width, this.height) * 0.55;

        this.ctx.shadowBlur = 0;

        for (let orbit = 0; orbit < orbits; orbit++) {
            const orbitRadius = 60 + orbit * (maxRadius / orbits);
            const orbitTilt = (orbit * 0.35) + Math.PI * 0.2;
            const orbitSpeed = (1.5 + orbit * 0.3) * (orbit % 2 === 0 ? 1 : -1);
            const freqBand = Math.floor((orbit / orbits) * bufferLength * 0.5);

            const points = [];

            for (let i = 0; i <= pointsPerOrbit; i++) {
                const t = i / pointsPerOrbit;
                const angle = t * Math.PI * 2 + this.time * orbitSpeed;

                const freqIndex = Math.floor(t * bufferLength * 0.8);
                const energy = frequencyData[freqBand + Math.floor(freqIndex * 0.2)] / 255;
                const wave = (timeData[freqIndex] / 128.0 - 1);

                const radiusOffset = this.fastSin(angle * 4 + this.time * 5) * 50 * energy * intensity;
                const r = orbitRadius + radiusOffset + wave * 60 * energy;

                const x3d = this.fastCos(angle) * r;
                const y3d = this.fastSin(angle) * r * this.fastCos(orbitTilt);
                const z3d = this.fastSin(angle) * r * this.fastSin(orbitTilt) + orbit * 60 - 200;

                const projected = this.camera ? this.camera.project(x3d, y3d, z3d, centerX, centerY) : { x: centerX + x3d * 0.5, y: centerY + y3d * 0.5, scale: 1 };
                if (!projected) continue;

                points.push({ ...projected, energy, t });
            }

            if (points.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    this.ctx.lineTo(points[i].x, points[i].y);
                }

                const orbitHue = (orbit * 45 + this.time * 60) % 360;
                const avgEnergy = points.reduce((sum, p) => sum + p.energy, 0) / points.length;

                this.ctx.strokeStyle = `hsla(${orbitHue}, 100%, 60%, ${0.5 + avgEnergy * 0.4})`;
                this.ctx.lineWidth = 3 + avgEnergy * 4;
                this.ctx.stroke();

                for (let i = 0; i < points.length; i += 3) {
                    const p = points[i];
                    const size = (3 + p.energy * 12) * p.scale * intensity;
                    const hue = (orbitHue + p.t * 80) % 360;
                    const alpha = Math.min(1, (0.5 + p.energy * 0.5) * p.scale);

                    this.ctx.fillStyle = `hsla(${hue}, 100%, ${65 + p.energy * 30}%, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        const centralEnergy = metadata.amplitude * intensity;
        const pulseSize = 35 + centralEnergy * 90;
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize);
        gradient.addColorStop(0, `hsla(${(this.time * 80) % 360}, 100%, 95%, 1)`);
        gradient.addColorStop(0.4, `hsla(${(this.time * 80 + 40) % 360}, 100%, 65%, 0.6)`);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Apple Music Style: Starburst - Lines exploding outward with 3D depth
     */
    renderStarburst(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rayCount = 100;

        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;
        const maxLength = Math.max(this.width, this.height) * 0.75;

        for (let i = 0; i < rayCount; i++) {
            const baseAngle = (i / rayCount) * Math.PI * 2;
            const freqIndex = Math.floor((i / rayCount) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1);

            const rayLength = 50 + energy * maxLength * intensity + Math.abs(wave) * 80;

            const segments = 25;
            let prevPoint = null;

            for (let s = 0; s < segments; s++) {
                const segProgress = s / segments;
                const segDist = segProgress * rayLength;

                const z3d = this.fastSin(segProgress * Math.PI + this.time * 4 + i * 0.1) * 300 * energy - 100;

                const spiralAngle = baseAngle + segProgress * 0.3 * energy + this.time * 0.3;
                const x3d = this.fastCos(spiralAngle) * segDist;
                const y3d = this.fastSin(spiralAngle) * segDist;

                const projected = this.camera ? this.camera.project(x3d, y3d, z3d, centerX, centerY) : { x: centerX + x3d * 0.5, y: centerY + y3d * 0.5, scale: 1 };
                if (!projected) continue;

                const hue = (i * 3.6 + s * 10 + this.time * 100) % 360;
                const brightness = 55 + energy * 40;
                const size = Math.max(2, (4 + energy * 10) * projected.scale * (1 - segProgress * 0.4) * intensity);
                const alpha = Math.min(1, (0.5 + energy * 0.5) * (1 - segProgress * 0.5) * projected.scale);

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
                this.ctx.fill();

                if (prevPoint) {
                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${alpha * 0.8})`;
                    this.ctx.lineWidth = Math.max(1, (2 + energy * 3) * projected.scale);
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevPoint.x, prevPoint.y);
                    this.ctx.lineTo(projected.x, projected.y);
                    this.ctx.stroke();
                }

                prevPoint = projected;
            }
        }

        const coreEnergy = metadata.amplitude * intensity;
        const coreSize = 40 + coreEnergy * 100;
        const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
        coreGradient.addColorStop(0, `hsla(${(this.time * 120) % 360}, 100%, 98%, 1)`);
        coreGradient.addColorStop(0.3, `hsla(${(this.time * 120 + 40) % 360}, 100%, 75%, 0.7)`);
        coreGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Apple Music Style: Horizon Grid - 3D perspective grid with camera integration
     */
    renderHorizonGrid(audioData, metadata) {
        if (!audioData || !audioData.frequencyData) return;
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const intensity = this.camera ? this.camera.getIntensityMultiplier() : 1;

        const horizonY = this.height * 0.4 + (this.camera ? this.camera.y * 0.3 : 0);
        const gridLines = 35;
        const verticalLines = 50;

        const cameraOffset = this.camera ? this.camera.x * 0.5 : 0;
        const speed = this.time * 2.5 + (this.camera ? this.camera.z * 0.01 : 0);

        for (let i = 0; i < gridLines; i++) {
            const baseZ = ((i / gridLines) * 1000 + (speed * 60) % 1000) % 1000;
            const z3d = baseZ - 200;

            const projected = this.camera ? this.camera.project(0, 100, z3d, centerX, centerY) : { x: centerX, y: centerY, scale: 0.5 };
            if (!projected || projected.scale <= 0.03) continue;

            const scale = projected.scale;
            const freqIndex = Math.floor((i / gridLines) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 40 * intensity;

            const y = horizonY + (1 - scale) * (this.height - horizonY) * 1.4;

            const xExtent = this.width * scale * 2.5;
            const x1 = centerX - xExtent + cameraOffset;
            const x2 = centerX + xExtent + cameraOffset;

            const waveY = y + wave * energy * intensity;

            const hue = (i * 10 + this.time * 50) % 360;
            const alpha = Math.min(1, (0.3 + scale * 0.7) * (0.6 + energy * 0.4));

            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${55 + energy * 35}%, ${alpha})`;
            this.ctx.lineWidth = Math.max(1.5, 4 * scale * (1 + energy * intensity));
            this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.5)`;
            this.ctx.shadowBlur = 8 * energy;
            this.ctx.beginPath();

            for (let x = x1; x <= x2; x += 8) {
                const t = (x - x1) / (x2 - x1);
                const waveFreq = Math.floor(t * bufferLength);
                const localEnergy = frequencyData[waveFreq] / 255;
                const localY = waveY + this.fastSin(t * Math.PI * 10 + this.time * 6) * 20 * localEnergy * intensity;

                if (x === x1) this.ctx.moveTo(x, localY);
                else this.ctx.lineTo(x, localY);
            }
            this.ctx.stroke();
        }

        this.ctx.shadowBlur = 0;

        for (let i = 0; i < verticalLines; i++) {
            const xProgress = (i / (verticalLines - 1)) - 0.5;
            const x1 = centerX + xProgress * this.width * 2.5 + cameraOffset;
            const x2 = centerX + xProgress * this.width * 0.15 + cameraOffset * 0.5;

            const freqIndex = Math.floor((i / verticalLines) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;

            const hue = (i * 7 + this.time * 60) % 360;
            const alpha = 0.4 + energy * 0.5;

            const gradient = this.ctx.createLinearGradient(x1, this.height + 30, x2, horizonY);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 70%, ${alpha * 0.7})`);
            gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 80%, ${alpha * 0.3})`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 1.5 + energy * 3 * intensity;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, this.height + 30);
            this.ctx.lineTo(x2, horizonY);
            this.ctx.stroke();
        }

        const sunX = centerX + (this.camera ? this.camera.shakeX * 0.5 : 0) + cameraOffset * 0.3;
        const sunY = horizonY + (this.camera ? this.camera.shakeY * 0.3 : 0);
        const sunSize = (80 + metadata.amplitude * 120 + this.fastSin(this.time * 3) * 25) * intensity;

        const sunGradient = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize);
        sunGradient.addColorStop(0, `hsla(${(this.time * 35) % 360}, 100%, 95%, 1)`);
        sunGradient.addColorStop(0.3, `hsla(${(this.time * 35 + 25) % 360}, 100%, 75%, 0.8)`);
        sunGradient.addColorStop(0.6, `hsla(${(this.time * 35 + 50) % 360}, 100%, 55%, 0.4)`);
        sunGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = sunGradient;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
        this.ctx.fill();

        const glowSize = sunSize * 1.5 + metadata.amplitude * 50;
        const glowGradient = this.ctx.createRadialGradient(sunX, sunY, sunSize * 0.8, sunX, sunY, glowSize);
        glowGradient.addColorStop(0, `hsla(${(this.time * 35 + 60) % 360}, 100%, 60%, 0.3)`);
        glowGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, glowSize, 0, Math.PI * 2);
        this.ctx.fill();
    }
}