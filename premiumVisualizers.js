/**
 * Premium Visualizers Module
 * Next-generation ultra-premium audio visualization system
 * Inspired by Apple Music, mathematical motion graphics, and psychedelic art
 */

export class PremiumVisualizers {
    constructor(canvas, audioCapture, audioAnalyzer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioCapture = audioCapture;
        this.audioAnalyzer = audioAnalyzer;
        this.time = 0;
        
        // Color system
        this.colorHue = 0;
        this.colorDrift = 0;
        this.lastBeatTime = 0;
        
        // Particle systems - optimized for performance
        this.nebulaParticles = [];
        this.maxNebulaParticles = 300; // Reduced from 2000 for performance
        
        // Waveform particles for Apple Music visualizer
        this.waveformParticles = [];
        this.maxWaveformParticles = 150;
        
        // Boids/flocking parameters
        this.boidParams = {
            separationDistance: 50,
            alignmentDistance: 80,
            cohesionDistance: 100,
            separationStrength: 0.05,
            alignmentStrength: 0.05,
            cohesionStrength: 0.01,
            maxSpeed: 3,
            maxForce: 0.1
        };
        
        // 3D geometry morphing
        this.geometryMorphProgress = 0;
        this.currentShape = 0; // 0: tetrahedron, 1: cube, 2: sphere, 3: torus
        
        // Fractal bloom
        this.fractalDepth = 0;
        this.fractalGrowth = 0;
        
        // Perlin noise for organic motion
        this.noiseOffset = { x: 0, y: 0, z: 0 };
        
        // Tunnel depth for enhanced tunnel
        this.tunnelDepth = 0;
        
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

    /**
     * Advanced color system with dynamic gradients, glow, and bloom
     */
    getDynamicColor(metadata, position = { x: 0, y: 0 }, energy = 0) {
        // Slow ambient color drift
        this.colorDrift += 0.01;
        
        // Fast color flash on beat
        const beatFlash = metadata.rhythm?.beat ? 60 : 0;
        const beatDecay = Math.max(0, 1 - (Date.now() - this.lastBeatTime) / 500);
        
        // Base hue from spectral centroid
        const baseHue = (metadata.spectralCentroid / 20) % 360;
        
        // Position-based hue variation
        const posHue = ((position.x + position.y) / (this.width + this.height)) * 60;
        
        // Combined hue with drift and beat flash
        const hue = (baseHue + this.colorDrift * 10 + posHue + beatFlash * beatDecay) % 360;
        
        // Saturation based on amplitude and energy
        const saturation = 70 + metadata.amplitude * 25 + energy * 5;
        
        // Lightness based on amplitude and brightness
        const brightness = metadata.amplitude > 0.3 ? 60 : 50;
        const lightness = brightness + energy * 20 + beatDecay * 15;
        
        return { hue, saturation, lightness };
    }

    /**
     * Create gradient with glow effect
     */
    createGlowGradient(x1, y1, x2, y2, color1, color2, glowRadius = 50) {
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, `hsla(${color1.hue}, ${color1.saturation}%, ${color1.lightness}%, 1)`);
        gradient.addColorStop(0.5, `hsla(${color2.hue}, ${color2.saturation}%, ${color2.lightness}%, 0.9)`);
        gradient.addColorStop(1, `hsla(${color2.hue + 30}, ${color2.saturation}%, ${color2.lightness}%, 0.7)`);
        return gradient;
    }

    /**
     * Clamp radius to prevent negative values
     */
    clampRadius(radius, minRadius = 0.1) {
        return Math.max(minRadius, Math.abs(radius));
    }

    /**
     * Apply bloom effect (soft glow) - optimized for performance
     */
    applyBloom() {
        // Minimal bloom for better performance
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
        this.ctx.shadowBlur = 5;
    }

    /**
     * Remove bloom effect
     */
    removeBloom() {
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
    }

