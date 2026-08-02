# Music Transcription Monitor - Transcription App

This is a standalone web application for audio transcription and music notation visualization, designed to work as part of the Music Transcription Monitor project.

## Features

### Three-Panel Interface
1. **Left Panel - File + Waveform**
   - Drag & drop audio file support
   - Waveform visualization using Wavesurfer.js
   - Interactive region selection for segmenting audio
   - Quality tagging (keeper/maybe/discard) for segments
   - Export selected segments as individual WAV files
   - Playback controls with play/pause/stop

2. **Center Panel - Transcription Output**
   - Real-time transcription display (simulated in this demo)
   - Progress tracking for analysis processes
   - Timestamped transcription segments
   - Live mode toggle for continuous processing

3. **Right Panel - Chart Preview**
   - Live music notation rendering using VexFlow
   - Export options:
     - SVG (vector graphics)
     - PDF (via html2canvas + jsPDF)
     - MusicXML (placeholder for future implementation)

## Technical Implementation

### Core Technologies
- **Web Audio API** - Audio decoding and processing
- **Wavesurfer.js** - Waveform visualization and interaction
- **VexFlow** - Music notation rendering
- **Web Workers** - Background processing for:
  - Whisper speech-to-text (via transformers.js)
  - pYIN pitch detection (using SharedArrayBuffer)
  - madmom DBN beat tracking
- **html2canvas + jsPDF** - PDF export functionality

### Processing Pipeline (Planned)
1. **Audio Input** → File API → Web Audio API
2. **Waveform Generation** → Wavesurfer.js visualization
3. **Parallel Processing** (Web Workers):
   - Speech-to-Text: Whisper via transformers.js
   - Pitch Detection: pYIN algorithm
   - Beat Tracking: madmom DBN
4. **Notation Rendering** → VexFlow staff generation
5. **Export Options** → SVG, PDF, MusicXML, WAV segments

## Usage

### Development
1. Clone the Music Transcription Monitor repository
2. Navigate to `transcriber-app/` directory
3. Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge)
   OR
4. Run a local server: `python3 -m http.server 8080`
5. Visit `http://localhost:8080`

### Features Currently Implemented
- File drag & drop or browse selection
- Waveform visualization with interactive regions
- Playback controls (play/pause/stop)
- Segment quality tagging
- Segment export as WAV files
- Basic UI layout with three panels
- Placeholder transcription display
- VexFlow notation container (ready for implementation)
- Export buttons with SVG/PDF/MusicXML stubs

### Features to Implement
1. **Web Worker Setup**:
   - Create workers for Whisper (transformers.js)
   - Create workers for pYIN pitch detection
   - Create workers for beat tracking (madmom DBN)
   
2. **Audio Processing Pipeline**:
   - Connect Web Audio API output to workers
   - Implement SharedArrayBuffer for pitch data sharing
   - Process audio buffers in real-time chunks

3. **Transcription Integration**:
   - Display real-time Whisper transcription results
   - Update segment text with recognized speech
   - Handle streaming/partial results

4. **Notation Generation**:
   - Convert pitch/onset data to VexFlow notes
   - Render evolving music notation in real-time
   - Handle measure layout and line breaking

5. **Export Functionality**:
   - Implement actual SVG generation from VexFlow
   - Complete PDF export with proper formatting
   - Add MusicXML export using musicxml library
   - Enhance WAV export with metadata

## Project Structure
```
transcriber-app/
├── index.html          # Main application interface
├── css/
│   └── style.css       # Styling for all components
├── js/
│   └── main.js         # Application logic and UI interactions
└── README.md           # This file
```

## Browser Compatibility
- Requires modern browser with support for:
  - Web Audio API
  - ES6 Modules
  - Web Workers
  - SharedArrayBuffer (requires HTTPS or localhost)
  - Blob URLs and object URLs
  - ES6 Promises and async/await

Tested with:
- Chrome 109+
- Firefox 108+
- Safari 15+
- Edge 109+

## Integration with Music Transcription Monitor
This application can be integrated into the main Music Transcription Monitor dashboard by:
1. Placing it in the `dashboard/` directory
2. Linking from the main dashboard interface
3. Sharing data via localStorage or IndexedDB for persistence
4. Using the same audio analysis pipelines as the main project

## Future Enhancements
- Real-time microphone input processing
- Multi-track audio separation (using Demucs integration)
- Advanced notation features (lyrics, dynamics, articulations)
- Collaboration features (share/export projects)
- Machine learning model selection (Whisper variants)
- Customizable transcription parameters
- Batch processing capabilities

---
*Built as part of the Music Transcription Monitor project*
*For more information, see the main repository: https://github.com/kajica2/music-transcription-monitor*