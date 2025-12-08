# Audio Visualizer - Replit Project

## Overview
An advanced, real-time audio visualizer web application that creates beautiful visual effects based on audio input from your microphone or system audio. Features intelligent auto-selection of visualizations based on audio characteristics and smooth transitions between different visual styles.

**Current State**: Fully functional and ready to use. The application runs on port 5000 and is accessible through the Replit webview.

## Project Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, Web Audio API
- **Server**: Node.js (simple HTTP server for static files)
- **No Build Process**: Direct ES6 module loading in the browser

### File Structure
```
.
├── index.html              # Main HTML page
├── styles.css              # Application styles
├── server.js              # Node.js static file server (PORT 5000)
├── server.py              # Alternative Python server (not used in Replit)
├── main.js                # Application orchestration
├── audioCapture.js        # Web Audio API capture logic
├── audioAnalyzer.js       # Real-time audio analysis
├── meshVisualizers.js     # Visualizer implementations
├── visualizerSelector.js  # Intelligent visualizer selection
├── visualizers.js         # Legacy visualizers (if present)
├── package.json           # Project metadata
└── README.md              # Original project documentation
```

### Key Features
1. **Classic Visualizer Types**: Tornado Spiral, Cyclone Vortex, Double Spiral, Kaleidoscope, Mandala, Fractal, Tunnel Portal, Morphing, Trippy, and more
2. **Intelligent Auto-Selection**: Automatically chooses the best visualizer based on audio characteristics (frequency distribution, amplitude, spectral centroid, etc.)
3. **Smooth Transitions**: Organic morphing between different visualizers
4. **Audio Input Options**: Microphone or System Audio (requires browser permission)
5. **Immersive Fullscreen Mode**: Pitch black background with auto-hiding controls

## Recent Changes

### December 8, 2025 - Premium Visualizer Removal & Immersive UI
- Removed all 9 premium visualizers (liquid metal, plasma field, neon grid, etc.) - now classic visualizers only
- Implemented immersive fullscreen experience with pitch black (#000000) background
- Auto-hiding controls: UI fades out after 3 seconds of mouse inactivity
- Controls reappear on any mouse/keyboard/touch activity
- Transparent control overlays for minimal visual interference
- Fixed critical JavaScript error from deleted premiumVisualizers.js import

### December 1, 2025 - UI Auto-Hide & Visualizer Fixes
- Implemented YouTube-style auto-hide UI: header and controls fade out after 3 seconds of inactivity during playback
- Auto-hide only activates when visualizer is running (not before clicking Start)
- UI reappears on any mouse/keyboard/touch activity
- Fixed 7 broken visualizers that were all rendering identical mesh planes:
  - **Double Spiral (spiral1)**: Two distinct intertwined spiral arms with dots
  - **Chaotic Spiral (spiral2)**: Explosive particle spiral with connecting lines
  - **Nested Spirals (spiral3)**: Multiple concentric rotating rings
  - **Spiral Trails (spiral4)**: Particles with fading trails and glowing heads
  - **Tracing Waves**: Horizontal flowing gradient waveforms
  - **Crossing Planes**: Intersecting grid lines with nodes at intersections
  - **Combined Effects**: Mix of rings, waves, and particles

### December 1, 2025 - Replit Import Setup
- Modified `server.js` to run on port 5000 with host binding to `0.0.0.0` for Replit compatibility
- Added cache control headers to prevent browser caching issues in the Replit iframe environment
- Configured workflow to automatically start the Node.js server
- Removed browser auto-launch functionality (not needed in Replit)
- Created deployment configuration for static hosting

## User Preferences

None documented yet.

## Development Notes

### Running Locally
The application is automatically started via the "Audio Visualizer" workflow which runs:
```bash
node server.js
```

### Important Constraints
- **Browser Permissions**: Requires microphone access for visualization. Users must grant permission when prompted.
- **HTTPS/Secure Context**: Web Audio API and getUserMedia require a secure context (HTTPS or localhost). Replit provides this automatically.
- **ES6 Modules**: Uses native browser ES6 module loading, requires a web server (cannot open HTML file directly).

### Audio Analysis
The application performs sophisticated real-time analysis:
- FFT Size: 2048 samples for high resolution
- Smoothing: 0.8 (80%) for fluid visualization
- Analysis includes: amplitude, loudness, frequency distribution, spectral centroid, rhythm detection

### Deployment
Configured for Replit's static deployment since there's no backend logic - just static file serving.

## Known Issues

None currently documented.

## Future Enhancement Ideas
- Audio file upload support (currently only live input)
- Custom color themes
- Recording/export functionality
- 3D visualizations with WebGL
- VR/AR support
