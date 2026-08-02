// Main JavaScript file for the Music Transcription Monitor

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let wavesurfer = null;
    let audioBuffer = null;
    let audioContext = null;
    let isPlaying = false;
    
    // Initialize WaveSurfer
    const initWaveSurfer = () => {
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'violet',
            progressColor: 'purple',
            cursorWidth: 1,
            height: 100,
            barWidth: 2,
            responsive: true,
            fillParent: true,
            hideScrollbar: true,
            plugins: [
                WaveSurfer.regions.create({
                    dragSelection: {
                        slop: 5
                    }
                })
            ]
        });
        
        // Region selection event
        wavesurfer.on('region-update-end', (region) => {
            // Update segment quality when region is modified
            updateSegmentQuality(region);
        });
        
        // Region created event
        wavesurfer.on('region-created', (region) => {
            // Set default quality to 'maybe'
            region.data = { quality: 'maybe' };
            updateSegmentQuality(region);
            addTranscriptionSegment(region);
        });
        
        // Region removed event
        wavesurfer.on('region-removed', (region) => {
            removeTranscriptionSegment(region);
        });
    };
    
    // Handle file drop and input
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const exportSegmentsBtn = document.getElementById('export-segments');
    const qualitySelect = document.getElementById('quality-select');
    const liveModeCheckbox = document.getElementById('live-mode');
    const transcriptionProgress = document.getElementById('transcription-progress');
    const transcriptionText = document.getElementById('transcription-text');
    const svgOutput = document.getElementById('svg-output');
    const exportSvgBtn = document.getElementById('export-svg');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportMusicXmlBtn = document.getElementById('export-musicxml');
    
    // File handling
    const handleFile = (file) => {
        if (!file.type.match('audio.*')) {
            alert('Please upload an audio file');
            return;
        }
        
        // Show progress
        transcriptionProgress.textContent = 'Loading audio file...';
        
        // Create file URL
        const fileURL = URL.createObjectURL(file);
        
        // Load audio into WaveSurfer
        if (wavesurfer) {
            wavesurfer.load(fileURL);
        }
        
        // Decode audio for processing
        decodeAudio(file);
        
        // Enable controls
        playBtn.disabled = false;
        stopBtn.disabled = false;
        exportSegmentsBtn.disabled = false;
        
        // Reset UI
        transcriptionText.innerHTML = '';
        transcriptionProgress.textContent = 'Analyzing audio...';
        
        // Start processing workers (placeholder)
        startProcessing();
    };
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    });
    
    // File input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });
    
    // Playback controls
    playBtn.addEventListener('click', () => {
        if (wavesurfer) {
            wavesurfer.playPause();
            isPlaying = wavesurfer.isPlaying();
            playBtn.textContent = isPlaying ? 'Pause' : 'Play';
        }
    });
    
    stopBtn.addEventListener('click', () => {
        if (wavesurfer) {
            wavesurfer.stop();
            isPlaying = false;
            playBtn.textContent = 'Play';
        }
    });
    
    // Export segments
    exportSegmentsBtn.addEventListener('click', () => {
        exportSelectedSegments();
    });
    
    // Export SVG
    exportSvgBtn.addEventListener('click', () => {
        exportAsSVG();
    });
    
    // Export PDF
    exportPdfBtn.addEventListener('click', () => {
        exportAsPDF();
    });
    
    // Export MusicXML
    exportMusicXmlBtn.addEventListener('click', () => {
        exportAsMusicXML();
    });
    
    // Decode audio file to AudioBuffer for processing
    function decodeAudio(file) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            audioContext.decodeAudioData(e.target.result, (buffer) => {
                audioBuffer = buffer;
                transcriptionProgress.textContent = 'Audio loaded, starting analysis...';
            }, (err) => {
                console.error('Error decoding audio:', err);
                transcriptionProgress.textContent = 'Error decoding audio';
            });
        };
        fileReader.onerror = (err) => {
            console.error('Error reading file:', err);
            transcriptionProgress.textContent = 'Error reading file';
        };
        fileReader.readAsArrayBuffer(file);
    }
    
    // Update segment quality UI
    function updateSegmentQuality(region) {
        const quality = region.data.quality || 'maybe';
        const element = region.element;
        element.dataset.quality = quality;
        
        // Update colors based on quality
        switch (quality) {
            case 'keeper':
                element.style.borderLeftColor = 'var(--keeper-color)';
                element.style.backgroundColor = '#f0fff4';
                break;
            case 'maybe':
                element.style.borderLeftColor = 'var(--maybe-color)';
                element.style.backgroundColor = '#fffbf0';
                break;
            case 'discard':
                element.style.borderLeftColor = 'var(--discard-color)';
                element.style.backgroundColor = '#fff0f0';
                break;
        }
    }
    
    // Add a transcription segment to the UI
    function addTranscriptionSegment(region) {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = `segment ${region.data.quality || 'maybe'}`;
        segmentDiv.dataset.regionId = region.id;
        
        const timeStr = `${formatTime(region.start)} - ${formatTime(region.end)}`;
        segmentDiv.innerHTML = `
            <div class="segment-header">
                <span>${timeStr}</span>
                <span class="quality-badge">${region.data.quality || 'maybe'}</span>
            </div>
            <div class="segment-text">Processing...</div>
        `;
        
        transcriptionText.appendChild(segmentDiv);
        return segmentDiv;
    }
    
    // Remove a transcription segment from the UI
    function removeTranscriptionSegment(region) {
        const segments = transcriptionText.querySelectorAll(`.segment[data-region-id="${region.id}"]`);
        segments.forEach(segment => segment.remove());
    }
    
    // Update transcription segment text
    function updateTranscriptionSegment(regionId, text) {
        const segment = transcriptionText.querySelector(`.segment[data-region-id="${regionId}"] .segment-text`);
        if (segment) {
            segment.textContent = text;
        }
    }
    
    // Format time in MM:SS.mmm format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    }
    
    // Export selected segments as WAV files
    function exportSelectedSegments() {
        if (!wavesurfer || !audioBuffer) {
            alert('Please load an audio file first');
            return;
        }
        
        const regions = wavesurfer.regions.list;
        const selectedRegions = Object.values(regions).filter(region => 
            region.element.classList.contains('selected') || 
            (qualitySelect.value === 'all' && true) ||
            region.data.quality === qualitySelect.value
        );
        
        if (selectedRegions.length === 0) {
            alert('No segments selected for export');
            return;
        }
        
        selectedRegions.forEach((region, index) => {
            const startFrame = Math.floor(region.start * audioBuffer.sampleRate);
            const endFrame = Math.floor(region.end * audioBuffer.sampleRate);
            const length = endFrame - startFrame;
            
            // Create a new AudioBuffer for the segment
            const segmentBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                length,
                audioBuffer.sampleRate
            );
            
            // Copy channel data
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const inputChannel = audioBuffer.getChannelData(channel);
                const outputChannel = segmentBuffer.getChannelData(channel);
                outputChannel.set(inputChannel.subarray(startFrame, endFrame));
            }
            
            // Encode as WAV and trigger download
            const wavBlob = encodeWAV(segmentBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `segment-${index + 1}-${formatTime(region.start)}-${formatTime(region.end)}.wav`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    // Encode AudioBuffer as WAV blob
    function encodeWAV(buffer) {
        const bufferLength = buffer.length * buffer.numberOfChannels * 2; // 16-bit
        const wavBuffer = new ArrayBuffer(44 + bufferLength);
        const view = new DataView(wavBuffer);
        
        // RIFF header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bufferLength, true); // chunk size
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // subchunk1 size
        view.setUint16(20, 1, true); // audio format (PCM)
        view.setUint16(22, buffer.numberOfChannels, true); // num channels
        view.setUint32(24, buffer.sampleRate, true); // sample rate
        view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true); // byte rate
        view.setUint16(32, buffer.numberOfChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeString(view, 36, 'data');
        view.setUint32(40, bufferLength, true); // subchunk2 size
        
        // Write PCM data
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                let sample = buffer.getChannelData(channel)[i]; // -1.0 to 1.0
                sample = Math.max(-1, Math.min(1, sample)); // clamp
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF; // scale to 16-bit
                view.setInt16(offset, sample, true); // little endian
                offset += 2;
            }
        }
        
        return new Blob([wavBuffer], { type: 'audio/wav' });
    }
    
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    // Export as SVG using VexFlow
    function exportAsSVG() {
        if (!svgOutput.innerHTML) {
            alert('No notation to export');
            return;
        }
        
        const serializer = new XMLSerializer();
        const svgSource = serializer.serializeToString(svgOutput.querySelector('svg'));
        
        const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcription.svg';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // Export as PDF using html2canvas and jsPDF
    async function exportAsPDF() {
        if (!svgOutput.innerHTML) {
            alert('No notation to export');
            return;
        }
        
        try {
            // Load required libraries if not already loaded
            if (!window.html2canvas || !window.jspdf) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            
            const { jsPDF } = window.jspdf;
            const element = document.getElementById('svg-output');
            
            const canvas = await html2canvas(element);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('transcription.pdf');
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('PDF export failed. See console for details.');
        }
    }
    
    // Export as MusicXML (placeholder - would require musicxml library)
    function exportAsMusicXML() {
        alert('MusicXML export not implemented in this demo');
    }
    
    // Helper to load external scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Placeholder for starting processing workers
    function startProcessing() {
        // In a real implementation, we would:
        // 1. Create a Web Worker for pYIN pitch detection (using SharedArrayBuffer)
        // 2. Create a Web Worker for Whisper transcription (using transformers.js)
        // 3. Create a Web Worker for beat tracking (madmom DBN)
        // 4. Process the audioBuffer and send results to update the UI
        
        transcriptionProgress.textContent = 'Processing audio (simulated)...';
        
        // Simulate processing delay
        setTimeout(() => {
            transcriptionProgress.textContent = 'Processing complete!';
            
            // Simulate some transcription results
            const regions = wavesurfer.regions.list;
            let index = 0;
            for (const id in regions) {
                const region = regions[id];
                // Simulate different transcription results
                const sampleTexts = [
                    "The quick brown fox jumps over the lazy dog.",
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                    "Music is the universal language of mankind.",
                    "Where words fail, music speaks.",
                    "Life is what happens when you're busy making other plans."
                ];
                const text = sampleTexts[index % sampleTexts.length] || "Transcribed text";
                updateTranscriptionSegment(id, text);
                index++;
            }
        }, 2000);
    }
    
    // Initialize the application
    function init() {
        initWaveSurfer();
        
        // Set initial button states
        playBtn.disabled = true;
        stopBtn.disabled = true;
        exportSegmentsBtn.disabled = true;
    }
    
    // Start the application
    init();
});

// Make sure to include the following in your HTML:
// <script src="https://unpkg.com/wavesurfer.js@7"></script>
// <script src="https://unpkg.com/vexflow"></script>
// And the CSS and HTML structure as defined in the previous files