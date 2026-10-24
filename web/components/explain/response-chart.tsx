"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { describeValueWithUnit } from "@/components/workbench/drafts";
import { FIELDS } from "@/components/workbench/fields";
import { FEATURES, type FeatureName } from "@/lib/housing/features";
import { formatUsd } from "@/lib/housing/format";
import { MODEL_FACTS } from "@/lib/housing/model-facts";
import type { SweepPoint } from "@/lib/housing/types";

const Y_TICKS = [0, 100_000, 200_000, 300_000, 400_000, 500_000];
const config = { usd: { label: "Estimate", color: "var(--pacific)" } } satisfies ChartConfig;

type Props = {
  feature: FeatureName;
  points: SweepPoint[];
  /** The feature's current value, in model units. */
  current: number;
};

/**
 * The model's estimate across one feature, other inputs fixed. Axes are in
 * display units (income in dollars); the y-axis is fixed from $0 to the cap so
 * curves for different features are comparable.
 */
export function ResponseChart({ feature, points, current }: Props) {
  const { scale } = FIELDS[feature];
  const { stats, label } = FEATURES[feature];
  const data = points.map((point) => ({ x: point.value * scale, usd: point.predicted_value_usd }));
  const currentUsd = points.find((point) => point.value === current)?.predicted_value_usd ?? null;
  const [low, high] = [data[0].x, data[data.length - 1].x];
  const [trainedLow, trainedHigh] = [stats.min * scale, stats.max * scale];

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-64 w-full sm:h-80"
      aria-label={`Line chart of the model's estimate as ${label.toLowerCase()} varies. The same numbers are in the table below.`}
      role="figure"
    >
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        {low < trainedLow && (
          <ReferenceArea x1={low} x2={trainedLow} fill="var(--muted)" fillOpacity={0.8} />
        )}
        {high > trainedHigh && (
          <ReferenceArea x1={trainedHigh} x2={high} fill="var(--muted)" fillOpacity={0.8} />
        )}
        <XAxis
          dataKey="x"
          type="number"
          domain={[low, high]}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tickMargin={8}
          ticks={niceTicks(low, high)}
          tickFormatter={(x: number) => axisLabel(feature, x / scale)}
        />
        <YAxis
          domain={[0, MODEL_FACTS.dataset.targetCapUsd]}
          ticks={Y_TICKS}
          width={44}
          tickLine={false}
          axisLine={false}
          tickFormatter={(usd: number) => (usd === 0 ? "$0" : `$${usd / 1000}k`)}
        />
        <ReferenceLine x={current * scale} stroke="var(--foreground)" strokeOpacity={0.3} />
        <ChartTooltip
          cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.3 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !point) return null;
            return (
              <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="text-sm font-semibold">
                  {point.usd === null ? "No estimate" : formatUsd(point.usd, 1_000)}
                </p>
                <p className="text-muted-foreground">
                  at {describeValueWithUnit(feature, point.x / scale)}
                </p>
              </div>
            );
          }}
        />
        <Line
          dataKey="usd"
          type="linear"
          stroke="var(--color-usd)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "var(--pacific)", stroke: "var(--card)", strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />
        {currentUsd !== null && (
          <ReferenceDot
            x={current * scale}
            y={currentUsd}
            r={5}
            fill="var(--pacific)"
            stroke="var(--card)"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}

/** Round tick values inside [low, high], about five of them, e.g. 20k, 40k, 60k. */
export function niceTicks(low: number, high: number, target = 5): number[] {
  const span = high - low;
  if (span <= 0) return [low];
  const magnitude = 10 ** Math.floor(Math.log10(span / target));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => span / s <= target * 1.25) ??
    10 * magnitude;
  const ticks: number[] = [];
  for (let tick = Math.ceil(low / step) * step; tick <= high + step * 1e-9; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}

/** Compact axis labels, e.g. "$50k", "1,200" or "−122". */
function axisLabel(feature: FeatureName, modelValue: number): string {
  if (feature === "MedInc") return `$${Math.round(modelValue * 10)}k`;
  const digits = Math.abs(modelValue) >= 100 ? 0 : Math.abs(modelValue) >= 10 ? 1 : 2;
  const text = modelValue.toLocaleString("en-US", { maximumFractionDigits: digits });
  return text.replace(/^-/, "−");
}
