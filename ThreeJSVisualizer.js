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
        // "Grand Effect" Particle System (Replacing simple drops)
        const particleCount = 8000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            // Spiral Galaxy Distribution
            const i3 = i * 3;
            const radius = 2.5 + Math.random() * 8.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.5; // Flattened sphere

            positions[i3] = radius * Math.cos(theta) * Math.cos(phi);
            positions[i3 + 1] = (radius * Math.sin(phi)) * 0.3; // Flattened Y
            positions[i3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

            // Base colors
            const hue = Math.random();
            color.setHSL(hue, 0.8, 0.6);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);

        // Clear legacy drops array
        this.drops = [];
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

        // Hide/Show logic
        if (this.mercuryMesh) {
            const isMercury = ['mercuryOrbs', 'liquidMetal', 'metallicNebula'].includes(mode);
            this.mercuryMesh.visible = isMercury;
            if (this.innerGlow) this.innerGlow.visible = isMercury;
            if (this.particleSystem) this.particleSystem.visible = isMercury;
            this.lights.forEach(l => l.light.visible = isMercury);

            if (isMercury) {
                const material = this.mercuryMesh.material;
                // Reset common props
                material.metalness = 1.0;
                material.roughness = 0.0;

                // DISTINCT MODE STYLING
                switch (mode) {
                    case 'liquidMetal':
                        // WARM GOLD/COPPER
                        material.color.setHex(0xffaa00);
                        material.emissive.setHex(0x331100);
                        material.roughness = 0.15;
                        material.iridescence = 0.6;
                        this.scene.background = new THREE.Color(0x110500);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xff4400);
                        break;

                    case 'metallicNebula':
                        // DEEP SPACE PURPLE/BLUE
                        material.color.setHex(0x2200ff);
                        material.emissive.setHex(0x110044);
                        material.roughness = 0.2;
                        material.iridescence = 1.0;
                        this.scene.background = new THREE.Color(0x020011);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xaa00ff);
                        break;

                    case 'mercuryOrbs':
                    default:
                        // PURE CHROME/SILVER
                        material.color.setHex(0xffffff);
                        material.emissive.setHex(0x000000);
                        material.roughness = 0.0;
                        material.iridescence = 0.4;
                        this.scene.background = new THREE.Color(0x000000);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0x4466ff);
                        break;
                }
            }
        }

        if (this.tunnelGroup) {
            this.tunnelGroup.visible = (mode === 'tunnel');
        } else if (mode === 'tunnel') {
            this.createTunnel();
        }
    }

    update(audioAnalysis) {
        if (!this.initialized) return;

        const delta = this.clock.getDelta();
        const metadata = audioAnalysis || {};
        const bass = metadata.energyBands?.bass || 0;
        const mid = metadata.energyBands?.mid || 0;
        const high = metadata.energyBands?.high || 0;
        const amplitude = metadata.amplitude || 0;
        const beat = metadata.rhythm?.beat ? 1.0 : 0.0;

        this.uniforms.uBass.value += (bass - this.uniforms.uBass.value) * 0.2;
        this.uniforms.uMid.value += (mid - this.uniforms.uMid.value) * 0.15;
        this.uniforms.uHigh.value += (high - this.uniforms.uHigh.value) * 0.25;
        this.uniforms.uAmplitude.value += (amplitude - this.uniforms.uAmplitude.value) * 0.15;
        this.uniforms.uTime.value += delta;

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

        if (this.mode === 'tunnel') {
            this.updateTunnel(time, bassVal, midVal, highVal, ampVal);
        } else {
            this.updateMercury(time, bassVal, midVal, highVal, ampVal);
            const cameraRadius = 6.0 + bassVal * 0.5;
            this.camera.position.x = Math.sin(time * 0.15) * 0.5;
            this.camera.position.y = Math.cos(time * 0.1) * 0.3;
            this.camera.position.z = cameraRadius;
            this.camera.lookAt(0, 0, 0);
        }

        if (this.bloomPass) {
            this.bloomPass.strength = 0.8 + this.beatDecay * 0.5 + ampVal * 0.3;
        }

        this.composer.render();
    }

    updateMercury(time, bassVal, midVal, highVal, ampVal) {
        if (!this.mercuryMesh) return;

        const posAttr = this.mercuryMesh.geometry.attributes.position;

        let noiseSpeed = 0.3;
        let noiseAmp = 0.12;

        if (this.mode === 'liquidMetal') {
            noiseSpeed = 0.6;
            noiseAmp = 0.18;
        } else if (this.mode === 'metallicNebula') {
            noiseSpeed = 0.2;
            noiseAmp = 0.15;
        }

        for (let i = 0; i < posAttr.count; i++) {
            const idx = i * 3;
            const ox = this.originalPositions[idx];
            const oy = this.originalPositions[idx + 1];
            const oz = this.originalPositions[idx + 2];

            const noise1 = this.noise3D(ox * 1.5 + time * noiseSpeed, oy * 1.5, oz * 1.5, 3) * noiseAmp;
            const noise2 = this.noise3D(ox * 3 + time * (noiseSpeed * 2.6), oy * 3 + time * (noiseSpeed * 1.6), oz * 3, 2) * (noiseAmp * 0.5);
            const noise3 = this.noise3D(ox * 5 + time * (noiseSpeed * 5), oy * 5, oz * 5 + time, 1) * (noiseAmp * 0.3);

            const audioMod = 1.0 + bassVal * 1.5 + midVal * 0.8 + highVal * 0.4;
            const displacement = (noise1 + noise2 + noise3) * audioMod;

            const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const beatPulse = Math.sin(dist * 8 - time * 15) * this.beatDecay * 0.08;

            const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const nx = ox / len;
            const ny = oy / len;
            const nz = oz / len;

            posAttr.array[idx] = ox + nx * (displacement + beatPulse);
            posAttr.array[idx + 1] = oy + ny * (displacement + beatPulse);
            posAttr.array[idx + 2] = oz + nz * (displacement + beatPulse);
        }
        posAttr.needsUpdate = true;
        this.mercuryMesh.geometry.computeVertexNormals();

        const bounceScale = 1.0 + this.beatDecay * 0.3 + bassVal * 0.15;
        this.mercuryMesh.scale.setScalar(bounceScale);
        if (this.mode === 'metallicNebula') this.mercuryMesh.scale.multiplyScalar(1.2);
        this.innerGlow.scale.setScalar(bounceScale * 0.98);

        this.mercuryMesh.rotation.y += 0.003 + bassVal * 0.015;
        this.mercuryMesh.rotation.x += 0.001 + midVal * 0.005;
        this.innerGlow.rotation.y = this.mercuryMesh.rotation.y;
        this.innerGlow.rotation.x = this.mercuryMesh.rotation.x;

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

        this.innerGlow.material.opacity = 0.1 + this.beatDecay * 0.2 + bassVal * 0.1;
        this.innerGlow.material.color.setHSL((time * 0.05) % 1, 0.8, 0.5);
        if (this.mode === 'liquidMetal') this.innerGlow.material.color.setHex(0xffaa00);

        this.updateLightsAndDrops(time, bassVal, midVal, highVal, ampVal);
    }

    updateLightsAndDrops(time, bassVal, midVal, highVal, ampVal) {
        // Dynamic Lights Update
        this.lights.forEach((item, i) => {
            const angle = item.baseAngle + time * item.speed * (1 + bassVal);
            const r = item.radiusBase + bassVal * 3;
            item.light.position.x = Math.cos(angle) * r;
            item.light.position.z = Math.sin(angle) * r;

            // Color shift based on mode
            if (this.mode === 'liquidMetal') {
                item.light.color.setHSL(0.05 + i * 0.05, 1.0, 0.5); // Orange/Yellow
            } else if (this.mode === 'metallicNebula') {
                item.light.color.setHSL(0.6 + i * 0.1, 1.0, 0.6); // Blue/Purple
            } else {
                const hue = ((i / this.lights.length) + time * 0.1) % 1;
                item.light.color.setHSL(hue, 0.8, 0.5);
            }
        });

        // Update Grand Particle System
        if (this.particleSystem) {
            this.particleSystem.rotation.y = time * 0.05 + bassVal * 0.1;
            const positions = this.particleSystem.geometry.attributes.position.array;

            // Gentle pulsing or turbulence could go here, but rotation is usually enough for grand effect
            // We can scale the whole system with bass
            const scale = 1.0 + bassVal * 0.2 + ampVal * 0.1;
            this.particleSystem.scale.setScalar(scale);
        }
    }

    createTunnel() {
        if (this.tunnelGroup) return;

        this.tunnelGroup = new THREE.Group();
        this.scene.add(this.tunnelGroup);

        this.tunnelPathPoints = [];
        this.tunnelPointsCount = 80;
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const t = i * 0.5;
            this.tunnelPathPoints.push(new THREE.Vector3(Math.cos(t) * 5, Math.sin(t) * 5, -i * 8));
        }

        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPathPoints);

        const geometry = new THREE.TubeGeometry(this.tunnelCurve, 80, 4, 12, false);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });

        this.tunnelMesh = new THREE.Mesh(geometry, material);
        this.tunnelGroup.add(this.tunnelMesh);

        this.createTunnelParticles();
        this.tunnelGroup.visible = true;
    }

    createTunnelParticles() {
        const particleCount = 2000;
        const particlesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 20;
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = Math.sin(angle) * r;
            positions[i * 3 + 2] = -Math.random() * 500;

            colors[i * 3] = 0.5 + Math.random() * 0.5;
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
            colors[i * 3 + 2] = 1.0;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particlesMat = new THREE.PointsMaterial({
            vertexColors: true,
            size: 0.8,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.tunnelParticles = new THREE.Points(particlesGeo, particlesMat);
        this.tunnelGroup.add(this.tunnelParticles);
    }

    updateTunnel(time, bass, mid, high, amp) {
        if (!this.tunnelGroup) {
            this.createTunnel();
            return;
        }

        const speed = 1.5 + bass * 1.5 + amp * 2.0;
        const forwardSpeed = speed;

        for (let i = 0; i < this.tunnelPathPoints.length; i++) {
            this.tunnelPathPoints[i].z += forwardSpeed;
        }

        if (this.tunnelPathPoints[this.tunnelPathPoints.length - 1].z > 10) {
            const p = this.tunnelPathPoints.pop();
            const firstP = this.tunnelPathPoints[0];

            p.z = firstP.z - 8;

            const turnScale = 50 + amp * 30;
            const t = time * 0.5;
            p.x = Math.sin(t * 0.7) * turnScale + Math.cos(t * 1.1) * turnScale * 0.5;
            p.y = Math.cos(t * 0.8) * turnScale + Math.sin(t * 1.3) * turnScale * 0.5;

            this.tunnelPathPoints.unshift(p);

            this.tunnelCurve.points = this.tunnelPathPoints;

            this.tunnelMesh.geometry.dispose();

            const radius = 4 + bass * 5 + Math.sin(time * 2) * 2;
            this.tunnelMesh.geometry = new THREE.TubeGeometry(this.tunnelCurve, 80, radius, 12, false);
        }

        const camIndex = this.tunnelPathPoints.length - 3;
        const lookIndex = this.tunnelPathPoints.length - 8;

        const camPos = this.tunnelPathPoints[camIndex];
        const lookPos = this.tunnelPathPoints[lookIndex];

        this.camera.position.x += (camPos.x - this.camera.position.x) * 0.1;
        this.camera.position.y += (camPos.y - this.camera.position.y) * 0.1;
        this.camera.position.z = 0;

        this.camera.lookAt(lookPos.x, lookPos.y, -100);

        const hue = (time * 0.1 + bass * 0.2) % 1;
        this.tunnelMesh.material.color.setHSL(hue, 1, 0.5);
        this.tunnelMesh.material.opacity = 0.3 + amp * 0.4;

        const positions = this.tunnelParticles.geometry.attributes.position.array;
        for (let i = 2; i < positions.length; i += 3) {
            positions[i] += forwardSpeed * 1.5;
            if (positions[i] > 10) {
                positions[i] = -500 - Math.random() * 100;
                positions[i - 2] = (Math.random() - 0.5) * 100;
                positions[i - 1] = (Math.random() - 0.5) * 100;
            }
        }
        this.tunnelParticles.geometry.attributes.position.needsUpdate = true;
        this.tunnelParticles.rotation.z += 0.002;
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
