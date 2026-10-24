import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FEATURES, type FeatureName } from "@/lib/housing/features";
import { describeRange, typicalRange } from "./drafts";
import { FIELDS } from "./fields";

export function FieldHelp({ name }: { name: FeatureName }) {
  const { label, unit, stats } = FEATURES[name];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`About ${label.toLowerCase()}`}
          className="text-muted-foreground"
        >
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-4 leading-relaxed">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{FIELDS[name].help}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
          <dt className="text-muted-foreground">Typical</dt>
          <dd>{typicalRange(name)} (98% of areas)</dd>
          <dt className="text-muted-foreground">In the data</dt>
          <dd>{describeRange(name, stats.min, stats.max)}</dd>
          <dt className="text-muted-foreground">Sent as</dt>
          <dd>
            <code className="font-mono">{name}</code>, in {unit}
          </dd>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
