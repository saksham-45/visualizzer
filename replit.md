# Advanced Audio Visualizer

## Overview

An advanced, real-time audio visualizer application that creates dynamic visual effects synchronized with audio input. The system analyzes audio characteristics (frequency distribution, amplitude, rhythm, spectral properties) and intelligently cycles through various mesh-based visualization styles. Built with vanilla JavaScript using the Web Audio API and HTML5 Canvas, the application supports both microphone and system audio input sources.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Single-Page Application (SPA)**
- Pure vanilla JavaScript with ES6 modules
- No framework dependencies - uses native Web APIs exclusively
- Module-based architecture for clean separation of concerns
- HTML5 Canvas for all visual rendering with 2D context

**Core Modules:**
1. **main.js** - Application controller, orchestrates all modules and manages UI state
2. **audioCapture.js** - Web Audio API integration for audio input
3. **audioAnalyzer.js** - Real-time audio characteristic extraction
4. **meshVisualizers.js** - Primary visualization engine with mesh-based effects
5. **visualizerSelector.js** - Intelligent visualizer cycling logic
6. **visualizers.js** - Legacy visualization wrapper (delegates to meshVisualizers)

**UI Components:**
- Auto-hiding overlay system (fades after 3 seconds of inactivity)
- Real-time audio metadata display
- Manual visualizer selection override
- Audio source selection (microphone vs system audio)
- Fullscreen mode support

**Canvas Rendering:**
- High-DPI support with devicePixelRatio scaling
- 60 FPS animation loop using requestAnimationFrame
- Smooth transitions between visualizers with easing functions
- Mesh-based rendering with configurable resolution (60x60 grid default)

### Audio Processing Pipeline

**Web Audio API Configuration:**
- Sample rate: 44,100 Hz
- FFT size: 2048 samples (high resolution frequency analysis)
- Smoothing time constant: 0.8 (balanced between responsiveness and stability)
- Latency hint: 'interactive' (optimized for real-time visualization)

**Audio Analysis Metrics:**
- Amplitude (0-1 normalized volume level)
- Loudness (decibel measurement)
- Dominant frequency detection
- Frequency distribution (bass, mid, treble balance)
- Energy bands across 7 frequency ranges (sub-bass to brilliance)
- Spectral centroid (audio brightness)
- Spectral spread (frequency distribution width)
- Rhythm analysis with beat detection

**Visualizer Selection Strategy:**
- Cycles through 14 distinct visualizer types equally
- Target duration: 6.5 seconds per visualizer
- Beat-responsive early switching (minimum 2 seconds between switches)
- Maintains selection history for variety
- Falls back to cycling during audio silence

**Available Visualizers:**
- tornado, cyclone, spiral1-4, tracing, crossing, combined
- kaleidoscope, mandala, fractal, tunnel, morphing

### Data Flow

1. Audio input captured via getUserMedia API
2. Audio stream connected to AnalyserNode
3. Real-time FFT analysis produces frequency/time domain data
4. AudioAnalyzer extracts metadata (amplitude, frequency characteristics, rhythm)
5. VisualizerSelector determines appropriate visualization
6. MeshVisualizers renders animated mesh effects synchronized to audio
7. UI updates display current visualizer and audio metrics

### Local Development Server

**Dual Server Support:**
- Python HTTP server (server.py) - primary, auto-detects free ports
- Node.js HTTP server (server.js) - alternative option
- CORS headers configured for ES6 module loading
- Auto-opens browser on start
- Serves static files with appropriate MIME types

**Design Rationale:**
ES6 modules require proper CORS configuration, necessitating a local server rather than file:// protocol access. Python server chosen as primary due to universal availability on macOS/Linux and minimal dependencies.

## External Dependencies

### Browser APIs

**Web Audio API** (Required)
- Purpose: Audio capture, analysis, and processing
- Components used: AudioContext, AnalyserNode, GainNode, getUserMedia
- Browser support: Modern browsers (Chrome, Firefox, Safari, Edge)

**Canvas 2D API** (Required)
- Purpose: All visual rendering
- Rationale: Chosen over WebGL for simpler implementation while maintaining performance for 2D effects

**Screen Capture API** (Optional)
- Purpose: System audio capture functionality
- Note: Experimental feature, requires user to share tab/window audio
- Fallback: Microphone input always available

### Runtime Dependencies

**None** - Zero npm packages or external libraries required

The application runs entirely on native browser APIs with no build process, bundlers, or external dependencies. This architectural decision prioritizes:
- Simplicity and ease of deployment
- Reduced attack surface
- Minimal maintenance burden
- Direct understanding of underlying platform APIs

### Development Tools

**Package.json** - Metadata only, no actual dependencies
- Defines npm scripts for convenience
- Scripts simply invoke server.py or server.js directly

### Browser Compatibility Requirements

- ES6 module support (import/export)
- Web Audio API support
- Canvas 2D rendering context
- High-resolution display support (devicePixelRatio)
- getUserMedia API for microphone access

**Minimum browser versions:**
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+