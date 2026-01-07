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
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:setMode:tunnel',message:'Setting tunnel mode - background set to black',data:{mode,tunnelGroupExists:!!this.tunnelGroup,tunnelMeshExists:!!this.tunnelMesh,sceneBackgroundSet:true,hasLights:!!this.tunnelLight},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E,F,G'})}).catch(()=>{});
            // #endregion
            
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
        
        // #region agent log
        if (this._frame % 120 === 0) { fetch('http://127.0.0.1:7242/ingest/eeb7875f-ddb5-4163-80e4-6a51bef53458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ThreeJSVisualizer.js:update:render',message:'Rendering frame',data:{frame:this._frame,mode:this.mode,hasComposer:!!this.composer,sceneBackground:this.scene?.background?.getHexString?.(),tunnelGroupVisible:this.tunnelGroup?.visible,mercuryMeshVisible:this.mercuryMesh?.visible,tunnelLightVisible:this.tunnelLight?.visible,canvasZIndex:this.threeCanvas?.style?.zIndex},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,G,J'})}).catch(()=>{}); }
        // #endregion
        
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

        // ========== CINEMATIC WORMHOLE TUNNEL ==========
        // Dark, moody sci-fi aesthetic with neon accent rings
        
        this.tunnelPoints = [];
        this.tunnelU = 0.15; // Start slightly into the tunnel
        this.tunnelPointsCount = 120;
        this.tunnelBasePoints = [];

        // Gentle winding path - subtle curves for immersion
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const z = 80 - i * 14;
            // Very gentle curves - keeps camera centered
            const baseX = Math.sin(i * 0.15) * 1.5;
            const baseY = Math.cos(i * 0.18) * 1.5;
            this.tunnelPoints.push(new THREE.Vector3(baseX, baseY, z));
            this.tunnelBasePoints.push(new THREE.Vector3(baseX, baseY, z));
        }

        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPoints);
        this.curveSmoothing = 0.12;
        
        // Initialize camera
        const initialCamPoint = this.tunnelCurve.getPoint(this.tunnelU);
        if (this.camera) {
            this.camera.position.copy(initialCamPoint);
            const initialLookAhead = this.tunnelCurve.getPoint(Math.min(0.99, this.tunnelU + 0.03));
            this.camera.lookAt(initialLookAhead);
        }

        const radius = 12;
        const tubularSegments = 200;
        const radialSegments = 32;

        // ========== MAIN TUNNEL STRUCTURE - Dark metallic walls ==========
        const tunnelGeo = new THREE.TubeGeometry(this.tunnelCurve, tubularSegments, radius, radialSegments, false);
        this.tunnelMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a12, // Very dark blue-black
            emissive: 0x0a0515, // Subtle purple tint
            emissiveIntensity: 0.3,
            metalness: 0.95,
            roughness: 0.4,
            side: THREE.BackSide,
            transparent: false
        });
        this.tunnelMesh = new THREE.Mesh(tunnelGeo, this.tunnelMaterial);
        this.tunnelGroup.add(this.tunnelMesh);

        // ========== NEON RING SEGMENTS - Creates depth perception ==========
        this.tunnelRings = [];
        const ringCount = 60;
        for (let i = 0; i < ringCount; i++) {
            const t = i / ringCount;
            const point = this.tunnelCurve.getPoint(t);
            const tangent = this.tunnelCurve.getTangent(t);
            
            // Alternating ring colors for variety
            const ringColor = i % 3 === 0 ? 0x00ffff : (i % 3 === 1 ? 0xff00aa : 0x4400ff);
            const ringRadius = radius - 0.3;
            
            const ringGeo = new THREE.TorusGeometry(ringRadius, 0.08, 8, 48);
            const ringMat = new THREE.MeshBasicMaterial({
                color: ringColor,
            transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(point);
            
            // Orient ring perpendicular to tunnel path
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);
            ring.quaternion.copy(quaternion);
            ring.rotateX(Math.PI / 2);
            
            ring.userData = { baseOpacity: 0.4 + Math.random() * 0.3, t: t };
            this.tunnelRings.push(ring);
            this.tunnelGroup.add(ring);
        }

        // ========== HEXAGONAL GRID WIREFRAME - Sci-fi texture ==========
        const wireGeo = new THREE.TubeGeometry(this.tunnelCurve, 80, radius - 0.1, 6, false);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x1a0a2e, // Dark purple
            wireframe: true,
            transparent: true,
            opacity: 0.25
        });
        this.tunnelWireframe = new THREE.Mesh(wireGeo, wireMat);
        this.tunnelGroup.add(this.tunnelWireframe);

        // ========== INNER GLOW CORE - Subtle light in the distance ==========
        const coreGeo = new THREE.TubeGeometry(this.tunnelCurve, 100, 0.8, 16, false);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x6633ff,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });
        this.tunnelCore = new THREE.Mesh(coreGeo, coreMat);
        this.tunnelGroup.add(this.tunnelCore);

        // ========== SPEED LINE PARTICLES ==========
        this.createSpeedLines();
        
        this.tunnelGroup.visible = true;
    }
    
    createSpeedLines() {
        // Elongated particles that streak past for speed sensation
        const lineCount = 800;
        const positions = new Float32Array(lineCount * 3);
        const colors = new Float32Array(lineCount * 3);
        const sizes = new Float32Array(lineCount);
        
        for (let i = 0; i < lineCount; i++) {
            const t = Math.random();
            const point = this.tunnelCurve.getPoint(t);
            const tangent = this.tunnelCurve.getTangent(t);
            
            // Distribute around the tunnel walls
            const angle = Math.random() * Math.PI * 2;
            const r = 2 + Math.random() * 8; // Between center and walls
            
            const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, binormal).normalize();
            
            positions[i * 3] = point.x + Math.cos(angle) * r * binormal.x + Math.sin(angle) * r * normal.x;
            positions[i * 3 + 1] = point.y + Math.cos(angle) * r * binormal.y + Math.sin(angle) * r * normal.y;
            positions[i * 3 + 2] = point.z + Math.cos(angle) * r * binormal.z + Math.sin(angle) * r * normal.z;
            
            // Color gradient: cyan to magenta
            const colorT = Math.random();
            colors[i * 3] = 0.2 + colorT * 0.8; // R
            colors[i * 3 + 1] = 0.8 - colorT * 0.5; // G  
            colors[i * 3 + 2] = 1.0; // B
            
            sizes[i] = 1 + Math.random() * 3;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            map: this.createSoftParticleTexture()
        });
        
        this.speedLines = new THREE.Points(geometry, material);
        this.tunnelGroup.add(this.speedLines);
    }

    updateTunnel(time, bass, mid, high, amp) {
        if (!this.tunnelGroup || !this.tunnelCurve || !this.tunnelBasePoints || !this.camera) {
            if (!this.tunnelGroup) {
                this.createTunnel();
            }
            return;
        }

        // Ensure tunnelU is initialized
        if (typeof this.tunnelU !== 'number' || isNaN(this.tunnelU)) {
            this.tunnelU = 0.15;
        }

        // Clamp audio values for subtle reactivity
        const clampedBass = Math.min(1.0, bass);
        const clampedMid = Math.min(1.0, mid);
        const clampedHigh = Math.min(1.0, high);
        const clampedAmp = Math.min(0.5, amp); // Extra clamped for subtlety

        // ========== GENTLE CURVE ANIMATION ==========
        // Very subtle curve movement - mostly static tunnel with slight breathing
        for (let i = 0; i < this.tunnelPointsCount; i++) {
            const basePoint = this.tunnelBasePoints[i];
            const progress = i / this.tunnelPointsCount;
            
            // Very gentle breathing motion - almost imperceptible
            const breathX = Math.sin(progress * Math.PI * 2 + time * 0.3) * 0.3 * clampedBass;
            const breathY = Math.cos(progress * Math.PI * 2.5 + time * 0.25) * 0.25 * clampedMid;
            
            const currentPoint = this.tunnelPoints[i];
            currentPoint.x += ((basePoint.x + breathX) - currentPoint.x) * 0.08;
            currentPoint.y += ((basePoint.y + breathY) - currentPoint.y) * 0.08;
        }
        
        // Rebuild curve
        this.tunnelCurve = new THREE.CatmullRomCurve3(this.tunnelPoints);

        // ========== SMOOTH FORWARD MOTION ==========
        // Gentle, consistent speed with subtle audio boost
        const baseSpeed = 0.0008;
        const audioBoost = clampedBass * 0.001 + clampedAmp * 0.0005;
        const speed = baseSpeed + Math.min(0.002, audioBoost);

        this.tunnelU += speed;
        if (this.tunnelU >= 0.92) {
            this.tunnelU = 0.08;
        }
        this.tunnelU = Math.max(0.05, Math.min(0.95, this.tunnelU));

        // ========== CAMERA - SMOOTH FLIGHT ==========
        const camPoint = this.tunnelCurve.getPoint(this.tunnelU);
        if (!camPoint || isNaN(camPoint.x)) return;
        
        const lookAheadU = Math.min(0.98, this.tunnelU + 0.04);
        const lookAtPoint = this.tunnelCurve.getPoint(lookAheadU);
        if (!lookAtPoint || isNaN(lookAtPoint.x)) return;
        
        // Smooth camera interpolation
        this.camera.position.lerp(camPoint, 0.15);
        this.camera.lookAt(lookAtPoint);

        // ========== ANIMATE NEON RINGS ==========
        if (this.tunnelRings) {
            this.tunnelRings.forEach((ring, i) => {
                const ringT = ring.userData.t;
                const distFromCamera = Math.abs(ringT - this.tunnelU);
                
                // Rings near camera are brighter
                const proximityGlow = Math.max(0, 1 - distFromCamera * 3);
                const baseOpacity = ring.userData.baseOpacity;
                const audioGlow = clampedBass * 0.3 + clampedHigh * 0.2;
                
                // Pulse effect
                const pulse = Math.sin(time * 3 + i * 0.5) * 0.1;
                
                ring.material.opacity = Math.min(0.8, baseOpacity * (0.3 + proximityGlow * 0.5 + audioGlow + pulse));
                
                // Subtle scale pulse on beat
                const scalePulse = 1 + this.beatDecay * 0.05;
                ring.scale.setScalar(scalePulse);
            });
        }

        // ========== ANIMATE SPEED LINES ==========
        if (this.speedLines) {
            const positions = this.speedLines.geometry.attributes.position.array;
            const speedLineDelta = speed * 800 + clampedBass * 5;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += speedLineDelta; // Move toward camera
                
                // Reset particles that pass the camera
                if (positions[i + 2] > this.camera.position.z + 50) {
                    positions[i + 2] = this.camera.position.z - 400 - Math.random() * 200;
                    // Redistribute around tunnel
                    const angle = Math.random() * Math.PI * 2;
                    const r = 2 + Math.random() * 8;
                    positions[i] = this.camera.position.x + Math.cos(angle) * r;
                    positions[i + 1] = this.camera.position.y + Math.sin(angle) * r;
                }
            }
            this.speedLines.geometry.attributes.position.needsUpdate = true;
            
            // Opacity pulses with music
            this.speedLines.material.opacity = 0.4 + clampedBass * 0.3 + clampedHigh * 0.2;
        }

        // ========== TUNNEL WALL EFFECTS ==========
        if (this.tunnelMaterial) {
            // Subtle emissive pulse - NOT flashy white
            const emissiveIntensity = 0.2 + clampedBass * 0.15 + this.beatDecay * 0.1;
            this.tunnelMaterial.emissiveIntensity = Math.min(0.5, emissiveIntensity);
            
            // Subtle color shift
            const hue = (time * 0.02 + clampedMid * 0.05) % 1;
            this.tunnelMaterial.emissive.setHSL(hue * 0.15 + 0.7, 0.5, 0.08); // Purple range
        }

        // ========== WIREFRAME ANIMATION ==========
        if (this.tunnelWireframe) {
            this.tunnelWireframe.material.opacity = 0.15 + clampedHigh * 0.15;
        }

        // ========== CORE GLOW ==========
        if (this.tunnelCore) {
            this.tunnelCore.material.opacity = 0.1 + clampedBass * 0.1 + this.beatDecay * 0.05;
        }

        // ========== LIGHTS FOLLOW CAMERA ==========
        if (this.tunnelLight) {
            this.tunnelLight.position.copy(this.camera.position);
            this.tunnelLight.position.z -= 30;
        }
        if (this.tunnelLight2) {
            this.tunnelLight2.position.copy(this.camera.position);
            this.tunnelLight2.position.x += 8;
            this.tunnelLight2.position.z -= 15;
        }
        if (this.tunnelLight3) {
            this.tunnelLight3.position.copy(this.camera.position);
            this.tunnelLight3.position.z += 40;
        }
        
        // Light intensity pulses subtly with music
        if (this.tunnelLight) {
            this.tunnelLight.intensity = 0.8 + clampedBass * 0.4;
        }
        if (this.tunnelLight2) {
            this.tunnelLight2.intensity = 0.5 + clampedMid * 0.3;
        }

        // ========== SUBTLE CAMERA ROLL ==========
        const tangent = this.tunnelCurve.getTangent(this.tunnelU);
        if (tangent && !isNaN(tangent.x)) {
            const rollFromCurve = Math.atan2(tangent.y, tangent.x) * 0.02;
            const targetRoll = rollFromCurve + Math.sin(time * 0.5) * 0.02;
            this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * 0.08;
        }
        
        // Wide FOV for immersive tunnel view
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
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


