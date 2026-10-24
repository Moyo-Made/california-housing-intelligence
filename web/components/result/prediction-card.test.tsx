import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Prediction } from "@/components/workbench/use-prediction";
import { failure } from "@/lib/api/errors";
import type { Provenance } from "@/lib/housing/presets";
import type { HousingInput } from "@/lib/housing/types";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import type { Baseline } from "./compare";
import { PredictionCard } from "./prediction-card";

type CardOptions = {
  provenance?: Provenance;
  hasInputNotices?: boolean;
  invalidCount?: number;
  currentValues?: Partial<HousingInput>;
  baseline?: Baseline | null;
};

function renderCard(
  prediction: Partial<Prediction>,
  {
    provenance = { kind: "synthetic" },
    hasInputNotices = false,
    invalidCount = 0,
    currentValues = EXAMPLE_INPUT,
    baseline = null,
  }: CardOptions = {},
) {
  const full: Prediction = {
    status: "success",
    valueUsd: 430217.29,
    isStale: false,
    error: null,
    isSlow: false,
    retry: vi.fn(),
    ...prediction,
  };
  const onPin = vi.fn();
  const onClearBaseline = vi.fn();
  render(
    <PredictionCard
      prediction={full}
      provenance={provenance}
      hasInputNotices={hasInputNotices}
      invalidCount={invalidCount}
      currentValues={currentValues}
      baseline={baseline}
      onPin={onPin}
      onClearBaseline={onClearBaseline}
    />,
  );
  return { ...full, onPin, onClearBaseline };
}

const BASELINE: Baseline = {
  input: EXAMPLE_INPUT,
  valueUsd: 430_217.29,
  provenance: { kind: "record", row: 0, place: "Berkeley hills" },
};

describe("PredictionCard comparison", () => {
  test("offers to pin a current estimate", async () => {
    const { onPin } = renderCard({});
    await userEvent.click(screen.getByRole("button", { name: "Pin as baseline" }));
    expect(onPin).toHaveBeenCalledOnce();
  });

  test.each([
    ["loading", { status: "loading", isStale: true }],
    ["out of date", { status: "error", isStale: true, error: failure("unavailable").error }],
    ["blocked", { status: "blocked", isStale: true }],
  ] as const)("can't pin while the estimate is %s", (_, prediction) => {
    renderCard(prediction);
    expect(screen.getByRole("button", { name: "Pin as baseline" })).toBeDisabled();
  });

  test("can't re-pin inputs that already are the baseline", () => {
    renderCard({}, { baseline: BASELINE });
    expect(screen.getByRole("button", { name: "Pin current as baseline" })).toBeDisabled();
    expect(screen.getByText("the same inputs")).toBeInTheDocument();
  });

  test("compares the current estimate with the baseline", () => {
    renderCard(
      { valueUsd: 476_123.45 },
      { baseline: BASELINE, currentValues: { ...EXAMPLE_INPUT, MedInc: 12, HouseAge: 20 } },
    );
    const panel = screen.getByRole("region", { name: "Compared with your baseline" });

    expect(panel).toHaveTextContent("the real 1990 record in row 0 (Berkeley hills)$430,000");
    expect(panel).toHaveTextContent("2 inputs changed$476,000");
    expect(within(panel).getByText(/estimate is \$46,000 higher than for the baseline/)).toBeInTheDocument();
    const items = within(panel).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      "Median household income$83,252 a year →changed to $120,000 a year",
      "Median house age41 years →changed to 20 years",
    ]);
    expect(panel).toHaveTextContent("not that the changed inputs cause the difference");
  });

  test("says lower when the estimate falls, and announces the difference", () => {
    renderCard({ valueUsd: 401_000 }, { baseline: BASELINE, currentValues: { ...EXAMPLE_INPUT, HouseAge: 10 } });
    const panel = screen.getByRole("region", { name: "Compared with your baseline" });
    expect(within(panel).getByText(/estimate is \$29,000 lower than for the baseline/)).toBeInTheDocument();
    expect(
      screen.getByText("Estimated median home value: $401,000. The model’s estimate is $29,000 lower than for the baseline."),
    ).toBeInTheDocument();
  });

  test("doesn't compare against an estimate that is out of date", () => {
    renderCard(
      { status: "loading", isStale: true },
      { baseline: BASELINE, currentValues: { ...EXAMPLE_INPUT, HouseAge: 10 } },
    );
    const panel = screen.getByRole("region", { name: "Compared with your baseline" });
    expect(panel).toHaveTextContent("Waiting for the current estimate…");
    expect(panel).not.toHaveTextContent(/higher|lower/);
  });

  test("shows an invalid current value in the changed list", () => {
    const withoutLatitude: Partial<HousingInput> = { ...EXAMPLE_INPUT };
    delete withoutLatitude.Latitude;
    renderCard({ status: "blocked", isStale: true }, { baseline: BASELINE, currentValues: withoutLatitude });
    const panel = screen.getByRole("region", { name: "Compared with your baseline" });
    expect(within(panel).getByRole("listitem")).toHaveTextContent("Latitude37.88°N →changed to invalid");
  });

  test("clears the baseline", async () => {
    const { onClearBaseline } = renderCard({}, { baseline: BASELINE, currentValues: { ...EXAMPLE_INPUT, HouseAge: 10 } });
    await userEvent.click(screen.getByRole("button", { name: "Clear baseline" }));
    expect(onClearBaseline).toHaveBeenCalledOnce();
  });

  test("draws the baseline on the scale with a legend", () => {
    renderCard({}, { baseline: BASELINE, currentValues: { ...EXAMPLE_INPUT, HouseAge: 10 } });
    expect(screen.getByTestId("scale-baseline")).toBeInTheDocument();
    expect(screen.getByText("Current estimate")).toBeInTheDocument();
  });
});