    /**
     * 1. Apple-Music Style Waveform
     * Fluid, ribbon-like wave with smooth spectral gradients - Screen filling with bouncing particles
     */
    renderAppleWaveform(audioData, metadata) {
        const { timeData, frequencyData, bufferLength } = audioData;
        const centerY = this.height / 2;
        const amplitude = (metadata.amplitude || 0.1) * this.height * 0.6; // More screen-filling
        
        // Calculate waveform points for collision detection
        const waveformPoints = [];
        const sliceWidth = this.width / bufferLength;
        
        // Draw upper wave
        this.ctx.beginPath();
        const upperPoints = [];
        
        for (let i = 0; i < bufferLength; i += 1) {
            const v = timeData[i] / 128.0;
            const x = i * sliceWidth;
            const y = centerY - (v * amplitude);
            const energy = frequencyData[i] / 255;
            
            upperPoints.push({ x, y, energy });
            waveformPoints.push({ x, y, energy, isUpper: true });
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        // Draw lower wave (mirrored)
        const lowerPoints = [];
        for (let i = bufferLength - 1; i >= 0; i -= 1) {
            const v = timeData[i] / 128.0;
            const x = i * sliceWidth;
            const y = centerY + (v * amplitude);
            const energy = frequencyData[i] / 255;
            
            lowerPoints.push({ x, y, energy });
            waveformPoints.push({ x, y, energy, isUpper: false });
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        
        // Create gradient fill
        const color1 = this.getDynamicColor(metadata, { x: 0, y: centerY }, metadata.amplitude);
        const color2 = this.getDynamicColor(metadata, { x: this.width, y: centerY }, metadata.amplitude);
        const gradient = this.createGlowGradient(0, centerY, this.width, centerY, color1, color2);
        
        this.applyBloom();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw outline with varying thickness
        this.ctx.strokeStyle = `hsla(${color1.hue}, ${color1.saturation}%, ${color1.lightness + 20}%, 0.8)`;
        this.ctx.lineWidth = 2 + metadata.amplitude * 4;
        this.ctx.stroke();
        this.removeBloom();
        
        // Update and render particles
        this.updateWaveformParticles(waveformPoints, upperPoints, lowerPoints, metadata, audioData);
        this.renderWaveformParticles(metadata);
    }
    
    /**
     * Update waveform particles - spawn from peaks, bounce on waveform
     */
    updateWaveformParticles(waveformPoints, upperPoints, lowerPoints, metadata, audioData) {
        const { timeData, frequencyData, bufferLength } = audioData;
        const amplitude = (metadata.amplitude || 0.1) * this.height * 0.6;
        const centerY = this.height / 2;
        const dt = 0.016; // Frame time
        const gravity = 0.15; // Lower gravity for slower movement
        
        // Spawn particles from waveform peaks
        for (let i = 0; i < bufferLength; i += 5) {
            const v = timeData[i] / 128.0;
            const peakHeight = Math.abs(v * amplitude);
            
            // Spawn particles from significant peaks
            if (peakHeight > amplitude * 0.3 && this.waveformParticles.length < this.maxWaveformParticles && Math.random() < 0.1) {
                const x = (i / bufferLength) * this.width;
                const isUpper = v < 0;
                const y = isUpper ? centerY - peakHeight : centerY + peakHeight;
                const energy = frequencyData[i] / 255;
                
                this.waveformParticles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 3, // Horizontal velocity
                    vy: isUpper ? Math.abs((Math.random() - 0.5) * 4) : -Math.abs((Math.random() - 0.5) * 4), // Upward/downward velocity
                    size: 4 + energy * 8, // Bigger particles
                    hue: (metadata.spectralCentroid / 20 + i * 2) % 360,
                    energy: energy,
                    life: 1,
                    luminosity: 0.8 + energy * 0.2, // High luminosity
                    bounceCount: 0,
                    maxBounces: 5 + Math.floor(energy * 5)
                });
            }
        }
        
        // Update existing particles
        for (let i = this.waveformParticles.length - 1; i >= 0; i--) {
            const p = this.waveformParticles[i];
            
            // Apply gravity (lower for slower movement)
            p.vy += gravity;
            
            // Update position
            const oldY = p.y;
            p.x += p.vx;
            p.y += p.vy;
            
            // Boundary check - wrap horizontally
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            
            // Check collision with waveform
            const waveformY = this.getWaveformYAtX(p.x, upperPoints, lowerPoints, centerY);
            const isOnUpper = p.y < centerY;
            
            // Collision detection
            if (isOnUpper && p.y >= waveformY.upper) {
                // Hit upper waveform
                p.y = waveformY.upper;
                p.vy = Math.abs(p.vy) * 0.7; // Bounce with energy loss
                p.bounceCount++;
                
                // Add horizontal velocity based on waveform slope
                const slope = waveformY.slope || 0;
                p.vx += slope * 0.5;
            } else if (!isOnUpper && p.y <= waveformY.lower) {
                // Hit lower waveform
                p.y = waveformY.lower;
                p.vy = -Math.abs(p.vy) * 0.7; // Bounce with energy loss
                p.bounceCount++;
                
                // Add horizontal velocity based on waveform slope
                const slope = waveformY.slope || 0;
                p.vx += slope * 0.5;
            }
            
            // Friction
            p.vx *= 0.98;
            
            // Remove particles that bounced too much or went off screen
            if (p.bounceCount > p.maxBounces || p.y < -100 || p.y > this.height + 100) {
                this.waveformParticles.splice(i, 1);
                continue;
            }
            
            // Update color based on position
            p.hue = (p.hue + 2) % 360;
            p.life -= 0.001;
        }
    }
    
