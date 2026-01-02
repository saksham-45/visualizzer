/**
 * Shader Visualizers Module
 * Manages WebGL2 shaders for visualizers with violent audio reactivity
 */
export class ShaderVisualizers {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');
        if (!this.gl) this.gl = canvas.getContext('webgl');

        this.programs = {};
        this.currentShader = 'psychedelicWaves';
        this.time = 0;
        this.params = { speed: 1.0, intensity: 1.0 };
        this.beatPulse = 0;

        // Audio texture
        this.audioData = new Uint8Array(256);
        this.audioTexture = null;

        this.initialize();
    }

    deriveMetadataFromAudio(audioData) {
        const emptyBands = {
            subBass: { peak: 0, avg: 0, transient: 0 },
            bass: { peak: 0, avg: 0, transient: 0 },
            mid: { peak: 0, avg: 0, transient: 0 },
            treble: { peak: 0, avg: 0, transient: 0 }
        };

        if (!audioData?.frequencyData || !audioData?.timeData || !audioData?.bufferLength) {
            return {
                amplitude: 0,
                spectralCentroid: 0,
                rhythm: { beat: false },
                energyBands: emptyBands
            };
        }

        const { frequencyData, timeData, bufferLength } = audioData;

        // Amplitude (0..1)
        let ampSum = 0;
        let ampCount = 0;
        for (let i = 0; i < bufferLength; i += 4) {
            ampSum += Math.abs((timeData[i] - 128) / 128);
            ampCount++;
        }
        const amplitude = ampCount ? Math.min(1, ampSum / ampCount) : 0;

        const band = (startFrac, endFrac) => {
            const start = Math.max(0, Math.floor(bufferLength * startFrac));
            const end = Math.min(bufferLength, Math.floor(bufferLength * endFrac));
            let peak = 0;
            let sum = 0;
            let n = 0;
            for (let i = start; i < end; i++) {
                const v = (frequencyData[i] || 0) / 255;
                if (v > peak) peak = v;
                sum += v;
                n++;
            }
            return { peak, avg: n ? sum / n : 0, transient: 0 };
        };

        const energyBands = {
            subBass: band(0.00, 0.08),
            bass: band(0.08, 0.20),
            mid: band(0.20, 0.55),
            treble: band(0.55, 1.00)
        };

        return {
            amplitude,
            spectralCentroid: 0,
            rhythm: { beat: false },
            energyBands
        };
    }

    initialize() {
        const gl = this.gl;
        if (!gl) return;

        // Create audio texture
        this.audioTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.audioTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const shaders = this.getShaderDefinitions();
        for (const [name, source] of Object.entries(shaders)) {
            this.programs[name] = this.createProgram(source);
        }
    }

    createProgram(fsSource) {
        const gl = this.gl;
        const vsSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        return {
            program,
            buffer,
            uniforms: {
                time: gl.getUniformLocation(program, 'time'),
                resolution: gl.getUniformLocation(program, 'resolution'),
                audioData: gl.getUniformLocation(program, 'audioData'),
                bass: gl.getUniformLocation(program, 'bass'),
                mid: gl.getUniformLocation(program, 'mid'),
                high: gl.getUniformLocation(program, 'high'),
                amplitude: gl.getUniformLocation(program, 'amplitude'),
                beatPulse: gl.getUniformLocation(program, 'beatPulse')
            }
        };
    }

    getShaderDefinitions() {
        const common = `
            precision highp float;
            varying vec2 vUv;
            uniform float time, bass, mid, high, amplitude, beatPulse;
            uniform vec2 resolution;
            uniform sampler2D audioData;

            // NEON PSYTRANCE PALETTE - Hot Pink, Electric Cyan, Acid Green, Deep Purple
            vec3 neonPalette(float t, float energy) {
                vec3 hotPink = vec3(1.0, 0.1, 0.5);
                vec3 electricCyan = vec3(0.0, 1.0, 0.9);
                vec3 acidGreen = vec3(0.5, 1.0, 0.0);
                vec3 deepPurple = vec3(0.4, 0.0, 0.8);
                
                float phase = fract(t);
                vec3 col;
                if (phase < 0.25) col = mix(hotPink, electricCyan, phase * 4.0);
                else if (phase < 0.5) col = mix(electricCyan, acidGreen, (phase - 0.25) * 4.0);
                else if (phase < 0.75) col = mix(acidGreen, deepPurple, (phase - 0.5) * 4.0);
                else col = mix(deepPurple, hotPink, (phase - 0.75) * 4.0);
                
                // Boost saturation and brightness with energy
                return col * (1.0 + energy * 0.5);
            }

            // Grit/noise overlay for texture
            float grit(vec2 uv, float scale) {
                return fract(sin(dot(uv * scale, vec2(12.9898, 78.233))) * 43758.5453);
            }

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            vec2 cMul(vec2 a, vec2 b) {
                return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
            }
        `;

        return {
            psychedelicWaves: common + `
                void main() {
                    vec2 uv = vUv;
                    float warp = sin(uv.y * 15.0 + time * 1.5) * bass * 0.4;
                    uv.x += warp + beatPulse * 0.2 * sin(time * 30.0);
                    
                    vec2 center = uv - 0.5;
                    float d = length(center);
                    
                    float pulse = sin(d * 30.0 - time * 8.0 - bass * 15.0);
                    vec3 col = neonPalette(d * 0.3 + time * 0.1, amplitude);
                    
                    col *= (0.3 + 0.7 * abs(pulse));
                    col += vec3(high * 0.3, high * 0.1, high * 0.4); // Purple flash on highs
                    
                    // Grit overlay
                    float g = grit(uv, 200.0) * 0.08;
                    col = mix(col, col * 0.7, g);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            neonVortex: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    uv *= (1.3 - beatPulse * 0.5 - bass * 0.3);

                    float d = length(uv);
                    vec2 dir = normalize(uv + vec2(1e-6));
                    float twist = d * 8.0 + time * 3.0 + bass * 5.0;
                    vec2 rot = vec2(cos(twist), sin(twist));
                    vec2 dirR = vec2(dir.x * rot.x - dir.y * rot.y, dir.x * rot.y + dir.y * rot.x);
                    
                    float rings = sin(d * 60.0 - time * 15.0);

                    vec2 z2 = cMul(dirR, dirR);
                    vec2 z4 = cMul(z2, z2);
                    vec2 z8 = cMul(z4, z4);
                    vec2 z12 = cMul(z8, z4);
                    float sin12a = z12.y;
                    float cos12a = z12.x;
                    float off = sin(d * 12.0);
                    float rays = sin12a * cos(off) + cos12a * sin(off);

                    vec3 col = neonPalette(time * 0.08 + d * 0.5 + dirR.x * 0.2, amplitude);
                    col *= smoothstep(0.0, 0.12, abs(rings * rays));
                    col *= (1.5 + beatPulse * 4.0 + high * 2.0);
                    
                    // Heavy grit for trance aesthetic
                    float g = grit(uv + time * 0.1, 300.0) * 0.12;
                    col = mix(col, col * 0.6, g);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            kaleidoscope: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float r = length(uv);
                    float a = atan(uv.y, uv.x);
                    
                    float sides = 8.0 + floor(bass * 6.0);
                    float tau = 6.283185;
                    a = mod(a, tau/sides) - tau/(sides*2.0);
                    a = abs(a);
                    
                    uv = r * vec2(cos(a), sin(a));
                    uv.x -= time * 0.15 + bass * 0.3;
                    
                    float g = sin(uv.x * 25.0) * sin(uv.y * 25.0);
                    vec3 col = neonPalette(r * 0.4 + time * 0.05 + a * 0.3, amplitude);
                    col *= smoothstep(0.0, 0.08, abs(g));
                    col *= (1.2 + beatPulse * 3.0);
                    
                    // Subtle grit
                    float gr = grit(uv, 150.0) * 0.06;
                    col = mix(col, col * 0.8, gr);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            hypnoticSpiral: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float d = max(length(uv), 0.02);

                    vec2 dir = normalize(uv + vec2(1e-6));
                    float rotA = time * 0.7 + bass * 2.0;
                    vec2 rot = vec2(cos(rotA), sin(rotA));
                    vec2 dirR = vec2(dir.x * rot.x - dir.y * rot.y, dir.x * rot.y + dir.y * rot.x);

                    vec2 z2 = cMul(dirR, dirR);
                    vec2 z3 = cMul(z2, dirR);
                    float sin3a = z3.y;
                    float cos3a = z3.x;
                    float phi = d * 25.0 - time * 12.0 - bass * 18.0;
                    float spiral = sin3a * cos(phi) + cos3a * sin(phi);

                    vec3 col = neonPalette(d * 0.6 + time * 0.05 + dirR.y * 0.15, amplitude);
                    
                    col *= smoothstep(0.0, 0.18, abs(spiral));
                    col *= (0.4 / d) * (1.2 + beatPulse * 1.5);
                    
                    // Acid grit
                    float g = grit(uv * 2.0 + time * 0.05, 250.0) * 0.1;
                    col = mix(col, col * 0.7, g);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            electricStorm: common + `
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                void main() {
                    vec2 uv = vUv;
                    vec3 col = vec3(0.0);
                    
                    for(float i = 1.0; i < 7.0; i++) {
                        float speed = time * i * 0.6;
                        float bolt = abs(0.008 / (uv.y - 0.5 + sin(uv.x * 12.0 * i + speed) * 0.25 * bass));
                        // Alternate between pink and cyan bolts
                        vec3 boltCol = i < 4.0 ? vec3(1.0, 0.1, 0.6) : vec3(0.0, 1.0, 0.9);
                        col += bolt * boltCol;
                    }
                    
                    col *= (1.2 + beatPulse * 4.0 + high * 3.0);
                    
                    // Heavy noise for storm effect
                    float g = grit(uv + time * 0.2, 400.0) * 0.15;
                    col = mix(col, col * 0.5, g);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            sacredGeometry: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float d = length(uv);
                    float col = 0.0;
                    
                    for(float i = 0.0; i < 5.0; i++) {
                        float r = 0.15 + i * 0.18 + bass * 0.12;
                        float circle = abs(d - r);
                        col += 0.004 / circle;
                    }
                    
                    vec3 finalCol = neonPalette(time * 0.08 + d * 0.4, amplitude) * col;
                    finalCol *= (1.3 + beatPulse * 2.5);
                    
                    // Subtle sacred grit
                    float g = grit(uv, 180.0) * 0.07;
                    finalCol = mix(finalCol, finalCol * 0.75, g);
                    
                    gl_FragColor = vec4(finalCol, 1.0);
                }
            `
        };
    }

    setShader(name) { if (this.programs[name]) this.currentShader = name; }
    setParams(params) { Object.assign(this.params, params); }
    getAvailableShaders() { return Object.keys(this.programs); }

    render(audioData, metadata, deltaTime = 0.016) {
        const gl = this.gl;
        if (!gl) return;

        const safeMetadata = metadata || this.deriveMetadataFromAudio(audioData);
        const bands = safeMetadata.energyBands;
        if (!bands) return;

        this.time += deltaTime * this.params.speed * (1.0 + bands.bass.avg);
        const shader = this.programs[this.currentShader];
        if (!shader) return;

        if (safeMetadata.rhythm?.beat) this.beatPulse = 1.0;
        this.beatPulse *= 0.9;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(shader.program);

        gl.uniform1f(shader.uniforms.time, this.time);
        gl.uniform1f(shader.uniforms.bass, bands.subBass.peak);
        gl.uniform1f(shader.uniforms.mid, bands.mid.peak);
        gl.uniform1f(shader.uniforms.high, bands.treble.peak);
        gl.uniform1f(shader.uniforms.amplitude, safeMetadata.amplitude);
        gl.uniform1f(shader.uniforms.beatPulse, this.beatPulse);
        gl.uniform2f(shader.uniforms.resolution, this.canvas.width, this.canvas.height);

        const posLoc = gl.getAttribLocation(shader.program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, shader.buffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
