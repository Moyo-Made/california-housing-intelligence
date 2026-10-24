import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/workbench/field-message";
import type { Prediction } from "@/components/workbench/use-prediction";
import { formatUsd } from "@/lib/housing/format";
import { MODEL_FACTS } from "@/lib/housing/model-facts";
import type { Provenance } from "@/lib/housing/presets";
import { cn } from "@/lib/utils";
import { ValueScale } from "./value-scale";

/** Estimates at or above this are close enough to the cap to say so. */
const NEAR_CAP_USD = 450_000;

type Props = {
  prediction: Prediction;
  provenance: Provenance;
  /** Some inputs have soft notices (unusual or beyond the training data). */
  hasInputNotices: boolean;
  /** Number of fields that currently fail validation. */
  invalidCount: number;
};

export function PredictionCard({
  prediction,
  provenance,
  hasInputNotices,
  invalidCount,
}: Props) {
  const { status, valueUsd, isStale, error, isSlow, retry } = prediction;
  const isCurrent = status === "success";

  return (
    <section
      aria-labelledby="prediction-title"
      aria-busy={status === "loading"}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:p-8"
    >
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="prediction-title"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Predicted median home value
          </h2>
          <StatusLabel prediction={prediction} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          In 1990 dollars, for {describeProvenance(provenance)}.
        </p>
      </div>

      {/* An out-of-date estimate fades after a short delay, so fast updates don't flicker. */}
      <div
        data-stale={isStale || undefined}
        className={cn(
          "flex flex-col gap-5 transition-opacity duration-150",
          isStale && "opacity-40 delay-150",
        )}
      >
        {valueUsd === null ? (
          <div className="flex h-11 items-center sm:h-16">
            {status === "loading" ? (
              <div aria-hidden className="h-full w-56 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-sm text-muted-foreground">No estimate yet.</p>
            )}
          </div>
        ) : (
          <p
            data-testid="prediction-value"
            className="text-[2.75rem] leading-none font-semibold tracking-tight sm:text-display"
          >
            {formatUsd(valueUsd, 1_000)}
          </p>
        )}
        <ValueScale valueUsd={valueUsd} />
      </div>

      {status === "error" && error && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" onClick={retry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      )}
      {status === "blocked" && (
        <FieldMessage tone="error">
          Fix the highlighted {invalidCount === 1 ? "field" : "fields"} to{" "}
          {valueUsd === null ? "get an estimate" : "update the estimate"}.
        </FieldMessage>
      )}
      {isSlow && (
        <p className="text-sm text-muted-foreground">
          This can take a moment if the prediction service has been idle.
        </p>
      )}
      {isCurrent && valueUsd !== null && valueUsd >= NEAR_CAP_USD && (
        <FieldMessage tone="notice">
          Near the data&rsquo;s ceiling. Home values above $500,000 were all recorded
          as {formatUsd(MODEL_FACTS.dataset.targetCapUsd)}, so the model can&rsquo;t
          estimate higher.
        </FieldMessage>
      )}
      {isCurrent && hasInputNotices && (
        <FieldMessage tone="notice">
          Some inputs are unusual for the data. See the warnings beside them.
        </FieldMessage>
      )}

      <p className="border-t border-border pt-4 text-sm text-pretty text-muted-foreground">
        On {MODEL_FACTS.dataset.testRows.toLocaleString("en-US")} areas it never saw
        during training, the model&rsquo;s estimates were off by{" "}
        <span className="font-medium text-foreground">
          {formatUsd(MODEL_FACTS.testMaeUsd.randomForest, 100)}
        </span>{" "}
        on average. That is an average across many areas, not a range for this
        estimate.
      </p>

      {valueUsd !== null && (
        <details className="group text-sm">
          <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
            Raw model output
          </summary>
          <p className="mt-2 text-pretty text-muted-foreground">
            The model returned{" "}
            <code className="font-mono text-foreground">
              {Number((valueUsd / 100_000).toFixed(7))}
            </code>
            , in units of $100,000. The API converts that to{" "}
            {valueUsd.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            })}
            , and this page rounds it to the nearest $1,000 because the model
            isn&rsquo;t precise to the dollar.
          </p>
        </details>
      )}

      <p aria-live="polite" className="sr-only">
        {status === "success" && valueUsd !== null
          ? `Estimated median home value: ${formatUsd(valueUsd, 1_000)}.`
          : status === "error" && error
            ? error.message
            : ""}
      </p>
    </section>
  );
}

function StatusLabel({ prediction }: { prediction: Prediction }) {
  const { status, valueUsd, isSlow } = prediction;
  const label =
    status === "loading"
      ? isSlow
        ? "Waking up the model…"
        : valueUsd === null
          ? "Asking the model…"
          : "Updating…"
      : (status === "error" || status === "blocked") && valueUsd !== null
        ? "Out of date"
        : null;

  return label ? <span className="text-xs text-muted-foreground">{label}</span> : null;
}

function describeProvenance(provenance: Provenance) {
  switch (provenance.kind) {
    case "synthetic":
      return "the synthetic median profile";
    case "record":
      return `the real 1990 record in row ${provenance.row.toLocaleString("en-US")} (${provenance.place})`;
    case "constructed":
      return "your constructed inputs";
  }
}
