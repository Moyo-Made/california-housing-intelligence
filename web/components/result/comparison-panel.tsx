import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeValueWithUnit } from "@/components/workbench/drafts";
import type { Prediction } from "@/components/workbench/use-prediction";
import { FEATURES } from "@/lib/housing/features";
import { formatUsd } from "@/lib/housing/format";
import type { HousingInput } from "@/lib/housing/types";
import { changedInputs, displayedDifference, DISPLAY_STEP_USD, type Baseline } from "./compare";
import { describeProvenance } from "./describe-provenance";

type Props = {
  baseline: Baseline;
  prediction: Prediction;
  /** Current valid values in model units. */
  currentValues: Partial<HousingInput>;
  onClear: () => void;
};

/** Baseline (A) against the current estimate (B), with what differs between them. */
export function ComparisonPanel({ baseline, prediction, currentValues, onClear }: Props) {
  const changes = changedInputs(baseline.input, currentValues);
  const isCurrent = prediction.status === "success" && prediction.valueUsd !== null;

  return (
    <section
      aria-labelledby="comparison-title"
      className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <h3
          id="comparison-title"
          className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          Compared with your baseline
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="-my-1 text-muted-foreground">
          <X data-icon="inline-start" />
          Clear baseline
        </Button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm">
        <dt className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-baseline" />
          Baseline
        </dt>
        <dd className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-muted-foreground">{describeProvenance(baseline.provenance)}</span>
          <span className="font-medium">{formatUsd(baseline.valueUsd, DISPLAY_STEP_USD)}</span>
        </dd>
        <dt className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-full bg-pacific" />
          Current
        </dt>
        <dd className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-muted-foreground">
            {changes.length === 0 ? "the same inputs" : `${changes.length} ${changes.length === 1 ? "input" : "inputs"} changed`}
          </span>
          <span className="font-medium">
            {isCurrent ? formatUsd(prediction.valueUsd!, DISPLAY_STEP_USD) : "—"}
          </span>
        </dd>
      </dl>

      <p className="text-sm">
        {isCurrent
          ? differenceSentence(displayedDifference(prediction.valueUsd!, baseline.valueUsd))
          : prediction.status === "loading"
            ? "Waiting for the current estimate…"
            : "The current estimate is out of date, so there is nothing to compare yet."}
      </p>

      {changes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-muted-foreground">Inputs that differ</h4>
          <ul className="flex flex-col gap-1.5 text-sm">
            {changes.map(({ name, from, to }) => (
              <li key={name} className="flex flex-col sm:flex-row sm:justify-between sm:gap-x-4">
                <span>{FEATURES[name].label}</span>
                <span className="text-muted-foreground">
                  {describeValueWithUnit(name, from)}{" "}
                  <span aria-hidden>→</span>
                  <span className="sr-only">changed to</span>{" "}
                  <span className="text-foreground">
                    {to === undefined ? "invalid" : describeValueWithUnit(name, to)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-pretty text-muted-foreground">
        This compares two estimates from the model. It shows how the model responds
        to different inputs, not that the changed inputs cause the difference.
      </p>
    </section>
  );
}

export function differenceSentence(differenceUsd: number): string {
  if (differenceUsd === 0) {
    return "The model’s estimate is the same as for the baseline, to the nearest $1,000.";
  }
  const amount = formatUsd(Math.abs(differenceUsd));
  return differenceUsd > 0
    ? `▲ The model’s estimate is ${amount} higher than for the baseline.`
    : `▼ The model’s estimate is ${amount} lower than for the baseline.`;
}
