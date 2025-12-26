/**
 * GPU Particle System - ULTRA Music Reactive
 * Particles that move, swarm, and form shapes based on audio
 * 50K particles with physics and audio-driven behaviors
 * ENHANCED: Violent responsiveness, shape morphing, and transient-driven jitter
 */

export class GPUParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.particleCount = 60000;
        this.particles = null;
        this.velocities = null;
        this.colors = null;
        this.basePositions = null;
        this.time = 0;
        this.params = { speed: 1.0, size: 1.0, spread: 1.0, colorMode: 0, reactivity: 1.0 };

        this.beatPulse = 0;
        this.currentShape = 0;
        this.shapeTransition = 0;
        this.targetShape = 0;
        this.audioData = { subBass: 0, bass: 0, mid: 0, high: 0, amp: 0 };

        this.initialize();
    }

    initialize() {
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        if (!this.gl) { console.error('WebGL not supported'); return; }

        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        this.compileProgram();
        this.initParticles();
    }

    compileProgram() {
        const gl = this.gl;

        const vs = `
            attribute vec3 position;
            attribute vec3 basePosition;
            attribute vec3 color;
            
            uniform float time, amplitude, bass, mid, high, subBass;
            uniform float beatPulse, size, reactivity;
            uniform int shapeMode; 
            uniform float shapeBlend;
            
            varying vec4 vColor;
            varying float vGlow;
            
            #define PI 3.14159265359
            
            void main() {
                vec3 pos = basePosition;
                float seed = basePosition.x * 12.0 + basePosition.y * 7.0;
                float phase = fract(seed + time * 0.1);
                
                // --- DYNAMIC SHAPE MORPHING ---
                vec3 spherePos = basePosition * (1.0 + amplitude * 0.2);
                
                float angle = atan(basePosition.y, basePosition.x);
                float radius = length(basePosition.xy) * (1.0 + bass * 0.5);
                vec3 ringPos = vec3(cos(angle) * radius, sin(angle) * radius, basePosition.z * 0.1);
                
                float twist = length(basePosition.xy) * 5.0 + time * 2.0;
                vec3 spiralPos = vec3(
                    cos(angle + twist) * radius,
                    sin(angle + twist) * radius,
                    basePosition.z + sin(twist) * 0.3
                );
                
                vec3 target = spherePos;
                if(shapeMode == 1) target = mix(spherePos, ringPos, shapeBlend);
                else if(shapeMode == 2) target = mix(spherePos, spiralPos, shapeBlend);
                
                pos = target;

                // --- VIOLENT PHYSICS ---
                // 1. Radial Explosion on Sub-Bass
                vec2 dir = normalize(pos.xy + 0.001);
                pos.xy += dir * (subBass * 0.8 * reactivity);
                
                // 2. High Frequency Jitter (Transient driven)
                float jitter = high * 0.15 * reactivity * sin(time * 50.0 + seed);
                pos.xyz += jitter;

                // 3. Beat Pulse Expansion
                pos.xy += dir * (beatPulse * 0.5 * reactivity);

                // 4. Mid frequency vortex
                float rot = mid * 4.0 * reactivity * (1.0 - length(pos.xy));
                mat2 rotMat = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
                pos.xy = rotMat * pos.xy;

                gl_Position = vec4(pos.xy, 0.0, 1.0);
                
                // Size responds to intensity and distance
                gl_PointSize = size * (2.0 + subBass * 20.0 + beatPulse * 30.0) / (0.5 + length(pos.xy));
                
                vGlow = subBass * 0.5 + beatPulse * 0.7 + high * 0.2;
                vColor = vec4(color, 0.8 + amplitude * 0.2);
            }
        `;

        const fs = `
            precision highp float;
            varying vec4 vColor;
            varying float vGlow;
            
            void main() {
                vec2 coord = gl_PointCoord - 0.5;
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                float alpha = smoothstep(0.5, 0.0, dist);
                vec3 finalColor = vColor.rgb * (1.0 + vGlow * 2.5);
                gl_FragColor = vec4(finalColor, alpha * vColor.a);
            }
        `;

        const vsh = this.createShader(gl.VERTEX_SHADER, vs);
        const fsh = this.createShader(gl.FRAGMENT_SHADER, fs);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vsh);
        gl.attachShader(this.program, fsh);
        gl.linkProgram(this.program);

        this.uniforms = {
            time: gl.getUniformLocation(this.program, 'time'),
            amplitude: gl.getUniformLocation(this.program, 'amplitude'),
            subBass: gl.getUniformLocation(this.program, 'subBass'),
            bass: gl.getUniformLocation(this.program, 'bass'),
            mid: gl.getUniformLocation(this.program, 'mid'),
            high: gl.getUniformLocation(this.program, 'high'),
            beatPulse: gl.getUniformLocation(this.program, 'beatPulse'),
            size: gl.getUniformLocation(this.program, 'size'),
            reactivity: gl.getUniformLocation(this.program, 'reactivity'),
            shapeMode: gl.getUniformLocation(this.program, 'shapeMode'),
            shapeBlend: gl.getUniformLocation(this.program, 'shapeBlend')
        };
    }

    createShader(type, src) {
        const s = this.gl.createShader(type);
        this.gl.shaderSource(s, src);
        this.gl.compileShader(s);
        if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(s));
        }
        return s;
    }

    initParticles() {
        const gl = this.gl;
        const count = this.particleCount;
        this.basePositions = new Float32Array(count * 3);
        this.colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const theta = Math.random() * PI2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.33) * 0.7;

            this.basePositions[i3] = Math.sin(phi) * Math.cos(theta) * r;
            this.basePositions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
            this.basePositions[i3 + 2] = Math.random(); // Used as life/offset seed

            const hue = (theta / PI2 + r * 0.5) % 1.0;
            const rgb = this.hsvToRgb(hue, 0.8, 1.0);
            this.colors[i3] = rgb[0];
            this.colors[i3 + 1] = rgb[1];
            this.colors[i3 + 2] = rgb[2];
        }

        const createBuf = (data) => {
            const b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return b;
        };

        this.basePosBuf = createBuf(this.basePositions);
        this.colorBuf = createBuf(this.colors);
    }

    hsvToRgb(h, s, v) {
        let r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return [r, g, b];
    }

    setParams(params) { Object.assign(this.params, params); }

    render(audioData, metadata, deltaTime = 0.016) {
        const gl = this.gl;
        if (!gl || !metadata) return;

        const bands = metadata.energyBands;
        if (!bands) return;

        // Extract peaks and transients for VIOLENCE
        const subBass = bands.subBass.peak;
        const bass = bands.bass.avg;
        const mid = bands.mid.peak;
        const high = bands.treble.transient * 2.0;
        const amp = metadata.amplitude;

        if (metadata.rhythm?.beat) {
            this.beatPulse = 1.0;
            if (subBass > 0.8) this.targetShape = (this.targetShape + 1) % 3;
        }
        this.beatPulse *= 0.92;
        this.shapeTransition += (this.targetShape - this.currentShape) * 0.1;
        if (Math.abs(this.shapeTransition - this.targetShape) < 0.01) this.currentShape = this.targetShape;

        this.time += deltaTime * (1.0 + bass * 2.0); // Time dilation based on energy

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.amplitude, amp);
        gl.uniform1f(this.uniforms.subBass, subBass);
        gl.uniform1f(this.uniforms.bass, bass);
        gl.uniform1f(this.uniforms.mid, mid);
        gl.uniform1f(this.uniforms.high, high);
        gl.uniform1f(this.uniforms.beatPulse, this.beatPulse);
        gl.uniform1f(this.uniforms.size, this.params.size);
        gl.uniform1f(this.uniforms.reactivity, (this.params.reactivity || 1.0) * 1.5);
        gl.uniform1i(this.uniforms.shapeMode, Math.floor(this.currentShape));
        gl.uniform1f(this.uniforms.shapeBlend, this.shapeTransition % 1.0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.basePosBuf);
        const posLoc = gl.getAttribLocation(this.program, 'basePosition');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
        const colLoc = gl.getAttribLocation(this.program, 'color');
        gl.enableVertexAttribArray(colLoc);
        gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, this.particleCount);
    }
}

const PI2 = Math.PI * 2;
