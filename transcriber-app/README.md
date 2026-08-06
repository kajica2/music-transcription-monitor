# Transcriber — Solo Instrument AMT

Browser-only solo instrument automatic music transcription. No server, no external API calls.

## Features

### Pitch Detection
- **ACF2+ autocorrelation** with parabolic interpolation — runs entirely in the main thread via `requestAnimationFrame`, no Web Workers required
- Adjustable **sensitivity** and **minimum note duration** sliders
- Live Hz readout overlay on the waveform while recording from mic

### Audio Sources
- **File**: drag & drop or browse — any format the browser's Web Audio API can decode (MP3, WAV, OGG, FLAC, M4A, etc.)
- **Microphone**: live real-time pitch detection loop — speak or play an instrument directly into the browser

### Notation
- **VexFlow** renders detected pitches as standard music notation (treble clef, accidentals, beams)
- Render controls: zoom, re-render from any note index, "Render" button

### Exports (all browser-side)
| Format | Notes |
|--------|-------|
| **SVG** | Vector notation — open in any vector editor |
| **PDF** | Rasterized via html2canvas + jsPDF |
| **MIDI** | Binary Standard MIDI File (Format 1) — 480 ticks/qtr, NoteOn/NoteOff events |
| **MusicXML** | Valid Partwise 3.1 document — open in Dorico, Finale, MuseScore, LilyPond |
| **WAV segments** | Per-region audio slices with quality tags |

### Quality Tagging
Each region can be marked **Keeper / Maybe / Discard** with color-coded segments. Export WAV only the segments you want.

### Piano Roll
Collapsible canvas visualization of all detected notes — time on X, pitch on Y, clarity-coded opacity. Click the header to expand/collapse.

### Debug Log
Every pitch detection event, note finalization, export action, and error is timestamped and displayed. Copy or clear the log at any time. Useful for understanding why a note was missed or an export failed.

### Theme
Dark/light toggle — inherits the MTM dashboard design tokens (teal accent). Theme preference is saved to `localStorage`.

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `M` | Toggle microphone |
| `Esc` | Stop all |

## File Layout
```
transcriber-app/
├── index.html         # App shell
├── css/style.css      # Full design system (dark/light, all components)
├── js/main.js         # ACF pitch detection, VexFlow, MIDI, MusicXML, piano roll
└── README.md          # This file
```

## Usage

Open directly in a browser:
```
open transcriber-app/index.html
```

Or serve locally:
```bash
cd transcriber-app && python3 -m http.server 8080
# → http://localhost:8080
```

## Architecture Notes

### ACF Pitch Detection (`acfPitch`)
1. Silence detection via RMS vs. sensitivity-adjusted threshold
2. Normalized autocorrelation for lag ∈ [sampleRate/2000, sampleRate/60]
3. First-peak detection (local max > neighbors) in ACF
4. Parabolic interpolation (±0.5 bin refinement) for sub-bin accuracy
5. Clarity = normalized ACF value at peak lag (0 = noise, 1 = perfectly periodic)
6. Notes are **finalized** when pitch changes by >2.5% or clarity jumps >0.2

### MIDI File Format
- **Format 1** (one tempo track + one note track)
- 480 ticks per quarter note
- NoteOn (0x90) / NoteOff (0x80) events, delta-VLQ encoded
- Yields a valid `.mid` file openable in any DAW or notation app

### MusicXML
- Partwise 3.1 — single `<measure>` with `<note>` elements
- Duration in divisions (480/qtr note)
- Pitch step + octave + optional alter for accidentals

## Browser Requirements
- Web Audio API (all modern browsers)
- `navigator.mediaDevices.getUserMedia` for microphone (requires HTTPS or localhost)
- ES6+ (modules not required — everything is a single IIFE bundle)