    /**
     * Get waveform Y position at given X coordinate
     */
    getWaveformYAtX(x, upperPoints, lowerPoints, centerY) {
        const sliceWidth = this.width / (upperPoints.length - 1);
        const index = Math.floor(x / sliceWidth);
        const t = (x / sliceWidth) - index;
        
        const upper1 = upperPoints[Math.max(0, Math.min(index, upperPoints.length - 1))];
        const upper2 = upperPoints[Math.max(0, Math.min(index + 1, upperPoints.length - 1))];
        const lower1 = lowerPoints[Math.max(0, Math.min(index, lowerPoints.length - 1))];
        const lower2 = lowerPoints[Math.max(0, Math.min(index + 1, lowerPoints.length - 1))];
        
        const upperY = upper1.y + (upper2.y - upper1.y) * t;
        const lowerY = lower1.y + (lower2.y - lower1.y) * t;
        const slope = (upper2.y - upper1.y) / sliceWidth;
        
        return {
            upper: upperY,
            lower: lowerY,
            slope: slope
        };
    }
    
    /**
     * Render waveform particles with high luminosity
     */
    renderWaveformParticles(metadata) {
        // Sort particles by Y for proper layering
        this.waveformParticles.sort((a, b) => a.y - b.y);
        
        for (const p of this.waveformParticles) {
            // High luminosity glow effect
            const glowSize = p.size * 2.5;
            const alpha = p.life * p.luminosity;
            
            // Outer glow
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Core particle - bright and luminous
            this.ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${alpha})`;
            this.ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 1)`;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Bright center highlight
            this.ctx.fillStyle = `hsla(${p.hue}, 50%, 95%, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * 2. Circular Harmonic Wave
     * Radial waves expanding in concentric circles - Screen filling
     */
    renderCircularHarmonic(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.max(this.width, this.height) * 0.6; // Fill more of screen
        const rings = 40; // Optimized for performance
        
        // Bass warps radius, highs ripple edges
        const bassEnergy = metadata.energyBands?.bass || 0;
        const highEnergy = metadata.energyBands?.brilliance || 0;
        
        for (let ring = 0; ring < rings; ring++) {
            const t = ring / rings;
            const baseRadius = t * maxRadius;
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 30;
            
            // Bass warps radius
            const bassWarp = Math.sin(t * Math.PI * 8 + this.time * 2) * bassEnergy * 50;
            
            // High frequencies ripple edges
            const highRipple = Math.sin(t * Math.PI * 20 + this.time * 5) * highEnergy * 20;
            
            const radius = this.clampRadius(baseRadius + wave + bassWarp + highRipple);
            
            // Draw circle - only if radius is valid
            if (radius > 0.1) {
                const color = this.getDynamicColor(metadata, { x: centerX, y: centerY }, energy);
                this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${0.3 + energy * 0.7})`;
                this.ctx.lineWidth = 1 + energy * 3;
                
                this.applyBloom();
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.removeBloom();
            }
        }
    }

    /**
     * 3. Frequency Bar Galaxy
     * 3D bar field that twists into spirals, helices, or grids - Screen filling
     */
    renderFrequencyBarGalaxy(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const barCount = 100; // Optimized for performance
        const maxRadius = Math.max(this.width, this.height) * 0.55; // Fill more screen
        
        // Determine twist mode based on spectral centroid
        const twistMode = Math.floor((metadata.spectralCentroid / 2000) % 3); // 0: spiral, 1: helix, 2: grid
        
        for (let i = 0; i < barCount; i++) {
            const t = i / barCount;
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const barHeight = energy * maxRadius * 0.8;
            
            let x, y, z, angle;
            
            if (twistMode === 0) {
                // Spiral arrangement
                angle = t * Math.PI * 6 + this.time * 2;
                const radius = t * maxRadius;
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                z = barHeight;
            } else if (twistMode === 1) {
                // Helix arrangement
                angle = t * Math.PI * 4 + this.time * 3;
                const radius = maxRadius * 0.6;
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                z = (t - 0.5) * maxRadius + barHeight;
            } else {
                // Grid arrangement
                const gridSize = Math.ceil(Math.sqrt(barCount));
                const gridX = i % gridSize;
                const gridY = Math.floor(i / gridSize);
                x = centerX + (gridX / gridSize - 0.5) * maxRadius * 1.5;
                y = centerY + (gridY / gridSize - 0.5) * maxRadius * 1.5;
                z = barHeight;
            }
            
            // 3D projection
            const scale = 1 / (1 + z * 0.001);
            const screenX = x;
            const screenY = y - z * scale;
            
            // Color based on frequency band
            const color = this.getDynamicColor(metadata, { x: screenX, y: screenY }, energy);
            const barWidth = 3 + energy * 5;
            
            this.applyBloom();
            this.ctx.fillStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${0.7 + energy * 0.3})`;
            this.ctx.fillRect(screenX - barWidth / 2, screenY - barHeight * scale, barWidth, barHeight * scale * 2);
            this.removeBloom();
        }
    }

    /**
     * 4. Enhanced Tunnel Mode
     * Infinite tunnel with depth-mapped lights and smooth zoom
     */
    renderEnhancedTunnel(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rings = 50; // Optimized for performance
        const segments = 64; // Optimized for performance
        
        // Beat detection for zoom
        const beatZoom = metadata.rhythm?.beat ? 0.1 : 0;
        const zoomSpeed = 0.02 + beatZoom;
        this.tunnelDepth = (this.tunnelDepth || 0) + zoomSpeed;
        
        // Audio warps tunnel width and curvature
        const bassEnergy = metadata.energyBands?.bass || 0;
        const tunnelWarp = Math.sin(this.time * 2) * bassEnergy * 0.3;
        const rotationSpeed = 1 + metadata.amplitude * 2;
        
        for (let ring = 0; ring < rings; ring++) {
            const depth = (ring / rings) + this.tunnelDepth;
            const normalizedDepth = depth % 1;
            const radius = normalizedDepth * Math.min(this.width, this.height) * 0.5;
            const z = normalizedDepth * 20;
            const scale = 1 / (1 + z * 0.1);
            
            // Warp based on audio
            const warpedRadius = radius * (1 + tunnelWarp);
            
            const freqIndex = Math.floor(normalizedDepth * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 30;
            
            // Depth-mapped lighting
            const lightIntensity = 1 - normalizedDepth;
            
            for (let seg = 0; seg < segments; seg++) {
                const angle = (seg / segments) * Math.PI * 2 + this.time * rotationSpeed + normalizedDepth * Math.PI;
                const baseRadius = warpedRadius + wave * scale;
                const x = centerX + Math.cos(angle) * baseRadius * scale;
                const y = centerY + Math.sin(angle) * baseRadius * scale;
                
                // Color cycling with depth
                const hue = (normalizedDepth * 360 + seg * 5.6 + this.time * 40) % 360;
                const saturation = 80 + energy * 20;
                const lightness = 40 + lightIntensity * 40 + energy * 20;
                
                const size = this.clampRadius((3 + energy * 15) * scale, 0.5);
                
                // Only render if size is reasonable and position is on screen
                if (size > 0.5 && x > -100 && x < this.width + 100 && y > -100 && y < this.height + 100) {
                    // Reduced bloom for performance
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + lightIntensity * 0.4})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
                
                // Connect segments with lines
                if (seg > 0) {
                    const prevAngle = ((seg - 1) / segments) * Math.PI * 2 + this.time * rotationSpeed + normalizedDepth * Math.PI;
                    const prevX = centerX + Math.cos(prevAngle) * baseRadius * scale;
                    const prevY = centerY + Math.sin(prevAngle) * baseRadius * scale;
                    
                    this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 10}%, ${0.3 + lightIntensity * 0.3})`;
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
     * Boids/flocking behavior for particles
     */
    applyBoidsBehavior(particles, metadata) {
        const amplitude = metadata.amplitude || 0.1;
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            let separationX = 0, separationY = 0;
            let alignmentX = 0, alignmentY = 0;
            let cohesionX = 0, cohesionY = 0;
            let separationCount = 0, alignmentCount = 0, cohesionCount = 0;
            
            // Check neighbors
            for (let j = 0; j < particles.length; j++) {
                if (i === j) continue;
                
                const other = particles[j];
                const dx = other.x - p.x;
                const dy = other.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.boidParams.separationDistance) {
                    // Separation - avoid crowding
                    separationX -= dx / dist;
                    separationY -= dy / dist;
                    separationCount++;
                }
                
                if (dist < this.boidParams.alignmentDistance) {
                    // Alignment - steer towards average heading
                    alignmentX += other.vx;
                    alignmentY += other.vy;
                    alignmentCount++;
                }
                
                if (dist < this.boidParams.cohesionDistance) {
                    // Cohesion - steer towards average position
                    cohesionX += other.x;
                    cohesionY += other.y;
                    cohesionCount++;
                }
            }
            
            // Apply forces
            if (separationCount > 0) {
                separationX /= separationCount;
                separationY /= separationCount;
                const sepMag = Math.sqrt(separationX * separationX + separationY * separationY);
                if (sepMag > 0) {
                    separationX = (separationX / sepMag) * this.boidParams.separationStrength;
                    separationY = (separationY / sepMag) * this.boidParams.separationStrength;
                }
            }
            
            if (alignmentCount > 0) {
                alignmentX /= alignmentCount;
                alignmentY /= alignmentCount;
                const alignMag = Math.sqrt(alignmentX * alignmentX + alignmentY * alignmentY);
                if (alignMag > 0) {
                    alignmentX = (alignmentX / alignMag) * this.boidParams.alignmentStrength;
                    alignmentY = (alignmentY / alignMag) * this.boidParams.alignmentStrength;
                }
            }
            
            if (cohesionCount > 0) {
                cohesionX /= cohesionCount;
                cohesionY /= cohesionCount;
                cohesionX -= p.x;
                cohesionY -= p.y;
                const cohMag = Math.sqrt(cohesionX * cohesionX + cohesionY * cohesionY);
                if (cohMag > 0) {
                    cohesionX = (cohesionX / cohMag) * this.boidParams.cohesionStrength;
                    cohesionY = (cohesionY / cohMag) * this.boidParams.cohesionStrength;
                }
            }
            
            // Apply forces with audio influence
            p.vx += (separationX + alignmentX + cohesionX) * (1 + amplitude);
            p.vy += (separationY + alignmentY + cohesionY) * (1 + amplitude);
            
            // Limit speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > this.boidParams.maxSpeed) {
                p.vx = (p.vx / speed) * this.boidParams.maxSpeed;
                p.vy = (p.vy / speed) * this.boidParams.maxSpeed;
            }
        }
    }

    /**
     * 5. Particle Nebula - Optimized with boids/flocking behavior
     */
    renderParticleNebula(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        
        // Initialize particles
        if (this.nebulaParticles.length < this.maxNebulaParticles) {
            for (let i = this.nebulaParticles.length; i < this.maxNebulaParticles; i++) {
                this.nebulaParticles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 1,
                    vy: (Math.random() - 0.5) * 1,
                    size: 1.5 + Math.random() * 2,
                    hue: Math.random() * 360,
                    life: 1
                });
            }
        }
        
        // Apply boids/flocking behavior
        this.applyBoidsBehavior(this.nebulaParticles, metadata);
        
        // Update particles with audio influence
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude || 0.1;
        
        // Batch render for performance
        this.ctx.save();
        this.removeBloom(); // Disable bloom for performance
        
        for (let i = 0; i < this.nebulaParticles.length; i++) {
            const p = this.nebulaParticles[i];
            
            // Audio-influenced motion
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Swirling motion from audio
            if (dist > 10) {
                const angle = Math.atan2(dy, dx);
                const swirlStrength = amplitude * 0.2;
                p.vx += Math.cos(angle + Math.PI / 2) * swirlStrength;
                p.vy += Math.sin(angle + Math.PI / 2) * swirlStrength;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Boundary wrap
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;
            
            // Friction
            p.vx *= 0.95;
            p.vy *= 0.95;
            
            // Color shift
            p.hue = (p.hue + amplitude * 1.5) % 360;
            
            // Render particle (only if visible)
            if (p.x >= -50 && p.x <= this.width + 50 && p.y >= -50 && p.y <= this.height + 50) {
                const freqIndex = Math.floor((dist / Math.max(this.width, this.height)) * bufferLength) % bufferLength;
                const energy = frequencyData[freqIndex] / 255;
                const color = this.getDynamicColor(metadata, { x: p.x, y: p.y }, energy);
                const particleSize = this.clampRadius(p.size * (1 + energy * 0.5), 0.5);
                
                this.ctx.fillStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${0.5 + energy * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }

    /**
     * 6. Mathematical Spiral Wave (Enhanced)
     * Fibonacci, Archimedean, and Lissajous curves - Screen filling
     */
    renderMathematicalSpiral(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const maxRadius = Math.max(this.width, this.height) * 0.6; // Fill more screen
        
        // Select spiral type based on spectral centroid
        const spiralType = Math.floor((metadata.spectralCentroid / 1500) % 3);
        const points = 500;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < points; i++) {
            const t = i / points;
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const wave = (timeData[freqIndex] / 128.0 - 1) * 30;
            
            let angle, radius;
            
            if (spiralType === 0) {
                // Fibonacci spiral (golden angle)
                const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                angle = t * Math.PI * 10 + this.time * 2;
                radius = Math.sqrt(t) * maxRadius;
            } else if (spiralType === 1) {
                // Archimedean spiral
                angle = t * Math.PI * 8 + this.time * 2.5;
                radius = t * maxRadius;
            } else {
                // Lissajous curve
                const a = 3 + Math.floor(energy * 3);
                const b = 2 + Math.floor(energy * 2);
                angle = t * Math.PI * 2;
                radius = maxRadius * 0.7;
                const lissX = Math.cos(a * angle + this.time * 2) * radius;
                const lissY = Math.sin(b * angle + this.time * 2) * radius;
                
                const x = centerX + lissX;
                const y = centerY + lissY;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
                continue;
            }
            
            // Spiral expands/contracts with rhythm
            const rhythmPulse = metadata.rhythm?.beat ? 1.2 : 1.0;
            const finalRadius = this.clampRadius(radius * rhythmPulse + wave * energy);
            
            const x = centerX + Math.cos(angle) * finalRadius;
            const y = centerY + Math.sin(angle) * finalRadius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        const color = this.getDynamicColor(metadata, { x: centerX, y: centerY }, metadata.amplitude);
        this.applyBloom();
        this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.9)`;
        this.ctx.lineWidth = 3 + metadata.amplitude * 5;
        this.ctx.stroke();
        this.removeBloom();
    }

    /**
     * 7. Spectrum Circle Halo
     * Multi-layer frequency ring with liquid glass refraction - Screen filling
     */
    renderSpectrumCircleHalo(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const layers = 10; // More layers
        const maxRadius = Math.max(this.width, this.height) * 0.55; // Fill more screen
        
        for (let layer = 0; layer < layers; layer++) {
            const t = layer / layers;
            const baseRadius = t * maxRadius;
            
            // Outer halo pulses with brightness
            const brightnessPulse = metadata.amplitude * 30;
            const radius = baseRadius + brightnessPulse;
            
            // Inner ring distorts like liquid glass
            const distortion = Math.sin(t * Math.PI * 10 + this.time * 3) * 15 * metadata.amplitude;
            const finalRadius = this.clampRadius(radius + distortion);
            
            // Frequency-based color
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const color = this.getDynamicColor(metadata, { x: centerX, y: centerY }, energy);
            
            // Draw halo ring - only if radius is valid
            if (finalRadius > 1) {
                // Reduced bloom for performance
                this.ctx.shadowBlur = 8;
                this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness + brightnessPulse}%, ${0.5 + energy * 0.5})`;
                this.ctx.lineWidth = 2 + energy * 4;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
            
            // Draw frequency points around ring
            const points = 64;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const pointFreqIndex = Math.floor((i / points) * bufferLength);
                const pointEnergy = frequencyData[pointFreqIndex] / 255;
                
                const pointX = centerX + Math.cos(angle) * finalRadius;
                const pointY = centerY + Math.sin(angle) * finalRadius;
                
                const pointSize = this.clampRadius(2 + pointEnergy * 8);
                if (pointSize > 0.1) {
                    this.ctx.fillStyle = `hsla(${color.hue + i * 5}, ${color.saturation}%, ${color.lightness + 20}%, ${0.7 + pointEnergy * 0.3})`;
                    this.ctx.beginPath();
                    this.ctx.arc(pointX, pointY, pointSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            this.removeBloom();
        }
    }

    /**
     * 8. Fractal Bloom Visualizer
     * Fractal tree or Mandelbrot evolution that grows with frequency bands - Screen filling
     */
    renderFractalBloom(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Growth controlled by frequency bands
        const bassEnergy = metadata.energyBands?.bass || 0;
        const midEnergy = metadata.energyBands?.mid || 0;
        const highEnergy = metadata.energyBands?.brilliance || 0;
        
        this.fractalGrowth += (bassEnergy + midEnergy + highEnergy) * 0.01;
        this.fractalDepth = Math.floor(3 + this.fractalGrowth % 3);
        
        const maxSize = Math.max(this.width, this.height) * 0.6; // Fill more screen
        const baseSize = maxSize * (0.4 + bassEnergy * 0.5); // More responsive
        
        // Draw fractal tree
        const drawBranch = (x, y, angle, length, depth, energy) => {
            if (depth > this.fractalDepth || length < 2) return;
            
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;
            
            // Color based on depth and energy
            const color = this.getDynamicColor(metadata, { x: endX, y: endY }, energy);
            const alpha = 0.3 + (depth / this.fractalDepth) * 0.7;
            
            this.applyBloom();
            this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${alpha})`;
            this.ctx.lineWidth = 3 - depth * 0.4;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            this.removeBloom();
            
            // Recursive branches
            const branchAngle = Math.PI / 6;
            const branchLength = length * 0.7;
            const leftEnergy = frequencyData[Math.floor((depth / this.fractalDepth) * bufferLength)] / 255;
            const rightEnergy = frequencyData[Math.floor(((depth + 1) / this.fractalDepth) * bufferLength)] / 255;
            
            drawBranch(endX, endY, angle - branchAngle, branchLength, depth + 1, leftEnergy);
            drawBranch(endX, endY, angle + branchAngle, branchLength, depth + 1, rightEnergy);
            
            // Bloom effect at tips
            if (depth === this.fractalDepth) {
                const tipSize = this.clampRadius(5 + energy * 10);
                if (tipSize > 0.1) {
                    this.ctx.fillStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness + 30}%, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(endX, endY, tipSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        };
        
        const baseEnergy = metadata.amplitude;
        const startAngle = -Math.PI / 2 + Math.sin(this.time) * 0.3;
        drawBranch(centerX, centerY + maxSize * 0.3, startAngle, baseSize, 0, baseEnergy);
    }

    /**
     * 9. 3D Geometry Shapeshifter
     * Morphs between tetrahedron, cube, sphere, and torus - Screen filling
     */
    render3DGeometryShapeshifter(audioData, metadata) {
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const size = Math.max(this.width, this.height) * 0.4; // Larger, more screen-filling
        
        // Morph on beats
        if (metadata.rhythm?.beat) {
            this.currentShape = (this.currentShape + 1) % 4;
            this.geometryMorphProgress = 0;
            this.lastBeatTime = Date.now();
        }
        
        // Smooth morphing
        this.geometryMorphProgress = Math.min(1, this.geometryMorphProgress + 0.02);
        
        // Surface ripple based on spectral centroid
        const ripple = Math.sin(this.time * 3 + metadata.spectralCentroid / 100) * metadata.amplitude * 20;
        
        // Define shape vertices
        const shapes = {
            0: [ // Tetrahedron
                { x: 0, y: -size, z: 0 },
                { x: size * 0.8, y: size * 0.6, z: 0 },
                { x: -size * 0.8, y: size * 0.6, z: 0 },
                { x: 0, y: 0, z: size * 0.8 }
            ],
            1: [ // Cube
                { x: -size, y: -size, z: -size },
                { x: size, y: -size, z: -size },
                { x: size, y: size, z: -size },
                { x: -size, y: size, z: -size },
                { x: -size, y: -size, z: size },
                { x: size, y: -size, z: size },
                { x: size, y: size, z: size },
                { x: -size, y: size, z: size }
            ],
            2: [], // Sphere (generated procedurally)
            3: []  // Torus (generated procedurally)
        };
        
        // Generate sphere vertices
        if (shapes[2].length === 0) {
            const segments = 20;
            for (let i = 0; i <= segments; i++) {
                const lat = (i / segments) * Math.PI;
                for (let j = 0; j <= segments; j++) {
                    const lon = (j / segments) * Math.PI * 2;
                    shapes[2].push({
                        x: size * Math.sin(lat) * Math.cos(lon),
                        y: size * Math.sin(lat) * Math.sin(lon),
                        z: size * Math.cos(lat)
                    });
                }
            }
        }
        
        // Generate torus vertices
        if (shapes[3].length === 0) {
            const segments = 20;
            const tubeRadius = size * 0.3;
            const radius = size * 0.7;
            for (let i = 0; i <= segments; i++) {
                const u = (i / segments) * Math.PI * 2;
                for (let j = 0; j <= segments; j++) {
                    const v = (j / segments) * Math.PI * 2;
                    shapes[3].push({
                        x: (radius + tubeRadius * Math.cos(v)) * Math.cos(u),
                        y: (radius + tubeRadius * Math.cos(v)) * Math.sin(u),
                        z: tubeRadius * Math.sin(v)
                    });
                }
            }
        }
        
        // Get current and next shape
        const currentShapeVerts = shapes[this.currentShape];
        const nextShapeVerts = shapes[(this.currentShape + 1) % 4];
        
        // Interpolate between shapes
        const vertices = currentShapeVerts.map((v, i) => {
            const next = nextShapeVerts[i] || nextShapeVerts[i % nextShapeVerts.length];
            return {
                x: v.x + (next.x - v.x) * this.geometryMorphProgress,
                y: v.y + (next.y - v.y) * this.geometryMorphProgress,
                z: v.z + (next.z - v.z) * this.geometryMorphProgress
            };
        });
        
        // Apply rotation and ripple
        const rotationX = this.time * 0.5;
        const rotationY = this.time * 0.7;
        
        const projected = vertices.map(v => {
            // Rotate
            let x = v.x;
            let y = v.y * Math.cos(rotationX) - v.z * Math.sin(rotationX);
            let z = v.y * Math.sin(rotationX) + v.z * Math.cos(rotationX);
            
            let x2 = x * Math.cos(rotationY) - z * Math.sin(rotationY);
            let y2 = y;
            let z2 = x * Math.sin(rotationY) + z * Math.cos(rotationY);
            
            // Apply ripple
            const dist = Math.sqrt(x2 * x2 + y2 * y2);
            const rippleFactor = 1 + (ripple / size) * Math.sin(dist * 0.1);
            x2 *= rippleFactor;
            y2 *= rippleFactor;
            
            // Project to 2D
            const scale = 1 / (1 + z2 * 0.001);
            return {
                x: centerX + x2 * scale,
                y: centerY + y2 * scale,
                z: z2
            };
        });
        
        // Render edges
        const color = this.getDynamicColor(metadata, { x: centerX, y: centerY }, metadata.amplitude);
        this.applyBloom();
        this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.8)`;
        this.ctx.lineWidth = 2 + metadata.amplitude * 3;
        
        // Draw shape-specific connections
        if (this.currentShape === 0 || this.currentShape === 1) {
            // Tetrahedron or cube - draw all edges
            for (let i = 0; i < projected.length; i++) {
                for (let j = i + 1; j < projected.length; j++) {
                    const dist = Math.sqrt(
                        Math.pow(projected[i].x - projected[j].x, 2) +
                        Math.pow(projected[i].y - projected[j].y, 2)
                    );
                    if (dist < size * 2) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(projected[i].x, projected[i].y);
                        this.ctx.lineTo(projected[j].x, projected[j].y);
                        this.ctx.stroke();
                    }
                }
            }
        } else {
            // Sphere or torus - draw surface
            const segments = 20;
            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < segments; j++) {
                    const idx = i * (segments + 1) + j;
                    if (idx < projected.length - 1) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(projected[idx].x, projected[idx].y);
                        if (j < segments) {
                            this.ctx.lineTo(projected[idx + 1].x, projected[idx + 1].y);
                        }
                        if (i < segments && idx + segments + 1 < projected.length) {
                            this.ctx.lineTo(projected[idx + segments + 1].x, projected[idx + segments + 1].y);
                        }
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        // Draw vertices
        for (const p of projected) {
            const vertexSize = this.clampRadius(3 + metadata.amplitude * 5);
            if (vertexSize > 0.1) {
                this.ctx.fillStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness + 20}%, 0.9)`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, vertexSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.removeBloom();
    }

    /**
     * Render a specific visualizer - Optimized
     */
    render(type, audioData, metadata) {
        this.time += 0.016;
        
        // Ensure metadata has defaults to prevent errors
        if (!metadata) {
            metadata = {
                amplitude: 0.1,
                spectralCentroid: 1000,
                energyBands: { bass: 0, mid: 0, brilliance: 0 },
                rhythm: { beat: false }
            };
        }
        
        // Update beat tracking
        if (metadata.rhythm?.beat) {
            this.lastBeatTime = Date.now();
        }
        
        // Clear with fade - optimized
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Ensure audioData has defaults
        if (!audioData) {
            // Create dummy audio data for testing
            const bufferLength = 256;
            audioData = {
                frequencyData: new Uint8Array(bufferLength).fill(128),
                timeData: new Uint8Array(bufferLength).fill(128),
                bufferLength: bufferLength,
                sampleRate: 44100
            };
        }
        
        switch (type) {
            case 'appleWaveform':
                this.renderAppleWaveform(audioData, metadata);
                break;
            case 'circularHarmonic':
                this.renderCircularHarmonic(audioData, metadata);
                break;
            case 'frequencyBarGalaxy':
                this.renderFrequencyBarGalaxy(audioData, metadata);
                break;
            case 'enhancedTunnel':
                this.renderEnhancedTunnel(audioData, metadata);
                break;
            case 'particleNebula':
                this.renderParticleNebula(audioData, metadata);
                break;
            case 'mathematicalSpiral':
                this.renderMathematicalSpiral(audioData, metadata);
                break;
            case 'spectrumCircleHalo':
                this.renderSpectrumCircleHalo(audioData, metadata);
                break;
            case 'fractalBloom':
                this.renderFractalBloom(audioData, metadata);
                break;
            case '3DGeometryShapeshifter':
                this.render3DGeometryShapeshifter(audioData, metadata);
                break;
        }
    }
}

