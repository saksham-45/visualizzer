/**
 * Mesh-Based Visualizers Module
 * Creates cloth-like flexible 2D surfaces that fill the screen
 */
export class MeshVisualizers {
    constructor(canvas, audioCapture, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioCapture = audioCapture;
        this.audioAnalyzer = audioAnalyzer;
        this.currentVisualizer = null;
        this.transitionProgress = 1;
        this.targetVisualizer = null;
        this.previousVisualizer = null;
        
        // Mesh properties - higher resolution for smoother cloth effect
        this.meshResolution = 60; // Grid density for cloth-like effect (increased for better quality)
        this.time = 0;
        
        // Physics particle system for melting disturbances
        this.particles = [];
        this.maxParticles = 30;
        this.meltingDisturbances = new Map(); // Store melting effects on mesh points
        
        // Resize canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    setVisualizer(type) {
        if (this.currentVisualizer === type) return;
        
        // Clear particles when switching away from bars
        if (this.currentVisualizer === 'bars' && type !== 'bars') {
            this.particles = [];
            this.meltingDisturbances.clear();
        }
        
        this.previousVisualizer = this.currentVisualizer;
        this.targetVisualizer = type;
        this.transitionProgress = 0;
        
        const transitionDuration = 3000; // Longer for organic transitions
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
            }
        };
        
        animateTransition();
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    render() {
        const audioData = this.audioCapture.getAudioData();
        if (!audioData) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            return;
        }

        this.time += 0.016; // Approximate frame time
        const metadata = this.audioAnalyzer.analyze();
        const visualizerType = this.targetVisualizer || this.currentVisualizer;

        // Darker fade for more vibrant colors
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Handle morphing transition
        if (this.targetVisualizer && this.previousVisualizer && this.transitionProgress < 1) {
            this.renderMorphingMesh(this.previousVisualizer, this.targetVisualizer, 
                                   this.transitionProgress, audioData, metadata);
        } else {
            this.renderMeshVisualizer(visualizerType, audioData, metadata);
        }
        
        // Render particles for bars visualizer (optional - can be removed)
        if (visualizerType === 'bars') {
            // Uncomment to see particles: this.renderParticles();
        }
    }

    /**
     * Create a mesh grid for cloth-like rendering
     */
    createMesh(cols, rows) {
        const mesh = [];
        for (let y = 0; y <= rows; y++) {
            const row = [];
            for (let x = 0; x <= cols; x++) {
                row.push({
                    x: (x / cols) * this.width,
                    y: (y / rows) * this.height,
                    z: 0, // Depth for 3D effect
                    baseX: (x / cols) * this.width,
                    baseY: (y / rows) * this.height
                });
            }
            mesh.push(row);
        }
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

        // Draw mesh lines for definition
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        for (let y = 0; y <= rows; y++) {
            this.ctx.beginPath();
            for (let x = 0; x <= cols; x++) {
                const p = mesh[y][x];
                if (x === 0) {
                    this.ctx.moveTo(p.x, p.y);
                } else {
                    this.ctx.lineTo(p.x, p.y);
                }
            }
            this.ctx.stroke();
        }
        for (let x = 0; x <= cols; x++) {
            this.ctx.beginPath();
            for (let y = 0; y <= rows; y++) {
                const p = mesh[y][x];
                if (y === 0) {
                    this.ctx.moveTo(p.x, p.y);
                } else {
                    this.ctx.lineTo(p.x, p.y);
                }
            }
            this.ctx.stroke();
        }
    }

    drawFilledTriangle(p1, p2, p3, hue, saturation, lightness, alpha) {
        const gradient = this.ctx.createLinearGradient(
            (p1.x + p2.x + p3.x) / 3,
            (p1.y + p2.y + p3.y) / 3,
            p3.x, p3.y
        );
        
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${hue + 30}, ${saturation}%, ${lightness + 10}%, ${alpha * 0.8})`);
        gradient.addColorStop(1, `hsla(${hue + 60}, ${saturation}%, ${lightness}%, ${alpha * 0.6})`);

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
            case 'spectrum':
                mesh = this.deformSpectrumMesh(mesh, audioData, metadata);
                break;
            case 'particles':
                mesh = this.deformParticlesMesh(mesh, audioData, metadata);
                break;
            case 'kaleidoscope':
                this.renderKaleidoscope(audioData, metadata);
                return; // Special rendering, don't use mesh
            case 'mandala':
                this.renderMandala(audioData, metadata);
                return; // Special rendering
            case 'fractal':
                this.renderFractal(audioData, metadata);
                return; // Special rendering
            case 'tunnel':
                this.renderTunnel(audioData, metadata);
                return; // Special rendering
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
        const amplitude = metadata.amplitude * 100;
        
        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const dataIndex = Math.floor((x / mesh[y].length) * bufferLength);
                const wave = (timeData[dataIndex] / 128.0 - 1) * amplitude;
                const wave2 = Math.sin((point.baseX / this.width) * Math.PI * 4 + this.time * 2) * amplitude * 0.5;
                
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
        const amplitude = metadata.amplitude * 200;
        
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
        const amplitude = metadata.amplitude * 120;
        
        for (let y = 0; y < mesh.length; y++) {
            for (let x = 0; x < mesh[y].length; x++) {
                const point = mesh[y][x];
                const freqIndex = Math.floor((x / mesh[y].length) * bufferLength);
                const energy = frequencyData[freqIndex] / 255;
                
                // Multiple wave layers for flowing effect
                const wave1 = Math.sin((point.baseX / this.width) * Math.PI * 6 + this.time * 2) * amplitude;
                const wave2 = Math.sin((point.baseY / this.height) * Math.PI * 4 + this.time * 1.5) * amplitude * 0.7;
                const wave3 = (timeData[freqIndex] / 128.0 - 1) * amplitude * energy;
                
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
        const cols = this.meshResolution;
        const rows = Math.floor(this.meshResolution * (this.height / this.width));
        
        let fromMesh = this.createMesh(cols, rows);
        let toMesh = this.createMesh(cols, rows);
        
        // Deform both meshes
        fromMesh = this.getDeformedMesh(fromType, fromMesh, audioData, metadata);
        toMesh = this.getDeformedMesh(toType, toMesh, audioData, metadata);
        
        // Interpolate between meshes
        const morphedMesh = [];
        for (let y = 0; y < fromMesh.length; y++) {
            const row = [];
            for (let x = 0; x < fromMesh[y].length; x++) {
                const fromP = fromMesh[y][x];
                const toP = toMesh[y][x];
                row.push({
                    x: fromP.x + (toP.x - fromP.x) * t,
                    y: fromP.y + (toP.y - fromP.y) * t,
                    z: fromP.z + (toP.z - fromP.z) * t,
                    baseX: fromP.baseX,
                    baseY: fromP.baseY
                });
            }
            morphedMesh.push(row);
        }
        
        this.renderMeshAsCloth(morphedMesh, audioData, metadata);
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
                const size = 2 + energy * 20 + Math.sin(ring * 2 + this.time) * 5;
                
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
                
                // Multiple distortion layers
                const distortion1 = Math.sin(point.baseX * 0.01 + this.time * 2) * amplitude * energy;
                const distortion2 = Math.cos(point.baseY * 0.01 + this.time * 1.5) * amplitude * energy;
                const distortion3 = Math.sin((point.baseX + point.baseY) * 0.02 + this.time * 3) * amplitude * energy * 0.5;
                const wave = (timeData[freqIndex] / 128.0 - 1) * amplitude * energy;
                
                // Radial distortion
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
}

