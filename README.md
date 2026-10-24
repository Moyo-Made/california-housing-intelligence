# California Housing Intelligence

An educational machine-learning project. A Random Forest trained on 1990 California census
block groups estimates an area's median home value. The model is served by a small API and
explored through a web interface.

It is not a property valuation tool. The data is from 1990, each record describes a
geographic area rather than a house, and the target is capped at $500,000.

| Folder | What it is |
|---|---|
| [`notebook/`](notebook/) | Data exploration, training and evaluation (Jupyter, scikit-learn) |
| [`api/`](api/) | FastAPI service that loads the saved model and serves `POST /predict` |
| [`web/`](web/) | Next.js frontend |

Each folder's README covers setup. All environments are pinned, and the training run has
been reproduced byte-for-byte (see `notebook/README.md`).

## Live

- App: https://california-housing-intelligence.vercel.app
- API: https://california-housing-api.vercel.app (`POST /predict`)

Both run on Vercel as separate projects. The app's server calls the API using the
`BACKEND_URL` environment variable; the browser never calls the API directly.