describe("PredictionCard", () => {
  test("shows the estimate rounded to $1,000 with honest context", () => {
    renderCard({});

    expect(screen.getByTestId("prediction-value")).toHaveTextContent("$430,000");
    expect(screen.getByText(/In 1990 dollars, for the synthetic median profile/)).toBeInTheDocument();
    expect(screen.getByText(/off by/)).toHaveTextContent(
      "On 4,128 areas it never saw during training, the model’s estimates were off by $32,800 on average.",
    );
    expect(screen.getByText(/not a range for this estimate/)).toBeInTheDocument();
  });

  test("announces a settled estimate to screen readers", () => {
    renderCard({});
    expect(screen.getByText("Estimated median home value: $430,000.")).toBeInTheDocument();
  });

  test("shows the raw model output in its own units", async () => {
    renderCard({});
    await userEvent.click(screen.getByText("Raw model output"));
    expect(screen.getByText("4.3021729")).toBeVisible();
    expect(screen.getByText(/\$430,217\.29/)).toBeVisible();
  });

  test("names the real record the estimate is for", () => {
    renderCard({}, { provenance: { kind: "record", row: 15760, place: "central San Francisco" } });
    expect(
      screen.getByText(/for the real 1990 record in row 15,760 \(central San Francisco\)/),
    ).toBeInTheDocument();
  });

  test("warns near the $500,001 cap", () => {
    renderCard({ valueUsd: 480_000 });
    expect(screen.getByText(/Near the data’s ceiling/)).toBeInTheDocument();
  });

  test("points to input warnings when there are any", () => {
    renderCard({}, { hasInputNotices: true });
    expect(screen.getByText(/Some inputs are unusual/)).toBeInTheDocument();
  });

  test("shows a placeholder before the first estimate", () => {
    renderCard({ status: "loading", valueUsd: null });
    expect(screen.getByText("Asking the model…")).toBeInTheDocument();
    expect(screen.queryByTestId("prediction-value")).not.toBeInTheDocument();
  });

  test("keeps the last estimate visible but marked while updating", () => {
    renderCard({ status: "loading", isStale: true });
    expect(screen.getByText("Updating…")).toBeInTheDocument();
    expect(screen.getByTestId("prediction-value").parentElement).toHaveAttribute("data-stale");
  });

  test("explains a slow response", () => {
    renderCard({ status: "loading", isStale: true, isSlow: true });
    expect(screen.getByText("Waking up the model…")).toBeInTheDocument();
    expect(screen.getByText(/service has been idle/)).toBeInTheDocument();
  });

  test("shows a safe error with a working retry", async () => {
    const { retry } = renderCard({
      status: "error",
      isStale: true,
      error: failure("unavailable").error,
    });

    expect(screen.getByText("Out of date")).toBeInTheDocument();
    expect(screen.getAllByText(/isn't reachable/)[0]).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  test.each([
    [1, "Fix the highlighted field to update the estimate."],
    [2, "Fix the highlighted fields to update the estimate."],
  ])("asks to fix %d invalid field(s)", (invalidCount, text) => {
    renderCard({ status: "blocked", isStale: true }, { invalidCount });
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
