import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Prediction } from "@/components/workbench/use-prediction";
import { failure } from "@/lib/api/errors";
import type { Provenance } from "@/lib/housing/presets";
import { PredictionCard } from "./prediction-card";

function renderCard(
  prediction: Partial<Prediction>,
  { provenance = { kind: "synthetic" } as Provenance, hasInputNotices = false, invalidCount = 0 } = {},
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
  render(
    <PredictionCard
      prediction={full}
      provenance={provenance}
      hasInputNotices={hasInputNotices}
      invalidCount={invalidCount}
    />,
  );
  return full;
}

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
