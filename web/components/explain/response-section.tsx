"use client";

import { RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { describeValueWithUnit } from "@/components/workbench/drafts";
import { FieldMessage } from "@/components/workbench/field-message";
import { useDebouncedRequest } from "@/components/workbench/use-debounced-request";
import { sweep } from "@/lib/api/client";
import { FEATURE_NAMES, FEATURES, type FeatureName } from "@/lib/housing/features";
import { formatUsd } from "@/lib/housing/format";
import type { HousingInput } from "@/lib/housing/types";
import { cn } from "@/lib/utils";

/** Same height as the chart, so swapping one for the other doesn't shift the page. */
function ChartPlaceholder() {
  return <div aria-hidden className="h-64 animate-pulse rounded-md bg-muted sm:h-80" />;
}

// Recharts is only downloaded once there is a curve to draw, not with the page.
const ResponseChart = dynamic(() => import("./response-chart").then((mod) => mod.ResponseChart), {
  ssr: false,
  loading: ChartPlaceholder,
});

const DEFAULT_FEATURE: FeatureName = "MedInc";

/** How the model's estimate changes across one input, with the others held fixed. */
export function ResponseSection({ input }: { input: HousingInput | null }) {
  const [feature, setFeature] = useState<FeatureName>(DEFAULT_FEATURE);
  const selectId = useId();
  const response = useDebouncedRequest(input && { input, feature }, sweep, { debounceMs: 400 });
  const { status, data, isStale, error, retry } = response;
  // Data from before a feature switch is for the wrong axis, so it isn't shown.
  const shown = data && data.feature === feature ? data : null;
  const failedCount = shown?.points.filter((p) => p.predicted_value_usd === null).length ?? 0;
  const { stats, label } = FEATURES[feature];
  const showsBeyondTraining =
    shown !== null &&
    (shown.points[0].value < stats.min || shown.points[shown.points.length - 1].value > stats.max);

  return (
    <section
      aria-labelledby="response-title"
      aria-busy={status === "loading"}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-baseline gap-3">
            <h2 id="response-title" className="font-heading text-2xl font-medium">
              How the model responds
            </h2>
            {shown && (status === "loading" || status === "error" || status === "blocked") && (
              <span className="text-xs text-muted-foreground">
                {status === "loading" ? "Updating…" : "Out of date"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            The model&rsquo;s estimate as one input changes across its typical range,
            with the other seven held at their current values.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-sm font-medium">
            Input to vary
          </label>
          <Select value={feature} onValueChange={(value) => setFeature(value as FeatureName)}>
            <SelectTrigger id={selectId} className="h-10 w-full rounded-md bg-card sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {FEATURE_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  {FEATURES[name].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {status === "blocked" && (
        <FieldMessage tone="error">
          Once every input is valid, this shows how the model responds.
        </FieldMessage>
      )}
      {status === "error" && error && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" onClick={retry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      )}

      {shown && input ? (
        <div
          data-stale={isStale || undefined}
          className={cn(isStale && "[&_.recharts-line-curve]:opacity-50 [&_.recharts-reference-dot]:opacity-50")}
        >
          <ResponseChart feature={feature} points={shown.points} current={input[feature]} />
        </div>
      ) : (
        status === "loading" && (
          <ChartPlaceholder />
        )
      )}

      {shown && input && (
        <>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded-full bg-pacific" />
              Model estimate
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-pacific ring-2 ring-card" />
              Current value: {describeValueWithUnit(feature, input[feature])}
            </li>
            {showsBeyondTraining && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm bg-muted ring-1 ring-border" />
                Beyond every area in the training data
              </li>
            )}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-pretty text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                This shows the model&rsquo;s behaviour, not cause and effect.
              </span>{" "}
              In real neighbourhoods these inputs change together, not one at a time,
              so a rise in this curve doesn&rsquo;t mean changing {label.toLowerCase()}{" "}
              would change home values.
            </p>
            <p>
              The line joins {shown.points.length} separate estimates. Between them the
              model&rsquo;s estimate moves in small steps, because a random forest is
              built from yes-or-no splits.
              {failedCount > 0 &&
                ` ${failedCount} ${failedCount === 1 ? "point" : "points"} couldn’t be estimated and ${failedCount === 1 ? "is" : "are"} left as gaps.`}
            </p>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
              Show the numbers
            </summary>
            <table className="mt-3 w-full max-w-md text-left">
              <caption className="sr-only">
                Model estimate at each value of {label.toLowerCase()}
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-1.5 font-normal">{label}</th>
                  <th scope="col" className="py-1.5 text-right font-normal">Estimate</th>
                </tr>
              </thead>
              <tbody>
                {shown.points.map((point) => (
                  <tr key={point.value} className="border-b border-border last:border-0">
                    <th scope="row" className="py-1.5 font-normal">
                      {describeValueWithUnit(feature, point.value)}
                      {point.value === input[feature] && (
                        <span className="text-muted-foreground"> (current)</span>
                      )}
                    </th>
                    <td className="py-1.5 text-right">
                      {point.predicted_value_usd === null
                        ? "No estimate"
                        : formatUsd(point.predicted_value_usd, 1_000)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
