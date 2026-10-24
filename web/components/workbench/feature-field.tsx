"use client";

import { useId, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { FEATURES, type FeatureName } from "@/lib/housing/features";
import { cn } from "@/lib/utils";
import { describeRange, formatDisplay, parseDisplay, typicalRange } from "./drafts";
import { FieldHelp } from "./field-help";
import { FieldMessage } from "./field-message";
import { FIELDS } from "./fields";

type Props = {
  name: FeatureName;
  draft: string;
  error?: string;
  notice?: "atypical" | "beyond-training";
  onDraftChange: (draft: string) => void;
};

export function FeatureField({ name, draft, error, notice, onDraftChange }: Props) {
  const { label, stats } = FEATURES[name];
  const field = FIELDS[name];
  const id = useId();
  const hintId = `${id}-hint`;
  const messageId = `${id}-message`;

  // Errors appear once the field has been left, so they don't flash while typing.
  const [blurred, setBlurred] = useState(false);
  const showError = Boolean(error) && blurred;

  const parsed = parseDisplay(draft);
  const display = parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined;

  function setDisplay(value: number) {
    const factor = 10 ** field.decimals;
    onDraftChange(formatDisplay(name, Math.round(value * factor) / factor));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const start = display ?? stats.median * field.scale;
    const step = field.step * (event.shiftKey ? 10 : 1);
    setDisplay(start + (event.key === "ArrowUp" ? step : -step));
  }

  const message = showError ? (
    <FieldMessage id={messageId} tone="error">
      {error}
    </FieldMessage>
  ) : notice === "beyond-training" ? (
    <FieldMessage id={messageId} tone="notice">
      Outside the training data ({describeRange(name, stats.min, stats.max)}). Tree
      models treat every value past the edge alike, so going further won&rsquo;t
      change the estimate.
    </FieldMessage>
  ) : notice === "atypical" ? (
    <FieldMessage id={messageId} tone="notice">
      Unusual value: 98% of areas in the data fall within {typicalRange(name)}.
    </FieldMessage>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <FieldHelp name={name} />
        {name !== label && (
          <code className="ml-auto font-mono text-xs text-muted-foreground">{name}</code>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {field.slider && (
          <Slider
            className="py-2 sm:flex-1"
            min={field.slider.min}
            max={field.slider.max}
            step={field.slider.step}
            value={[clamp(display ?? field.slider.min, field.slider.min, field.slider.max)]}
            onValueChange={([value]) => setDisplay(value)}
            thumbLabel={`Adjust ${label.toLowerCase()}`}
            valueText={display === undefined ? undefined : displayText(name, display)}
          />
        )}
        {/* The units are visual; the hint below (aria-describedby) states them in words. */}
        <InputGroup
          className={cn(
            "h-10 rounded-md bg-card",
            field.slider ? "w-full sm:w-44 sm:shrink-0" : "w-full sm:w-60",
          )}
        >
          {field.prefix && (
            <InputGroupAddon aria-hidden className="pl-3">
              {field.prefix}
            </InputGroupAddon>
          )}
          <InputGroupInput
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={() => setBlurred(true)}
            onKeyDown={handleKeyDown}
            aria-invalid={showError || undefined}
            aria-describedby={message ? `${hintId} ${messageId}` : hintId}
            className={cn("h-full text-base md:text-sm", !field.prefix && "pl-3")}
          />
          {field.suffix && (
            <InputGroupAddon align="inline-end" aria-hidden className="pr-3 font-normal">
              {field.suffix}
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>

      <p id={hintId} className="text-xs text-muted-foreground">
        Typical: {typicalRange(name)}
      </p>
      {message}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function displayText(name: FeatureName, display: number) {
  const { prefix = "", suffix = "" } = FIELDS[name];
  return `${prefix}${formatDisplay(name, display)} ${suffix}`.trim();
}
