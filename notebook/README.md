# Notebook: training and evaluation

`california_housing.ipynb` explores the California Housing dataset, compares a median
baseline, Linear Regression and a Random Forest, and saves the final Random Forest as
`housing_model.joblib`.

## Data

`california_housing.csv` holds 20,640 rows, 8 features and the target `MedHouseVal`
(in units of $100,000). Each row is a census block group from the 1990 US Census
(Pace & Barry, 1997), not an individual house. The notebook references the copy at
https://data.mendeley.com/datasets/hhb6nwfft8/1.

## Environment

Python 3.13.5. `requirements.in` lists the direct dependencies and `requirements.txt` is
the full frozen environment.

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/jupyter lab
```

Choose the `.venv` kernel. Running the notebook writes `housing_model.joblib` next to it.
Model files are gitignored.

## Reproducibility check (2026-10-24)

The notebook was re-executed headlessly in a fresh environment built from these files:

```bash
.venv/bin/jupyter nbconvert --to notebook --execute --output executed.ipynb california_housing.ipynb
```

- All 31 code-cell text outputs were identical to the committed outputs.
- The retrained `housing_model.joblib` was byte-identical to the model the API serves:
  SHA-256 `feebf328e1c6c216b7e45a034ddf8e07759c2838945ebc90baebc4f91930b4b2`.

A full run takes about 5 minutes on a laptop.

## Reported results

Test MAE on the 20% hold-out (4,128 block groups, `random_state=42`):

| Model | Test MAE |
|---|---:|
| Median baseline | $87,403.99 |
| Linear Regression | $53,320.01 |
| Random Forest (saved model) | $32,773.11 |

The Random Forest's training MAE is $12,209.52.

Limitations to keep in mind when quoting these numbers:

- The split is random, not geographic. Neighbouring block groups can appear in both the
  training and test sets, so the test MAE is likely optimistic for unfamiliar areas.
- The test set was evaluated several times during development, so it is not a strictly
  untouched final check.
- The target is capped at 5.00001 ($500,001) for 992 rows. `MedInc` is capped at 15 and
  `HouseAge` at 52.
