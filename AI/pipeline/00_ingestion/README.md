# 00_ingestion

External data acquisition and dataset organization scripts.

## Files

- `download_phrase_api.py`: downloads phrase-level Gugak API audio into `AI/data`.
- `download_monotone_api.py`: downloads monotone/instrument note samples when available.
- `extract_aihub.py`: extracts AIHub source archives into a local training dataset.
- `extract_instruments.py`: extracts instrument-specific data into `AI/data_instruments`.
- `organize_samples.py`: prepares runtime sample WAV files under `back/static/samples`.

Run these before preprocessing or model training when source data is missing or refreshed.

