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
        
        // Spectrum Halo rotation and particles
        this.spectrumHaloRotation = 0;
        this.spectrumHaloParticles = [];
        this.spectrumHaloBubbles = [];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        // Reset transform to avoid cumulative scaling when resize fires
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        const amplitude = (metadata.amplitude || 0.1) * this.height * 0.5;
        const beatIntensity = metadata.rhythm?.beat ? 2 : 0.5;
        
        // Calculate waveform points
        const waveformPoints = [];
        const sliceWidth = this.width / bufferLength;
        const upperPoints = [];
        const lowerPoints = [];
        
        // Draw upper wave
        this.ctx.beginPath();
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
        const lowerStart = this.ctx.currentPath?.length || 0;
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
        
        // Draw outline
        this.ctx.strokeStyle = `hsla(${color1.hue}, ${color1.saturation}%, ${color1.lightness + 20}%, 0.9)`;
        this.ctx.lineWidth = 3 + metadata.amplitude * 5;
        this.ctx.stroke();
        this.removeBloom();
        
        // Update and render bouncing particles
        this.updateWaveformParticles(upperPoints, lowerPoints, centerY, metadata, audioData);
        this.renderWaveformParticles(metadata);
    }
    
    /**
     * Update waveform particles - they bounce dynamically around entire screen
     */
    updateWaveformParticles(upperPoints, lowerPoints, centerY, metadata, audioData) {
        const { timeData, frequencyData, bufferLength } = audioData;
        const amplitude = (metadata.amplitude || 0.1) * this.height * 0.5;
        const beatIntensity = metadata.rhythm?.beat ? 1.5 : 0.1;
        const gravity = 0.3; // Stronger gravity
        const friction = 0.96;
        
        // Spawn particles from waveform peaks
        for (let i = 0; i < bufferLength; i += Math.max(3, Math.floor(bufferLength / 100))) {
            const v = timeData[i] / 128.0;
            const peakHeight = Math.abs(v * amplitude);
            
            // Spawn more particles on peaks
            if (peakHeight > amplitude * 0.2 && this.waveformParticles.length < this.maxWaveformParticles && Math.random() < 0.15 + beatIntensity * 0.2) {
                const x = (i / bufferLength) * this.width;
                const isUpper = v < 0;
                const y = isUpper ? centerY - peakHeight : centerY + peakHeight;
                const energy = frequencyData[i] / 255;
                
                // Launch with much more varied velocity
                const launchAngle = Math.random() * Math.PI * 2;
                const launchForce = 3 + energy * 6 + beatIntensity * 4;
                
                this.waveformParticles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(launchAngle) * launchForce, // Circular launch
                    vy: Math.sin(launchAngle) * launchForce - (isUpper ? 2 : -2), // Bias
                    size: 2 + energy * 6,
                    hue: (metadata.spectralCentroid / 20 + i * 1.5) % 360,
                    energy: energy,
                    life: 1,
                    bounceCount: 0,
                    maxBounces: 20 + Math.floor(energy * 10),
                    trailX: [x],
                    trailY: [y]
                });
            }
        }
        
        // Update existing particles with physics-based movement
        for (let i = this.waveformParticles.length - 1; i >= 0; i--) {
            const p = this.waveformParticles[i];
            
            // Apply gravity
            p.vy += gravity;
            
            // Apply friction
            p.vx *= friction;
            p.vy *= friction;
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Track trail
            if (p.trailX.length > 15) {
                p.trailX.shift();
                p.trailY.shift();
            }
            p.trailX.push(p.x);
            p.trailY.push(p.y);
            
            // Boundary bounce (essential for lively movement)
            let bounced = false;
            
            if (p.x < 0) {
                p.x = 0;
                p.vx *= -0.9;
                bounced = true;
            }
            if (p.x > this.width) {
                p.x = this.width;
                p.vx *= -0.9;
                bounced = true;
            }
            if (p.y < 0) {
                p.y = 0;
                p.vy *= -0.85;
                bounced = true;
            }
            if (p.y > this.height) {
                p.y = this.height;
                p.vy *= -0.85;
                bounced = true;
            }
            
            if (bounced) {
                p.bounceCount++;
            }
            
            // Remove particles that bounced too much
            if (p.bounceCount > p.maxBounces) {
                this.waveformParticles.splice(i, 1);
            }
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
        const maxRadius = Math.min(this.width, this.height) * 0.45;
        
        const amplitude = metadata.amplitude || 0.1;
        const bassEnergy = metadata.energyBands?.bass || 0;
        const midEnergy = metadata.energyBands?.mid || 0;
        const trebleEnergy = metadata.energyBands?.brilliance || 0;
        const beat = metadata.rhythm?.beat || false;
        
        // Initialize state
        if (!this.circularState) {
            this.circularState = { rotation: 0, particles: [] };
        }
        
        // Rotation based on frequencies
        this.circularState.rotation += midEnergy * 2 + bassEnergy * 1 + (beat ? 10 : 0);
        
        // Draw multiple concentric rings with psychedelic warping
        const ringCount = 30 + Math.floor(amplitude * 20);
        
        for (let ring = 0; ring < ringCount; ring++) {
            const t = ring / ringCount;
            const baseRadius = t * maxRadius;
            
            // Get audio data for this ring
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const timeWave = (timeData[freqIndex] / 128.0) * amplitude * 50;
            
            // Psychedelic warping based on multiple factors
            const warp1 = Math.sin(t * Math.PI * 6 + this.time * 2) * bassEnergy * 40;
            const warp2 = Math.sin(t * Math.PI * 15 + this.time * 3) * trebleEnergy * 30;
            const warp3 = Math.cos(t * Math.PI * 8 + this.circularState.rotation * 0.01) * midEnergy * 35;
            
            const radius = this.clampRadius(baseRadius + warp1 + warp2 + warp3 + timeWave);
            
            if (radius > 1) {
                // Color shifts through spectrum
                const hue = (t * 360 + this.time * 30 + this.circularState.rotation * 0.2) % 360;
                const saturation = 60 + energy * 40 + beat ? 20 : 0;
                const lightness = 50 + energy * 30;
                
                // Draw ring with varying thickness
                const lineWidth = 2 + energy * 8 + (beat ? 3 : 0);
                
                this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.5 + energy * 0.5})`;
                this.ctx.lineWidth = lineWidth;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Draw segments with glow
                const segments = 64;
                for (let seg = 0; seg < segments; seg++) {
                    const angle = (seg / segments) * Math.PI * 2 + this.circularState.rotation * 0.02;
                    const segFreqIndex = Math.floor((seg / segments) * bufferLength);
                    const segEnergy = frequencyData[segFreqIndex] / 255;
                    
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    
                    const dotSize = 1.5 + segEnergy * 4;
                    const segHue = (hue + seg * (360 / segments)) % 360;
                    
                    this.ctx.shadowBlur = 8 + segEnergy * 12;
                    this.ctx.shadowColor = `hsla(${segHue}, 100%, 60%, 0.8)`;
                    this.ctx.fillStyle = `hsla(${segHue}, 100%, 70%, ${0.7 + segEnergy * 0.3})`;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        // Draw radiating lines from center (like spokes)
        const spokeCount = 24;
        for (let spoke = 0; spoke < spokeCount; spoke++) {
            const spokeAngle = (spoke / spokeCount) * Math.PI * 2 + this.circularState.rotation * 0.05;
            const freqIndex = Math.floor((spoke / spokeCount) * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            
            const endRadius = maxRadius * (0.7 + energy * 0.3);
            const endX = centerX + Math.cos(spokeAngle) * endRadius;
            const endY = centerY + Math.sin(spokeAngle) * endRadius;
            
            const hue = (spoke * (360 / spokeCount) + this.time * 20) % 360;
            const alpha = 0.2 + energy * 0.5;
            
            this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            this.ctx.lineWidth = 1 + energy * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
        
        // Emit particles from center on beat
        if (beat && this.circularState.particles.length < 100) {
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                this.circularState.particles.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    hue: Math.random() * 360,
                    size: 2 + Math.random() * 4
                });
            }
        }
        
        // Update and render particles
        this.ctx.shadowBlur = 0;
        for (let i = this.circularState.particles.length - 1; i >= 0; i--) {
            const p = this.circularState.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.015;
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            if (p.life <= 0 || Math.hypot(p.x - centerX, p.y - centerY) > maxRadius) {
                this.circularState.particles.splice(i, 1);
            } else {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, 0.8)`;
                this.ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.shadowBlur = 0;
    }

    /**
     * 3. Frequency Bar Galaxy - Psychedelic 3D
     * Immersive frequency visualization with 3D positioning
     */
    renderFrequencyBarGalaxy(audioData, metadata) {
        const { frequencyData, bufferLength, timeData } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude || 0.1;
        const bassEnergy = metadata.energyBands?.bass || 0;
        const midEnergy = metadata.energyBands?.mid || 0;
        const beat = metadata.rhythm?.beat || false;
        
        // Initialize state
        if (!this.galaxyState) {
            this.galaxyState = { rotation: 0, mode: 0 };
        }
        
        // Rotate based on frequencies
        this.galaxyState.rotation += midEnergy * 1.5 + (beat ? 10 : 0);
        
        // Switch modes on beat
        if (beat) {
            this.galaxyState.mode = (this.galaxyState.mode + 1) % 3;
        }
        
        const barCount = 128;
        const maxRadius = Math.min(this.width, this.height) * 0.4;
        
        // Create 3D bars radiating from center
        const bars = [];
        
        for (let i = 0; i < barCount; i++) {
            const t = i / barCount;
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const timeWave = (timeData[freqIndex] / 128.0) * amplitude * 50;
            
            let x, y, z;
            const angle = (i / barCount) * Math.PI * 2 + this.galaxyState.rotation * 0.02;
            
            if (this.galaxyState.mode === 0) {
                // Spiral mode - bars radiate outward in spiral
                const radius = Math.max(20, t * maxRadius);
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                z = energy * 100 + timeWave;
            } else if (this.galaxyState.mode === 1) {
                // Helix mode - bars spiral upward
                const radius = maxRadius * 0.6;
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                z = (t - 0.5) * 200 + energy * 100 + timeWave;
            } else {
                // Wave mode - bars pulse in waves
                const radius = maxRadius * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(angle * 3)));
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;
                z = energy * 150 + Math.sin(this.time * 2 + angle) * 50;
            }
            
            bars.push({ x, y, z, energy, angle, freqIndex });
        }
        
        // Sort by z-depth for proper rendering (painter's algorithm)
        bars.sort((a, b) => a.z - b.z);
        
        // Render bars
        for (const bar of bars) {
            const scale = 1 / (1 + bar.z * 0.01);
            const screenX = centerX + (bar.x - centerX) * scale;
            const screenY = centerY + (bar.y - centerY) * scale;
            
            const barHeight = bar.energy * maxRadius * scale;
            const barWidth = 4 + bar.energy * 8;
            
            // Color based on frequency
            const hue = (bar.angle * 180 / Math.PI + this.time * 20) % 360;
            const saturation = 70 + bar.energy * 30;
            const lightness = 40 + bar.energy * 40;
            
            // Glow intensity based on depth and energy
            const glowAmount = (1 - scale) * 20 + bar.energy * 15;
            
            // Draw bar with glow
            this.ctx.shadowBlur = glowAmount;
            this.ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`;
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.8 + bar.energy * 0.2})`;
            
            // Draw vertical bar
            this.ctx.fillRect(screenX - barWidth / 2, screenY - barHeight, barWidth, barHeight);
            
            // Draw glow cap at top
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY - barHeight, barWidth * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.shadowBlur = 0;
    }

    /**
     * 4. Enhanced Tunnel Mode
     * Infinite tunnel with depth-mapped lights and smooth zoom
     */
    renderEnhancedTunnel(audioData, metadata) {
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const rings = 80; // More rings for smooth tunnel
        const segments = 128; // More segments for detail
        
        // Initialize tunnel state
        if (!this.tunnelState) {
            this.tunnelState = { innerRadius: 50, rotation: 0 };
        }
        
        // Beat detection for massive zoom effect
        const beatZoom = metadata.rhythm?.beat ? 1.5 : 0;
        const bassEnergy = metadata.energyBands?.bass || 0;
        const midEnergy = metadata.energyBands?.mid || 0;
        const amplitude = metadata.amplitude || 0.1;
        
        // Smooth zoom towards center - approaching the singularity
        this.tunnelState.innerRadius += (amplitude * 10 + beatZoom * 50 + bassEnergy * 30) - this.tunnelState.innerRadius * 0.1;
        
        // Rotation based on mid and high frequencies
        const rotationSpeed = (midEnergy * 3 + amplitude * 1) * 0.02;
        this.tunnelState.rotation += rotationSpeed;
        
        // Create rings that SPIRAL from center outward (psychedelic effect)
        for (let ring = 0; ring < rings; ring++) {
            // Ring depth from center (0 = center, 1 = far away)
            const ringProgress = ring / rings;
            
            // Ring radiates from very small center outward
            const ringRadius = Math.max(10, this.tunnelState.innerRadius + ringProgress * Math.min(this.width, this.height) * 0.4);
            
            // Get frequency data for this ring's depth
            const freqIndex = Math.floor(ringProgress * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            const timeWave = (timeData[freqIndex] / 128.0) * amplitude * 100;
            
            // Brightness decreases towards center (depth effect)
            const depthBrightness = ringProgress * 0.6 + 0.4;
            
            // Color shifts through spectrum as rings approach center
            const hueShift = (ringProgress * 360 - this.time * 50 + this.tunnelState.rotation * 200) % 360;
            
            // Draw segments of this ring
            for (let seg = 0; seg < segments; seg++) {
                const angle = (seg / segments) * Math.PI * 2 + this.tunnelState.rotation * 0.02;
                const segFreqIndex = Math.floor((seg / segments) * bufferLength);
                const segEnergy = frequencyData[segFreqIndex] / 255;
                
                const x = centerX + Math.cos(angle) * ringRadius;
                const y = centerY + Math.sin(angle) * ringRadius;
                
                const size = 2 + segEnergy * 8;
                const segHue = (hue + seg * (360 / segments)) % 360;
                
                this.ctx.shadowBlur = 8 + segEnergy * 12;
                this.ctx.shadowColor = `hsla(${segHue}, 100%, 60%, 0.8)`;
                this.ctx.fillStyle = `hsla(${segHue}, 100%, 70%, ${0.7 + segEnergy * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw concentric rings at center for psychedelic effect
        const centerRings = 20;
        for (let i = 0; i < centerRings; i++) {
            const ringR = (this.tunnelState.innerRadius * (i / centerRings)) * 0.9;
            const ringHue = (i * 18 + this.time * 30) % 360;
            
            this.ctx.strokeStyle = `hsla(${ringHue}, 100%, 60%, ${0.5 * (1 - i / centerRings)})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ringR, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
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
        const { frequencyData, timeData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude || 0.1;
        const beat = metadata.rhythm?.beat || false;
        const beatIntensity = beat ? 1.0 : 0.3;
        
        // Increase max particles for more impressive nebula
        this.maxNebulaParticles = Math.min(600, 300 + amplitude * 300);
        
        // Initialize particles with enhanced spread
        if (this.nebulaParticles.length < this.maxNebulaParticles) {
            const particlesToAdd = Math.min(20, this.maxNebulaParticles - this.nebulaParticles.length);
            for (let i = 0; i < particlesToAdd; i++) {
                // Spawn particles more dynamically based on audio
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 200;
                this.nebulaParticles.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3,
                    size: 2 + Math.random() * 5, // Bigger particles
                    hue: Math.random() * 360,
                    life: 1,
                    maxLife: 1,
                    originalSize: 2 + Math.random() * 5,
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }
        }
        
        // Apply boids/flocking behavior with enhanced strength
        this.applyBoidsBehavior(this.nebulaParticles, metadata);
        
        // Batch render with bloom for flashy effect
        this.ctx.save();
        this.applyBloom();
        
        for (let i = 0; i < this.nebulaParticles.length; i++) {
            const p = this.nebulaParticles[i];
            
            // Audio-influenced swirling motion - MUCH stronger based on music
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                const angle = Math.atan2(dy, dx);
                // Much stronger swirl based on amplitude and beat
                const swirlStrength = amplitude * 1.5 + (beat ? 2 : 0.5);
                p.vx += Math.cos(angle + Math.PI / 2 + this.time * 0.05) * swirlStrength;
                p.vy += Math.sin(angle + Math.PI / 2 + this.time * 0.05) * swirlStrength;
                
                // Radial pulsing from center based on bass energy
                const bassEnergy = (metadata.energyBands?.bass || 0);
                const radialForce = bassEnergy * 2;
                p.vx += (dx / dist) * radialForce;
                p.vy += (dy / dist) * radialForce;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Boundary wrap with margin
            if (p.x < -50) p.x = this.width + 50;
            if (p.x > this.width + 50) p.x = -50;
            if (p.y < -50) p.y = this.height + 50;
            if (p.y > this.height + 50) p.y = -50;
            
            // Reduced friction for more energetic movement
            p.vx *= 0.92;
            p.vy *= 0.92;
            
            // Limit max speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 8) {
                p.vx = (p.vx / speed) * 8;
                p.vy = (p.vy / speed) * 8;
            }
            
            // Dynamic color shift synced to music
            p.hue = (p.hue + amplitude * 3 + beatIntensity * 10) % 360;
            
            // Pulsing size based on beat
            p.pulsePhase += 0.1;
            const pulseFactor = 1 + Math.sin(p.pulsePhase) * 0.3 + (beat ? 0.5 : 0);
            
            // Render particle with enhanced brightness
            if (p.x >= -100 && p.x <= this.width + 100 && p.y >= -100 && p.y <= this.height + 100) {
                const freqIndex = Math.floor((Math.abs(Math.atan2(p.y - centerY, p.x - centerX)) / Math.PI) * bufferLength) % bufferLength;
                const energy = frequencyData[freqIndex] / 255;
                const color = this.getDynamicColor(metadata, { x: p.x, y: p.y }, energy);
                const particleSize = this.clampRadius(p.size * pulseFactor * (1 + energy * 1.2), 1);
                
                // MUCH brighter - higher lightness, higher opacity
                const opacity = Math.min(1, 0.7 + energy * 0.8 + beatIntensity * 0.3);
                this.ctx.fillStyle = `hsla(${color.hue}, ${Math.min(100, color.saturation + 20)}%, ${Math.min(100, color.lightness + 20)}%, ${opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add glow effect for extra flashiness
                if (energy > 0.5 || beat) {
                    this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, 100%, ${opacity * 0.6})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.restore();
        this.time += 0.016;
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
        const { frequencyData, bufferLength, timeData } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude || 0.1;
        const beat = metadata.rhythm?.beat || false;
        const bassEnergy = (metadata.energyBands?.bass || 0);
        const midEnergy = (metadata.energyBands?.mid || 0);
        const trebleEnergy = (metadata.energyBands?.brilliance || 0);
        
        // Initialize state
        if (!this.haloState) {
            this.haloState = {
                rotation: 0,
                zoom: 1,
                particles: [],
                orbs: [],
                spirals: []
            };
        }
        
        // Zoom based on bass
        this.haloState.zoom += (bassEnergy * 0.3 - this.haloState.zoom * 0.05);
        this.haloState.zoom = Math.max(0.5, Math.min(2, this.haloState.zoom));
        
        // Rotation from mid frequencies
        this.haloState.rotation += midEnergy * 2 + (beat ? 15 : 0);
        
        const maxRadius = Math.min(this.width, this.height) * 0.4 * this.haloState.zoom;
        
        this.ctx.save();
        
        // Draw artistic kaleidoscopic rings
        const ringCount = 25 + Math.floor(trebleEnergy * 20);
        
        for (let ring = 0; ring < ringCount; ring++) {
            const t = ring / ringCount;
            const ringRadius = t * maxRadius;
            
            // Frequency data for this ring
            const freqIndex = Math.floor(t * bufferLength);
            const energy = frequencyData[freqIndex] / 255;
            
            // Color from spectrum
            const hue = (t * 360 + this.haloState.rotation * 0.5 + this.time * 30) % 360;
            const saturation = 60 + energy * 40 + (beat ? 20 : 0);
            const lightness = 45 + energy * 35;
            
            // Ring distortion based on audio
            const waveDistortion = Math.sin(ringRadius * 0.01 + this.time * 2) * amplitude * 30;
            const bassDistortion = Math.sin(t * Math.PI * 5 + bassEnergy * Math.PI * 2) * bassEnergy * 40;
            const finalRadius = this.clampRadius(ringRadius + waveDistortion + bassDistortion);
            
            if (finalRadius > 1) {
                // Glowing ring
                this.ctx.shadowBlur = 12 + energy * 20;
                this.ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`;
                this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + energy * 0.4})`;
                this.ctx.lineWidth = 2 + energy * 5 + (beat ? 3 : 0);
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Add gradient wave effect
                const segmentCount = 64;
                for (let seg = 0; seg < segmentCount; seg++) {
                    const angle = (seg / segmentCount) * Math.PI * 2 + this.haloState.rotation * 0.02;
                    const nextAngle = ((seg + 1) / segmentCount) * Math.PI * 2 + this.haloState.rotation * 0.02;
                    
                    const x1 = centerX + Math.cos(angle) * finalRadius;
                    const y1 = centerY + Math.sin(angle) * finalRadius;
                    const x2 = centerX + Math.cos(nextAngle) * finalRadius;
                    const y2 = centerY + Math.sin(nextAngle) * finalRadius;
                    
                    const segHue = (hue + seg * (360 / segmentCount)) % 360;
                    const alpha = 0.3 + energy * 0.4;
                    
                    this.ctx.strokeStyle = `hsla(${segHue}, ${saturation}%, ${lightness}%, ${alpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
            }
        }
        
        // Create artistic spiral arms
        const spiralArms = 5 + Math.floor(midEnergy * 3);
        for (let arm = 0; arm < spiralArms; arm++) {
            const armAngle = (arm / spiralArms) * Math.PI * 2 + this.haloState.rotation * 0.03;
            const armFreqIndex = Math.floor((arm / spiralArms) * bufferLength);
            const armEnergy = frequencyData[armFreqIndex] / 255;
            
            // Draw spiral arm as flowing ribbon
            for (let step = 0; step < 50; step++) {
                const t = step / 50;
                const spiralRadius = t * maxRadius * 1.2;
                const spiralAngle = armAngle + t * Math.PI * 4 + this.time * 0.5;
                
                const x = centerX + Math.cos(spiralAngle) * spiralRadius;
                const y = centerY + Math.sin(spiralAngle) * spiralRadius;
                
                const hue = (360 * arm / spiralArms + t * 60 + this.time * 20) % 360;
                const alpha = (1 - t) * armEnergy * 0.6;
                
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
                this.ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2 + armEnergy * 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Beat-triggered orb explosion
        if (beat && this.haloState.orbs.length < 60) {
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 5;
                const hueOffset = Math.random() * 60;
                
                this.haloState.orbs.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    hue: (this.haloState.rotation * 0.5 + hueOffset) % 360,
                    size: 3 + Math.random() * 5,
                    trail: []
                });
            }
        }
        
        // Update and render orbs
        for (let i = this.haloState.orbs.length - 1; i >= 0; i--) {
            const orb = this.haloState.orbs[i];
            
            orb.x += orb.vx;
            orb.y += orb.vy;
            orb.vx *= 0.98;
            orb.vy *= 0.98;
            orb.life -= 0.02;
            
            // Distance from center
            const dist = Math.hypot(orb.x - centerX, orb.y - centerY);
            
            if (orb.life <= 0 || dist > maxRadius * 1.5) {
                this.haloState.orbs.splice(i, 1);
            } else {
                // Draw orb with trail
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = `hsla(${orb.hue}, 100%, 60%, 0.8)`;
                this.ctx.fillStyle = `hsla(${orb.hue}, 100%, 70%, ${orb.life})`;
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw glow sphere
                this.ctx.strokeStyle = `hsla(${orb.hue}, 100%, 80%, ${orb.life * 0.5})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, orb.size * 2, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Draw center singularity
        const singularitySize = 10 + bassEnergy * 30 + (beat ? 20 : 0);
        this.ctx.shadowBlur = 30 + singularitySize;
        this.ctx.shadowColor = 'hsla(200, 100%, 60%, 0.9)';
        
        // Multiple concentric glows
        for (let i = 3; i > 0; i--) {
            const glowSize = singularitySize * (i / 3);
            const glowAlpha = 0.4 * (i / 3);
            this.ctx.fillStyle = `hsla(200, 100%, 60%, ${glowAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Center bright dot
        this.ctx.fillStyle = 'hsla(200, 100%, 90%, 0.9)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, singularitySize * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    /**
     * Update and render spectrum halo particles (smoke-like emission from bubbles)
     */
    updateAndRenderSpectrumHaloParticles(metadata, audioData) {
        const amplitude = metadata.amplitude || 0.1;
        const gravity = 0.5; // Gravity pulls particles upward slightly
        const friction = 0.93;
        
        this.ctx.save();
        
        for (let i = this.spectrumHaloParticles.length - 1; i >= 0; i--) {
            const p = this.spectrumHaloParticles[i];
            
            // Apply upward drift (smoke effect) and gravity
            p.vy -= gravity * 0.3; // Upward drift
            p.vx *= friction;
            p.vy *= friction;
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Life decay
            p.life -= 0.02;
            
            // Fade out
            const alpha = Math.max(0, p.life) * (0.7 + p.energy * 0.3);
            
            // Expand slightly as it travels (smoke dispersion)
            const expandFactor = 1 + (1 - p.life) * 2;
            
            // Render particle with smoke effect
            if (alpha > 0.01 && p.x > -100 && p.x < this.width + 100 && p.y > -100 && p.y < this.height + 100) {
                const particleSize = this.clampRadius(p.size * expandFactor, 0.5);
                
                // Smoke color with slight hue shift
                const hueShift = (1 - p.life) * 30;
                this.ctx.fillStyle = `hsla(${(p.hue + hueShift) % 360}, ${p.color.saturation * 0.7}%, ${p.color.lightness + (1 - p.life) * 20}%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Remove dead particles
            if (p.life <= 0 || p.x < -150 || p.x > this.width + 150 || p.y < -150 || p.y > this.height + 150) {
                this.spectrumHaloParticles.splice(i, 1);
            }
        }
        
        this.ctx.restore();
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
        if (type === 'hinduGodPsychedelic') {
            console.log('[PremiumVisualizers] Rendering hinduGodPsychedelic', { audioData, metadata });
        } else {
            // Uncomment for general debug: console.log('[PremiumVisualizers] Rendering', type);
        }
        
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
            case 'hinduGodPsychedelic':
                this.renderHinduGodPsychedelic(audioData, metadata);
                break;
        }
    }

    /**
     * Hindu God Psychedelic Visualizer
     * Shiva outline with multiple heads + spinning color planes
     */
    renderHinduGodPsychedelic(audioData, metadata) {
        console.log('[PremiumVisualizers] renderHinduGodPsychedelic CALLED', { audioData, metadata });
        const { frequencyData, bufferLength } = audioData;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const amplitude = metadata.amplitude || 0.1;
        const beat = metadata.rhythm?.beat || false;
        const bassEnergy = (metadata.energyBands?.bass || 0);
        const midEnergy = (metadata.energyBands?.mid || 0);

        this.ctx.save();

        // Draw psychedelic, melting, flowing background
        this.renderPsychedelicMeltingBackground(centerX, centerY, amplitude, bassEnergy, midEnergy, beat);

        // Draw Shiva outline (vector path, always on top)
        this.renderShivaOutlineVector(centerX, centerY, amplitude, midEnergy, beat);

        // Draw glowing aura
        this.renderPsychedelicAuraOptimized(centerX, centerY, amplitude, beat);

        this.ctx.restore();
        this.time += 0.016;
    }

    renderPsychedelicMeltingBackground(centerX, centerY, amplitude, bassEnergy, midEnergy, beat) {
        const w = this.width, h = this.height;
        const imageData = this.ctx.createImageData(w, h);
        const t = this.time * 0.7 + amplitude * 2;
        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                // Plasma/flow field: trippy, melting, music-reactive
                const nx = x / w - 0.5, ny = y / h - 0.5;
                const r = 0.5 + 0.5 * Math.sin(10 * nx + t + Math.sin(ny * 6 + t * 0.7));
                const g = 0.5 + 0.5 * Math.sin(10 * ny - t + Math.cos(nx * 6 - t * 0.5));
                const b = 0.5 + 0.5 * Math.sin(8 * (nx + ny) + t * 1.2 + amplitude * 3);
                const melt = Math.sin(t + nx * 8 + ny * 8 + amplitude * 10) * 0.5 + 0.5;
                const R = Math.floor(180 + 75 * r + 60 * melt * amplitude);
                const G = Math.floor(120 + 100 * g + 80 * amplitude * (1 - melt));
                const B = Math.floor(200 + 55 * b + 80 * melt * amplitude);
                const idx = (y * w + x) * 4;
                imageData.data[idx] = R;
                imageData.data[idx + 1] = G;
                imageData.data[idx + 2] = B;
                imageData.data[idx + 3] = 255;
            }
        }
        this.ctx.putImageData(imageData, 0, 0);

        // Trippy grid/floor (music-reactive)
        const gridRows = 16, gridCols = 20;
        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                const gx = w * (j / (gridCols - 1));
                const gy = h * 0.7 + (i / (gridRows - 1)) * h * 0.3;
                const phase = t * 2 + i * 0.3 + j * 0.2;
                const yOffset = Math.sin(phase + amplitude * 5) * 12 * (1 + amplitude);
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(gx, gy + yOffset, 2.5 + amplitude * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${(phase * 40 + amplitude * 200) % 360}, 90%, 60%, 0.7)`;
                this.ctx.shadowColor = `hsla(${(phase * 40 + amplitude * 200) % 360}, 100%, 80%, 0.5)`;
                this.ctx.shadowBlur = 8 + amplitude * 8;
                this.ctx.fill();
                this.ctx.restore();
            }
        }
    }

    renderShivaOutlineVector(centerX, centerY, amplitude, midEnergy, beat) {
        const scale = Math.min(this.width, this.height) * 0.38 + amplitude * 30;
        this.ctx.save();
        this.ctx.translate(centerX, centerY + scale * 0.08);
        this.ctx.scale(scale / 400, scale / 400);
        this.ctx.lineWidth = 4 + amplitude * 2;
        this.ctx.strokeStyle = `rgba(255,255,255,0.93)`;
        this.ctx.shadowColor = `hsla(${(this.time * 60) % 360}, 100%, 80%, 0.7)`;
        this.ctx.shadowBlur = 18 + amplitude * 10;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 120);
        this.ctx.bezierCurveTo(-60, 180, -120, 220, -110, 320);
        this.ctx.bezierCurveTo(-90, 370, 90, 370, 110, 320);
        this.ctx.bezierCurveTo(120, 220, 60, 180, 0, 120);
        this.ctx.moveTo(-110, 200);
        this.ctx.bezierCurveTo(-180, 180, -180, 80, -80, 60);
        this.ctx.moveTo(110, 200);
        this.ctx.bezierCurveTo(180, 180, 180, 80, 80, 60);
        this.ctx.moveTo(0, 120);
        this.ctx.bezierCurveTo(-20, 80, -20, 40, 0, 20);
        this.ctx.bezierCurveTo(20, 40, 20, 80, 0, 120);
        this.ctx.moveTo(-140, 60);
        this.ctx.lineTo(-140, -120);
        this.ctx.moveTo(-140, -120);
        this.ctx.lineTo(-150, -140);
        this.ctx.moveTo(-140, -120);
        this.ctx.lineTo(-130, -140);
        this.ctx.moveTo(-120, 320);
        this.ctx.lineTo(-160, 350);
        this.ctx.lineTo(-120, 380);
        this.ctx.lineTo(-80, 350);
        this.ctx.lineTo(-120, 320);
        this.ctx.moveTo(-10, 40);
        this.ctx.lineTo(-5, 50);
        this.ctx.moveTo(10, 40);
        this.ctx.lineTo(5, 50);
        this.ctx.moveTo(0, 55);
        this.ctx.lineTo(0, 65);
        for (let i = 0; i < 3; i++) {
            this.ctx.moveTo(-30 + i * 10, 90 + i * 10);
            this.ctx.bezierCurveTo(-20 + i * 10, 110 + i * 10, 20 - i * 10, 110 + i * 10, 30 - i * 10, 90 + i * 10);
        }
        this.ctx.moveTo(-20, 30);
        this.ctx.lineTo(-40, 50);
        this.ctx.moveTo(20, 30);
        this.ctx.lineTo(40, 50);
        this.ctx.moveTo(120, 320);
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const r1 = 20 + amplitude * 6;
            const r2 = 35 + amplitude * 10;
            this.ctx.lineTo(120 + Math.cos(angle) * r2, 320 + Math.sin(angle) * r2);
            this.ctx.lineTo(120 + Math.cos(angle + Math.PI / 8) * r1, 320 + Math.sin(angle + Math.PI / 8) * r1);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderPsychedelicPlanesOptimized(centerX, centerY, amplitude, bassEnergy, midEnergy, beat) {
        const planeCount = 6; // Reduced from 12 for performance
        const maxRadius = Math.min(this.width, this.height) * 0.6;
        
        for (let plane = 0; plane < planeCount; plane++) {
            const t = plane / planeCount;
            const baseRadius = (t * maxRadius) + bassEnergy * 50;
            
            // Rotation driven by mid frequencies
            const baseRotation = this.time * (1 + midEnergy * 3);
            const planeRotation = baseRotation + (plane / planeCount) * Math.PI * 2;
            
            // Color from spectrum
            const hue = (planeRotation * 180 / Math.PI + t * 360 + this.time * 50) % 360;
            const saturation = 80 + bassEnergy * 20;
            const lightness = 40 + amplitude * 30 + (beat ? 20 : 0);
            
            // Draw plane as rotated rectangle/diamond - SIMPLIFIED
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(planeRotation);
            
            const planeSize = baseRadius * 0.8;
            
            // Draw single gradient fill (no stroke for speed)
            const gradient = this.ctx.createLinearGradient(-planeSize, 0, planeSize, 0);
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);
            gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`);
            gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-planeSize, -planeSize * 0.3, planeSize * 2, planeSize * 0.6);
            
            this.ctx.restore();
        }
    }

    renderShivaOutlineOptimized(centerX, centerY, amplitude, midEnergy, beat) {
        // Stylized Shiva outline: left/right split, music-reactive gradients, morphing, and aura
        const scale = 90 + amplitude * 60 + (beat ? 30 : 0);
        const split = 0.5 + 0.2 * Math.sin(this.time * 1.2 + amplitude * 2) + amplitude * 0.3;
        const morph = Math.sin(this.time * 2 + midEnergy * 5) * 0.15 * (0.5 + amplitude);
        const leftColor = this.ctx.createLinearGradient(centerX - scale, centerY - scale, centerX, centerY + scale);
        leftColor.addColorStop(0, `#2e1a47`);
        leftColor.addColorStop(1, `#2ef7e1`);
        const rightColor = this.ctx.createLinearGradient(centerX, centerY - scale, centerX + scale, centerY + scale);
        rightColor.addColorStop(0, `#f7e12e`);
        rightColor.addColorStop(1, `#e12ef7`);

        // Draw left half
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - scale * 1.1);
        this.ctx.bezierCurveTo(
            centerX - scale * (0.7 + morph), centerY - scale * 0.8,
            centerX - scale * (0.8 + morph), centerY + scale * 0.7,
            centerX, centerY + scale * 1.1
        );
        this.ctx.lineTo(centerX, centerY);
        this.ctx.closePath();
        this.ctx.fillStyle = leftColor;
        this.ctx.globalAlpha = 0.85;
        this.ctx.fill();
        this.ctx.restore();

        // Draw right half
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - scale * 1.1);
        this.ctx.bezierCurveTo(
            centerX + scale * (0.7 + morph), centerY - scale * 0.8,
            centerX + scale * (0.8 + morph), centerY + scale * 0.7,
            centerX, centerY + scale * 1.1
        );
        this.ctx.lineTo(centerX, centerY);
        this.ctx.closePath();
        this.ctx.fillStyle = rightColor;
        this.ctx.globalAlpha = 0.85;
        this.ctx.fill();
        this.ctx.restore();

        // Central face line
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - scale * 1.1);
        this.ctx.lineTo(centerX, centerY + scale * 1.1);
        this.ctx.strokeStyle = `rgba(255,255,255,0.5)`;
        this.ctx.lineWidth = 2 + amplitude * 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Heads: morph and shift with music
        const headY = centerY - scale * (0.95 + morph * 0.2);
        const headRadius = scale * (0.28 + 0.08 * amplitude);
        for (let i = -1; i <= 1; i++) {
            const xShift = i * scale * (0.38 + 0.12 * amplitude * split);
            const hue = (this.time * 60 + i * 60 + amplitude * 120) % 360;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(centerX + xShift, headY, headRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.95)`;
            this.ctx.lineWidth = 4 + amplitude * 2;
            this.ctx.shadowColor = `hsla(${hue}, 100%, 80%, 0.7)`;
            this.ctx.shadowBlur = 16 + amplitude * 10;
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Eyes and tilak (center head)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX - headRadius * 0.3, headY - headRadius * 0.1, headRadius * 0.13, 0, Math.PI * 2);
        this.ctx.arc(centerX + headRadius * 0.3, headY - headRadius * 0.1, headRadius * 0.13, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255,255,255,0.85)`;
        this.ctx.fill();
        // Tilak
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - headRadius * 0.15, headY + headRadius * 0.18);
        this.ctx.lineTo(centerX + headRadius * 0.15, headY + headRadius * 0.18);
        this.ctx.strokeStyle = `rgba(255,255,255,0.7)`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Trident (Trishul) - left, music-reactive
        this.ctx.save();
        const trishulX = centerX - scale * 0.85;
        const trishulY = centerY - scale * 0.2;
        this.ctx.beginPath();
        this.ctx.moveTo(trishulX, trishulY);
        this.ctx.lineTo(trishulX, trishulY - scale * (0.7 + 0.2 * amplitude));
        for (let i = -1; i <= 1; i++) {
            this.ctx.moveTo(trishulX, trishulY - scale * (0.7 + 0.2 * amplitude));
            this.ctx.lineTo(trishulX + i * scale * 0.13, trishulY - scale * (0.95 + 0.2 * amplitude));
        }
        this.ctx.strokeStyle = `rgba(255,255,255,0.7)`;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = `rgba(0,255,255,0.3)`;
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
        this.ctx.restore();

        // Lotus (right hand) - right, music-reactive
        this.ctx.save();
        const lotusX = centerX + scale * 0.85;
        const lotusY = centerY + scale * 0.25;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const r1 = scale * 0.13 + amplitude * scale * 0.07;
            const r2 = scale * 0.22 + amplitude * scale * 0.09;
            this.ctx.lineTo(
                lotusX + Math.cos(angle) * r2,
                lotusY + Math.sin(angle) * r2
            );
            this.ctx.lineTo(
                lotusX + Math.cos(angle + Math.PI / 8) * r1,
                lotusY + Math.sin(angle + Math.PI / 8) * r1
            );
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = `rgba(255,255,255,0.7)`;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = `rgba(255,0,255,0.3)`;
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderPsychedelicAuraOptimized(centerX, centerY, amplitude, beat) {
        const time = this.time;
        const auraLayers = 4; // Reduced from 8 for performance
        
        for (let layer = 0; layer < auraLayers; layer++) {
            const t = layer / auraLayers;
            const baseRadius = 180 + t * 100;
            const wobbleAmount = Math.sin(time * (1 + t * 2)) * (20 + amplitude * 40);
            const radius = baseRadius + wobbleAmount;
            
            const hue = (time * 60 + t * 360 + (beat ? 45 : 0)) % 360;
            const saturation = 80;
            const lightness = 50 + amplitude * 30;
            const alpha = (1 - t) * (0.3 + amplitude * 0.4);
            
            this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            this.ctx.lineWidth = 2 + t * 3 + amplitude; // Reduced line widths
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
}

