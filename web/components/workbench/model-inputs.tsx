import { FEATURE_NAMES } from "@/lib/housing/features";
import type { FieldErrors, HousingInput } from "@/lib/housing/types";
import { cn } from "@/lib/utils";

type Props = {
  /** Valid values in model units; invalid fields are missing. */
  values: Partial<HousingInput>;
  errors: FieldErrors;
};

/** Shows the exact eight numbers the model would receive, in its own units. */
export function ModelInputs({ values, errors }: Props) {
  const invalidCount = Object.keys(errors).length;

  return (
    <section
      aria-labelledby="model-inputs-title"
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 id="model-inputs-title" className="font-heading text-xl font-medium">
        What the model receives
      </h2>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        These eight numbers are everything the model knows about an area. Income
        is sent in tens of thousands of dollars.
      </p>

      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm">
        {FEATURE_NAMES.map((name) => {
          const value = values[name];
          return (
            <div key={name} className="contents">
              <dt className="text-muted-foreground">{name}</dt>
              <dd
                className={cn(
                  "text-right tabular-nums",
                  value === undefined && "text-destructive",
                )}
              >
                {value === undefined ? (
                  <>
                    <span aria-hidden>—</span>
                    <span className="sr-only">invalid</span>
                  </>
                ) : (
                  String(Number(value.toFixed(6)))
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <p
        role="status"
        className={cn(
          "mt-5 border-t border-border pt-4 text-sm",
          invalidCount > 0 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {invalidCount === 0
          ? "All eight values are valid."
          : `${invalidCount} ${invalidCount === 1 ? "field needs" : "fields need"} fixing before the model can be asked.`}
      </p>
    </section>
  );
}
