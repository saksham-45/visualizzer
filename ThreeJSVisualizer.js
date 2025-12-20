/**
 * ThreeJS Visualizer Module - Premium Mercury/Liquid Metal
 * True 3D chrome/metallic orbs with environment reflections and audio reactivity
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class ThreeJSVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.mercuryMesh = null;
        this.drops = [];
        this.lights = [];
        this.envMap = null;
        this.mode = 'mercuryOrbs';

        this.uniforms = {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uMid: { value: 0 },
            uHigh: { value: 0 },
            uAmplitude: { value: 0 }
        };

        this.beatDecay = 0;
        this.initialized = false;
        this.clock = new THREE.Clock();
    }

    initialize() {
        if (this.initialized) return;

        try {
            const container = this.canvas.parentElement;

            // Create Three.js canvas
            this.threeCanvas = document.createElement('canvas');
            this.threeCanvas.className = 'three-canvas';
            this.threeCanvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                pointer-events: none;
            `;
            container.insertBefore(this.threeCanvas, this.canvas);

            // Setup WebGL Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.threeCanvas,
                alpha: false,
                antialias: true,
                powerPreference: 'high-performance'
            });

            const width = container.clientWidth;
            const height = container.clientHeight;

            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x000000);
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;

            // Scene & Camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            this.camera.position.z = 6;

            // Create dynamic gradient environment
            this.createEnvironment();

            // Create premium mercury sphere
            this.createMercurySphere();

            // Create satellite drops
            this.createDrops();

            // Create dynamic lights
            this.createLights();

            // Post-processing
            this.setupPostProcessing(width, height);

            this.initialized = true;
            console.log('[ThreeJSVisualizer] Premium 3D engine initialized');

            // Set initial mode
            this.setMode(this.mode);

            window.addEventListener('resize', () => this.resize());
        } catch (error) {
            console.error('[ThreeJSVisualizer] Init failed:', error);
        }
    }

    createEnvironment() {
        // Create a procedural HDR-like environment for reflections
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Create dynamic gradient background
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, '#1a0a30');
        gradient.addColorStop(0.3, '#0a1a2a');
        gradient.addColorStop(0.6, '#0f0f1a');
        gradient.addColorStop(1, '#000005');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add colored light spots for chromatic reflections
        const lightSpots = [
            { x: size * 0.2, y: size * 0.3, color: '#ff3388', radius: 100 },
            { x: size * 0.8, y: size * 0.2, color: '#33ffaa', radius: 80 },
            { x: size * 0.5, y: size * 0.8, color: '#3388ff', radius: 90 },
            { x: size * 0.1, y: size * 0.7, color: '#ffaa33', radius: 70 },
            { x: size * 0.9, y: size * 0.6, color: '#ff33ff', radius: 85 },
            { x: size * 0.3, y: size * 0.9, color: '#33ffff', radius: 75 }
        ];

        lightSpots.forEach(spot => {
            const spotGradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.radius);
            spotGradient.addColorStop(0, spot.color);
            spotGradient.addColorStop(1, 'transparent');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = spotGradient;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.scene.environment = texture;
        this.scene.background = new THREE.Color(0x000000);
        this.envMap = texture;
    }

    createMercurySphere() {
        // High-detail geometry for smooth deformation
        const geometry = new THREE.IcosahedronGeometry(1.5, 64);

        // Store original positions for deformation
        const posAttr = geometry.attributes.position;
        this.originalPositions = new Float32Array(posAttr.array.length);
        this.originalPositions.set(posAttr.array);

        // Premium physical material - true chrome/mercury look
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.0,
            envMapIntensity: 3.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            reflectivity: 1.0,
            ior: 2.5, // High IOR for liquid metal
            iridescence: 0.8,
            iridescenceIOR: 2.0,
            iridescenceThicknessRange: [100, 800],
            sheen: 0.5,
            sheenColor: new THREE.Color(0x3399ff),
            sheenRoughness: 0.2
        });

        this.mercuryMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mercuryMesh);

        // Add inner glow sphere
        const glowGeo = new THREE.SphereGeometry(1.48, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x4466ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.innerGlow = new THREE.Mesh(glowGeo, glowMat);
        this.scene.add(this.innerGlow);
    }

    createDrops() {
        for (let i = 0; i < 8; i++) {
            const size = 0.1 + Math.random() * 0.15;
            const dropGeo = new THREE.IcosahedronGeometry(size, 16);

            // Store original positions for each drop
            const posAttr = dropGeo.attributes.position;
            const originalPos = new Float32Array(posAttr.array.length);
            originalPos.set(posAttr.array);

            const dropMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 1.0,
                roughness: 0.0,
                envMapIntensity: 2.5,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0,
                iridescence: 0.6,
                iridescenceIOR: 1.8
            });

            const drop = new THREE.Mesh(dropGeo, dropMat);
            this.scene.add(drop);

            this.drops.push({
                mesh: drop,
                originalPositions: originalPos,
                angle: (i / 8) * Math.PI * 2,
                radius: 2.2 + Math.random() * 0.8,
                speed: 0.3 + Math.random() * 0.4,
                yOffset: (Math.random() - 0.5) * 2,
                verticalSpeed: 0.5 + Math.random() * 0.5,
                size
            });
        }
    }

    createLights() {
        // Ambient for base illumination
        const ambient = new THREE.AmbientLight(0x111122, 0.3);
        this.scene.add(ambient);

        // Dynamic colored point lights for chromatic reflections
        const lightConfigs = [
            { color: 0xff3366, intensity: 3, distance: 25 },
            { color: 0x33ff99, intensity: 2.5, distance: 22 },
            { color: 0x3366ff, intensity: 3, distance: 25 },
            { color: 0xffff33, intensity: 2, distance: 20 },
            { color: 0xff33ff, intensity: 2.5, distance: 22 },
            { color: 0x33ffff, intensity: 2.5, distance: 22 }
        ];

        lightConfigs.forEach((config, i) => {
            const light = new THREE.PointLight(config.color, config.intensity, config.distance);
            const angle = (i / lightConfigs.length) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 5,
                Math.sin(angle * 0.7) * 3,
                Math.sin(angle) * 5
            );
            this.scene.add(light);
            this.lights.push({
                light,
                baseAngle: angle,
                speed: 0.2 + i * 0.08,
                baseIntensity: config.intensity,
                radiusBase: 5,
                yFrequency: 0.5 + Math.random() * 0.5
            });
        });

        // Add a subtle hemisphere light for better ambient
        const hemi = new THREE.HemisphereLight(0x3366ff, 0x220033, 0.3);
        this.scene.add(hemi);
    }

    setupPostProcessing(width, height) {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Enhanced bloom for that glowing liquid look
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.0,   // strength
            0.5,   // radius
            0.7    // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }

    resize() {
        if (!this.renderer || !this.threeCanvas) return;

        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    // Enhanced 3D noise function using multiple octaves
    noise3D(x, y, z, octaves = 2) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            const n = Math.sin(x * frequency * 12.9898 + y * frequency * 78.233 + z * frequency * 37.719) * 43758.5453;
            value += ((n - Math.floor(n)) * 2 - 1) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    setMode(mode) {
        this.mode = mode;
        if (!this.mercuryMesh) return;

        const material = this.mercuryMesh.material;

        // Reset baseline parameters
        material.color.setHex(0xffffff);
        material.metalness = 1.0;
        material.roughness = 0.0;
        material.emissive.setHex(0x000000);
        this.scene.background = new THREE.Color(0x000000);

        switch (mode) {
            case 'liquidMetal':
                // Silver/Chrome liquid - darker, smoother flow
                material.roughness = 0.1;
                material.metalness = 1.0;
                material.iridescence = 0.3;
                break;
            case 'metallicNebula':
                // Cosmic colors
                material.metalness = 0.9;
                material.roughness = 0.2;
                material.emissive.setHex(0x110033);
                material.iridescence = 1.0;
                break;
            case 'mercuryOrbs':
            default:
                // Pure mercury
                material.metalness = 1.0;
                material.roughness = 0.0;
                material.iridescence = 0.8;
                break;
        }
    }

    update(audioAnalysis) {
        if (!this.initialized || !this.mercuryMesh) return;

        const delta = this.clock.getDelta();
        const metadata = audioAnalysis || {};
        const bass = metadata.energyBands?.bass || 0;
        const mid = metadata.energyBands?.mid || 0;
        const high = metadata.energyBands?.high || 0;
        const amplitude = metadata.amplitude || 0;
        const beat = metadata.rhythm?.beat ? 1.0 : 0.0;

        // Smooth audio values with different decay rates
        this.uniforms.uBass.value += (bass - this.uniforms.uBass.value) * 0.2;
        this.uniforms.uMid.value += (mid - this.uniforms.uMid.value) * 0.15;
        this.uniforms.uHigh.value += (high - this.uniforms.uHigh.value) * 0.25;
        this.uniforms.uAmplitude.value += (amplitude - this.uniforms.uAmplitude.value) * 0.15;
        this.uniforms.uTime.value += delta;

        // Beat decay for bounce effect
        if (beat > 0.5) {
            this.beatDecay = 1.0;
        } else {
            this.beatDecay *= 0.88;
        }

        const time = this.uniforms.uTime.value;
        const bassVal = this.uniforms.uBass.value;
        const midVal = this.uniforms.uMid.value;
        const highVal = this.uniforms.uHigh.value;
        const ampVal = this.uniforms.uAmplitude.value;

        // ===== MERCURY DEFORMATION =====
        const posAttr = this.mercuryMesh.geometry.attributes.position;

        // Mode-specific noise settings
        let noiseSpeed = 0.3;
        let noiseAmp = 0.12;

        if (this.mode === 'liquidMetal') {
            noiseSpeed = 0.6; // Faster flow
            noiseAmp = 0.18; // More distortion
        } else if (this.mode === 'metallicNebula') {
            noiseSpeed = 0.2;
            noiseAmp = 0.15;
        }

        for (let i = 0; i < posAttr.count; i++) {
            const idx = i * 3;
            const ox = this.originalPositions[idx];
            const oy = this.originalPositions[idx + 1];
            const oz = this.originalPositions[idx + 2];

            // Multi-layer noise for fluid organic movement
            const noise1 = this.noise3D(ox * 1.5 + time * noiseSpeed, oy * 1.5, oz * 1.5, 3) * noiseAmp;
            const noise2 = this.noise3D(ox * 3 + time * (noiseSpeed * 2.6), oy * 3 + time * (noiseSpeed * 1.6), oz * 3, 2) * (noiseAmp * 0.5);
            const noise3 = this.noise3D(ox * 5 + time * (noiseSpeed * 5), oy * 5, oz * 5 + time, 1) * (noiseAmp * 0.3);

            // Audio-reactive amplitude modulation
            const audioMod = 1.0 + bassVal * 1.5 + midVal * 0.8 + highVal * 0.4;
            const displacement = (noise1 + noise2 + noise3) * audioMod;

            // Add beat "pulse" wave
            const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const beatPulse = Math.sin(dist * 8 - time * 15) * this.beatDecay * 0.08;

            // Calculate normal (direction from center)
            const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const nx = ox / len;
            const ny = oy / len;
            const nz = oz / len;

            // Apply displacement
            posAttr.array[idx] = ox + nx * (displacement + beatPulse);
            posAttr.array[idx + 1] = oy + ny * (displacement + beatPulse);
            posAttr.array[idx + 2] = oz + nz * (displacement + beatPulse);
        }
        posAttr.needsUpdate = true;
        this.mercuryMesh.geometry.computeVertexNormals();

        // ===== BEAT BOUNCE (Scale) =====
        const bounceScale = 1.0 + this.beatDecay * 0.3 + bassVal * 0.15;
        this.mercuryMesh.scale.setScalar(bounceScale);

        if (this.mode === 'metallicNebula') {
            this.mercuryMesh.scale.multiplyScalar(1.2);
        }

        this.innerGlow.scale.setScalar(bounceScale * 0.98);

        // ===== ROTATION =====
        this.mercuryMesh.rotation.y += 0.003 + bassVal * 0.015;
        this.mercuryMesh.rotation.x += 0.001 + midVal * 0.005;
        this.innerGlow.rotation.y = this.mercuryMesh.rotation.y;
        this.innerGlow.rotation.x = this.mercuryMesh.rotation.x;

        // ===== MATERIAL UPDATES =====
        // Dynamic iridescence based on audio
        const material = this.mercuryMesh.material;
        material.iridescence = 0.5 + ampVal * 0.5;
        material.sheenColor.setHSL((time * 0.1 + highVal) % 1, 1, 0.5);

        if (this.mode === 'metallicNebula') {
            const hue = (time * 0.05) % 1;
            material.color.setHSL(hue, 0.5, 0.5);
            material.emissive.setHSL((hue + 0.5) % 1, 0.8, 0.2);
        } else if (this.mode === 'liquidMetal') {
            const heat = Math.min(ampVal, 1.0);
            material.color.setHSL(0.1, heat * 0.5, 0.5 + heat * 0.5);
        }

        // Inner glow intensity
        this.innerGlow.material.opacity = 0.1 + this.beatDecay * 0.2 + bassVal * 0.1;
        this.innerGlow.material.color.setHSL((time * 0.05) % 1, 0.8, 0.5);
        if (this.mode === 'liquidMetal') {
            this.innerGlow.material.color.setHex(0xffaa00);
        }

        // ===== LIGHT ANIMATION (Chromatic Dance) =====
        this.lights.forEach((item, i) => {
            const angle = item.baseAngle + time * item.speed * (1 + bassVal * 0.5);
            const radius = item.radiusBase + bassVal * 2;

            item.light.position.x = Math.cos(angle) * radius;
            item.light.position.z = Math.sin(angle) * radius;
            item.light.position.y = Math.sin(time * item.yFrequency + i) * 3;

            // Pulse intensity on beat
            item.light.intensity = item.baseIntensity * (1 + ampVal * 1.5 + this.beatDecay * 2);

            // Shift hue over time
            let hue = ((i / this.lights.length) + time * 0.05 + highVal * 0.3) % 1;
            if (this.mode === 'liquidMetal') {
                hue = (0.6 + i * 0.05) % 1;
            }
            item.light.color.setHSL(hue, 1.0, 0.5);
        });

        // ===== DROP ANIMATION =====
        this.drops.forEach((drop, i) => {
            // Orbit
            drop.angle += drop.speed * 0.015 * (1 + bassVal * 2);
            const r = drop.radius + bassVal * 0.8 + Math.sin(time * 2 + i) * 0.3;

            drop.mesh.position.x = Math.cos(drop.angle) * r;
            drop.mesh.position.z = Math.sin(drop.angle) * r;
            drop.mesh.position.y = Math.sin(time * drop.verticalSpeed + i * 1.5) * 0.8 + drop.yOffset;

            const dropScale = 1 + this.beatDecay * 0.6 + bassVal * 0.3;
            drop.mesh.scale.setScalar(dropScale);

            const dropPosAttr = drop.mesh.geometry.attributes.position;
            for (let j = 0; j < dropPosAttr.count; j++) {
                const jdx = j * 3;
                const ox = drop.originalPositions[jdx];
                const oy = drop.originalPositions[jdx + 1];
                const oz = drop.originalPositions[jdx + 2];

                const noise = this.noise3D(ox * 4 + time + i, oy * 4, oz * 4 + time, 2) * 0.15;
                const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
                const nx = ox / len;
                const ny = oy / len;
                const nz = oz / len;

                dropPosAttr.array[jdx] = ox + nx * noise * (1 + bassVal);
                dropPosAttr.array[jdx + 1] = oy + ny * noise * (1 + bassVal);
                dropPosAttr.array[jdx + 2] = oz + nz * noise * (1 + bassVal);
            }
            dropPosAttr.needsUpdate = true;
            drop.mesh.geometry.computeVertexNormals();

            drop.mesh.rotation.x += 0.01 + bassVal * 0.05;
            drop.mesh.rotation.y += 0.02 + midVal * 0.03;
        });

        // ===== CAMERA =====
        const cameraRadius = 6 - bassVal * 0.5;
        this.camera.position.x = Math.sin(time * 0.15) * 0.5;
        this.camera.position.y = Math.cos(time * 0.1) * 0.3;
        this.camera.position.z = cameraRadius;
        this.camera.lookAt(0, 0, 0);

        // ===== BLOOM =====
        if (this.bloomPass) {
            this.bloomPass.strength = 0.8 + this.beatDecay * 0.6 + ampVal * 0.4;
        }

        // ===== RENDER =====
        this.composer.render();
    }

    destroy() {
        if (this.threeCanvas) {
            this.threeCanvas.remove();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        this.initialized = false;
    }
}
