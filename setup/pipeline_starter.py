"""Music Transcription Monitor — Pipeline Starter.

This is a minimal stub demonstrating the four pipeline stages:
    1. demucs_separate  — source separation (vocals / drums / bass / other)
    2. audio_to_midi    — polyphonic audio → MIDI transcription
    3. midi_clean_score — MIDI cleaning, quantization, key/signature inference
    4. render_score     — score engraving to SVG / PNG via Verovio

Each stage is a TODO; real execution belongs to a later monitoring cycle.
This file must remain valid Python 3 (parsable by `ast.parse`) so the
quarterly foundation sweep can dry-run it as a health check.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Stage 1: Source separation
# ---------------------------------------------------------------------------
def demucs_separate(input_path: str, output_dir: Optional[str] = None) -> str:
    """Separate an input audio file into stems (vocals, drums, bass, other).

    Args:
        input_path: Path to a source audio file (wav / mp3 / flac).
        output_dir: Directory where stems will be written. Defaults to
            ``out/assets/stems/<input_stem>/`` relative to the project root.

    Returns:
        Absolute path to the directory containing the separated stems.

    TODO:
        - Load ``input_path`` with ``torchaudio``.
        - Run ``demucs`` (htdemucs or htdemucs_ft) on the loaded waveform.
        - Write each stem as a 44.1 kHz wav into ``output_dir``.
        - Verify each stem is non-silent (peak amplitude > 1e-4).
    """
    print("[STAGE] demucs_separate starting...")
    project_root = Path(__file__).resolve().parent.parent
    if output_dir is None:
        output_dir = str(project_root / "out" / "assets" / "stems" / Path(input_path).stem)
    os.makedirs(output_dir, exist_ok=True)
    # Real implementation will be added in a later cycle.
    return output_dir


# ---------------------------------------------------------------------------
# Stage 2: Audio → MIDI
# ---------------------------------------------------------------------------
def audio_to_midi(input_path: str, output_path: Optional[str] = None) -> str:
    """Transcribe an audio file (typically a separated stem) to MIDI.

    Args:
        input_path: Path to an audio file (wav preferred; usually a stem
            produced by ``demucs_separate``).
        output_path: Path for the output ``.mid`` file. Defaults to
            ``out/assets/midi/<input_stem>.mid``.

    Returns:
        Absolute path to the written MIDI file.

    TODO:
        - Instantiate ``basic_pitch.InferenceManager``.
        - Run ``predict`` on ``input_path``.
        - Save the resulting ``pretty_midi.PrettyMIDI`` to ``output_path``.
        - Log note count and polyphony histogram.
    """
    print("[STAGE] audio_to_midi starting...")
    project_root = Path(__file__).resolve().parent.parent
    if output_path is None:
        output_path = str(project_root / "out" / "assets" / "midi" / (Path(input_path).stem + ".mid"))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Real implementation will be added in a later cycle.
    return output_path


# ---------------------------------------------------------------------------
# Stage 3: MIDI cleaning & score assembly
# ---------------------------------------------------------------------------
def midi_clean_score(midi_path: str, output_path: Optional[str] = None) -> str:
    """Clean a raw MIDI file and assemble it into a score representation.

    Steps (planned): velocity filtering, minimum-note-length quantization,
    key / time-signature inference, deduplication of simultaneous identical
    notes, and export to MusicXML.

    Args:
        midi_path: Path to the raw MIDI file from ``audio_to_midi``.
        output_path: Path for the cleaned MusicXML file. Defaults to
            ``out/assets/musicxml/<input_stem>.musicxml``.

    Returns:
        Absolute path to the cleaned MusicXML file.

    TODO:
        - Load MIDI via ``music21.converter`` or ``mido``.
        - Drop notes below a velocity threshold and shorter than N ticks.
        - Infer key + time signature and write them into the score.
        - Export to MusicXML at ``output_path``.
    """
    print("[STAGE] midi_clean_score starting...")
    project_root = Path(__file__).resolve().parent.parent
    if output_path is None:
        output_path = str(project_root / "out" / "assets" / "musicxml" / (Path(midi_path).stem + ".musicxml"))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Real implementation will be added in a later cycle.
    return output_path


# ---------------------------------------------------------------------------
# Stage 4: Score rendering
# ---------------------------------------------------------------------------
def render_score(score_path: str, output_path: Optional[str] = None) -> str:
    """Render a cleaned score to SVG / PNG for the dashboard.

    Args:
        score_path: Path to a MusicXML file from ``midi_clean_score``.
        output_path: Path for the rendered PNG (or SVG) file. Defaults to
            ``out/assets/png/<input_stem>.png``.

    Returns:
        Absolute path to the rendered image.

    TODO:
        - Use ``verovio.toolkit`` to load ``score_path``.
        - Configure layout options (page height, spacing, system breaks).
        - Render to SVG and rasterise to PNG at ``output_path``.
        - Verify the PNG is non-empty (width × height > 0 and non-blank pixels).
    """
    print("[STAGE] render_score starting...")
    project_root = Path(__file__).resolve().parent.parent
    if output_path is None:
        output_path = str(project_root / "out" / "assets" / "png" / (Path(score_path).stem + ".png"))
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Real implementation will be added in a later cycle.
    return output_path


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> int:
    """Run the four pipeline stages in order against a sample input.

    For the bootstrap cycle this is a smoke test: every stage logs its
    starting line and returns the expected output path. Real audio is not
    processed until a later cycle provides a sample under ``assets/``.
    """
    print("[PIPELINE] music-transcription-monitor starter")
    sample_input = os.path.join(
        Path(__file__).resolve().parent.parent, "assets", "sample.wav"
    )

    stems_dir = demucs_separate(sample_input)
    print(f"[STAGE] demucs_separate -> {stems_dir}")

    # In a real run, iterate over the stems directory produced above.
    midi_path = audio_to_midi(sample_input)
    print(f"[STAGE] audio_to_midi -> {midi_path}")

    score_path = midi_clean_score(midi_path)
    print(f"[STAGE] midi_clean_score -> {score_path}")

    image_path = render_score(score_path)
    print(f"[STAGE] render_score -> {image_path}")

    print("[PIPELINE] all stages completed (stub).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
