"""Summary statistics of the training CSV, used by the web app's feature ranges.

Run: .venv/bin/python feature_stats.py
Prints JSON. Copy the values into web/lib/housing/features.ts when the data changes.
"""

import json

import pandas as pd

df = pd.read_csv("california_housing.csv")
stats = {
    name: {
        "min": round(float(col.min()), 4),
        "p1": round(float(col.quantile(0.01)), 4),
        "median": round(float(col.median()), 4),
        "p99": round(float(col.quantile(0.99)), 4),
        "max": round(float(col.max()), 4),
    }
    for name, col in df.drop(columns=["MedHouseVal"]).items()
}
target = df["MedHouseVal"]
stats["_target"] = {
    "rows": len(df),
    "max": float(target.max()),
    "rows_at_max": int((target == target.max()).sum()),
}
print(json.dumps(stats, indent=2))
