import { formatUsd } from "@/lib/housing/format";
import { cn } from "@/lib/utils";

export type ErrorBar = {
  label: string;
  detail?: string;
  valueUsd: number;
  /** The row the story is about, drawn in the accent; the rest are context. */
  emphasis?: boolean;
};

/** Shared scale so every error chart on the page is comparable. */
const SCALE_MAX_USD = 100_000;

/**
 * Horizontal bars for average error, built as a real table: the bars are
 * decorative, and the label and value cells are the accessible content.
 */
export function ErrorBars({ caption, rows }: { caption: string; rows: ErrorBar[] }) {
  return (
    // Explicit roles keep table semantics when narrow screens restack the cells.
    <table role="table" className="w-full border-collapse text-sm">
      <caption className="mb-3 text-left text-sm font-medium">{caption}</caption>
      <thead role="rowgroup" className="sr-only">
        <tr role="row">
          <th scope="col" role="columnheader">Model</th>
          <th scope="col" role="columnheader">Average error</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((row) => (
          <tr key={row.label} role="row" className="flex flex-col align-top sm:table-row">
            <th
              scope="row"
              role="rowheader"
              className="block pt-2 text-left font-normal sm:table-cell sm:w-[42%] sm:py-2 sm:pr-4"
            >
              <span className={cn(row.emphasis && "font-medium")}>{row.label}</span>
              {row.detail && (
                <span className="block text-xs text-muted-foreground">{row.detail}</span>
              )}
            </th>
            <td role="cell" className="block pt-1.5 pb-2 sm:table-cell sm:py-2">
              {/* Bars share one left baseline; the value sits at the bar's tip. */}
              <div className="flex h-5 items-center gap-2">
                <div
                  aria-hidden
                  className={cn("h-4 shrink-0 rounded-r-[4px]", row.emphasis ? "bg-pacific" : "bg-baseline")}
                  style={{
                    width: `calc((100% - 4.5rem) * ${Math.min(row.valueUsd, SCALE_MAX_USD) / SCALE_MAX_USD})`,
                  }}
                />
                <span className={cn("tabular-nums", row.emphasis && "font-medium")}>
                  {formatUsd(row.valueUsd)}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
