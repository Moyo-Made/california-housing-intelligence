import { expect, test } from "vitest";
import { MODEL_FACTS } from "./model-facts";

const { dataset, depthValidation, testMaeUsd, trainMaeUsd } = MODEL_FACTS;

test("the train/test split adds up to the dataset", () => {
  expect(dataset.trainRows + dataset.testRows).toBe(dataset.rows);
});

test("the depth validation split adds up to the training set", () => {
  expect(depthValidation.trainRows + depthValidation.validationRows).toBe(dataset.trainRows);
});

test("the served model (unlimited depth) had the lowest validation error", () => {
  const best = depthValidation.maeByDepthUsd.reduce((a, b) => (b.maeUsd < a.maeUsd ? b : a));
  expect(best.depth).toBeNull();
});

test("errors are ordered as the notebook reports them", () => {
  expect(testMaeUsd.randomForest).toBeLessThan(testMaeUsd.linearRegression);
  expect(testMaeUsd.linearRegression).toBeLessThan(testMaeUsd.medianBaseline);
  expect(trainMaeUsd.randomForest).toBeLessThan(testMaeUsd.randomForest);
});
