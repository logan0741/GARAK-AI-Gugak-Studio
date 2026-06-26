# AI pipeline layout

AI code is grouped by pipeline stage so backend runtime code is separated from data collection and training scripts.

## Stages

- `00_ingestion`: download, extract, and organize external source data.
- `01_preprocessing`: transform source audio or user recordings into normalized analysis/training assets.
- `02_training`: build Markov/onset/segment models from prepared audio data.
- `03_runtime`: modules imported by the backend for live generation. Keep this folder free of download/training side effects.

## Shared data directories

- `AI/data`: phrase WAV data used by rhythm/segment training.
- `AI/data_instruments`: instrument note/phrase data used by pitch Markov training.
- `AI/models`: generated model files.
- `AI/segments`: exported phrase segments used for accompaniment generation.

