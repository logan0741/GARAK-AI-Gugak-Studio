# 01_preprocessing

Audio cleanup, separation, and note extraction scripts.

## Files

- `audio_preprocess.py`: shared audio preprocessing helpers.
- `preprocess_recording.py`: normalizes uploaded/user recording audio for analysis.
- `separate_ensemble.py`: separates ensemble audio and stores usable training WAVs.
- `extract_notes_from_phrases.py`: extracts note samples from phrase audio.
- `extract_janggu_hits.py`: extracts janggu hit samples from existing segments.

Outputs from this stage should feed `02_training` or runtime sample directories.

