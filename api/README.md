# API: FastAPI inference service

Loads `housing_model.joblib` and serves predictions.

## Endpoints

- `GET /` returns a health message.
- `POST /predict` takes a body with these eight features (names are case-sensitive):

```json
{ "MedInc": 8.3252, "HouseAge": 41, "AveRooms": 6.984127, "AveBedrms": 1.02381,
  "Population": 322, "AveOccup": 2.555556, "Latitude": 37.88, "Longitude": -122.23 }
```

It returns `{"predicted_value_usd": 430217.29}`: the model output (units of $100,000)
converted to US dollars and rounded to cents. Invalid input returns FastAPI's standard 422.

## Setup

The model is not in git. Copy it in and check its checksum:

```bash
shasum -a 256 housing_model.joblib
# feebf328e1c6c216b7e45a034ddf8e07759c2838945ebc90baebc4f91930b4b2
```

Then build the environment and start the server:

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload        # http://127.0.0.1:8000
```

## Environment notes

- **Versions match training.** The scikit-learn, numpy, pandas, scipy and joblib versions
  in `requirements.in` are the ones the model was trained with (see
  `../notebook/requirements.in`). A joblib pickle is only reliable in the scikit-learn
  version that saved it.
- **Why this matters.** Before this setup, the API ran on Anaconda's base Python with
  scikit-learn 1.6.1, and loading the model raised `InconsistentVersionWarning`.
  Predictions happened to match (checked on all 4,128 test rows), but that wasn't guaranteed.
- **Verified with the pinned environment:**
  - the model loads with no warnings
  - test MAE is $32,773.11
  - the example above returns `430217.29`
- **Last-digit noise.** The forest predicts with `n_jobs=-1`, so tree outputs are added up
  in parallel and the float summation order varies between calls. Results differ by about
  1e-15 (in units of $100,000), which never affects the rounded-to-cents output.

## Model compression investigation (not applied)

The saved model was re-saved with joblib compression. For every variant:

- all 100 trees are identical in structure, thresholds and leaf values;
- predictions on all 20,640 rows, with sequential summation (`n_jobs=1`), are bit-identical
  to the original's.

| Variant | Size | Load time | Peak memory | Dump time |
|---|---:|---:|---:|---:|
| original (uncompressed) | 144.7 MB | 1.8 s | ~400 MB | — |
| `compress=("zlib", 3)` | 32.8 MB | 2.4 s | ~415 MB | 1.6 s |
| `compress=("zlib", 9)` | 30.2 MB | 2.8 s | ~415 MB | 29.5 s |
| `compress=("lzma", 3)` | 23.5 MB | 3.9 s | ~410 MB | 15.1 s |

Compression shrinks the file, which helps git hosting and deploy uploads. It doesn't reduce
memory, because the trees are fully expanded after loading. Which variant to ship is still
to be decided.
