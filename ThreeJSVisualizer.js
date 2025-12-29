/**
 * ThreeJS Visualizer Module - Premium Mercury/Liquid Metal
 * True 3D chrome/metallic orbs with environment reflections and audio reactivity
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { FilmShader } from 'three/addons/shaders/FilmShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
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

        // Cinematic Camera State
        this.cameraState = {
            mode: 'drift', // drift, orbit, intense
            target: new THREE.Vector3(0, 0, 0),
            position: new THREE.Vector3(0, 0, 15),
            shake: 0
        };
        this.lastCutTime = 0;
    }

    initialize() {
        if (this.initialized) return;

        try {
            const container = this.canvas.parentElement;

            // PREVENT DUPLICATES: Remove any existing ThreeJS canvases in this container
            const existingCanvases = container.querySelectorAll('.three-canvas');
            existingCanvases.forEach(c => c.remove());

            // Create Three.js canvas
            this.threeCanvas = document.createElement('canvas');
            this.threeCanvas.className = 'three-canvas';
            // Force the Three.js layer to truly cover the viewport, independent of
            // any parent layout quirks that could make it render in a smaller
            // region (top-left quarter, etc.).
            this.threeCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
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
            this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1500);
            this.camera.position.z = 5;

            // Create dynamic gradient environment
            this.createEnvironment();

            // Create premium mercury sphere
            this.createMercurySphere();

            // Create satellite drops
            this.createDrops();

            // Create dynamic lights
            this.createLights();

            // Create Volumetric "God Rays"
            this.createGodRays(); // New Feature

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
        // "Dark Studio" - High contrast, minimal ambient, driven by softboxes
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Pitch black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Softbox Top
        const gradTop = ctx.createLinearGradient(0, 0, 0, size * 0.3);
        gradTop.addColorStop(0, '#ffffff');
        gradTop.addColorStop(1, '#000000');
        ctx.fillStyle = gradTop;
        ctx.fillRect(size * 0.3, 0, size * 0.4, size * 0.3);

        // Softbox Bottom (Cool Fill)
        const gradBot = ctx.createLinearGradient(0, size, 0, size * 0.7);
        gradBot.addColorStop(0, '#112233');
        gradBot.addColorStop(1, '#000000');
        ctx.fillStyle = gradBot;
        ctx.fillRect(size * 0.2, size * 0.7, size * 0.6, size * 0.3);

        // Rim Light Left (Warm)
        const gradLeft = ctx.createLinearGradient(0, 0, size * 0.2, 0);
        gradLeft.addColorStop(0, '#ffaa44');
        gradLeft.addColorStop(1, '#000000');
        ctx.fillStyle = gradLeft;
        ctx.fillRect(0, size * 0.3, size * 0.2, size * 0.4);

        // Rim Light Right (Cyan)
        const gradRight = ctx.createLinearGradient(size, 0, size * 0.8, 0);
        gradRight.addColorStop(0, '#00ffff');
        gradRight.addColorStop(1, '#000000');
        ctx.fillStyle = gradRight;
        ctx.fillRect(size * 0.8, size * 0.2, size * 0.2, size * 0.6);

        // Creates a texture we can use for environment mapping
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.scene.environment = texture;
        // Keep background black for the "Void" look
        this.scene.background = new THREE.Color(0x000000);
        this.envMap = texture;
    }

    createMercurySphere() {
        // High-detail geometry for smooth deformation - 20% BIGGER (1.5 -> 1.8)
        const geometry = new THREE.IcosahedronGeometry(1.8, 64);

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

        // Add inner glow sphere - Scaled proportionally
        const glowGeo = new THREE.SphereGeometry(1.78, 32, 32);
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
            const size = (0.1 + Math.random() * 0.15) * 1.2; // 20% Bigger drops
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
                radius: 2.8 + Math.random() * 1.0, // Moved further out for bigger main orb
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

    createGodRays() {
        this.godRays = [];
        const geometry = new THREE.ConeGeometry(4, 40, 32, 1, true); // Open ended cone
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        for (let i = 0; i < 5; i++) {
            const mesh = new THREE.Mesh(geometry, material.clone());
            mesh.position.set(0, 0, 0);

            // Random initial rotations
            mesh.rotation.x = (Math.random() - 0.5) * 2;
            mesh.rotation.z = (Math.random() - 0.5) * 2;
            mesh.rotation.y = (Math.random() - 0.5) * 2;

            mesh.userData = {
                speedX: (Math.random() - 0.5) * 0.2,
                speedZ: (Math.random() - 0.5) * 0.2,
                baseOpacity: 0.03 + Math.random() * 0.04
            };

            this.scene.add(mesh);
            this.godRays.push(mesh);
        }
    }

    setupPostProcessing(width, height) {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // 1. Unreal Bloom - The Neon Glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.5,   // Higher strength
            0.8,   // Wide radius
            0.6    // Threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // 2. RGB Shift - Chromatic Aberration (Lens Imperfection)
        const rgbShiftPass = new ShaderPass(RGBShiftShader);
        rgbShiftPass.uniforms['amount'].value = 0.002;
        this.composer.addPass(rgbShiftPass);
        this.rgbShiftPass = rgbShiftPass;

        // 3. Film Grain - Cinematic Feel
        const filmPass = new ShaderPass(FilmShader);
        filmPass.uniforms['nIntensity'].value = 0.35;
        filmPass.uniforms['sIntensity'].value = 0.15;
        filmPass.uniforms['sCount'].value = 4096;
        filmPass.uniforms['grayscale'].value = 0;
        this.composer.addPass(filmPass);
        this.filmPass = filmPass;

        // 4. Output Pass - Color Correction
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    resize() {
        if (!this.renderer || !this.threeCanvas) return;

        // Use the actual viewport size so Three.js always matches the full
        // screen, not just whatever size the parent element happens to be.
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
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
            const isMercury = ['mercuryOrbs', 'liquidMetal', 'metallicNebula', 'liquidGeometry'].includes(mode);
            this.mercuryMesh.visible = isMercury;
            if (this.innerGlow) this.innerGlow.visible = isMercury;
            // Only show drops for standard mercuryOrbs mode
            this.drops.forEach(d => d.mesh.visible = (mode === 'mercuryOrbs'));
            this.lights.forEach(l => l.light.visible = isMercury);

            if (isMercury) {
                const material = this.mercuryMesh.material;
                material.color.setHex(0xffffff);
                material.metalness = 1.0;
                material.roughness = 0.0;
                material.emissive.setHex(0x000000);
                this.scene.background = new THREE.Color(0x000000);

                switch (mode) {
                    case 'liquidMetal': // BURNING LAVA THEME
                        material.color.setHex(0x050100); // Almost black for cooled crust
                        material.roughness = 0.8; // Rough volcanic surface
                        material.metalness = 0.1;
                        material.emissive.setHex(0xff2200); // Intense heat glow
                        material.emissiveIntensity = 3.0;
                        this.scene.background = new THREE.Color(0x020000);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xff4400);
                        break;
                    case 'metallicNebula':
                        material.color.setHex(0x4400ff);
                        material.metalness = 0.9;
                        material.roughness = 0.15;
                        material.emissive.setHex(0x110033);
                        material.iridescence = 1.0;
                        this.scene.background = new THREE.Color(0x020010);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xaa00ff);
                        break;
                    case 'liquidGeometry':
                        material.color.setHex(0x00ffcc);
                        material.metalness = 1.0;
                        material.roughness = 0.05;
                        material.emissive.setHex(0x002233);
                        material.iridescence = 1.0;
                        material.thickness = 5.0; // Thick glass/chrome feel
                        this.scene.background = new THREE.Color(0x000508);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0x00ffee);
                        break;
                    case 'mercuryOrbs':
                    default:
                        material.color.setHex(0xffffff);
                        material.metalness = 1.0;
                        material.roughness = 0.0;
                        material.iridescence = 0.8;
                        material.emissive.setHex(0x000000);
                        this.scene.background = new THREE.Color(0x000000);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0x4466ff);
                        break;
                }
            }
        }

        if (this.tunnelGroup) {
            this.tunnelGroup.visible = (mode === 'tunnel' || mode === 'depthlines');
        } else if (mode === 'tunnel' || mode === 'depthlines') {
            this.createTunnel();
        }
    }

    update(audioAnalysis) {
        if (!this.initialized) return;

        const delta = this.clock.getDelta();
        const metadata = audioAnalysis || {};
        const bands = metadata.energyBands || {};

        // Use PEAKS for direct violence, AVG for smooth base
        const subBass = bands.subBass?.peak || 0;
        const bass = bands.bass?.peak || 0;
        const mid = bands.mid?.avg || 0;
        const high = bands.treble?.peak || 0;
        const amplitude = metadata.amplitude || 0;
        const beat = metadata.rhythm?.beat ? 1.0 : 0.0;
        const transient = bands.subBass?.transient || 0;

        // Smoothed uniforms (faster response now)
        this.uniforms.uBass.value += (subBass - this.uniforms.uBass.value) * 0.3;
        this.uniforms.uMid.value += (mid - this.uniforms.uMid.value) * 0.2;
        this.uniforms.uHigh.value += (high - this.uniforms.uHigh.value) * 0.4;
        this.uniforms.uAmplitude.value += (amplitude - this.uniforms.uAmplitude.value) * 0.3;
        this.uniforms.uTime.value += delta;

        // Peak/Beat decay tracking
        if (beat > 0.5 || transient > 0.1) {
            this.beatDecay = 1.0;
        } else {
            this.beatDecay *= 0.85;
        }

        const time = this.uniforms.uTime.value;
        const bassVal = this.uniforms.uBass.value;
        const midVal = this.uniforms.uMid.value;
        const highVal = this.uniforms.uHigh.value;
        const ampVal = this.uniforms.uAmplitude.value;

        if (this.mode === 'tunnel') {
            this.updateTunnel(time, bassVal, midVal, highVal, ampVal);
        } else if (this.mercuryMesh) {
            this.updateMercury(time, bassVal, midVal, highVal, ampVal);

            // DYNAMIC LAVA PULSE
            if (this.mode === 'liquidMetal') {
                const lavaPulse = 1.0 + Math.sin(time * 3) * 0.5 + bassVal * 5.0; // Boosted
                if (this.mercuryMesh.material) this.mercuryMesh.material.emissiveIntensity = lavaPulse;
            }

            // Update God Rays
            this.updateGodRays(time, bassVal, midVal, highVal, ampVal);

            // Cinematic Auto-Camera
            this.updateCameraSystem(time, bassVal, midVal, highVal, beat);
        }

        // --- POST PROCESSING UPDATES ---
        if (this.bloomPass) {
            this.bloomPass.strength = 1.0 + this.beatDecay * 0.8 + ampVal * 0.5;
        }

        if (this.rgbShiftPass) {
            // Clean, tight aberration only on strong beats
            const shift = beat > 0.8 ? 0.005 : 0.001;
            this.rgbShiftPass.uniforms['amount'].value = THREE.MathUtils.lerp(this.rgbShiftPass.uniforms['amount'].value, shift, 0.2);
        }

        if (this.filmPass) {
            this.filmPass.uniforms['time'].value = time;
            // Reduce grain for cleaner look
            this.filmPass.uniforms['nIntensity'].value = 0.15;
            this.filmPass.uniforms['sIntensity'].value = 0.05;
        }

        this.composer.render();
    }

    updateCameraSystem(time, bass, mid, high, beat) {
        // RADICAL: Cinematic Impulse Camera
        const orbitRadius = 14 + Math.sin(time * 0.15) * 4;
        const orbitSpeed = time * 0.22;

        // Massive kick on beats/transients using beatDecay
        const impulse = this.beatDecay * 2.5 + bass * 0.8;
        this.camera.fov = 60 + impulse * 35.0; // Extreme FOV zoom
        this.camera.updateProjectionMatrix();

        const x = Math.sin(orbitSpeed) * orbitRadius;
        const z = Math.cos(orbitSpeed) * orbitRadius;
        const y = Math.sin(time * 0.2) * 5.0;

        const targetPos = new THREE.Vector3(x, y, z);

        // Add random "glitch" jitter on high frequencies
        if (high > 0.8) {
            targetPos.x += (Math.random() - 0.5) * high * 4.0;
            targetPos.y += (Math.random() - 0.5) * high * 4.0;
        }

        this.camera.position.lerp(targetPos, 0.2);

        // Dynamic lookAt with impulse offset
        const lookTarget = new THREE.Vector3(
            (Math.random() - 0.5) * impulse * 5.0,
            (Math.random() - 0.5) * impulse * 5.0,
            (Math.random() - 0.5) * impulse * 5.0
        );
        this.camera.lookAt(lookTarget);
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
        } else if (this.mode === 'liquidGeometry') {
            noiseSpeed = 0.8; // Fast, mechanical
            noiseAmp = 0.25;  // More aggressive
        }

        for (let i = 0; i < posAttr.count; i++) {
            const idx = i * 3;
            const ox = this.originalPositions[idx];
            const oy = this.originalPositions[idx + 1];
            const oz = this.originalPositions[idx + 2];

            const noise1 = this.noise3D(ox * 1.5 + time * noiseSpeed, oy * 1.5, oz * 1.5, 3) * noiseAmp;
            // BOOSTED: Reactivity to High Frequencies (Normalized Peak)
            const highFreqNoise = this.noise3D(ox * 9 + time * 3, oy * 9, oz * 9, 1) * (highVal * 6.0);

            // MASSIVE: Audio modulation on position
            const audioMod = 1.0 + (this.beatDecay * 2.5) + (bassVal * 7.5);

            const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const nx = ox / len;
            const ny = oy / len;
            const nz = oz / len;

            // Combined noise function with extreme audio influence
            const totalDistortion = noise1 + highFreqNoise;

            posAttr.array[idx] = ox + nx * totalDistortion * audioMod;
            posAttr.array[idx + 1] = oy + ny * totalDistortion * audioMod;
            posAttr.array[idx + 2] = oz + nz * totalDistortion * audioMod;
        }
        posAttr.needsUpdate = true;
        this.mercuryMesh.geometry.computeVertexNormals();

        // DYNAMIC PULSING: Violent scale bounce
        const bounceScale = 1.0 + (this.beatDecay * 1.8) + (bassVal * 3.5);
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

        // Use frequency bands to alter material properties (Responsiveness++)
        material.roughness = Math.max(0, 0.4 * highVal); // Shimmy with highs
        material.metalness = 1.0 - (midVal * 0.3); // Soften with mids

        if (this.mode === 'metallicNebula') {
            const hue = (time * 0.03 + bassVal * 0.1) % 1;
            material.color.setHSL(hue, 0.7, 0.4);
            material.emissive.setHSL((hue + 0.5) % 1, 0.9, 0.15);
        } else if (this.mode === 'liquidMetal') {
            // BURNING LAVA: Deep reds and blacks with orange emissive pulses
            const lavaRed = 0.0 + ampVal * 0.04; // Very low hue (red)
            material.color.setHSL(lavaRed, 1.0, 0.1 + ampVal * 0.1);
            // Emissive is the primary 'glow' of the lava
            material.emissive.setHSL(0.04 + ampVal * 0.06, 1.0, 0.2 + bassVal * 0.5);
        } else {
            // Classic silver - keep it white but reactive to lights
            material.color.setHex(0xffffff);
            material.emissive.setHex(0x000000);
        }

        this.innerGlow.material.opacity = 0.15 + this.beatDecay * 0.25 + bassVal * 0.15;
        this.innerGlow.material.color.setHSL((time * 0.05) % 1, 0.8, 0.5);
        if (this.mode === 'liquidMetal') this.innerGlow.material.color.setHex(0xff3300);

        this.updateLightsAndDrops(time, bassVal, midVal, highVal, ampVal);
    }

    updateLightsAndDrops(time, bassVal, midVal, highVal, ampVal) {
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

        // REACTIVE PHYSICS for Drops
        this.drops.forEach((drop, i) => {
            // 1. Gravity & Orbit
            drop.angle += drop.speed * 0.015 * (1 + bassVal * 2);

            // 2. Attraction to center (black hole effect)
            const targetR = drop.radius * (1.0 - bassVal * 0.3) + 2.0;

            // 3. Simple Physics collision/repulsion from each other
            // (Simplified N^2 loop for small number of drops)
            let forceX = 0, forceZ = 0;
            const myPos = new THREE.Vector2(Math.cos(drop.angle) * drop.radius, Math.sin(drop.angle) * drop.radius);

            // Repel from neighbors
            this.drops.forEach((other, j) => {
                if (i === j) return;
                const otherPos = new THREE.Vector2(Math.cos(other.angle) * other.radius, Math.sin(other.angle) * other.radius);
                const dist = myPos.distanceTo(otherPos);
                if (dist < 2.0) { // Too close
                    const push = myPos.clone().sub(otherPos).normalize().multiplyScalar(0.1);
                    forceX += push.x;
                    forceZ += push.y;
                }
            });

            // 4. Update Position
            let r = drop.radius + bassVal * 0.8 + Math.sin(time * 2 + i) * 0.3;
            // Apply collision nudges (mapping back to polar is hard, just hack cartesian offset)
            let x = Math.cos(drop.angle) * r + forceX * 5;
            let z = Math.sin(drop.angle) * r + forceZ * 5;

            drop.mesh.position.x = x;
            drop.mesh.position.z = z;
            // Bounce vertically on beat
            drop.mesh.position.y = Math.sin(time * drop.verticalSpeed + i * 1.5) * 0.8 + drop.yOffset + (this.beatDecay * 0.5 * (i % 2 == 0 ? 1 : -1));

            const dropScale = 1 + this.beatDecay * 0.6 + bassVal * 0.3;
            drop.mesh.scale.setScalar(dropScale);

            // Mesh Distortion (Metal Liquid effect)
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
    }

    updateGodRays(time, bass, mid, high, amp) {
        if (!this.godRays) return;

        this.godRays.forEach((mesh, i) => {
            // Rotate slowly
            mesh.rotation.x += mesh.userData.speedX * (1 + bass);
            mesh.rotation.z += mesh.userData.speedZ * (1 + bass);

            // Pulse opacity on bass
            const targetOpacity = mesh.userData.baseOpacity * (1 + bass * 5.0 + amp * 2.0);
            mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.1;

            // Scale length slightly on beat
            const scaleY = 1 + bass * 0.5;
            mesh.scale.set(1 + bass * 0.2, scaleY, 1 + bass * 0.2);

            // Color shift based on high freqs for that "prism" look
            const hue = (time * 0.1 + i * 0.2) % 1;
            mesh.material.color.setHSL(hue, 0.5, 0.8);
        });
    }

    createSoftParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createNoiseTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 2 + 0.5;
            const alpha = Math.random() * 0.3; // Low alpha for subtle noise
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    createTunnel() {
        if (this.tunnelGroup) return;

        this.tunnelGroup = new THREE.Group();
        this.scene.add(this.tunnelGroup);

        this.tunnelPathPoints = [];
        this.tunnelPointsCount = 120; // Smoother path
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const z = -i * 8;
            const timeScale = i * 0.05;
            const x = Math.sin(timeScale * 0.8) * 15;
            const y = Math.cos(timeScale * 0.7) * 15;
            this.tunnelPathPoints.push(new THREE.Vector3(x, y, z));
        }

        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPathPoints);

        // Abstract Plasma Material
        // Uses transmission for a glass-like feel, plus noise map for organic texture
        const noiseMap = this.createNoiseTexture();

        this.tunnelMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4400ff,
            emissive: 0x220055,
            emissiveIntensity: 0.8,
            metalness: 0.8,
            roughness: 0.3,
            transmission: 0.2, // See-through glass effect
            thickness: 2.5,
            side: THREE.BackSide, // Render inside
            map: noiseMap,
            alphaMap: noiseMap,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false // Allow particles behind to show
        });

        // Use more segments for smoother organic deformation
        const geometry = new THREE.TubeGeometry(this.tunnelCurve, 100, 14, 24, false);
        this.tunnelMesh = new THREE.Mesh(geometry, this.tunnelMaterial);

        // Add a second outer mesh for "glow" volume
        const outerGeo = new THREE.TubeGeometry(this.tunnelCurve, 100, 14.5, 24, false);
        const outerMat = new THREE.MeshBasicMaterial({
            color: 0x4400ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.tunnelOuterMesh = new THREE.Mesh(outerGeo, outerMat);

        this.tunnelGroup.add(this.tunnelMesh);
        this.tunnelGroup.add(this.tunnelOuterMesh);

        this.createTunnelParticles();
        this.tunnelGroup.visible = true;
    }

    createTunnelParticles() {
        const particleCount = 2000;
        const particlesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 2] = -Math.random() * 800;
            // distribute in a cylinder around camera path
            const angle = Math.random() * Math.PI * 2;
            const r = 4 + Math.random() * 25; // 4 to 29 radius
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = Math.sin(angle) * r;

            colors[i * 3] = 0.5 + Math.random() * 0.5; // R
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G
            colors[i * 3 + 2] = 1.0; // B - Blue tint

            sizes[i] = Math.random();
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // We'll use this if we setup shader material, else just variance

        // Use soft sprite
        const particleTex = this.createSoftParticleTexture();

        const particlesMat = new THREE.PointsMaterial({
            vertexColors: true,
            size: 3.5,
            map: particleTex,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.tunnelParticles = new THREE.Points(particlesGeo, particlesMat);
        this.tunnelGroup.add(this.tunnelParticles);
    }

    updateTunnel(time, bass, mid, high, amp) {
        if (!this.tunnelGroup) {
            this.createTunnel();
            return;
        }

        if (!this.tunnelMaterial) return; // Guard

        // VIOLENT: Significantly increased speed multiplier based on BASS
        const baseSpeed = 5.0;
        const transient = this.uniforms.uBass.value > 0.7 ? 20.0 : 0.0;
        const speed = baseSpeed + (bass * 80.0) + (mid * 35.0) + transient;
        this.tunnelOffset -= speed * 0.06;

        // Peak-driven camera shake
        this.camera.position.x = Math.sin(time * 0.8) * (1 + bass * 15.0);
        this.camera.position.y = Math.cos(time * 0.6) * (1 + bass * 15.0);
        this.camera.lookAt(0, 0, -20);

        // Rotate the whole group violently on transients
        this.tunnelGroup.rotation.z += 0.008 + (bass * 0.45);

        // Texture offset for flow
        if (this.tunnelMesh && this.tunnelMesh.material.map) {
            this.tunnelMesh.material.map.offset.y = time * 0.8 + this.tunnelOffset;
            this.tunnelMesh.material.map.offset.x = Math.sin(time * 0.2) * 0.5;
        }

        // Update tunnel particles - Fly towards camera
        if (this.tunnelParticles) {
            const positions = this.tunnelParticles.geometry.attributes.position;
            const count = positions.count;

            for (let i = 0; i < count; i++) {
                let z = positions.getZ(i);
                z += speed * 0.2; // Fly towards camera

                if (z > 10) z = -100; // Reset loop

                positions.setZ(i, z);
            }
            positions.needsUpdate = true;
        }

        // Pulse emission
        this.tunnelMaterial.emissiveIntensity = 0.5 + amp * 3.0; // Strong flask on beat

        // Return early to skip complex curve logic
        return;
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
