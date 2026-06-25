# 02_training

Model and segment build scripts.

## Files

- `onset_detection.py`: onset detection utilities.
- `clustering.py`: pattern clustering utilities.
- `markov_builder.py`: rhythm/phrase Markov model builder.
- `train_markov.py`: trains accompaniment/rhythm Markov models from `AI/data`.
- `train_pitch_markov.py`: trains pitch Markov models from `AI/data_instruments`.
- `export_segments.py`: exports phrase segments into `AI/segments`.

The backend does not import this stage directly. Generated artifacts are consumed from `AI/models` and `AI/segments`.

