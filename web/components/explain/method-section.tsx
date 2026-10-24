import { formatUsd } from "@/lib/housing/format";
import { MODEL_FACTS } from "@/lib/housing/model-facts";
import { ErrorBars } from "./error-bars";

const { dataset, testMaeUsd, trainMaeUsd, depthValidation, caps } = MODEL_FACTS;
const count = (n: number) => n.toLocaleString("en-US");

const reductionVsBaseline = Math.round(
  (1 - testMaeUsd.randomForest / testMaeUsd.medianBaseline) * 100,
);
const trainTestRatio = (testMaeUsd.randomForest / trainMaeUsd.randomForest).toFixed(1);

const LIMITS: { title: string; body: string }[] = [
  {
    title: "It describes 1990, not today",
    body: "Prices, incomes and neighbourhoods have changed since the 1990 Census. Estimates are in 1990 dollars, not adjusted for inflation, and are not a valuation of any property today.",
  },
  {
    title: "It estimates areas, not homes",
    body: "Each estimate is the median value of a whole block group. It says nothing about the price of any particular house in it.",
  },
  {
    title: "It can’t see above $500,000",
    body: `${count(dataset.rowsAtTargetCap)} areas were recorded at the ${formatUsd(dataset.targetCapUsd)} cap, so their true values are unknown, and the model can never estimate higher. Income is capped at ${formatUsd(caps.incomeUsd)} and house age at ${caps.houseAgeYears} years in the same way.`,
  },
  {
    title: "Changing an input isn’t cause and effect",
    body: "The model learned patterns that existed together in the 1990 data. Changing an input shows how the model’s estimate responds, not what would happen to real prices if that thing changed.",
  },
  {
    title: "Its error is probably higher for unfamiliar places",
    body: "The test areas were picked at random, so many sit right next to areas the model trained on. Areas unlike anything in the training data would likely see larger errors than the average reported here.",
  },
  {
    title: "The test set was used more than once",
    body: "During development the same test areas were used to compare models before the final one was chosen, so the reported error isn’t a perfectly untouched final check.",
  },
  {
    title: "No uncertainty for a single estimate",
    body: "The model returns one number. It doesn’t provide a confidence range, and the average error above is not a range for any individual estimate.",
  },
];

export function MethodSection() {
  return (
    <section
      id="method"
      aria-labelledby="method-title"
      className="flex scroll-mt-8 flex-col gap-12 border-t border-border pt-12 sm:pt-16"
    >
      <div className="max-w-2xl">
        <h2 id="method-title" className="font-heading text-title font-medium sm:text-headline">
          Method and limits
        </h2>
        <p className="mt-3 text-base text-pretty text-muted-foreground sm:text-lg">
          How the model was built and tested, and what it can&rsquo;t tell you.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-12">
        <article className="flex flex-col gap-4 lg:col-span-5">
          <h3 className="font-heading text-xl font-medium">What it predicts</h3>
          <p className="text-pretty">
            Each of the {count(dataset.rows)} rows in the data describes one California
            census block group in 1990: an area, not a house. The model estimates the
            area&rsquo;s <strong className="font-medium">median home value</strong>, the
            value half its homes are below and half above, in 1990 dollars.
          </p>
          <p className="text-pretty text-muted-foreground">
            It is a Random Forest: 100 decision trees, each trained on a random resample
            of the training areas. Each tree sorts an area through a series of yes-or-no
            questions about the eight inputs and lands on a value learned from similar
            training areas. The estimate is the average of the 100 trees&rsquo; answers.
          </p>
          <p className="text-pretty text-muted-foreground">
            Because every answer comes from values seen in training, the model can never
            estimate below the lowest or above the highest value it was trained on.
          </p>
        </article>

        <article className="flex flex-col gap-6 lg:col-span-7">
          <h3 className="font-heading text-xl font-medium">How it was evaluated</h3>
          <p className="text-pretty">
            The areas were split at random: {count(dataset.trainRows)} to learn from and{" "}
            {count(dataset.testRows)} held back to test on. The score is the{" "}
            <strong className="font-medium">mean absolute error</strong> (MAE): the average
            size of a miss, ignoring whether it was too high or too low. An MAE of{" "}
            {formatUsd(testMaeUsd.randomForest, 100)} means the estimates were off by that
            much on average; some misses were much larger, some much smaller.
          </p>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <ErrorBars
              caption={`Average error on the ${count(dataset.testRows)} test areas (lower is better)`}
              rows={[
                {
                  label: "Always guess the median",
                  detail: `A baseline that predicts ${formatUsd(MODEL_FACTS.baselinePredictionUsd)} for every area`,
                  valueUsd: testMaeUsd.medianBaseline,
                },
                { label: "Linear regression", valueUsd: testMaeUsd.linearRegression },
                {
                  label: "Random forest",
                  detail: "The model used here",
                  valueUsd: testMaeUsd.randomForest,
                  emphasis: true,
                },
              ]}
            />
            <p className="mt-3 text-sm text-pretty text-muted-foreground">
              The random forest&rsquo;s error is {reductionVsBaseline}% lower than always
              guessing the median.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <ErrorBars
              caption="Random forest: familiar areas vs unseen ones"
              rows={[
                {
                  label: "Areas it trained on",
                  valueUsd: trainMaeUsd.randomForest,
                },
                {
                  label: "Areas it never saw",
                  detail: "The fair measure",
                  valueUsd: testMaeUsd.randomForest,
                  emphasis: true,
                },
              ]}
            />
            <p className="mt-3 text-sm text-pretty text-muted-foreground">
              On unseen areas the error is about {trainTestRatio} times larger. The model
              partly memorised its training areas (overfitting), which is why only the
              test error is a fair measure of how it does on new data.
            </p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
              How the tree depth was chosen
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-pretty text-muted-foreground">
                Before the final test, the training areas were split again (
                {count(depthValidation.trainRows)} to learn from,{" "}
                {count(depthValidation.validationRows)} to validate on) to compare how deep
                each tree may grow. Unlimited depth did best, narrowly, and was kept.
              </p>
              <table className="w-full max-w-sm text-left">
                <caption className="sr-only">Validation error by maximum tree depth</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-1.5 font-normal">Maximum depth</th>
                    <th scope="col" className="py-1.5 text-right font-normal">Validation error</th>
                  </tr>
                </thead>
                <tbody>
                  {depthValidation.maeByDepthUsd.map(({ depth, maeUsd }) => (
                    <tr key={depth ?? "unlimited"} className="border-b border-border last:border-0">
                      <th scope="row" className="py-1.5 font-normal">
                        {depth ?? "Unlimited (used)"}
                      </th>
                      <td className="py-1.5 text-right">{formatUsd(maeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </article>
      </div>

      <article className="flex flex-col gap-6">
        <h3 className="font-heading text-xl font-medium">What it can&rsquo;t tell you</h3>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {LIMITS.map((limit) => (
            <li key={limit.title} className="flex flex-col gap-1.5 border-t border-border pt-4">
              <h4 className="font-medium">{limit.title}</h4>
              <p className="text-sm text-pretty text-muted-foreground">{limit.body}</p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
