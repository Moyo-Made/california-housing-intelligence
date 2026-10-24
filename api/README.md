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

- `POST /predict/batch` takes `{"inputs": [ ... ]}` with 1 to 100 inputs in the same shape
  and returns `{"predicted_values_usd": [ ... ]}` in the same order. Each estimate equals
  what `/predict` returns for that input. The web app's model-response chart uses it, so
  the model runs once per chart instead of once per point.

## Setup

The API loads `housing_model.joblib`, a compressed copy of the notebook's model made with
`compress_model.py` (same trees, 33 MB instead of 145 MB). That compressed file is committed
so Vercel can build from Git; the uncompressed original stays out of git. To regenerate it:

```bash
# The notebook's output, renamed:
shasum -a 256 housing_model.uncompressed.joblib
# feebf328e1c6c216b7e45a034ddf8e07759c2838945ebc90baebc4f91930b4b2

.venv/bin/python compress_model.py housing_model.uncompressed.joblib housing_model.joblib \
    ../notebook/california_housing.csv
# trees identical: True
# predictions bit-identical on 20640 rows: True

shasum -a 256 housing_model.joblib
# 7160e2b6f680776060f9d5a83c7aaf2ce99f2b0012c6f63153fe6b1efa3f1e04
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

## Deployment

Deployed on Vercel as its own project (`california-housing-api`), at
https://california-housing-api.vercel.app. Vercel builds the FastAPI app from `main.py`
with Python 3.13 (`.python-version`) and `requirements.txt`; `vercel.json` sets the
framework. `.vercelignore` uploads the compressed model and leaves out the virtual
environment and the uncompressed model.

Pushing to `main` deploys automatically: the Vercel project's root directory is `api/`, and
`ignoreCommand` skips the build when nothing in this folder changed.

## Model compression

The saved model was re-saved with joblib compression. For every variant:

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

Compression shrinks the file, which helps deploy uploads. It doesn't reduce memory, because
the trees are fully expanded after loading. The API ships the zlib-3 variant: it loads
fastest of the compressed versions.
