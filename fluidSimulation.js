/**
 * WebGL2 Fluid Simulation Engine
 * SPH (Smoothed Particle Hydrodynamics) with Newtonian physics
 * GPU-accelerated for high performance
 */

export class FluidSimulation {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: true
        });

        if (!this.gl) {
            console.error('WebGL2 not supported');
            return;
        }

        // Simulation parameters
        this.config = {
            particleCount: options.particleCount || 2000,
            smoothingRadius: options.smoothingRadius || 30,
            restDensity: options.restDensity || 1.0,
            stiffness: options.stiffness || 50.0,
            viscosity: options.viscosity || 0.1,
            surfaceTension: options.surfaceTension || 0.5,
            gravity: options.gravity || 0.5,
            maxVelocity: options.maxVelocity || 10.0,
            boundaryDamping: options.boundaryDamping || 0.3,
            ...options
        };

        this.width = canvas.width;
        this.height = canvas.height;
        this.time = 0;

        // Particle data
        this.particles = [];
        this.velocities = [];
        this.densities = [];
        this.pressures = [];
        this.colors = [];

        // Audio reactivity
        this.audioEnergy = 0;
        this.bassEnergy = 0;
        this.beatIntensity = 0;

        // Initialize WebGL resources
        this.initShaders();
        this.initBuffers();
        this.initParticles();

        // Metaball rendering
        this.metaballThreshold = 0.5;
        this.metaballScale = 1.5;
    }

    initShaders() {
        const gl = this.gl;

        // Vertex shader for particle rendering
        const vertexShaderSource = `#version 300 es
            precision highp float;
            
            in vec2 a_position;
            in vec2 a_velocity;
            in float a_density;
            in vec4 a_color;
            
            uniform vec2 u_resolution;
            uniform float u_pointSize;
            uniform float u_time;
            uniform float u_audioEnergy;
            
            out vec4 v_color;
            out float v_density;
            out vec2 v_velocity;
            
            void main() {
                vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
                clipSpace.y *= -1.0;
                
                gl_Position = vec4(clipSpace, 0.0, 1.0);
                
                // Dynamic point size based on density and audio
                float sizeMultiplier = 1.0 + a_density * 0.5 + u_audioEnergy * 0.3;
                gl_PointSize = u_pointSize * sizeMultiplier;
                
                v_color = a_color;
                v_density = a_density;
                v_velocity = a_velocity;
            }
        `;

        // Fragment shader for metaball-like rendering
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            in vec4 v_color;
            in float v_density;
            in vec2 v_velocity;
            
            uniform float u_time;
            uniform float u_audioEnergy;
            uniform float u_bassEnergy;
            
            out vec4 fragColor;
            
            void main() {
                // Create smooth circular particles
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                
                // Metaball-like falloff
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 1.5);
                
                // Velocity-based color shift
                float speed = length(v_velocity) * 0.1;
                
                // Audio-reactive color enhancement
                vec3 color = v_color.rgb;
                color += vec3(u_bassEnergy * 0.3, u_audioEnergy * 0.2, speed * 0.5);
                
                // Add glow at edges
                float glow = smoothstep(0.3, 0.5, dist) * (1.0 - smoothstep(0.5, 0.6, dist));
                color += glow * vec3(0.5, 0.8, 1.0) * u_audioEnergy;
                
                // Density-based brightness
                float brightness = 0.8 + v_density * 0.4;
                color *= brightness;
                
                if (alpha < 0.01) discard;
                
                fragColor = vec4(color, alpha * v_color.a);
            }
        `;

        // Compile shaders
        this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            return;
        }

        // Get attribute and uniform locations
        this.attribs = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            velocity: gl.getAttribLocation(this.program, 'a_velocity'),
            density: gl.getAttribLocation(this.program, 'a_density'),
            color: gl.getAttribLocation(this.program, 'a_color')
        };

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            pointSize: gl.getUniformLocation(this.program, 'u_pointSize'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            audioEnergy: gl.getUniformLocation(this.program, 'u_audioEnergy'),
            bassEnergy: gl.getUniformLocation(this.program, 'u_bassEnergy')
        };

        // Metaball post-processing shader
        this.initMetaballShader();
    }

    initMetaballShader() {
        const gl = this.gl;

        // Full-screen quad vertex shader
        const metaballVertexSource = `#version 300 es
            precision highp float;
            
            in vec2 a_position;
            out vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = (a_position + 1.0) * 0.5;
            }
        `;

        // Metaball fragment shader - creates liquid metal effect
        const metaballFragmentSource = `#version 300 es
            precision highp float;
            
            in vec2 v_texCoord;
            uniform sampler2D u_particleTexture;
            uniform float u_threshold;
            uniform float u_time;
            uniform float u_audioEnergy;
            uniform float u_bassEnergy;
            uniform vec2 u_resolution;
            
            out vec4 fragColor;
            
            // Metallic color palette
            vec3 metallicColor(float t, float energy) {
                // Chrome-like iridescent colors
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.0 + energy * 0.3, 0.33 + energy * 0.2, 0.67);
                
                return a + b * cos(6.28318 * (c * t + d));
            }
            
            void main() {
                vec4 particle = texture(u_particleTexture, v_texCoord);
                float density = particle.a;
                
                // Threshold for metaball effect
                if (density < u_threshold) {
                    // Background - subtle gradient
                    vec2 uv = v_texCoord;
                    float bg = 0.02 + 0.01 * sin(u_time * 0.5 + uv.x * 3.0);
                    fragColor = vec4(vec3(bg * 0.5, bg * 0.3, bg), 1.0);
                    return;
                }
                
                // Calculate normal from density gradient
                float dx = dFdx(density);
                float dy = dFdy(density);
                vec3 normal = normalize(vec3(-dx * 50.0, -dy * 50.0, 1.0));
                
                // Fresnel effect for metallic look
                float fresnel = pow(1.0 - abs(normal.z), 3.0);
                
                // Environment reflection (simulated)
                float envAngle = atan(normal.y, normal.x) + u_time * 0.5;
                float envReflection = 0.5 + 0.5 * sin(envAngle * 4.0);
                
                // Base metallic color
                vec3 baseColor = metallicColor(density + u_time * 0.1, u_audioEnergy);
                
                // Add fresnel highlights
                vec3 fresnelColor = vec3(1.0, 0.9, 0.8) * fresnel;
                
                // Add environment reflection
                vec3 reflectionColor = metallicColor(envReflection + density, u_bassEnergy) * 0.5;
                
                // Combine
                vec3 finalColor = baseColor * 0.6 + fresnelColor * 0.3 + reflectionColor * 0.4;
                
                // Add specular highlight
                float specular = pow(max(0.0, normal.z), 20.0) * (0.5 + u_audioEnergy * 0.5);
                finalColor += vec3(specular);
                
                // Edge glow
                float edge = smoothstep(u_threshold, u_threshold + 0.1, density);
                float edgeGlow = (1.0 - edge) * 0.5;
                finalColor += vec3(0.3, 0.6, 1.0) * edgeGlow * (1.0 + u_bassEnergy);
                
                fragColor = vec4(finalColor, 1.0);
            }
        `;

        this.metaballVertexShader = this.compileShader(gl.VERTEX_SHADER, metaballVertexSource);
        this.metaballFragmentShader = this.compileShader(gl.FRAGMENT_SHADER, metaballFragmentSource);

        this.metaballProgram = gl.createProgram();
        gl.attachShader(this.metaballProgram, this.metaballVertexShader);
        gl.attachShader(this.metaballProgram, this.metaballFragmentShader);
        gl.linkProgram(this.metaballProgram);

        if (!gl.getProgramParameter(this.metaballProgram, gl.LINK_STATUS)) {
            console.error('Metaball program link error:', gl.getProgramInfoLog(this.metaballProgram));
        }

        this.metaballAttribs = {
            position: gl.getAttribLocation(this.metaballProgram, 'a_position')
        };

        this.metaballUniforms = {
            particleTexture: gl.getUniformLocation(this.metaballProgram, 'u_particleTexture'),
            threshold: gl.getUniformLocation(this.metaballProgram, 'u_threshold'),
            time: gl.getUniformLocation(this.metaballProgram, 'u_time'),
            audioEnergy: gl.getUniformLocation(this.metaballProgram, 'u_audioEnergy'),
            bassEnergy: gl.getUniformLocation(this.metaballProgram, 'u_bassEnergy'),
            resolution: gl.getUniformLocation(this.metaballProgram, 'u_resolution')
        };

        // Create framebuffer for particle rendering
        this.createFramebuffer();

        // Create full-screen quad
        this.createQuad();
    }

    createFramebuffer() {
        const gl = this.gl;

        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

        this.particleTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, this.width, this.height, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.particleTexture, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    createQuad() {
        const gl = this.gl;

        const quadVertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    initBuffers() {
        const gl = this.gl;

        this.positionBuffer = gl.createBuffer();
        this.velocityBuffer = gl.createBuffer();
        this.densityBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();

        // VAO for efficient rendering
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

        // Velocity attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.enableVertexAttribArray(this.attribs.velocity);
        gl.vertexAttribPointer(this.attribs.velocity, 2, gl.FLOAT, false, 0, 0);

        // Density attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.densityBuffer);
        gl.enableVertexAttribArray(this.attribs.density);
        gl.vertexAttribPointer(this.attribs.density, 1, gl.FLOAT, false, 0, 0);

        // Color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.attribs.color);
        gl.vertexAttribPointer(this.attribs.color, 4, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    initParticles() {
        const count = this.config.particleCount;

        // Initialize particles in clusters (like orbs)
        const clusterCount = 5;
        const particlesPerCluster = Math.floor(count / clusterCount);

        for (let c = 0; c < clusterCount; c++) {
            const centerX = Math.random() * this.width;
            const centerY = Math.random() * this.height;
            const clusterRadius = 50 + Math.random() * 100;

            for (let i = 0; i < particlesPerCluster; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * clusterRadius;

                this.particles.push(
                    centerX + Math.cos(angle) * radius,
                    centerY + Math.sin(angle) * radius
                );

                this.velocities.push(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                );

                this.densities.push(1.0);

                // Random hue for each cluster
                const hue = (c / clusterCount) + Math.random() * 0.1;
                const [r, g, b] = this.hslToRgb(hue, 0.8, 0.6);
                this.colors.push(r, g, b, 1.0);
            }
        }

        this.updateBuffers();
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [r, g, b];
    }

    updateBuffers() {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.particles), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.velocities), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.densityBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.densities), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    }

    /**
     * SPH Kernel functions
     */
    poly6Kernel(r, h) {
        if (r >= h) return 0;
        const coeff = 315 / (64 * Math.PI * Math.pow(h, 9));
        return coeff * Math.pow(h * h - r * r, 3);
    }

    spikyGradient(r, h, dx, dy) {
        if (r >= h || r < 0.0001) return { x: 0, y: 0 };
        const coeff = -45 / (Math.PI * Math.pow(h, 6));
        const factor = coeff * Math.pow(h - r, 2) / r;
        return { x: factor * dx, y: factor * dy };
    }

    viscosityLaplacian(r, h) {
        if (r >= h) return 0;
        const coeff = 45 / (Math.PI * Math.pow(h, 6));
        return coeff * (h - r);
    }

    /**
     * Update fluid simulation
     */
    update(deltaTime, audioMetadata = null) {
        const dt = Math.min(deltaTime, 0.016); // Cap at 60fps
        this.time += dt;

        // Update audio reactivity
        if (audioMetadata) {
            this.audioEnergy = audioMetadata.amplitude || 0;
            this.bassEnergy = audioMetadata.energyBands?.bass || 0;
            this.beatIntensity = audioMetadata.rhythm?.beat ? 1.0 : this.beatIntensity * 0.9;
        }

        const h = this.config.smoothingRadius;
        const restDensity = this.config.restDensity;
        const stiffness = this.config.stiffness;
        const viscosity = this.config.viscosity;
        const gravity = this.config.gravity * (1 + this.bassEnergy * 2);
        const particleCount = this.particles.length / 2;

        // Audio-reactive forces
        const audioForceScale = 1 + this.audioEnergy * 3;
        const beatPulse = this.beatIntensity * 10;

        // Spatial hashing for neighbor search (optimization)
        const cellSize = h;
        const grid = new Map();

        for (let i = 0; i < particleCount; i++) {
            const px = this.particles[i * 2];
            const py = this.particles[i * 2 + 1];
            const cellX = Math.floor(px / cellSize);
            const cellY = Math.floor(py / cellSize);
            const key = `${cellX},${cellY}`;

            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(i);
        }

        // Calculate densities
        for (let i = 0; i < particleCount; i++) {
            const px = this.particles[i * 2];
            const py = this.particles[i * 2 + 1];
            const cellX = Math.floor(px / cellSize);
            const cellY = Math.floor(py / cellSize);

            let density = 0;

            // Check neighboring cells
            for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
                for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
                    const key = `${cx},${cy}`;
                    const neighbors = grid.get(key);
                    if (!neighbors) continue;

                    for (const j of neighbors) {
                        const dx = px - this.particles[j * 2];
                        const dy = py - this.particles[j * 2 + 1];
                        const r = Math.sqrt(dx * dx + dy * dy);
                        density += this.poly6Kernel(r, h);
                    }
                }
            }

            this.densities[i] = density;
            this.pressures[i] = stiffness * (density - restDensity);
        }

        // Calculate forces and update velocities
        for (let i = 0; i < particleCount; i++) {
            const px = this.particles[i * 2];
            const py = this.particles[i * 2 + 1];
            const cellX = Math.floor(px / cellSize);
            const cellY = Math.floor(py / cellSize);

            let fx = 0, fy = gravity;

            // Check neighboring cells
            for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
                for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
                    const key = `${cx},${cy}`;
                    const neighbors = grid.get(key);
                    if (!neighbors) continue;

                    for (const j of neighbors) {
                        if (i === j) continue;

                        const dx = px - this.particles[j * 2];
                        const dy = py - this.particles[j * 2 + 1];
                        const r = Math.sqrt(dx * dx + dy * dy);

                        if (r >= h || r < 0.0001) continue;

                        // Pressure force
                        const pressureForce = -(this.pressures[i] + this.pressures[j]) / (2 * this.densities[j] + 0.001);
                        const gradient = this.spikyGradient(r, h, dx, dy);
                        fx += pressureForce * gradient.x;
                        fy += pressureForce * gradient.y;

                        // Viscosity force
                        const viscLaplacian = this.viscosityLaplacian(r, h);
                        const dvx = this.velocities[j * 2] - this.velocities[i * 2];
                        const dvy = this.velocities[j * 2 + 1] - this.velocities[i * 2 + 1];
                        fx += viscosity * dvx * viscLaplacian / (this.densities[j] + 0.001);
                        fy += viscosity * dvy * viscLaplacian / (this.densities[j] + 0.001);

                        // Surface tension (cohesion)
                        const cohesion = this.config.surfaceTension * this.poly6Kernel(r, h);
                        fx -= cohesion * dx / (r + 0.001);
                        fy -= cohesion * dy / (r + 0.001);
                    }
                }
            }

            // Audio-reactive center attraction on beat
            if (this.beatIntensity > 0.5) {
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const toCenterX = centerX - px;
                const toCenterY = centerY - py;
                const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
                fx += (toCenterX / distToCenter) * beatPulse * (Math.random() - 0.3);
                fy += (toCenterY / distToCenter) * beatPulse * (Math.random() - 0.3);
            }

            // Apply forces
            this.velocities[i * 2] += fx * dt * audioForceScale;
            this.velocities[i * 2 + 1] += fy * dt * audioForceScale;

            // Velocity limit
            const speed = Math.sqrt(
                this.velocities[i * 2] ** 2 +
                this.velocities[i * 2 + 1] ** 2
            );
            if (speed > this.config.maxVelocity) {
                const scale = this.config.maxVelocity / speed;
                this.velocities[i * 2] *= scale;
                this.velocities[i * 2 + 1] *= scale;
            }
        }

        // Update positions
        for (let i = 0; i < particleCount; i++) {
            this.particles[i * 2] += this.velocities[i * 2] * dt * 60;
            this.particles[i * 2 + 1] += this.velocities[i * 2 + 1] * dt * 60;

            // Boundary collisions
            const damping = this.config.boundaryDamping;

            if (this.particles[i * 2] < 0) {
                this.particles[i * 2] = 0;
                this.velocities[i * 2] *= -damping;
            }
            if (this.particles[i * 2] > this.width) {
                this.particles[i * 2] = this.width;
                this.velocities[i * 2] *= -damping;
            }
            if (this.particles[i * 2 + 1] < 0) {
                this.particles[i * 2 + 1] = 0;
                this.velocities[i * 2 + 1] *= -damping;
            }
            if (this.particles[i * 2 + 1] > this.height) {
                this.particles[i * 2 + 1] = this.height;
                this.velocities[i * 2 + 1] *= -damping;
            }

            // Audio-reactive color updates
            const hue = (this.time * 0.1 + this.audioEnergy + i * 0.001) % 1;
            const [r, g, b] = this.hslToRgb(hue, 0.8, 0.5 + this.audioEnergy * 0.3);
            this.colors[i * 4] = r;
            this.colors[i * 4 + 1] = g;
            this.colors[i * 4 + 2] = b;
        }

        this.updateBuffers();
    }

    /**
     * Add particles at a position (e.g., on beat)
     */
    addParticles(x, y, count, velocity = { x: 0, y: 0 }, hue = null) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;

            this.particles.push(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20
            );

            this.velocities.push(
                velocity.x + Math.cos(angle) * speed,
                velocity.y + Math.sin(angle) * speed
            );

            this.densities.push(1.0);

            const h = hue !== null ? hue : Math.random();
            const [r, g, b] = this.hslToRgb(h, 0.9, 0.6);
            this.colors.push(r, g, b, 1.0);
        }

        // Limit total particles
        const maxParticles = this.config.particleCount * 1.5;
        while (this.particles.length / 2 > maxParticles) {
            this.particles.splice(0, 2);
            this.velocities.splice(0, 2);
            this.densities.splice(0, 1);
            this.colors.splice(0, 4);
        }
    }

    /**
     * Apply explosion force from a point
     */
    applyExplosion(x, y, force, radius) {
        const particleCount = this.particles.length / 2;

        for (let i = 0; i < particleCount; i++) {
            const px = this.particles[i * 2];
            const py = this.particles[i * 2 + 1];
            const dx = px - x;
            const dy = py - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius && dist > 0) {
                const strength = force * (1 - dist / radius);
                this.velocities[i * 2] += (dx / dist) * strength;
                this.velocities[i * 2 + 1] += (dy / dist) * strength;
            }
        }
    }

    /**
     * Render the fluid
     */
    render() {
        const gl = this.gl;

        // First pass: render particles to texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        gl.uniform2f(this.uniforms.resolution, this.width, this.height);
        gl.uniform1f(this.uniforms.pointSize, this.config.smoothingRadius * this.metaballScale);
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.audioEnergy, this.audioEnergy);
        gl.uniform1f(this.uniforms.bassEnergy, this.bassEnergy);

        gl.drawArrays(gl.POINTS, 0, this.particles.length / 2);

        gl.bindVertexArray(null);

        // Second pass: metaball post-processing
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.metaballProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
        gl.uniform1i(this.metaballUniforms.particleTexture, 0);

        gl.uniform1f(this.metaballUniforms.threshold, this.metaballThreshold);
        gl.uniform1f(this.metaballUniforms.time, this.time);
        gl.uniform1f(this.metaballUniforms.audioEnergy, this.audioEnergy);
        gl.uniform1f(this.metaballUniforms.bassEnergy, this.bassEnergy);
        gl.uniform2f(this.metaballUniforms.resolution, this.width, this.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(this.metaballAttribs.position);
        gl.vertexAttribPointer(this.metaballAttribs.position, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disable(gl.BLEND);
    }

    /**
     * Resize handler
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;

        // Recreate framebuffer with new size
        this.createFramebuffer();
    }

    /**
     * Get particle data for CPU-based rendering (fallback)
     */
    getParticleData() {
        const count = this.particles.length / 2;
        const data = [];

        for (let i = 0; i < count; i++) {
            data.push({
                x: this.particles[i * 2],
                y: this.particles[i * 2 + 1],
                vx: this.velocities[i * 2],
                vy: this.velocities[i * 2 + 1],
                density: this.densities[i],
                color: {
                    r: this.colors[i * 4],
                    g: this.colors[i * 4 + 1],
                    b: this.colors[i * 4 + 2],
                    a: this.colors[i * 4 + 3]
                }
            });
        }

        return data;
    }
}
