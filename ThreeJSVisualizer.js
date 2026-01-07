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
            this.threeCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 0;
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

        // 1. Unreal Bloom - The Neon Glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.85,
            0.55,
            0.75
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:setMode:tunnel',message:'Setting tunnel mode',data:{mode,tunnelGroupExists:!!this.tunnelGroup,tunnelMeshExists:!!this.tunnelMesh},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            
            // CRITICAL: Set black background for tunnel mode
            this.scene.background = new THREE.Color(0x000000);
            
            // CRITICAL: Add tunnel-specific lighting
            if (!this.tunnelLight) {
                // Ambient light so tunnel walls are visible
                this.tunnelAmbient = new THREE.AmbientLight(0x4466ff, 0.5);
                this.scene.add(this.tunnelAmbient);
                
                // Point light that follows the camera
                this.tunnelLight = new THREE.PointLight(0x00aaff, 2.0, 100);
                this.scene.add(this.tunnelLight);
                
                // Secondary light for depth
                this.tunnelLight2 = new THREE.PointLight(0xff44aa, 1.5, 80);
                this.scene.add(this.tunnelLight2);
            }
            // Enable tunnel lights
            if (this.tunnelAmbient) this.tunnelAmbient.visible = true;
            if (this.tunnelLight) this.tunnelLight.visible = true;
            if (this.tunnelLight2) this.tunnelLight2.visible = true;
            
            // Hide mercury mesh
            if (this.mercuryMesh) this.mercuryMesh.visible = false;
            if (this.innerGlow) this.innerGlow.visible = false;
            this.drops.forEach(d => d.mesh.visible = false);
            if (this.godRays) this.godRays.forEach(mesh => mesh.visible = false);
            
            if (!this.tunnelGroup) {
                this.createTunnel();
            } else {
                this.tunnelGroup.visible = true;
                // Re-initialize camera position if tunnel already exists
                if (this.tunnelCurve && this.camera) {
                    const initialCamPoint = this.tunnelCurve.getPoint(this.tunnelU || 0.2);
                    if (initialCamPoint && !isNaN(initialCamPoint.x)) {
                        this.camera.position.copy(initialCamPoint);
                        const initialLookAhead = this.tunnelCurve.getPoint(Math.min(0.99, (this.tunnelU || 0.2) + 0.02));
                        if (initialLookAhead && !isNaN(initialLookAhead.x)) {
                            this.camera.lookAt(initialLookAhead);
                        }
                    }
                }
            }
        } else if (this.tunnelGroup) {
            this.tunnelGroup.visible = false;
            // Hide tunnel lights when not in tunnel mode
            if (this.tunnelAmbient) this.tunnelAmbient.visible = false;
            if (this.tunnelLight) this.tunnelLight.visible = false;
            if (this.tunnelLight2) this.tunnelLight2.visible = false;
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:createTunnel:entry',message:'createTunnel called',data:{alreadyExists:!!this.tunnelGroup,hasScene:!!this.scene,hasCamera:!!this.camera},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (this.tunnelGroup) return;

        this.tunnelGroup = new THREE.Group();
        this.scene.add(this.tunnelGroup);

        // CREATE WINDING PATH FOR "FLY-THROUGH"
        this.tunnelPoints = [];
        // Start tunnelU at 0.2 so camera starts "inside" the tunnel, not at the entrance
        this.tunnelU = 0.2;
        this.tunnelPointsCount = 100; // More points for smoother, longer tunnel
        this.tunnelBasePoints = []; // Store base positions for audio-reactive deformation

        // Initial points for a winding path with more variation
        // Start curve further ahead (positive Z) and extend far back (negative Z)
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const z = 100 - i * 15; // Start at z=100, go back to z=-1400 (longer tunnel)
            const baseX = Math.sin(i * 0.35) * 8;
            const baseY = Math.cos(i * 0.4) * 8;
            const x = baseX;
            const y = baseY;
            this.tunnelPoints.push(new THREE.Vector3(x, y, z));
            this.tunnelBasePoints.push(new THREE.Vector3(baseX, baseY, z));
        }

        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPoints);
        
        // Smoothing factor for curve updates
        this.curveSmoothing = 0.15;
        
        // Initialize camera position on curve
        const initialCamPoint = this.tunnelCurve.getPoint(this.tunnelU);
        if (this.camera) {
            this.camera.position.copy(initialCamPoint);
            const initialLookAhead = this.tunnelCurve.getPoint(Math.min(0.99, this.tunnelU + 0.02));
            this.camera.lookAt(initialLookAhead);
        }

        // Tube Geometry along the curve - optimized for performance
        const tubularSegments = 150; // Reduced for better performance
        const radius = 6;
        const radialSegments = 24; // Reduced for better performance
        const closed = false;

        const geometry = new THREE.TubeGeometry(this.tunnelCurve, tubularSegments, radius, radialSegments, closed);

        // Enhanced material - VISIBLE and realistic tunnel
        const noiseMap = this.createNoiseTexture();
        this.tunnelMaterial = new THREE.MeshStandardMaterial({
            color: 0x2244aa, // Visible blue color
            emissive: 0x1133ff, // Strong blue glow
            emissiveIntensity: 0.8, // Visible glow
            metalness: 0.9,
            roughness: 0.2,
            side: THREE.BackSide, // See inside the tunnel
            map: noiseMap,
            transparent: false, // Solid tunnel walls
            depthWrite: true,
            depthTest: true
        });

        this.tunnelMesh = new THREE.Mesh(geometry, this.tunnelMaterial);
        this.tunnelGroup.add(this.tunnelMesh);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:createTunnel:meshCreated',message:'Tunnel mesh created',data:{meshExists:!!this.tunnelMesh,curvePointsCount:this.tunnelPoints?.length,firstPoint:this.tunnelPoints?.[0],lastPoint:this.tunnelPoints?.[this.tunnelPoints.length-1],tunnelU:this.tunnelU},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        // Outer glow layer - visible neon glow
        const outerGeo = new THREE.TubeGeometry(this.tunnelCurve, tubularSegments, radius + 1.0, radialSegments, closed);
        const outerMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, // Bright blue glow
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.tunnelOuterMesh = new THREE.Mesh(outerGeo, outerMat);
        this.tunnelGroup.add(this.tunnelOuterMesh);
        
        // Inner neon ring layer - creates depth and speed lines
        const innerGeo = new THREE.TubeGeometry(this.tunnelCurve, tubularSegments, radius - 0.5, radialSegments, closed);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Cyan inner glow
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.tunnelInnerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.tunnelGroup.add(this.tunnelInnerMesh);

        // Create particles that fly within the tunnel
        this.createWormholeParticles();
        this.tunnelGroup.visible = true;
    }

    createWormholeParticles() {
        const particleCount = 1500; // Reduced for better performance
        const particlesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Distribute along the curve
            const t = Math.random();
            const point = this.tunnelCurve.getPoint(t);
            const tangent = this.tunnelCurve.getTangent(t);

            // Random radial offset
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 5.5;
            const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();

            const offset = new THREE.Vector3()
                .addScaledVector(binormal, Math.cos(angle) * r)
                .addScaledVector(normal, Math.sin(angle) * r);

            positions[i * 3] = point.x + offset.x;
            positions[i * 3 + 1] = point.y + offset.y;
            positions[i * 3 + 2] = point.z + offset.z;

            // Subtle colors - REDUCED brightness
            colors[i * 3] = 0.3 + Math.random() * 0.3;
            colors[i * 3 + 1] = 0.2 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleTex = this.createSoftParticleTexture();
        const particlesMat = new THREE.PointsMaterial({
            vertexColors: true,
            size: 3.0,
            map: particleTex,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.tunnelParticles = new THREE.Points(particlesGeo, particlesMat);
        this.tunnelGroup.add(this.tunnelParticles);
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

            colors[i * 3] = 0.3 + Math.random() * 0.3; // R - Reduced
            colors[i * 3 + 1] = 0.25 + Math.random() * 0.25; // G - Reduced
            colors[i * 3 + 2] = 0.6 + Math.random() * 0.3; // B - Reduced brightness

            sizes[i] = Math.random();
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1)); // We'll use this if we setup shader material, else just variance

        // Use soft sprite
        const particleTex = this.createSoftParticleTexture();

        const particlesMat = new THREE.PointsMaterial({
            vertexColors: true,
            size: 2.5, // Smaller particles
            map: particleTex,
            transparent: true,
            opacity: 0.5, // Reduced opacity
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.tunnelParticles = new THREE.Points(particlesGeo, particlesMat);
        this.tunnelGroup.add(this.tunnelParticles);
    }

    updateTunnel(time, bass, mid, high, amp) {
        // #region agent log
        if (this._frame % 60 === 0) { fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:updateTunnel:entry',message:'updateTunnel called',data:{frame:this._frame,hasTunnelGroup:!!this.tunnelGroup,hasTunnelCurve:!!this.tunnelCurve,hasTunnelMesh:!!this.tunnelMesh,tunnelGroupVisible:this.tunnelGroup?.visible,tunnelU:this.tunnelU,bass,mid,high,amp},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{}); }
        // #endregion
        if (!this.tunnelGroup || !this.tunnelCurve || !this.tunnelBasePoints || !this.camera) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:updateTunnel:earlyReturn',message:'Early return - missing dependencies',data:{hasTunnelGroup:!!this.tunnelGroup,hasTunnelCurve:!!this.tunnelCurve,hasBasePoints:!!this.tunnelBasePoints,hasCamera:!!this.camera},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            if (!this.tunnelGroup) {
                this.createTunnel();
            }
            return;
        }
        
        // Ensure tunnelU is initialized
        if (typeof this.tunnelU !== 'number' || isNaN(this.tunnelU)) {
            this.tunnelU = 0.2;
        }

        // ========== AUDIO-REACTIVE TUNNEL CURVES ==========
        // Update tunnel curve shape based on audio frequencies - CLAMPED to prevent excessive deformation
        const curveIntensity = Math.min(0.8, bass * 1.2 + mid * 0.8 + high * 0.5);
        
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const basePoint = this.tunnelBasePoints[i];
            const progress = i / this.tunnelPointsCount;
            
            // Frequency-based curve deformation - REDUCED multipliers
            // Bass controls horizontal curves (left/right) - clamped
            const bassCurve = Math.sin(progress * Math.PI * 4 + time * 0.8) * Math.min(8, bass * 6);
            // Mid controls vertical curves (up/down) - clamped
            const midCurve = Math.cos(progress * Math.PI * 3.5 + time * 0.6) * Math.min(6, mid * 5);
            // High frequencies add quick twists - clamped
            const highTwist = Math.sin(progress * Math.PI * 8 + time * 2) * Math.min(4, high * 3);
            
            // Beat-driven sudden curves - REDUCED
            const beatCurveX = Math.sin(time * 5 + progress * 10) * Math.min(5, this.beatDecay * 4);
            const beatCurveY = Math.cos(time * 4 + progress * 9) * Math.min(4, this.beatDecay * 3);
            
            // Calculate new position
            const newX = basePoint.x + bassCurve + beatCurveX + highTwist * 0.3;
            const newY = basePoint.y + midCurve + beatCurveY;
            
            // Smooth interpolation for fluid curve changes
            const currentPoint = this.tunnelPoints[i];
            currentPoint.x += (newX - currentPoint.x) * this.curveSmoothing;
            currentPoint.y += (newY - currentPoint.y) * this.curveSmoothing;
        }
        
        // Rebuild curve with updated points - CRITICAL: Must rebuild every frame for smooth motion
        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPoints);
        
        // Update tunnel geometry every 2 frames for balance between smoothness and performance
        // NOTE: Curve changes every frame, but geometry can update less frequently
        if (this.tunnelMesh && this.tunnelMesh.geometry && this._frame % 2 === 0) {
            try {
                const newGeometry = new THREE.TubeGeometry(
                    this.tunnelCurve,
                    150, // tubularSegments (matches creation)
                    6,   // radius
                    24,  // radialSegments (matches creation)
                    false // closed
                );
                this.tunnelMesh.geometry.dispose();
                this.tunnelMesh.geometry = newGeometry;
                
                // Update outer glow geometry
                if (this.tunnelOuterMesh && this.tunnelOuterMesh.geometry) {
                    const outerGeo = new THREE.TubeGeometry(
                        this.tunnelCurve,
                        150,
                        6.8,
                        24,
                        false
                    );
                    this.tunnelOuterMesh.geometry.dispose();
                    this.tunnelOuterMesh.geometry = outerGeo;
                }
                
                // Update inner glow geometry
                if (this.tunnelInnerMesh && this.tunnelInnerMesh.geometry) {
                    const innerGeo = new THREE.TubeGeometry(
                        this.tunnelCurve,
                        150,
                        4.5,
                        24,
                        false
                    );
                    this.tunnelInnerMesh.geometry.dispose();
                    this.tunnelInnerMesh.geometry = innerGeo;
                }
            } catch (e) {
                console.warn('[Tunnel] Geometry update error:', e);
            }
        }

        // ========== AUDIO-REACTIVE SPEED - CLAMPED ==========
        // Speed depends on audio energy but with MAX LIMITS to prevent excessive zoom
        const baseSpeed = 0.001; // Base speed for smooth forward motion
        // Clamp multipliers to prevent extreme values
        const clampedBass = Math.min(1.0, bass);
        const clampedMid = Math.min(1.0, mid);
        const clampedHigh = Math.min(1.0, high);
        const clampedAmp = Math.min(1.0, amp);
        
        const speedMultiplier = 1.0 + (clampedBass * 1.2) + (clampedMid * 0.6) + (clampedHigh * 0.3) + (clampedAmp * 0.8);
        const audioSpeedBoost = Math.min(0.005, baseSpeed * speedMultiplier); // MAX speed cap
        const speed = audioSpeedBoost + (this.beatDecay * 0.0015);

        this.tunnelU += speed;
        // Seamless loop - wrap around smoothly, keep in valid range
        if (this.tunnelU >= 0.95) {
            // Instead of resetting to 0, smoothly wrap by going back slightly
            // This prevents camera jump
            this.tunnelU = 0.05 + (this.tunnelU - 0.95);
        }
        // Keep tunnelU in valid range
        this.tunnelU = Math.max(0.05, Math.min(0.95, this.tunnelU));

        // ========== CAMERA POSITIONING - MOVE THROUGH TUNNEL ==========
        // Camera moves along the curve - NOT tunnel rotating around camera
        // Ensure tunnelU is within valid range
        if (this.tunnelU < 0) this.tunnelU = 0;
        if (this.tunnelU > 0.99) this.tunnelU = 0.99;
        
        const camPoint = this.tunnelCurve.getPoint(this.tunnelU);
        if (!camPoint || isNaN(camPoint.x)) {
            console.warn('[Tunnel] Invalid camera point at U:', this.tunnelU);
            return;
        }
        
        const lookAheadU = Math.min(0.99, this.tunnelU + 0.02); // Look ahead
        const lookAtPoint = this.tunnelCurve.getPoint(lookAheadU);
        
        if (!lookAtPoint || isNaN(lookAtPoint.x)) {
            console.warn('[Tunnel] Invalid look-at point');
            return;
        }
        
        // DIRECTLY set camera position to the curve point (no lerp lag)
        this.camera.position.set(camPoint.x, camPoint.y, camPoint.z);
        
        // Very subtle shake - MINIMAL to keep camera inside tunnel
        const shakeIntensity = Math.min(0.3, (this.beatDecay * 0.25) + (clampedBass * 0.15));
        const shakeX = Math.sin(time * 8) * shakeIntensity * 0.1;
        const shakeY = Math.cos(time * 7) * shakeIntensity * 0.1;
        this.camera.position.x += shakeX;
        this.camera.position.y += shakeY;

        // Use THREE.js built-in lookAt for proper orientation
        this.camera.lookAt(lookAtPoint);
        
        // CRITICAL: Move tunnel lights with camera for proper illumination
        if (this.tunnelLight) {
            this.tunnelLight.position.copy(this.camera.position);
            // Offset slightly forward to light the path ahead
            this.tunnelLight.position.z -= 20;
        }
        if (this.tunnelLight2) {
            this.tunnelLight2.position.copy(this.camera.position);
            // Offset behind camera for rear illumination
            this.tunnelLight2.position.z += 30;
        }
        
        // #region agent log
        if (this._frame % 60 === 0) { fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:updateTunnel:cameraSet',message:'Camera position set',data:{tunnelU:this.tunnelU,camPoint:{x:camPoint.x,y:camPoint.y,z:camPoint.z},lookAtPoint:{x:lookAtPoint.x,y:lookAtPoint.y,z:lookAtPoint.z},cameraPos:{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z},cameraFov:this.camera.fov,sceneBackground:this.scene?.background?.getHexString?.()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D,F,G'})}).catch(()=>{}); }
        // #endregion

        // ========== CAMERA ROLL - MINIMAL ==========
        // Subtle roll based on curve direction - REDUCED
        const tangent = this.tunnelCurve.getTangent(this.tunnelU);
        if (tangent && !isNaN(tangent.x)) {
            const rollFromCurve = Math.atan2(tangent.y, tangent.x) * 0.05; // Reduced multiplier
            const audioRoll = (Math.sin(time * 1.0) * 0.05 * clampedMid) + (this.beatDecay * 0.1); // Reduced
            const targetRoll = rollFromCurve + audioRoll;
            
            // Smooth roll transition
            this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.15;
        }
        
        // Ensure camera stays at reasonable FOV for tunnel view
        this.camera.fov = 60; // Good FOV for tunnel fly-through
        this.camera.updateProjectionMatrix();

        // ========== VISUAL EFFECTS - MUSIC-DRIVEN TUNNEL ==========
        // Make the tunnel feel like music is pulling you through
        if (this.tunnelMaterial) {
            // Emissive intensity pulses with music - drives the "pull" feeling
            const baseEmissive = 0.6;
            const musicPull = (clampedBass * 0.8) + (clampedAmp * 0.5) + (this.beatDecay * 0.6);
            const emissiveIntensity = Math.min(2.0, baseEmissive + musicPull);
            this.tunnelMaterial.emissiveIntensity = emissiveIntensity;
            
            // Dynamic color - shifts with music frequencies
            const hue = (time * 0.05 + clampedBass * 0.2 + clampedMid * 0.15) % 1;
            // Higher saturation and visible lightness
            const saturation = Math.min(0.9, 0.7 + clampedAmp * 0.2);
            const lightness = Math.min(0.5, 0.35 + clampedAmp * 0.15);
            this.tunnelMaterial.color.setHSL(hue, saturation, lightness);
            
            // Emissive color - brighter, more vivid
            const emissiveHue = (hue + 0.1) % 1;
            this.tunnelMaterial.emissive.setHSL(emissiveHue, 0.9, 0.3 + clampedBass * 0.2);
            
            // Scroll texture with speed for forward motion feel
            if (this.tunnelMaterial.map) {
                const scrollSpeed = Math.min(0.05, speed * 50);
                this.tunnelMaterial.map.offset.y -= scrollSpeed;
            }
        }
        
        // Update outer glow based on music
        if (this.tunnelOuterMesh && this.tunnelOuterMesh.material) {
            const glowIntensity = 0.3 + (clampedBass * 0.4) + (this.beatDecay * 0.3);
            this.tunnelOuterMesh.material.opacity = Math.min(0.7, glowIntensity);
        }
        
        // Update inner glow based on music
        if (this.tunnelInnerMesh && this.tunnelInnerMesh.material) {
            const innerGlow = 0.2 + (clampedMid * 0.3) + (this.beatDecay * 0.2);
            this.tunnelInnerMesh.material.opacity = Math.min(0.5, innerGlow);
        }

        // NO TUNNEL ROTATION - Camera moves, tunnel stays put (or very minimal rotation)
        const rotationSpeed = Math.min(0.001, 0.0005 + (clampedBass * 0.0003)); // MINIMAL rotation
        this.tunnelGroup.rotation.z += rotationSpeed;
        
        // Subtle pulse on beats - CLAMPED
        if (this.tunnelMesh) {
            const pulseScale = 1.0 + Math.min(0.03, (this.beatDecay * 0.02) + (clampedBass * 0.015));
            this.tunnelMesh.scale.set(1, 1, pulseScale);
            if (this.tunnelOuterMesh) {
                this.tunnelOuterMesh.scale.set(1, 1, pulseScale);
            }
            if (this.tunnelInnerMesh) {
                const innerPulse = 1.0 + Math.min(0.04, (this.beatDecay * 0.03) + (clampedBass * 0.02));
                this.tunnelInnerMesh.scale.set(1, 1, innerPulse);
                
                // Inner glow opacity - CONTROLLED
                if (this.tunnelInnerMesh.material) {
                    const innerOpacity = Math.min(0.15, 0.08 + (clampedAmp * 0.05) + (this.beatDecay * 0.04));
                    this.tunnelInnerMesh.material.opacity = innerOpacity;
                }
            }
        }

        // ========== PARTICLE SYSTEM UPDATE ==========
        // Update tunnel particles - fly past camera with CLAMPED speed
        if (this.tunnelParticles) {
            const positions = this.tunnelParticles.geometry.attributes.position;
            const colors = this.tunnelParticles.geometry.attributes.color;
            const count = positions.count;
            // Clamp particle speed to prevent excessive movement
            const particleSpeed = Math.min(3.0, 0.6 + (clampedBass * 1.5) + (clampedAmp * 1.0));
            
            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                let z = positions.array[idx + 2];
                
                // Move particles forward with audio-reactive speed
                positions.array[idx + 2] += particleSpeed;
                
                // Reset particles that passed camera
                if (positions.array[idx + 2] > 20) {
                    // Reset to far distance along curve
                    const resetT = (this.tunnelU - 0.3 + Math.random() * 0.2 + 1.0) % 1.0;
                    const resetPoint = this.tunnelCurve.getPoint(resetT);
                    
                    // Random position within tunnel radius
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.random() * 5.0;
                    positions.array[idx] = resetPoint.x + Math.cos(angle) * r;
                    positions.array[idx + 1] = resetPoint.y + Math.sin(angle) * r;
                    positions.array[idx + 2] = resetPoint.z;
                    
                    // Update particle color based on audio - REDUCED brightness
                    const hue = (time * 0.08 + Math.random()) % 1;
                    // Darker particle colors (0.2-0.5 range instead of 0.3-0.7)
                    colors.array[idx] = 0.2 + Math.sin(hue * Math.PI * 2) * 0.15;
                    colors.array[idx + 1] = 0.15 + Math.cos(hue * Math.PI * 2) * 0.15;
                    colors.array[idx + 2] = 0.7; // Reduced blue component
                }
            }
            positions.needsUpdate = true;
            if (colors) colors.needsUpdate = true;
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


