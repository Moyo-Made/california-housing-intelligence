import { formatUsd } from "@/lib/housing/format";
import { MODEL_FACTS } from "@/lib/housing/model-facts";
import { cn } from "@/lib/utils";

const CAP = MODEL_FACTS.dataset.targetCapUsd;
const MEDIAN = MODEL_FACTS.baselinePredictionUsd;
const TICKS = [0, 100_000, 200_000, 300_000, 400_000, 500_000];

function percent(usd: number) {
  return `${Math.min(1, Math.max(0, usd / CAP)) * 100}%`;
}

type Props = {
  valueUsd: number | null;
  /** A pinned estimate to compare against, drawn as a grey marker. */
  baselineUsd?: number | null;
  /** Fade the track and markers (not the labels) while the estimate is out of date. */
  dimmed?: boolean;
};

/**
 * Places the estimate on the range the data can express: $0 up to the
 * $500,001 cap. Decorative; the card states the same facts in text.
 */
export function ValueScale({ valueUsd, baselineUsd = null, dimmed = false }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div
        aria-hidden
        className={cn(
          "relative mt-2 h-2 rounded-full bg-muted transition-opacity duration-150",
          dimmed && "opacity-60 delay-150",
        )}
      >
        {valueUsd !== null && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-pacific/20 transition-[width] duration-200"
            style={{ width: percent(valueUsd) }}
          />
        )}
        <div
          className="absolute -top-1 h-4 w-px bg-foreground/50"
          style={{ left: percent(MEDIAN) }}
        />
        {baselineUsd !== null && (
          <div
            data-testid="scale-baseline"
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-baseline"
            style={{ left: percent(baselineUsd) }}
          />
        )}
        {valueUsd !== null && (
          <div
            data-testid="scale-marker"
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-pacific shadow-sm transition-[left] duration-200"
            style={{ left: percent(valueUsd) }}
          />
        )}
      </div>
      <div aria-hidden className="relative h-4 text-xs text-muted-foreground tabular-nums">
        {TICKS.map((tick, index) => (
          <span
            key={tick}
            className={cn(
              "absolute",
              index === 0 ? "left-0" : index === TICKS.length - 1 ? "right-0" : "-translate-x-1/2",
              // Narrow screens keep $0, $200k and the cap so labels don't collide.
              (tick === 100_000 || tick === 300_000 || tick === 400_000) && "hidden sm:inline",
            )}
            style={index > 0 && index < TICKS.length - 1 ? { left: percent(tick) } : undefined}
          >
            {index === TICKS.length - 1 ? "$500k cap" : tick === 0 ? "$0" : `$${tick / 1000}k`}
          </span>
        ))}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {baselineUsd !== null && (
          <>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-pacific" />
              Current estimate
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-baseline" />
              Baseline
            </li>
          </>
        )}
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-px bg-foreground/50" />
          Median of all training areas: {formatUsd(MEDIAN)}
        </li>
      </ul>
    </div>
  );
}
