# Visualizzer

A real-time audio visualizer with intelligent, music-reactive visuals. Supports microphone and system audio with automatic visualizer selection.

## Showcase: visualizzer × automix

<p align="center">
  <img src="https://raw.githubusercontent.com/saksham-45/automix-_./main/docs/media/preview_chrome_morph.gif" width="49%" alt="Chrome Morph">
  <img src="https://raw.githubusercontent.com/saksham-45/automix-_./main/docs/media/preview_liquid_metal.gif" width="49%" alt="Liquid Metal">
</p>

These are 1080p60 music videos: visualizzer reacting to mixes made by
[automix](https://github.com/saksham-45/automix-_.), my AI DJ engine. The modes shown
are Chrome Morph, Neon Vortex, Mercury Orbs, Electric Storm, Liquid Metal and Hypnotic
Spiral. **▶ [Watch the videos](https://github.com/saksham-45/automix-_./releases/tag/showcase-2026-11)**

For the videos, the visualizer was rendered offline in headless Chrome, frame by frame,
from analyser data computed off the mix (pipeline: `automix/video/`).

Recent changes:
- The beat-triggered center burst and flash effects are switched off in every mode
  (`BeatEffects.DISABLED_EFFECTS`).
- Glow is much lower: bloom 0.28 with a 0.92 threshold, and less inner glow and
  emissive.
- Chrome Morph, Liquid Metal, Mercury Orbs and Metallic Nebula keep their full audio
  reactivity. Their expansion is soft-limited to 82% of the visible frame, so the
  shapes never leave the screen.

## Role of Mathematics

This project is fundamentally mathematical—audio signals are transformed into visuals through:

- **Fourier Analysis**: FFT converts time-domain audio to frequency spectra (2048-point transform)
- **Signal Processing**: Smoothing constants, band energy extraction, and beat detection using statistical methods
- **Geometry**: 2D/3D coordinate transformations, polar/cartesian conversions, and mesh deformations
- **Complex Numbers**: Used in shaders for seamless rotation patterns (avoiding atan discontinuities)
- **Linear Algebra**: Camera projections, mesh vertex transformations, and lighting calculations
- **Trigonometry**: Spiral patterns, wave functions, and orbital camera movements
- **Color Theory**: HSV↔RGB conversions for audio-reactive coloring
- **Calculus**: Smooth interpolation functions for visual transitions

## Features

- **Multiple Visualizers**: Waveforms, circles, bars, particles, spirals, spectrum rings, GPU shaders, and 3D fluid simulations
- **Intelligent Selection**: AI-driven visualizer switching based on audio characteristics
- **Audio Sources**: Microphone or system audio capture
- **Smooth Transitions**: Morphing between visualizers
- **Performance Optimized**: Adaptive quality and hardware acceleration

## Quick Start

```bash
python3 server.py
# Open http://localhost:8000
# Click Start and grant audio permissions
```

## Visualizer Types

### 2D Canvas
- Wave, Circle, Bars, Particles, Spiral, Spectrum
- Mesh-based morphing visualizers

### GPU Shaders
- Psychedelic Waves, Neon Vortex, Kaleidoscope
- Electric Storm, Sacred Geometry, Hypnotic Spiral

### 3D Fluid (Three.js)
- Mercury Orbs, Liquid Metal, Metallic Nebula
- Liquid Geometry, Tunnel

## Architecture

```
index.html
├── audioCapture.js      # Audio input (mic/system)
├── audioAnalyzer.js     # Real-time analysis
├── visualizers.js       # Main render loop & 2D visualizers
├── shaderVisualizers.js # WebGL shaders
├── ThreeJSVisualizer.js # 3D fluid visualizers
├── fluidVisualizers.js  # 3D wrapper
├── meshVisualizers.js   # Mesh morphing
├── gpuParticles.js      # GPU particle system
├── visualizerSelector.js # Intelligent selection
├── musicIntelligence.js # Predictive analysis
├── beatEffects.js       # Beat reactive overlays
├── performanceOptimizer.js # Adaptive quality
└── main.js              # App orchestration
```

## Audio Analysis

- **FFT**: 2048 samples, 44.1kHz
- **Features**: Amplitude, spectral centroid, energy bands (sub-bass to brilliance), rhythm/beat detection
- **Smoothing**: 80% to reduce jitter

## Browser Support

- Chrome/Edge: Full (mic + system audio)
- Firefox/Safari: Mic only

## Controls

- Start/Stop audio capture
- Auto-select vs manual visualizer
- Settings panel for parameters
- Fullscreen mode

## Technical Notes

- Uses Web Audio API & WebGL2
- Fixed viewport sizing for consistent rendering
- No-cache headers for development
- Graceful fallbacks for missing features

## License

MIT

