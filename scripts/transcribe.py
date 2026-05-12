#!/usr/bin/env python3
"""
Transcribes an audio file using mlx-whisper (Apple Silicon native).
Usage: python3 transcribe.py <audio_file_path>
Outputs: plain text transcript to stdout
"""
import sys
import os

if len(sys.argv) < 2:
    print("Usage: python3 transcribe.py <audio_file>", file=sys.stderr)
    sys.exit(1)

audio_path = sys.argv[1]
if not os.path.exists(audio_path):
    print(f"File not found: {audio_path}", file=sys.stderr)
    sys.exit(1)

model = os.environ.get("WHISPER_MODEL", "mlx-community/whisper-small-mlx")

try:
    # Add bundled ffmpeg to PATH so mlx-whisper can find it
    # Ensure ~/bin/ffmpeg is on PATH (symlink to bundled imageio-ffmpeg binary)
    home_bin = os.path.expanduser('~/bin')
    if home_bin not in os.environ.get('PATH', ''):
        os.environ['PATH'] = home_bin + os.pathsep + os.environ.get('PATH', '')

    import mlx_whisper
    result = mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo=model,
        verbose=False
    )
    text = result["text"].strip()
    # Strip mlx-whisper debug lines that leak to stdout
    lines = [l for l in text.split('\n') if not l.startswith('Detected language:')]
    print('\n'.join(lines).strip())
except ImportError:
    print("mlx-whisper not installed. Run: pip3 install mlx-whisper", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Transcription failed: {e}", file=sys.stderr)
    sys.exit(1)
