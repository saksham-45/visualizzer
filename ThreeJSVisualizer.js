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

        this.renderScale = 0.75;
        this.maxPixelRatio = 1.25;
        this._lastQualityUpdate = 0;
        this._smoothedFps = 60;
        this._frame = 0;

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
            // CRITICAL: z-index must be HIGHER than 2D canvas to be visible
            this.threeCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 5;
                pointer-events: none;
                background: #000;
            `;
            container.insertBefore(this.threeCanvas, this.canvas);

            // Setup WebGL Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.threeCanvas,
                alpha: false,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setClearColor(0x000000);

            // Use viewport dimensions; body/container client sizes can be 0 in some layouts.
            const width = window.innerWidth;
            const height = window.innerHeight;

            const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
            const scaledWidth = Math.max(1, Math.floor(width * this.renderScale));
            const scaledHeight = Math.max(1, Math.floor(height * this.renderScale));
            this.renderer.setSize(scaledWidth, scaledHeight, false);
            this.renderer.setPixelRatio(pixelRatio);
            console.log('[ThreeJSVisualizer] Canvas size:', scaledWidth, 'x', scaledHeight, 'pixelRatio:', pixelRatio);
            this.renderer.setClearColor(0x000000);
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;

            // Scene & Camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1500);
            this.camera.position.set(0, 0, 12);

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
            this.setupPostProcessing(scaledWidth, scaledHeight);

            this.initialized = true;
            console.log('[ThreeJSVisualizer] Premium 3D engine initialized');

            // Set initial mode
            this.setMode(this.mode);

            window.addEventListener('resize', () => this.resize());
        } catch (error) {
            const name = error?.name || 'Error';
            const message = error?.message || String(error);
            console.error('[ThreeJSVisualizer] Init failed:', name, message);
            if (error?.stack) console.error(error.stack);
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
        const geometry = new THREE.IcosahedronGeometry(1.8, 8);

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
        const glowGeo = new THREE.SphereGeometry(1.78, 24, 24);
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
        for (let i = 0; i < 6; i++) {
            const size = (0.1 + Math.random() * 0.15) * 1.2; // 20% Bigger drops
            const dropGeo = new THREE.IcosahedronGeometry(size, 6);

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
                angle: (i / 6) * Math.PI * 2,
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

        // 1. Unreal Bloom - Subtle glow (reduced for tunnel mode)
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.6,   // strength - reduced
            0.4,   // radius
            0.85   // threshold - raised to reduce bloom on darker elements
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // 2. RGB Shift - Chromatic Aberration (Lens Imperfection)
        const rgbShiftPass = new ShaderPass(RGBShiftShader);
        if (rgbShiftPass.uniforms && rgbShiftPass.uniforms['amount']) {
            rgbShiftPass.uniforms['amount'].value = 0.001;
        }
        this.composer.addPass(rgbShiftPass);
        this.rgbShiftPass = rgbShiftPass;

        // 3. Film Grain - Cinematic Feel
        const filmPass = new ShaderPass(FilmShader);
        if (filmPass.uniforms) {
            if (filmPass.uniforms['nIntensity']) filmPass.uniforms['nIntensity'].value = 0.10;
            if (filmPass.uniforms['sIntensity']) filmPass.uniforms['sIntensity'].value = 0.03;
            if (filmPass.uniforms['sCount']) filmPass.uniforms['sCount'].value = 1024;
            if (filmPass.uniforms['grayscale']) filmPass.uniforms['grayscale'].value = 0;
        }
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

        const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
        const scaledWidth = Math.max(1, Math.floor(width * this.renderScale));
        const scaledHeight = Math.max(1, Math.floor(height * this.renderScale));

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(scaledWidth, scaledHeight, false);
        if (this.composer) {
            this.composer.setSize(scaledWidth, scaledHeight);
        }
    }

    _updateQuality(delta) {
        const fps = delta > 0 ? 1 / delta : 60;
        this._smoothedFps = this._smoothedFps * 0.9 + fps * 0.1;

        const now = performance.now();
        if (now - this._lastQualityUpdate < 1200) return;
        this._lastQualityUpdate = now;

        let targetScale = this.renderScale;
        let targetPixelRatio = this.maxPixelRatio;

        if (this._smoothedFps < 45) {
            targetScale = Math.max(0.55, this.renderScale - 0.08);
            targetPixelRatio = 1.0;
        } else if (this._smoothedFps > 57) {
            targetScale = Math.min(0.8, this.renderScale + 0.05);
            targetPixelRatio = Math.min(1.25, this.maxPixelRatio + 0.05);
        }

        const scaleChanged = Math.abs(targetScale - this.renderScale) > 0.03;
        const prChanged = Math.abs(targetPixelRatio - this.maxPixelRatio) > 0.03;
        if (scaleChanged || prChanged) {
            this.renderScale = targetScale;
            this.maxPixelRatio = targetPixelRatio;
            this.resize();
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

            // Hide godrays in Mercury modes as requested
            if (this.godRays) {
                this.godRays.forEach(mesh => mesh.visible = !isMercury);
            }

            // Sync lights visibility
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
                        material.color.setHex(0x050100);
                        material.roughness = 0.8;
                        material.metalness = 0.1;
                        material.emissive.setHex(0xff2200);
                        material.emissiveIntensity = 3.0;
                        this.scene.background = new THREE.Color(0x000000);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xff4400);
                        break;
                    case 'metallicNebula':
                        material.color.setHex(0x4400ff);
                        material.metalness = 0.9;
                        material.roughness = 0.15;
                        material.emissive.setHex(0x110033);
                        material.iridescence = 1.0;
                        this.scene.background = new THREE.Color(0x000000);
                        if (this.innerGlow) this.innerGlow.material.color.setHex(0xaa00ff);
                        break;
                    case 'liquidGeometry':
                        material.color.setHex(0x00ffcc);
                        material.metalness = 1.0;
                        material.roughness = 0.05;
                        material.emissive.setHex(0x002233);
                        material.iridescence = 1.0;
                        material.thickness = 5.0;
                        this.scene.background = new THREE.Color(0x000000);
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

        if (mode === 'tunnel' || mode === 'depthlines') {
            // CRITICAL: Set black background for tunnel mode
            this.scene.background = new THREE.Color(0x000000);
            
            // CINEMATIC TUNNEL LIGHTING - Subtle and moody
            if (!this.tunnelLight) {
                // Very dim ambient - mostly dark with accent highlights
                this.tunnelAmbient = new THREE.AmbientLight(0x0a0510, 0.4);
                this.scene.add(this.tunnelAmbient);
                
                // Primary light - soft cyan glow ahead
                this.tunnelLight = new THREE.PointLight(0x00aacc, 1.2, 100);
                this.scene.add(this.tunnelLight);
                
                // Accent light - subtle magenta rim
                this.tunnelLight2 = new THREE.PointLight(0x660066, 0.8, 80);
                this.scene.add(this.tunnelLight2);
                
                // Rear light - very subtle purple
                this.tunnelLight3 = new THREE.PointLight(0x220033, 0.5, 60);
                this.scene.add(this.tunnelLight3);
            }
            // Enable tunnel lights
            if (this.tunnelAmbient) this.tunnelAmbient.visible = true;
            if (this.tunnelLight) this.tunnelLight.visible = true;
            if (this.tunnelLight2) this.tunnelLight2.visible = true;
            if (this.tunnelLight3) this.tunnelLight3.visible = true;
            
            // Hide mercury mesh
            if (this.mercuryMesh) this.mercuryMesh.visible = false;
            if (this.innerGlow) this.innerGlow.visible = false;
            this.drops.forEach(d => d.mesh.visible = false);
            if (this.godRays) this.godRays.forEach(mesh => mesh.visible = false);
            
            if (!this.tunnelGroup) {
                this.createTunnel();
            } else {
                this.tunnelGroup.visible = true;
                // Reset tunnel position for fresh start
                this.tunnelZ = 0;
                this.tunnelGroup.position.z = 0;
                // Camera at origin looking down the tunnel
                if (this.camera) {
                    this.camera.position.set(0, 0, 0);
                    this.camera.lookAt(0, 0, -100);
                }
            }
        } else if (this.tunnelGroup) {
            this.tunnelGroup.visible = false;
            // Hide tunnel lights when not in tunnel mode
            if (this.tunnelAmbient) this.tunnelAmbient.visible = false;
            if (this.tunnelLight) this.tunnelLight.visible = false;
            if (this.tunnelLight2) this.tunnelLight2.visible = false;
            if (this.tunnelLight3) this.tunnelLight3.visible = false;
        }
    }

    update(metadata) {
        if (!this.initialized || !this.renderer || !this.scene || !this.camera) return;

        this._frame++;
        const delta = this.clock.getDelta();
        const time = performance.now() * 0.001;
        this.time = time;

        // Extract audio bands from metadata with safety
        const bands = metadata?.energyBands || {};
        const subBass = bands.subBass?.peak || 0;
        const bass = bands.bass?.peak || 0;
        const mid = bands.mid?.peak || 0;
        const high = bands.treble?.peak || 0;
        const amplitude = metadata?.amplitude || 0;
        const beat = metadata?.rhythm?.beat ? 1.0 : 0.0;
        const transient = bands.subBass?.transient || 0;

        // Smoothed uniforms
        this.uniforms.uBass.value += (subBass - this.uniforms.uBass.value) * 0.3;
        this.uniforms.uMid.value += (mid - this.uniforms.uMid.value) * 0.2;
        this.uniforms.uHigh.value += (high - this.uniforms.uHigh.value) * 0.4;
        this.uniforms.uAmplitude.value += (amplitude - this.uniforms.uAmplitude.value) * 0.3;
        this.uniforms.uTime.value += delta;

        // Beat decay tracking
        if (beat > 0.5 || transient > 0.1) {
            this.beatDecay = 1.0;
        }
        this.beatDecay *= 0.92;

        // Update components with extracted values
        this.updateMercury(time, bass, mid, high, amplitude);
        this.updateGodRays(time, bass, mid, high, amplitude);

        // Handle tunnel mode
        if (this.mode === 'tunnel' || this.mode === 'depthlines') {
            this.updateTunnel(time, bass, mid, high, amplitude);
            
            // Reduce bloom for tunnel mode - prevents flashy white
            if (this.bloomPass) {
                this.bloomPass.strength = 0.35;
                this.bloomPass.threshold = 0.9;
            }
        } else {
            // Normal bloom for other modes
            if (this.bloomPass) {
                this.bloomPass.strength = 0.6;
                this.bloomPass.threshold = 0.85;
            }
        }

        // FIXED CAMERA - No zoom, minimal drift for Mercury modes
        const isMercury = ['mercuryOrbs', 'liquidMetal', 'metallicNebula', 'liquidGeometry'].includes(this.mode);
        if (isMercury) {
            // Locked Z position - sphere stays in place
            const fixedZ = 12;
            // Very subtle orbital drift for visual interest, NOT audio reactive
            const driftX = Math.sin(time * 0.1) * 0.3;
            const driftY = Math.cos(time * 0.08) * 0.2;

            this.camera.position.x += (driftX - this.camera.position.x) * 0.02;
            this.camera.position.y += (driftY - this.camera.position.y) * 0.02;
            this.camera.position.z += (fixedZ - this.camera.position.z) * 0.05;

            // Fixed FOV - no zoom
            this.camera.fov = 52;
            this.camera.updateProjectionMatrix();

            this.camera.lookAt(0, 0, 0);

            // Minimal roll for subtle motion
            const targetRoll = Math.sin(time * 0.2) * 0.01;
            this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.05;
        }

        // Render
        this._updateQuality(delta);
        
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateMercury(time, bassVal, midVal, highVal, ampVal) {
        if (!this.mercuryMesh) return;

        const posAttr = this.mercuryMesh.geometry.attributes.position;

        // Mode-specific noise parameters
        let noiseSpeed = 0.3;
        let noiseAmp = 0.15;

        if (this.mode === 'liquidMetal') {
            noiseSpeed = 0.6;
            noiseAmp = 0.25;
        } else if (this.mode === 'metallicNebula') {
            noiseSpeed = 0.2;
            noiseAmp = 0.2;
        } else if (this.mode === 'liquidGeometry') {
            noiseSpeed = 0.8;
            noiseAmp = 0.35;
        }

        // Vertex displacement - EXPANDS SURFACE COMPLEXITY
        for (let i = 0; i < posAttr.count; i++) {
            const idx = i * 3;
            const ox = this.originalPositions[idx];
            const oy = this.originalPositions[idx + 1];
            const oz = this.originalPositions[idx + 2];

            // Multi-octave noise for organic deformation
            const noise1 = this.noise3D(ox * 1.5 + time * noiseSpeed, oy * 1.5, oz * 1.5, 3) * noiseAmp;
            // High frequency detail for responsiveness
            const highFreqNoise = this.noise3D(ox * 9 + time * 3, oy * 9, oz * 9, 1) * (highVal * 2.5);

            // Audio modulation - drives DISPLACEMENT
            const audioMod = 1.0 + (this.beatDecay * 0.4) + (bassVal * 1.2);

            const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const nx = ox / len;
            const ny = oy / len;
            const nz = oz / len;

            const totalDistortion = (noise1 + highFreqNoise) * audioMod;

            posAttr.array[idx] = ox + nx * totalDistortion;
            posAttr.array[idx + 1] = oy + ny * totalDistortion;
            posAttr.array[idx + 2] = oz + nz * totalDistortion;
        }
        posAttr.needsUpdate = true;
        if (this._frame % 2 === 0) this.mercuryMesh.geometry.computeVertexNormals();

        // RESTORED SCALE PULSING: Violent but bounded scale bounce
        const bounceScale = 1.0 + (this.beatDecay * 0.15) + (bassVal * 0.12);
        let baseScale = 1.0 * bounceScale;
        if (this.mode === 'metallicNebula') baseScale = 1.2 * bounceScale;

        this.mercuryMesh.scale.setScalar(baseScale);
        if (this.innerGlow) this.innerGlow.scale.setScalar(baseScale * 0.98);

        // Rotation
        this.mercuryMesh.rotation.y += 0.002 + bassVal * 0.004;
        this.mercuryMesh.rotation.x += 0.0008 + midVal * 0.001;
        if (this.innerGlow) {
            this.innerGlow.rotation.y = this.mercuryMesh.rotation.y;
            this.innerGlow.rotation.x = this.mercuryMesh.rotation.x;
        }

        // Material reactivity
        const material = this.mercuryMesh.material;
        material.iridescence = 0.5 + ampVal * 0.5;
        material.sheenColor.setHSL((time * 0.1 + highVal) % 1, 1, 0.5);
        material.roughness = Math.max(0, 0.3 * highVal);
        material.metalness = 1.0 - (midVal * 0.2);

        // BEAT REACTIVE COLOR EMISSIONS
        material.emissiveIntensity = 0.5 + (this.beatDecay * 4.0) + (bassVal * 2.0);

        // Mode-specific color shifts
        if (this.mode === 'metallicNebula') {
            const hue = (time * 0.03 + bassVal * 0.1 + this.beatDecay * 0.2) % 1;
            material.color.setHSL(hue, 0.7, 0.4);
            material.emissive.setHSL((hue + 0.5) % 1, 0.9, 0.15 + this.beatDecay * 0.4);
        } else if (this.mode === 'liquidMetal') {
            const lavaRed = 0.0 + ampVal * 0.04 + this.beatDecay * 0.05;
            material.color.setHSL(lavaRed, 1.0, 0.1 + ampVal * 0.1);
            material.emissive.setHSL(0.04 + ampVal * 0.06, 1.0, 0.2 + bassVal * 0.5 + this.beatDecay * 0.5);
        } else {
            // Default mercuryOrbs emission
            const beatHue = (time * 0.1 + this.beatDecay * 0.5) % 1;
            material.emissive.setHSL(beatHue, 0.8, 0.2 * this.beatDecay);
        }

        // Inner glow updates
        if (this.innerGlow) {
            this.innerGlow.material.opacity = 0.15 + this.beatDecay * 0.3 + bassVal * 0.15;
            this.innerGlow.material.color.setHSL((time * 0.05 + this.beatDecay * 0.2) % 1, 0.8, 0.5);
            if (this.mode === 'liquidMetal') this.innerGlow.material.color.setHex(0xff3300);
        }
    }


    updateLightsAndDrops(time, bassVal, midVal, highVal, ampVal) {
        this.lights.forEach((item, i) => {
            const angle = item.baseAngle + time * item.speed * (1 + bassVal * 0.5);
            const radius = item.radiusBase + bassVal * 2;

            item.light.position.x = Math.cos(angle) * radius;
            item.light.position.z = Math.sin(angle) * radius;
            item.light.position.y = Math.sin(time * item.yFrequency + i) * 3;

            // Pulse intensity on beat
            item.light.intensity = item.baseIntensity * (1 + ampVal * 0.7 + this.beatDecay * 0.9);

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
            if (this._frame % 2 === 0) {
                for (let j = 0; j < dropPosAttr.count; j++) {
                    const jdx = j * 3;
                    const ox = drop.originalPositions[jdx];
                    const oy = drop.originalPositions[jdx + 1];
                    const oz = drop.originalPositions[jdx + 2];

                    const noise = this.noise3D(ox * 4 + time + i, oy * 4, oz * 4 + time, 2) * 0.12;
                    const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
                    const nx = ox / len;
                    const ny = oy / len;
                    const nz = oz / len;

                    dropPosAttr.array[jdx] = ox + nx * noise * (1 + bassVal * 0.6);
                    dropPosAttr.array[jdx + 1] = oy + ny * noise * (1 + bassVal * 0.6);
                    dropPosAttr.array[jdx + 2] = oz + nz * noise * (1 + bassVal * 0.6);
                }
                dropPosAttr.needsUpdate = true;
                drop.mesh.geometry.computeVertexNormals();
            }

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

        // ========== INFINITE TRIPPY HYPERSPACE TUNNEL ==========
        // Vibrant, psychedelic, seamless infinity effect
        
        this.tunnelZ = 0; // Camera Z position (moves forward continuously)
        this.tunnelSpeed = 2; // Base speed
        const radius = 15;

        // ========== MAIN TUNNEL - Cylindrical geometry that repeats ==========
        // Create a long cylinder that we'll move and recycle
        const tunnelLength = 2000;
        const tunnelGeo = new THREE.CylinderGeometry(radius, radius, tunnelLength, 64, 1, true);
        tunnelGeo.rotateX(Math.PI / 2); // Align with Z axis
        
        this.tunnelMaterial = new THREE.MeshBasicMaterial({
            color: 0x110022,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.95
        });
        this.tunnelMesh = new THREE.Mesh(tunnelGeo, this.tunnelMaterial);
        this.tunnelMesh.position.z = -tunnelLength / 2;
        this.tunnelGroup.add(this.tunnelMesh);

        // ========== NEON RINGS - Many vibrant rings for infinity effect ==========
        this.tunnelRings = [];
        const ringCount = 100; // Many rings for seamless look
        const ringSpacing = 20;
        
        for (let i = 0; i < ringCount; i++) {
            // Vibrant rainbow colors
            const hue = (i / ringCount) % 1;
            const color = new THREE.Color().setHSL(hue, 1.0, 0.6);
            
            // Thick glowing rings
            const ringGeo = new THREE.TorusGeometry(radius - 0.5, 0.15, 16, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending
            });
            
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.z = -i * ringSpacing;
            ring.rotation.x = Math.PI / 2;
            
            ring.userData = { 
                baseZ: -i * ringSpacing,
                hue: hue,
                index: i
            };
            
            this.tunnelRings.push(ring);
            this.tunnelGroup.add(ring);
        }

        // ========== SPIRAL LINES - Trippy rotating spirals ==========
        this.spiralLines = [];
        const spiralCount = 8;
        for (let s = 0; s < spiralCount; s++) {
            const points = [];
            const spiralTurns = 20;
            const spiralLength = 1500;
            const pointCount = 500;
            
            for (let i = 0; i < pointCount; i++) {
                const t = i / pointCount;
                const angle = (s / spiralCount) * Math.PI * 2 + t * spiralTurns * Math.PI * 2;
                const z = -t * spiralLength;
                const r = radius - 1;
                points.push(new THREE.Vector3(
                    Math.cos(angle) * r,
                    Math.sin(angle) * r,
                    z
                ));
            }
            
            const spiralGeo = new THREE.BufferGeometry().setFromPoints(points);
            const spiralMat = new THREE.LineBasicMaterial({
                color: new THREE.Color().setHSL(s / spiralCount, 1.0, 0.7),
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            
            const spiral = new THREE.Line(spiralGeo, spiralMat);
            spiral.userData = { baseAngle: (s / spiralCount) * Math.PI * 2 };
            this.spiralLines.push(spiral);
            this.tunnelGroup.add(spiral);
        }

        // ========== PARTICLE STARS - Flying through space ==========
        this.createHyperspaceParticles();

        // ========== CENTRAL GLOW - Light at the end ==========
        const glowGeo = new THREE.SphereGeometry(3, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.centerGlow = new THREE.Mesh(glowGeo, glowMat);
        this.centerGlow.position.z = -800;
        this.tunnelGroup.add(this.centerGlow);
        
        // Camera starts at origin looking down -Z
        if (this.camera) {
            this.camera.position.set(0, 0, 0);
            this.camera.lookAt(0, 0, -100);
        }
        
        this.tunnelGroup.visible = true;
    }
    
    createHyperspaceParticles() {
        const particleCount = 1500;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            // Distribute in a cylinder around the camera path
            const angle = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 12;
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = Math.sin(angle) * r;
            positions[i * 3 + 2] = -Math.random() * 1500;
            
            // Rainbow colors
            const hue = Math.random();
            const color = new THREE.Color().setHSL(hue, 1.0, 0.7);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            sizes[i] = 1 + Math.random() * 3;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 2.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            map: this.createSoftParticleTexture()
        });
        
        this.hyperspaceParticles = new THREE.Points(geometry, material);
        this.tunnelGroup.add(this.hyperspaceParticles);
    }

    updateTunnel(time, bass, mid, high, amp) {
        if (!this.tunnelGroup || !this.camera) {
            if (!this.tunnelGroup) {
                this.createTunnel();
            }
            return;
        }

        // Audio reactivity - clamped but still responsive
        const clampedBass = Math.min(1.2, bass);
        const clampedMid = Math.min(1.0, mid);
        const clampedHigh = Math.min(1.0, high);
        const clampedAmp = Math.min(0.8, amp);

        // ========== INFINITE FORWARD MOTION ==========
        // Speed based on music - faster on bass hits
        const baseSpeed = 3;
        const audioBoost = clampedBass * 4 + clampedAmp * 2;
        const speed = baseSpeed + audioBoost;
        
        this.tunnelZ += speed;
        
        // Move the entire tunnel forward with camera
        // This creates the illusion of infinite travel
        this.tunnelGroup.position.z = this.tunnelZ;
        
        // Camera stays at origin, tunnel moves around it
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(0, 0, -100);
        
        // Slight camera sway for trippy effect
        const sway = Math.sin(time * 0.5) * 0.3;
        const tilt = Math.cos(time * 0.3) * 0.2;
        this.camera.position.x = sway * (1 + clampedBass * 0.5);
        this.camera.position.y = tilt * (1 + clampedMid * 0.3);

        // ========== NEON RINGS - INFINITE LOOP ==========
        const ringSpacing = 20;
        const totalRingDistance = this.tunnelRings.length * ringSpacing;
        
        if (this.tunnelRings) {
            this.tunnelRings.forEach((ring, i) => {
                // Move ring position relative to camera
                let ringZ = ring.userData.baseZ - (this.tunnelZ % totalRingDistance);
                
                // Wrap rings that pass behind camera
                while (ringZ > 50) {
                    ringZ -= totalRingDistance;
                }
                while (ringZ < -totalRingDistance + 50) {
                    ringZ += totalRingDistance;
                }
                
                ring.position.z = ringZ;
                
                // Distance-based effects
                const distFromCamera = Math.abs(ringZ);
                const proximityFade = Math.max(0.1, 1 - distFromCamera / 500);
                
                // VIBRANT COLORS - Rainbow cycling with music
                const hue = (ring.userData.hue + time * 0.1 + clampedHigh * 0.3) % 1;
                ring.material.color.setHSL(hue, 1.0, 0.65);
                
                // Opacity pulses with beat
                const beatPulse = this.beatDecay * 0.4;
                const basePulse = Math.sin(time * 4 + i * 0.3) * 0.15;
                ring.material.opacity = Math.min(1.0, 0.5 + proximityFade * 0.4 + beatPulse + basePulse + clampedBass * 0.2);
                
                // Scale pulse on beats
                const scalePulse = 1 + this.beatDecay * 0.15 + clampedBass * 0.1;
                ring.scale.setScalar(scalePulse);
                
                // Rings rotate with music
                ring.rotation.z += (0.01 + clampedHigh * 0.02) * (i % 2 === 0 ? 1 : -1);
            });
        }

        // ========== SPIRAL LINES - ROTATING ==========
        if (this.spiralLines) {
            this.spiralLines.forEach((spiral, i) => {
                // Rotate spirals with music
                spiral.rotation.z += 0.005 + clampedBass * 0.01;
                
                // Color cycling
                const hue = (i / this.spiralLines.length + time * 0.05) % 1;
                spiral.material.color.setHSL(hue, 1.0, 0.7);
                spiral.material.opacity = 0.4 + clampedMid * 0.3 + this.beatDecay * 0.2;
            });
        }

        // ========== HYPERSPACE PARTICLES ==========
        if (this.hyperspaceParticles) {
            const positions = this.hyperspaceParticles.geometry.attributes.position.array;
            const colors = this.hyperspaceParticles.geometry.attributes.color.array;
            const particleSpeed = speed * 0.8;
            
            for (let i = 0; i < positions.length / 3; i++) {
                const idx = i * 3;
                
                // Move particles toward camera
                positions[idx + 2] += particleSpeed;
                
                // Reset particles that pass camera
                if (positions[idx + 2] > 100) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = 2 + Math.random() * 12;
                    positions[idx] = Math.cos(angle) * r;
                    positions[idx + 1] = Math.sin(angle) * r;
                    positions[idx + 2] = -1200 - Math.random() * 300;
                    
                    // New rainbow color
                    const hue = Math.random();
                    const color = new THREE.Color().setHSL(hue, 1.0, 0.7);
                    colors[idx] = color.r;
                    colors[idx + 1] = color.g;
                    colors[idx + 2] = color.b;
                }
            }
            
            this.hyperspaceParticles.geometry.attributes.position.needsUpdate = true;
            this.hyperspaceParticles.geometry.attributes.color.needsUpdate = true;
            
            // Size and opacity pulse with music
            this.hyperspaceParticles.material.size = 2 + clampedBass * 2 + this.beatDecay * 1.5;
            this.hyperspaceParticles.material.opacity = 0.7 + clampedAmp * 0.3;
        }

        // ========== CENTER GLOW - Light at end of tunnel ==========
        if (this.centerGlow) {
            // Keep glow far ahead
            this.centerGlow.position.z = -800;
            
            // Pulsing glow
            const glowPulse = 1 + Math.sin(time * 2) * 0.3 + clampedBass * 0.5;
            this.centerGlow.scale.setScalar(glowPulse);
            
            // Color cycling
            const glowHue = (time * 0.1) % 1;
            this.centerGlow.material.color.setHSL(glowHue, 0.8, 0.8);
            this.centerGlow.material.opacity = 0.6 + clampedAmp * 0.3;
        }

        // ========== TUNNEL WALL COLOR ==========
        if (this.tunnelMaterial) {
            // Subtle color wash on walls
            const wallHue = (time * 0.03) % 1;
            this.tunnelMaterial.color.setHSL(wallHue, 0.3, 0.1);
        }

        // ========== TRIPPY CAMERA ROLL ==========
        // Slow continuous roll for psychedelic effect
        const targetRoll = Math.sin(time * 0.3) * 0.1 + Math.cos(time * 0.2) * 0.05;
        this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.05;
        
        // Wide FOV for immersive tunnel view
        if (this.camera.fov !== 85) {
            this.camera.fov = 85;
            this.camera.updateProjectionMatrix();
        }
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


