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

            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }
        `;

        return {
            psychedelicWaves: common + `
                void main() {
                    vec2 uv = vUv;
                    float warp = sin(uv.y * 12.0 + time) * bass * 0.3;
                    uv.x += warp + beatPulse * 0.15 * sin(time * 25.0);
                    
                    vec2 center = uv - 0.5;
                    float d = length(center);
                    
                    float pulse = sin(d * 25.0 - time * 6.0 - bass * 12.0);
                    vec3 col = hsv2rgb(vec3(d * 0.4 + time * 0.15 + bass * 0.25, 0.85, 1.0));
                    
                    col *= (0.4 + 0.6 * pulse);
                    col += vec3(high * 0.4); 
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            neonVortex: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    uv *= (1.2 - beatPulse * 0.4 - bass * 0.2);
                    
                    float angle = atan(uv.y, uv.x);
                    float d = length(uv);
                    angle += d * 6.0 + time * 2.5 + bass * 4.0;
                    
                    float rings = sin(d * 50.0 - time * 12.0);
                    float rays = sin(angle * 12.0 + sin(d * 10.0));
                    
                    vec3 col = hsv2rgb(vec3(angle * 0.15 + time * 0.25, 0.8, 1.0));
                    col *= smoothstep(0.0, 0.15, abs(rings * rays));
                    col *= (1.2 + beatPulse * 3.0 + high * 1.5);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            kaleidoscope: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float r = length(uv);
                    float a = atan(uv.y, uv.x);
                    
                    float sides = 6.0 + floor(bass * 4.0);
                    float tau = 6.283185;
                    a = mod(a, tau/sides) - tau/(sides*2.0);
                    a = abs(a);
                    
                    uv = r * vec2(cos(a), sin(a));
                    uv.x -= time * 0.1 + bass * 0.2;
                    
                    float g = sin(uv.x * 20.0) * sin(uv.y * 20.0);
                    vec3 col = hsv2rgb(vec3(r * 0.5 + time * 0.1, 0.7, 1.0));
                    col *= smoothstep(0.0, 0.1, abs(g));
                    col *= (1.0 + beatPulse * 2.0);
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            hypnoticSpiral: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float d = length(uv);
                    float a = atan(uv.y, uv.x);
                    
                    float spiral = sin(a * 3.0 + d * 20.0 - time * 10.0 - bass * 15.0);
                    vec3 col = hsv2rgb(vec3(d - time * 0.2 + a * 0.1, 0.9, 1.0));
                    
                    col *= smoothstep(0.0, 0.2, abs(spiral));
                    col *= (0.5 / d) * (1.0 + beatPulse);
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
                    
                    for(float i=1.0; i<5.0; i++) {
                        float speed = time * i * 0.5;
                        float bolt = abs(0.01 / (uv.y - 0.5 + sin(uv.x * 10.0 * i + speed) * 0.2 * bass));
                        col += bolt * hsv2rgb(vec3(0.6 + i * 0.1, 0.8, 1.0));
                    }
                    
                    col *= (1.0 + beatPulse * 3.0 + high * 2.0);
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            sacredGeometry: common + `
                void main() {
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
                    float d = length(uv);
                    float col = 0.0;
                    
                    for(float i=0.0; i<3.0; i++) {
                        float r = 0.2 + i * 0.2 + bass * 0.1;
                        float circle = abs(d - r);
                        col += 0.005 / circle;
                    }
                    
                    vec3 finalCol = hsv2rgb(vec3(time * 0.1 + d, 0.8, 1.0)) * col;
                    finalCol *= (1.0 + beatPulse * 2.0);
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
        if (!gl || !metadata) return;

        const bands = metadata.energyBands;
        if (!bands) return;

        this.time += deltaTime * this.params.speed * (1.0 + bands.bass.avg);
        const shader = this.programs[this.currentShader];
        if (!shader) return;

        if (metadata.rhythm?.beat) this.beatPulse = 1.0;
        this.beatPulse *= 0.9;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(shader.program);

        gl.uniform1f(shader.uniforms.time, this.time);
        gl.uniform1f(shader.uniforms.bass, bands.subBass.peak);
        gl.uniform1f(shader.uniforms.mid, bands.mid.peak);
        gl.uniform1f(shader.uniforms.high, bands.treble.peak);
        gl.uniform1f(shader.uniforms.amplitude, metadata.amplitude);
        gl.uniform1f(shader.uniforms.beatPulse, this.beatPulse);
        gl.uniform2f(shader.uniforms.resolution, this.canvas.width, this.canvas.height);

        const posLoc = gl.getAttribLocation(shader.program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, shader.buffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
