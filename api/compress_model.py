"""Re-save the trained model with joblib compression, proving nothing changed.

The notebook writes an uncompressed model (145 MB). Compressed with zlib level 3
it is 33 MB, which deploys faster. This script checks that all 100 trees are
identical (structure, thresholds, leaf values) and that predictions on the full
dataset are bit-identical when trees are summed in order (n_jobs=1).

Usage:
    .venv/bin/python compress_model.py SOURCE.joblib DEST.joblib ../notebook/california_housing.csv
"""

import sys

import joblib
import numpy as np
import pandas as pd

TREE_FIELDS = ["children_left", "children_right", "feature", "threshold", "value", "n_node_samples"]


def load(path):
    model = joblib.load(path)
    model.n_jobs = 1  # sequential tree summation, so float results are deterministic
    return model


def main(source, dest, csv_path):
    original = load(source)
    joblib.dump(original, dest, compress=("zlib", 3))
    compressed = load(dest)

    trees_identical = len(original.estimators_) == len(compressed.estimators_) and all(
        np.array_equal(getattr(a.tree_, field), getattr(b.tree_, field))
        for a, b in zip(original.estimators_, compressed.estimators_)
        for field in TREE_FIELDS
    )
    features = pd.read_csv(csv_path).drop(columns=["MedHouseVal"])
    predictions_identical = np.array_equal(original.predict(features), compressed.predict(features))

    print(f"trees identical: {trees_identical}")
    print(f"predictions bit-identical on {len(features)} rows: {predictions_identical}")
    if not (trees_identical and predictions_identical):
        raise SystemExit("compressed model differs from the original")


if __name__ == "__main__":
    main(*sys.argv[1:4])
