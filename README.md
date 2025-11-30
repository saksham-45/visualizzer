# Advanced Audio Visualizer

A comprehensive, Apple Music-style audio visualizer system that intelligently adapts to your audio in real-time.

## Features

###  Multiple Visualization Types

1. **Wave Form** - Classic waveform visualization, perfect for rhythmic content
2. **Circle Wave** - Circular wave derived from audio, ideal for bass-heavy tracks
3. **Frequency Bars** - Bar chart showing frequency spectrum, great for complex audio
4. **Particle System** - Dynamic particles responding to audio, best for bright, high-frequency content
5. **Spiral Wave** - Flowing spiral visualization, excellent for melodic music
6. **Spectrum Circle** - Circular frequency spectrum, optimal for full-spectrum audio

### Intelligent Visualizer Selection

The system analyzes your audio in real-time and automatically selects the best visualizer based on:

- **Frequency Distribution** - Bass, mid, and treble balance
- **Spectral Centroid** - Brightness of the audio
- **Spectral Spread** - Width of frequency distribution
- **Amplitude & Loudness** - Volume characteristics
- **Energy Bands** - Energy across 7 frequency bands (sub-bass to brilliance)
- **Rhythm Analysis** - Beat detection and variance

### 🎵 Audio Input Options

- **Microphone** - Real-time audio from your microphone
- **System Audio** - Capture audio from your system (requires browser permission to share tab/window audio)

###  Smooth Transitions

Visualizers transition smoothly between each other with fade effects, creating a seamless experience.

## How It Works

### Audio Capture (`audioCapture.js`)

Uses the Web Audio API to capture audio with:
- High-resolution FFT (2048 samples)
- Low-latency processing
- Smooth time constants for fluid visualization

### Audio Analysis (`audioAnalyzer.js`)

Performs real-time analysis to extract:
- **Amplitude** - Overall volume level (0-1)
- **Loudness** - Decibel measurement
- **Dominant Frequency** - Peak frequency in the spectrum
- **Frequency Distribution** - Low/mid/high balance
- **Energy Bands** - 7-band frequency analysis
- **Spectral Centroid** - Brightness indicator
- **Spectral Spread** - Frequency width
- **Rhythm** - Beat detection and stability

### Visualizer Selector (`visualizerSelector.js`)

Intelligently scores each visualizer based on audio characteristics:

- **Wave**: Best for rhythmic, moderate-dynamics content
- **Circle**: Optimal for bass-heavy tracks
- **Bars**: Ideal for complex, multi-band frequency content
- **Particles**: Perfect for bright, high-frequency audio
- **Spiral**: Excellent for stable, melodic content
- **Spectrum**: Best for full-spectrum, balanced audio

The selector prevents rapid switching by requiring a minimum change threshold.

### Visualizers (`visualizers.js`)

Each visualizer:
- Renders in real-time at 60fps
- Uses gradient colors based on audio metadata
- Adapts size/intensity based on amplitude
- Smoothly transitions when switching

## Usage

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari)
2. Click "Start" to begin
3. Grant microphone permissions when prompted
4. Toggle "Auto-Select Visualizer" to enable intelligent selection
5. Or manually select a visualizer from the dropdown

### For System Audio

1. Select "System Audio" from the dropdown
2. Click "Start"
3. When prompted, select the tab/window you want to capture audio from
4. The visualizer will display the audio from that source

## Technical Details

### Performance Optimizations

- High-resolution FFT (2048) for smooth visualization
- Efficient canvas rendering with hardware acceleration
- Smoothing time constants to reduce jitter
- History-based analysis to prevent rapid switching

### Browser Compatibility

- Chrome/Edge: Full support (including system audio via screen capture)
- Firefox: Full support (microphone only)
- Safari: Full support (microphone only)

### Audio Analysis Parameters

- **FFT Size**: 2048 samples
- **Sample Rate**: 44.1 kHz
- **Smoothing**: 0.8 (80% smoothing)
- **Frequency Bins**: 1024

## Architecture

```
index.html
├── audioCapture.js      - Audio input handling
├── audioAnalyzer.js     - Real-time audio analysis
├── visualizers.js       - All visualization types
├── visualizerSelector.js - Intelligent selection logic
└── main.js              - Application orchestration
```

## Future Enhancements

- Audio file upload support
- Custom visualizer themes
- Recording/export functionality
- 3D visualizations
- VR/AR support
- Machine learning-based visualizer selection

## License

MIT License - Feel free to use and modify!

