"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRESETS } from "@/lib/housing/presets";

const synthetic = PRESETS.filter((preset) => preset.provenance.kind === "synthetic");
const records = PRESETS.filter((preset) => preset.provenance.kind === "record");

export function PresetMenu({ onLoad }: { onLoad: (presetId: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg">
          Load an example
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Synthetic</DropdownMenuLabel>
          {synthetic.map((preset) => (
            <DropdownMenuItem key={preset.id} onSelect={() => onLoad(preset.id)}>
              <span className="flex flex-col">
                {preset.label}
                <span className="text-xs text-muted-foreground">Not a real block group</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Real 1990 records</DropdownMenuLabel>
          {records.map((preset) => (
            <DropdownMenuItem key={preset.id} onSelect={() => onLoad(preset.id)}>
              <span className="flex flex-col">
                {preset.label}
                {preset.provenance.kind === "record" && (
                  <span className="text-xs text-muted-foreground">
                    Dataset row {preset.provenance.row.toLocaleString("en-US")}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
