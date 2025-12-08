/**
 * 3D Camera Controller - Beat-reactive perspective shifts
 * Creates dynamic camera movement based on audio analysis
 */
export class CameraController {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.fov = 400;
        this.baseFov = 400;
        
        this.targetX = 0;
        this.targetY = 0;
        this.targetZ = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.targetRotZ = 0;
        
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        
        this.time = 0;
        this.beatAccumulator = 0;
        this.lastBeatTime = 0;
        this.smoothEnergy = 0;
        this.smoothBass = 0;
        this.beatZOffset = 0;
    }

    update(metadata, deltaTime = 0.016) {
        this.time += deltaTime;
        
        if (!metadata) {
            metadata = { amplitude: 0, energyBands: {}, rhythm: {} };
        }
        
        const energyBands = metadata.energyBands || {};
        const bass = energyBands.bassEnergy || energyBands.bass || 0;
        const mid = energyBands.midEnergy || energyBands.mid || 0;
        const amplitude = metadata.amplitude || 0;
        const isBeat = (metadata.rhythm && metadata.rhythm.beat) || metadata.isBeat || false;
        
        const bassTotal = bass > 0 ? bass : 1;
        const midTotal = mid > 0 ? mid : 1;
        const normalizedBass = Math.min(1, bassTotal / 5000);
        const normalizedMid = Math.min(1, midTotal / 3000);
        
        this.smoothEnergy += (amplitude - this.smoothEnergy) * 0.15;
        this.smoothBass += (normalizedBass - this.smoothBass) * 0.12;
        
        this.beatZOffset *= 0.92;
        
        if (isBeat && this.time - this.lastBeatTime > 0.15) {
            this.lastBeatTime = this.time;
            this.beatAccumulator += 0.4 + amplitude * 0.6;
            
            this.shakeIntensity = 15 + amplitude * 40;
            
            const beatStrength = 0.3 + amplitude * 0.7;
            this.beatZOffset += (Math.random() - 0.3) * 100 * beatStrength;
            this.targetRotY += (Math.random() - 0.5) * 0.4 * beatStrength;
            this.targetRotX += (Math.random() - 0.5) * 0.25 * beatStrength;
        }
        
        const orbitSpeed = 0.3 + this.smoothEnergy * 0.5;
        const orbitRadius = 50 + this.smoothBass * 100;
        
        this.targetX = Math.sin(this.time * orbitSpeed) * orbitRadius;
        this.targetY = Math.cos(this.time * orbitSpeed * 0.7) * orbitRadius * 0.5;
        
        const dollyPush = this.smoothEnergy * 80 + this.smoothBass * 60;
        this.targetZ = -50 + dollyPush + Math.sin(this.time * 0.5) * 30 + this.beatZOffset;
        
        this.targetZ = Math.max(-200, Math.min(200, this.targetZ));
        this.targetRotX = Math.max(-0.4, Math.min(0.4, this.targetRotX));
        this.targetRotY = Math.max(-0.5, Math.min(0.5, this.targetRotY));
        
        const smoothing = 0.08;
        this.x += (this.targetX - this.x) * smoothing;
        this.y += (this.targetY - this.y) * smoothing;
        this.z += (this.targetZ - this.z) * smoothing;
        this.rotationX += (this.targetRotX - this.rotationX) * smoothing;
        this.rotationY += (this.targetRotY - this.rotationY) * smoothing;
        this.rotationZ += (this.targetRotZ - this.rotationZ) * smoothing;
        
        this.shakeIntensity *= 0.85;
        if (this.shakeIntensity > 0.5) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        } else {
            this.shakeX *= 0.8;
            this.shakeY *= 0.8;
        }
        
        this.fov = this.baseFov - this.smoothEnergy * 100 - this.smoothBass * 50;
        this.fov = Math.max(200, Math.min(600, this.fov));
        
        this.targetRotX *= 0.98;
        this.targetRotY *= 0.98;
        this.targetRotZ *= 0.98;
    }

    project(x3d, y3d, z3d, centerX, centerY) {
        let rx = x3d - this.x;
        let ry = y3d - this.y;
        let rz = z3d - this.z;
        
        if (this.rotationY !== 0) {
            const cosY = Math.cos(this.rotationY);
            const sinY = Math.sin(this.rotationY);
            const newX = rx * cosY - rz * sinY;
            const newZ = rx * sinY + rz * cosY;
            rx = newX;
            rz = newZ;
        }
        
        if (this.rotationX !== 0) {
            const cosX = Math.cos(this.rotationX);
            const sinX = Math.sin(this.rotationX);
            const newY = ry * cosX - rz * sinX;
            const newZ = ry * sinX + rz * cosX;
            ry = newY;
            rz = newZ;
        }
        
        const effectiveZ = rz + this.fov;
        if (effectiveZ <= 10) {
            return null;
        }
        
        const scale = this.fov / effectiveZ;
        if (scale <= 0 || scale > 10) {
            return null;
        }
        
        const screenX = centerX + rx * scale + this.shakeX;
        const screenY = centerY + ry * scale + this.shakeY;
        
        return {
            x: screenX,
            y: screenY,
            scale: scale,
            depth: rz
        };
    }

    getIntensityMultiplier() {
        return 1 + this.smoothEnergy * 0.8 + this.smoothBass * 0.5;
    }

    getFovScale() {
        return this.baseFov / this.fov;
    }
}
