"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from "react";
import type { Baseline } from "@/components/result/compare";
import { ResponseSection } from "@/components/explain/response-section";
import { MobileEstimateBar } from "@/components/result/mobile-estimate-bar";
import { PredictionCard } from "@/components/result/prediction-card";
import { Button } from "@/components/ui/button";
import type { FeatureName } from "@/lib/housing/features";
import { DEFAULT_PRESET_ID } from "@/lib/housing/presets";
import { toDraft } from "./drafts";
import { FeatureField } from "./feature-field";
import { FieldMessage } from "./field-message";
import { FIELD_GROUPS } from "./fields";
import { LocationPicker } from "./location-picker";
import { ModelInputs } from "./model-inputs";
import { PresetMenu } from "./preset-menu";
import { ProvenanceBadge } from "./provenance-badge";
import { deriveScenario, initialScenario, scenarioReducer } from "./scenario";
import { usePrediction } from "./use-prediction";

export function Workbench() {
  const [state, dispatch] = useReducer(scenarioReducer, DEFAULT_PRESET_ID, initialScenario);
  const scenario = useMemo(() => deriveScenario(state), [state]);
  const prediction = usePrediction(scenario.input);
  const isInitial = scenario.isPristine && state.presetId === DEFAULT_PRESET_ID;
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputsRef = useRef<HTMLDivElement>(null);
  const showMobileBar = useMobileBarVisibility(inputsRef, cardRef);

  function pinBaseline() {
    // Only an estimate that belongs to the current inputs can be pinned.
    if (prediction.status !== "success" || !scenario.input || prediction.valueUsd === null) return;
    setBaseline({
      input: scenario.input,
      valueUsd: prediction.valueUsd,
      provenance: scenario.provenance,
    });
  }

  function moveLocation(latitude: number, longitude: number) {
    dispatch({ type: "edit", name: "Latitude", draft: toDraft("Latitude", latitude) });
    dispatch({ type: "edit", name: "Longitude", draft: toDraft("Longitude", longitude) });
  }

  const fieldNotices = new Map<FeatureName, "atypical" | "beyond-training">();
  let bedroomsExceedRooms = false;
  let outsideCalifornia = false;
  for (const notice of scenario.notices) {
    if (notice.kind === "bedrooms-exceed-rooms") bedroomsExceedRooms = true;
    else if (notice.kind === "outside-california") outsideCalifornia = true;
    else fieldNotices.set(notice.feature, notice.kind);
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="workbench-title" className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div ref={inputsRef} className="flex flex-col gap-8 lg:col-span-5">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                id="workbench-title"
                className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Describe a block group
              </h2>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">
                A census block group is a small, neighbourhood-sized area, usually
                home to 600 to 3,000 people.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PresetMenu onLoad={(presetId) => dispatch({ type: "load", presetId })} />
              <Button
                variant="ghost"
                size="lg"
                disabled={isInitial}
                onClick={() => dispatch({ type: "load", presetId: DEFAULT_PRESET_ID })}
              >
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
            </div>
            <ProvenanceBadge provenance={scenario.provenance} />
          </div>

          {FIELD_GROUPS.map((group) => (
            <fieldset key={group.id} className="flex flex-col gap-6">
              <legend className="mb-4 w-full border-b border-border pb-2 font-heading text-lg font-medium">
                {group.title}
              </legend>
              {group.id === "location" && (
                <LocationPicker
                  latitude={scenario.values.Latitude}
                  longitude={scenario.values.Longitude}
                  isOutside={outsideCalifornia}
                  onMove={moveLocation}
                />
              )}
              {group.features.map((name) => (
                <FeatureField
                  key={name}
                  name={name}
                  draft={state.drafts[name]}
                  error={scenario.errors[name]}
                  notice={fieldNotices.get(name)}
                  onDraftChange={(draft) => dispatch({ type: "edit", name, draft })}
                />
              ))}
              {group.id === "location" && outsideCalifornia && (
                <FieldMessage tone="notice">
                  This point is outside California or offshore, where the training data
                  has no areas. The model still returns a number, but it has nothing
                  comparable to base it on.
                </FieldMessage>
              )}
              {group.id === "housing" && bedroomsExceedRooms && (
                <FieldMessage tone="notice">
                  Average bedrooms is higher than average rooms. That never happens
                  in the data, so the model has nothing like it to learn from.
                </FieldMessage>
              )}
            </fieldset>
          ))}
          <ModelInputs values={scenario.values} errors={scenario.errors} />
        </div>

        <div className="lg:col-span-7">
          {/* Only the card is sticky; if it is ever taller than the screen it scrolls on its own. */}
          <div
            ref={cardRef}
            className="lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:overscroll-contain"
          >
            <PredictionCard
              prediction={prediction}
              provenance={scenario.provenance}
              hasInputNotices={scenario.notices.length > 0}
              invalidCount={Object.keys(scenario.errors).length}
              currentValues={scenario.values}
              baseline={baseline}
              onPin={pinBaseline}
              onClearBaseline={() => setBaseline(null)}
            />
          </div>
        </div>
      </section>
      <ResponseSection input={scenario.input} />
      <MobileEstimateBar
        visible={showMobileBar}
        prediction={prediction}
        baseline={baseline}
        onView={() => {
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          cardRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }}
      />
    </div>
  );
}

/**
 * On narrow screens the estimate card sits below the inputs, so a compact bar
 * shows the estimate while the inputs are on screen and the card isn't.
 */
function useMobileBarVisibility(
  inputsRef: RefObject<HTMLElement | null>,
  cardRef: RefObject<HTMLElement | null>,
): boolean {
  const [inputsInView, setInputsInView] = useState(false);
  const [cardInView, setCardInView] = useState(true);

  useEffect(() => {
    const inputs = inputsRef.current;
    const card = cardRef.current;
    if (!inputs || !card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === inputs) setInputsInView(entry.isIntersecting);
        if (entry.target === card) setCardInView(entry.isIntersecting);
      }
    });
    observer.observe(inputs);
    observer.observe(card);
    return () => observer.disconnect();
  }, [inputsRef, cardRef]);

  return inputsInView && !cardInView;
}
