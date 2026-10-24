/**
 * Facts about the served model, as recorded in notebook/california_housing.ipynb.
 * The notebook was re-run on 2026-10-24 and reproduced these outputs and the
 * model file exactly. Update this file whenever the model is retrained.
 */
export const MODEL_FACTS = {
  model: "Random Forest regressor (100 trees, unlimited depth)",
  library: "scikit-learn 1.9.1",
  modelSha256: "feebf328e1c6c216b7e45a034ddf8e07759c2838945ebc90baebc4f91930b4b2",

  dataset: {
    source: "1990 US Census block groups (Pace & Barry, 1997)",
    rows: 20_640,
    trainRows: 16_512,
    testRows: 4_128,
    /** Random 80/20 split with random_state=42; not split by geography. */
    split: "random",
    /** Target values are capped; 965 rows sit exactly at the cap. */
    targetCapUsd: 500_001,
    rowsAtTargetCap: 965,
  },

  /** Mean absolute error on the 4,128-row test set, in 1990 US dollars. */
  testMaeUsd: {
    medianBaseline: 87_403.99,
    linearRegression: 53_320.01,
    randomForest: 32_773.11,
  },
  /** The baseline always predicts the training set's median value. */
  baselinePredictionUsd: 179_850,
  /** Random Forest error on the data it was trained on. */
  trainMaeUsd: { randomForest: 12_209.52 },

  /**
   * Tree depth was compared on a validation split of the training data
   * (13,209 / 3,303 rows). Unlimited depth was kept for the final model.
   */
  depthValidation: {
    trainRows: 13_209,
    validationRows: 3_303,
    maeByDepthUsd: [
      { depth: 5, maeUsd: 49_855.46 },
      { depth: 10, maeUsd: 37_788.17 },
      { depth: 15, maeUsd: 34_893.29 },
      { depth: 20, maeUsd: 34_570.68 },
      { depth: null, maeUsd: 34_475.16 },
    ],
  },

  /** Other capped values in the data. */
  caps: { incomeUsd: 150_001, houseAgeYears: 52 },
} as const;
