/**
 * Metallic Renderer Module
 * WebGL2-based chrome/metallic rendering with environment reflections,
 * Fresnel effects, and iridescent color shifting
 */

export class MetallicRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: true
        });

        if (!this.gl) {
            console.error('WebGL2 not supported for MetallicRenderer');
            return;
        }

        this.config = {
            reflectionStrength: options.reflectionStrength || 0.6,
            fresnelPower: options.fresnelPower || 3.0,
            specularPower: options.specularPower || 32.0,
            iridescenceStrength: options.iridescenceStrength || 0.4,
            roughness: options.roughness || 0.2,
            metalness: options.metalness || 0.9,
            envMapIntensity: options.envMapIntensity || 1.0,
            ...options
        };

        this.width = canvas.width;
        this.height = canvas.height;
        this.time = 0;

        // Audio reactivity
        this.audioEnergy = 0;
        this.bassEnergy = 0;
        this.midEnergy = 0;
        this.trebleEnergy = 0;
        this.beatIntensity = 0;

        // Sphere data for orbs
        this.orbs = [];
        this.maxOrbs = 20;

        this.initShaders();
        this.initBuffers();
        this.initEnvironmentMap();
        this.initOrbs();
    }

    initShaders() {
        const gl = this.gl;

        // Vertex shader for metallic spheres
        const vertexShaderSource = `#version 300 es
            precision highp float;
            
            in vec3 a_position;
            in vec3 a_normal;
            in vec2 a_texCoord;
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform float u_time;
            uniform float u_audioEnergy;
            uniform float u_bassEnergy;
            
            out vec3 v_position;
            out vec3 v_normal;
            out vec3 v_worldPosition;
            out vec2 v_texCoord;
            out float v_audioEnergy;
            
            void main() {
                vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
                
                // Audio-reactive vertex displacement
                float displacement = sin(a_position.x * 10.0 + u_time * 2.0) * 
                                    sin(a_position.y * 10.0 + u_time * 1.5) * 
                                    u_bassEnergy * 0.1;
                worldPosition.xyz += a_normal * displacement;
                
                v_worldPosition = worldPosition.xyz;
                v_position = (u_viewMatrix * worldPosition).xyz;
                v_normal = mat3(u_modelMatrix) * a_normal;
                v_texCoord = a_texCoord;
                v_audioEnergy = u_audioEnergy;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
            }
        `;

        // Fragment shader for metallic/chrome effect
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            in vec3 v_position;
            in vec3 v_normal;
            in vec3 v_worldPosition;
            in vec2 v_texCoord;
            in float v_audioEnergy;
            
            uniform vec3 u_cameraPosition;
            uniform float u_time;
            uniform float u_audioEnergy;
            uniform float u_bassEnergy;
            uniform float u_midEnergy;
            uniform float u_trebleEnergy;
            uniform float u_beatIntensity;
            uniform float u_reflectionStrength;
            uniform float u_fresnelPower;
            uniform float u_specularPower;
            uniform float u_iridescenceStrength;
            uniform float u_roughness;
            uniform float u_metalness;
            uniform sampler2D u_envMap;
            uniform vec3 u_baseColor;
            uniform float u_orbIndex;
            
            out vec4 fragColor;
            
            // Iridescent color based on viewing angle
            vec3 iridescence(float cosTheta, float strength) {
                vec3 thinFilmColor;
                float hue = fract(cosTheta * 2.0 + u_time * 0.1 + u_orbIndex * 0.1);
                
                // HSL to RGB for iridescent effect
                float h = hue * 6.0;
                float s = 0.8 + u_audioEnergy * 0.2;
                float l = 0.5 + u_trebleEnergy * 0.2;
                
                float c = (1.0 - abs(2.0 * l - 1.0)) * s;
                float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
                float m = l - c * 0.5;
                
                if (h < 1.0) thinFilmColor = vec3(c, x, 0.0);
                else if (h < 2.0) thinFilmColor = vec3(x, c, 0.0);
                else if (h < 3.0) thinFilmColor = vec3(0.0, c, x);
                else if (h < 4.0) thinFilmColor = vec3(0.0, x, c);
                else if (h < 5.0) thinFilmColor = vec3(x, 0.0, c);
                else thinFilmColor = vec3(c, 0.0, x);
                
                return (thinFilmColor + m) * strength;
            }
            
            // Environment map sampling with distortion
            vec3 sampleEnvMap(vec3 reflectDir) {
                // Convert reflection direction to UV coordinates
                float theta = atan(reflectDir.z, reflectDir.x);
                float phi = asin(clamp(reflectDir.y, -1.0, 1.0));
                
                vec2 uv = vec2(
                    (theta + 3.14159) / (2.0 * 3.14159),
                    (phi + 3.14159 * 0.5) / 3.14159
                );
                
                // Audio-reactive distortion
                uv += vec2(
                    sin(u_time * 2.0 + uv.y * 10.0) * u_bassEnergy * 0.05,
                    cos(u_time * 1.5 + uv.x * 10.0) * u_midEnergy * 0.05
                );
                
                return texture(u_envMap, uv).rgb;
            }
            
            // Procedural environment for reflections
            vec3 proceduralEnv(vec3 reflectDir) {
                // Swirling colorful environment
                float angle = atan(reflectDir.z, reflectDir.x) + u_time * 0.5;
                float elevation = reflectDir.y;
                
                // Multiple color bands
                vec3 color1 = vec3(0.8, 0.2, 0.5); // Magenta
                vec3 color2 = vec3(0.2, 0.8, 0.6); // Cyan
                vec3 color3 = vec3(0.9, 0.7, 0.2); // Gold
                vec3 color4 = vec3(0.3, 0.3, 0.9); // Blue
                
                // Spiral pattern
                float pattern = sin(angle * 4.0 + elevation * 8.0 + u_time * 2.0);
                pattern = pattern * 0.5 + 0.5;
                
                // Audio-reactive color mixing
                float mix1 = sin(angle * 3.0 + u_time) * 0.5 + 0.5;
                float mix2 = cos(elevation * 5.0 + u_time * 1.2) * 0.5 + 0.5;
                
                vec3 envColor = mix(
                    mix(color1, color2, mix1),
                    mix(color3, color4, mix2),
                    pattern
                );
                
                // Add brightness based on audio
                envColor *= 0.5 + u_audioEnergy * 0.5 + u_beatIntensity * 0.3;
                
                // Add neon streaks
                float streak = pow(abs(sin(angle * 8.0 + u_time * 3.0)), 10.0);
                envColor += vec3(1.0, 0.3, 0.7) * streak * u_trebleEnergy;
                
                return envColor;
            }
            
            void main() {
                vec3 normal = normalize(v_normal);
                vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
                vec3 reflectDir = reflect(-viewDir, normal);
                
                // Fresnel effect
                float cosTheta = max(dot(normal, viewDir), 0.0);
                float fresnel = pow(1.0 - cosTheta, u_fresnelPower);
                fresnel = mix(0.04, 1.0, fresnel); // F0 for metal
                
                // Environment reflection
                vec3 envReflection = proceduralEnv(reflectDir);
                
                // Base metallic color
                vec3 baseColor = u_baseColor;
                
                // Iridescent overlay
                vec3 iridescentColor = iridescence(cosTheta, u_iridescenceStrength);
                
                // Specular highlight
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                vec3 halfDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(normal, halfDir), 0.0), u_specularPower);
                spec *= (1.0 + u_beatIntensity * 2.0); // Beat-reactive specular
                
                // Combine all lighting
                vec3 diffuse = baseColor * max(dot(normal, lightDir), 0.2);
                vec3 specular = vec3(1.0) * spec;
                vec3 reflection = envReflection * fresnel * u_reflectionStrength;
                
                // Final color with metalness
                vec3 finalColor = mix(diffuse, reflection, u_metalness);
                finalColor += specular * (1.0 - u_roughness);
                finalColor += iridescentColor * fresnel;
                
                // Edge glow on beats
                float edgeGlow = pow(1.0 - cosTheta, 4.0) * u_beatIntensity;
                finalColor += vec3(0.5, 0.8, 1.0) * edgeGlow;
                
                // Subtle pulsing
                finalColor *= 0.9 + sin(u_time * 4.0) * u_audioEnergy * 0.1;
                
                fragColor = vec4(finalColor, 1.0);
            }
        `;

        this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('MetallicRenderer program link error:', gl.getProgramInfoLog(this.program));
            return;
        }

        // Get locations
        this.attribs = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            normal: gl.getAttribLocation(this.program, 'a_normal'),
            texCoord: gl.getAttribLocation(this.program, 'a_texCoord')
        };

        this.uniforms = {
            modelMatrix: gl.getUniformLocation(this.program, 'u_modelMatrix'),
            viewMatrix: gl.getUniformLocation(this.program, 'u_viewMatrix'),
            projectionMatrix: gl.getUniformLocation(this.program, 'u_projectionMatrix'),
            cameraPosition: gl.getUniformLocation(this.program, 'u_cameraPosition'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            audioEnergy: gl.getUniformLocation(this.program, 'u_audioEnergy'),
            bassEnergy: gl.getUniformLocation(this.program, 'u_bassEnergy'),
            midEnergy: gl.getUniformLocation(this.program, 'u_midEnergy'),
            trebleEnergy: gl.getUniformLocation(this.program, 'u_trebleEnergy'),
            beatIntensity: gl.getUniformLocation(this.program, 'u_beatIntensity'),
            reflectionStrength: gl.getUniformLocation(this.program, 'u_reflectionStrength'),
            fresnelPower: gl.getUniformLocation(this.program, 'u_fresnelPower'),
            specularPower: gl.getUniformLocation(this.program, 'u_specularPower'),
            iridescenceStrength: gl.getUniformLocation(this.program, 'u_iridescenceStrength'),
            roughness: gl.getUniformLocation(this.program, 'u_roughness'),
            metalness: gl.getUniformLocation(this.program, 'u_metalness'),
            envMap: gl.getUniformLocation(this.program, 'u_envMap'),
            baseColor: gl.getUniformLocation(this.program, 'u_baseColor'),
            orbIndex: gl.getUniformLocation(this.program, 'u_orbIndex')
        };

        // Background shader
        this.initBackgroundShader();
    }

    initBackgroundShader() {
        const gl = this.gl;

        const bgVertexSource = `#version 300 es
            precision highp float;
            in vec2 a_position;
            out vec2 v_uv;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_uv = (a_position + 1.0) * 0.5;
            }
        `;

        const bgFragmentSource = `#version 300 es
            precision highp float;
            in vec2 v_uv;
            uniform float u_time;
            uniform float u_audioEnergy;
            uniform float u_bassEnergy;
            uniform vec2 u_resolution;
            out vec4 fragColor;
            
            // Neon grid background with energy waves
            void main() {
                vec2 uv = v_uv;
                vec2 centered = uv - 0.5;
                
                // Dark gradient background
                float vignette = 1.0 - length(centered) * 0.8;
                vec3 bgColor = vec3(0.02, 0.01, 0.05) * vignette;
                
                // Energy waves radiating from center
                float dist = length(centered);
                float wave = sin(dist * 20.0 - u_time * 3.0) * 0.5 + 0.5;
                wave *= exp(-dist * 3.0) * u_audioEnergy;
                
                vec3 waveColor = vec3(0.8, 0.2, 0.9) * wave;
                
                // Neon grid lines
                vec2 grid = abs(fract(uv * 20.0 - 0.5) - 0.5);
                float gridLine = min(grid.x, grid.y);
                float gridIntensity = smoothstep(0.05, 0.0, gridLine) * 0.1 * u_bassEnergy;
                vec3 gridColor = vec3(0.0, 0.8, 1.0) * gridIntensity;
                
                // Combine
                vec3 finalColor = bgColor + waveColor + gridColor;
                
                fragColor = vec4(finalColor, 1.0);
            }
        `;

        this.bgVertexShader = this.compileShader(gl.VERTEX_SHADER, bgVertexSource);
        this.bgFragmentShader = this.compileShader(gl.FRAGMENT_SHADER, bgFragmentSource);

        this.bgProgram = gl.createProgram();
        gl.attachShader(this.bgProgram, this.bgVertexShader);
        gl.attachShader(this.bgProgram, this.bgFragmentShader);
        gl.linkProgram(this.bgProgram);

        this.bgUniforms = {
            time: gl.getUniformLocation(this.bgProgram, 'u_time'),
            audioEnergy: gl.getUniformLocation(this.bgProgram, 'u_audioEnergy'),
            bassEnergy: gl.getUniformLocation(this.bgProgram, 'u_bassEnergy'),
            resolution: gl.getUniformLocation(this.bgProgram, 'u_resolution')
        };
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

        // Create sphere geometry
        const sphere = this.createSphereGeometry(1.0, 32, 32);

        this.sphereVAO = gl.createVertexArray();
        gl.bindVertexArray(this.sphereVAO);

        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

        // Normal buffer
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.attribs.normal);
        gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);

        // TexCoord buffer
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.texCoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.attribs.texCoord);
        gl.vertexAttribPointer(this.attribs.texCoord, 2, gl.FLOAT, false, 0, 0);

        // Index buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere.indices), gl.STATIC_DRAW);

        this.sphereIndexCount = sphere.indices.length;

        gl.bindVertexArray(null);

        // Background quad
        const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    }

    createSphereGeometry(radius, widthSegments, heightSegments) {
        const positions = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const phi = v * Math.PI;

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const theta = u * Math.PI * 2;

                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);

                const px = radius * sinPhi * cosTheta;
                const py = radius * cosPhi;
                const pz = radius * sinPhi * sinTheta;

                positions.push(px, py, pz);
                normals.push(sinPhi * cosTheta, cosPhi, sinPhi * sinTheta);
                texCoords.push(u, v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + widthSegments + 1;

                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }

        return { positions, normals, texCoords, indices };
    }

    initEnvironmentMap() {
        const gl = this.gl;

        // Create procedural environment map
        const size = 512;
        const data = new Uint8Array(size * size * 4);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const v = y / size;

                // Gradient with color bands
                const hue = (u + v * 0.5) % 1;
                const [r, g, b] = this.hslToRgb(hue, 0.8, 0.5);

                const idx = (y * size + x) * 4;
                data[idx] = r * 255;
                data[idx + 1] = g * 255;
                data[idx + 2] = b * 255;
                data[idx + 3] = 255;
            }
        }

        this.envMapTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.envMapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    initOrbs() {
        // Create initial metallic orbs
        const orbConfigs = [
            { size: 0.15, color: [0.8, 0.2, 0.5], pattern: 'swirl' },
            { size: 0.12, color: [0.2, 0.8, 0.6], pattern: 'pulse' },
            { size: 0.18, color: [0.9, 0.7, 0.2], pattern: 'kaleidoscope' },
            { size: 0.1, color: [0.3, 0.3, 0.9], pattern: 'ripple' },
            { size: 0.14, color: [0.7, 0.2, 0.8], pattern: 'spiral' },
            { size: 0.16, color: [0.2, 0.9, 0.4], pattern: 'checkerboard' },
            { size: 0.11, color: [1.0, 0.4, 0.1], pattern: 'dots' },
            { size: 0.13, color: [0.1, 0.5, 0.9], pattern: 'waves' }
        ];

        for (let i = 0; i < this.maxOrbs; i++) {
            const config = orbConfigs[i % orbConfigs.length];
            const angle = (i / this.maxOrbs) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.4;

            this.orbs.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius * 0.8,
                z: (Math.random() - 0.5) * 0.3,
                vx: (Math.random() - 0.5) * 0.01,
                vy: (Math.random() - 0.5) * 0.01,
                vz: (Math.random() - 0.5) * 0.005,
                size: config.size * (0.8 + Math.random() * 0.4),
                baseSize: config.size,
                color: config.color,
                pattern: config.pattern,
                rotationSpeed: (Math.random() - 0.5) * 2,
                phase: Math.random() * Math.PI * 2
            });
        }
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

    /**
     * Update orb positions and audio reactivity
     */
    update(deltaTime, audioMetadata = null) {
        this.time += deltaTime;

        if (audioMetadata) {
            this.audioEnergy = audioMetadata.amplitude || 0;
            this.bassEnergy = audioMetadata.energyBands?.bass || 0;
            this.midEnergy = audioMetadata.energyBands?.mid || 0;
            this.trebleEnergy = audioMetadata.energyBands?.brilliance || 0;
            this.beatIntensity = audioMetadata.rhythm?.beat ? 1.0 : this.beatIntensity * 0.92;
        }

        // Update orb physics
        for (let i = 0; i < this.orbs.length; i++) {
            const orb = this.orbs[i];

            // Audio-reactive size pulsing
            orb.size = orb.baseSize * (1 + this.bassEnergy * 0.3 + this.beatIntensity * 0.2);

            // Gentle floating motion
            orb.x += orb.vx + Math.sin(this.time * 0.5 + orb.phase) * 0.002 * this.audioEnergy;
            orb.y += orb.vy + Math.cos(this.time * 0.4 + orb.phase) * 0.002 * this.audioEnergy;
            orb.z += orb.vz;

            // Beat-reactive burst
            if (this.beatIntensity > 0.8) {
                const angle = Math.atan2(orb.y, orb.x);
                orb.vx += Math.cos(angle) * 0.01 * this.beatIntensity;
                orb.vy += Math.sin(angle) * 0.01 * this.beatIntensity;
            }

            // Boundary forces
            const boundaryForce = 0.001;
            if (Math.abs(orb.x) > 0.8) orb.vx -= Math.sign(orb.x) * boundaryForce;
            if (Math.abs(orb.y) > 0.6) orb.vy -= Math.sign(orb.y) * boundaryForce;
            if (Math.abs(orb.z) > 0.3) orb.vz -= Math.sign(orb.z) * boundaryForce;

            // Damping
            orb.vx *= 0.98;
            orb.vy *= 0.98;
            orb.vz *= 0.98;

            // Orb-orb repulsion
            for (let j = i + 1; j < this.orbs.length; j++) {
                const other = this.orbs[j];
                const dx = other.x - orb.x;
                const dy = other.y - orb.y;
                const dz = other.z - orb.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const minDist = (orb.size + other.size) * 1.5;

                if (dist < minDist && dist > 0) {
                    const force = (minDist - dist) * 0.01;
                    orb.vx -= (dx / dist) * force;
                    orb.vy -= (dy / dist) * force;
                    orb.vz -= (dz / dist) * force;
                    other.vx += (dx / dist) * force;
                    other.vy += (dy / dist) * force;
                    other.vz += (dz / dist) * force;
                }
            }
        }
    }

    /**
     * Create transformation matrices
     */
    createModelMatrix(x, y, z, scale, rotation = 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        return new Float32Array([
            scale * cos, scale * sin, 0, 0,
            -scale * sin, scale * cos, 0, 0,
            0, 0, scale, 0,
            x, y, z, 1
        ]);
    }

    createViewMatrix(cameraPos, target) {
        const forward = this.normalize([
            target[0] - cameraPos[0],
            target[1] - cameraPos[1],
            target[2] - cameraPos[2]
        ]);

        const right = this.normalize(this.cross([0, 1, 0], forward));
        const up = this.cross(forward, right);

        return new Float32Array([
            right[0], up[0], -forward[0], 0,
            right[1], up[1], -forward[1], 0,
            right[2], up[2], -forward[2], 0,
            -this.dot(right, cameraPos), -this.dot(up, cameraPos), this.dot(forward, cameraPos), 1
        ]);
    }

    createProjectionMatrix(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov / 2);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);
    }

    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    /**
     * Render all metallic orbs
     */
    render() {
        const gl = this.gl;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Render background
        this.renderBackground();

        // Camera setup with audio-reactive movement
        const cameraDistance = 2 - this.bassEnergy * 0.3;
        const cameraAngle = this.time * 0.2 + this.beatIntensity * 0.5;
        const cameraPos = [
            Math.sin(cameraAngle) * cameraDistance,
            0.3 + Math.sin(this.time * 0.3) * 0.2,
            Math.cos(cameraAngle) * cameraDistance
        ];
        const target = [0, 0, 0];

        const viewMatrix = this.createViewMatrix(cameraPos, target);
        const aspect = this.width / this.height;
        const projectionMatrix = this.createProjectionMatrix(Math.PI / 4, aspect, 0.1, 100);

        // Render orbs
        gl.useProgram(this.program);
        gl.bindVertexArray(this.sphereVAO);

        // Set shared uniforms
        gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);
        gl.uniform3fv(this.uniforms.cameraPosition, cameraPos);
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.audioEnergy, this.audioEnergy);
        gl.uniform1f(this.uniforms.bassEnergy, this.bassEnergy);
        gl.uniform1f(this.uniforms.midEnergy, this.midEnergy);
        gl.uniform1f(this.uniforms.trebleEnergy, this.trebleEnergy);
        gl.uniform1f(this.uniforms.beatIntensity, this.beatIntensity);
        gl.uniform1f(this.uniforms.reflectionStrength, this.config.reflectionStrength);
        gl.uniform1f(this.uniforms.fresnelPower, this.config.fresnelPower);
        gl.uniform1f(this.uniforms.specularPower, this.config.specularPower);
        gl.uniform1f(this.uniforms.iridescenceStrength, this.config.iridescenceStrength);
        gl.uniform1f(this.uniforms.roughness, this.config.roughness);
        gl.uniform1f(this.uniforms.metalness, this.config.metalness);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.envMapTexture);
        gl.uniform1i(this.uniforms.envMap, 0);

        // Sort orbs by Z for proper transparency
        const sortedOrbs = [...this.orbs].sort((a, b) => a.z - b.z);

        for (let i = 0; i < sortedOrbs.length; i++) {
            const orb = sortedOrbs[i];
            const rotation = this.time * orb.rotationSpeed + orb.phase;
            const modelMatrix = this.createModelMatrix(orb.x, orb.y, orb.z, orb.size, rotation);

            gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMatrix);
            gl.uniform3fv(this.uniforms.baseColor, orb.color);
            gl.uniform1f(this.uniforms.orbIndex, i);

            gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        }

        gl.bindVertexArray(null);
        gl.disable(gl.DEPTH_TEST);
    }

    renderBackground() {
        const gl = this.gl;

        gl.useProgram(this.bgProgram);
        gl.disable(gl.DEPTH_TEST);

        gl.uniform1f(this.bgUniforms.time, this.time);
        gl.uniform1f(this.bgUniforms.audioEnergy, this.audioEnergy);
        gl.uniform1f(this.bgUniforms.bassEnergy, this.bassEnergy);
        gl.uniform2f(this.bgUniforms.resolution, this.width, this.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }

    /**
     * Get orb data for external use
     */
    getOrbData() {
        return this.orbs.map(orb => ({
            x: orb.x,
            y: orb.y,
            z: orb.z,
            size: orb.size,
            color: orb.color
        }));
    }

    /**
     * Add a new orb (e.g., on beat)
     */
    addOrb(x, y, z, color = null) {
        if (this.orbs.length >= this.maxOrbs * 2) {
            this.orbs.shift();
        }

        const hue = color ? color : Math.random();
        const [r, g, b] = typeof hue === 'number' ? this.hslToRgb(hue, 0.8, 0.6) : hue;

        this.orbs.push({
            x, y, z,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            vz: (Math.random() - 0.5) * 0.02,
            size: 0.08 + Math.random() * 0.08,
            baseSize: 0.08 + Math.random() * 0.08,
            color: [r, g, b],
            pattern: 'swirl',
            rotationSpeed: (Math.random() - 0.5) * 3,
            phase: Math.random() * Math.PI * 2
        });
    }

    /**
     * Resize handler
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
