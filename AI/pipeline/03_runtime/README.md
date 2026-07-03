# 03_runtime

Backend-facing generation modules.

## Files

- `pitch_markov.py`: loads pitch models and generates pitch sequences.
- `solo_generator.py`: renders one-instrument continuation WAV files.
- `ensemble_generator.py`: renders accompaniment/ensemble continuation WAV files.

The FastAPI backend imports this folder through `sys.path`. Avoid adding training, download, or long-running batch logic here.

