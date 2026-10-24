import { Button } from "@/components/ui/button";
import type { Prediction } from "@/components/workbench/use-prediction";
import { formatUsd } from "@/lib/housing/format";
import { cn } from "@/lib/utils";
import { displayedDifference, DISPLAY_STEP_USD, type Baseline } from "./compare";

type Props = {
  visible: boolean;
  prediction: Prediction;
  baseline: Baseline | null;
  onView: () => void;
};

/**
 * Narrow screens only: keeps the estimate in view while editing inputs that
 * sit above the card. It repeats what the card says, so it has no live region.
 */
export function MobileEstimateBar({ visible, prediction, baseline, onView }: Props) {
  const { status, valueUsd } = prediction;
  const isCurrent = status === "success" && valueUsd !== null;
  const difference =
    isCurrent && baseline ? displayedDifference(valueUsd, baseline.valueUsd) : null;
  const statusLabel =
    status === "loading"
      ? "Updating…"
      : status === "error" || status === "blocked"
        ? "Out of date"
        : null;

  return (
    <div
      data-testid="mobile-estimate-bar"
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgb(22_24_29/0.08)] transition-transform duration-200 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Estimate, 1990 dollars{statusLabel && ` · ${statusLabel}`}
          </p>
          <p className={cn("text-xl font-semibold", !isCurrent && "text-muted-foreground")}>
            {valueUsd === null ? "—" : formatUsd(valueUsd, DISPLAY_STEP_USD)}
            {difference !== null && difference !== 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {difference > 0 ? "▲" : "▼"} {formatUsd(Math.abs(difference))} vs baseline
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={onView} className="shrink-0">
          View details
        </Button>
      </div>
    </div>
  );
}
