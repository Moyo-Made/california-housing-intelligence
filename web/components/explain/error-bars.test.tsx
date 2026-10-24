import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { ErrorBars } from "./error-bars";

test("renders a captioned table whose values don't depend on the bars", () => {
  render(
    <ErrorBars
      caption="Errors"
      rows={[
        { label: "Context", valueUsd: 80_000 },
        { label: "Focus", detail: "The one that matters", valueUsd: 20_000, emphasis: true },
      ]}
    />,
  );

  const table = screen.getByRole("table", { name: "Errors" });
  const rows = within(table).getAllByRole("row");
  expect(rows.map((row) => row.textContent)).toEqual([
    "ModelAverage error",
    "Context$80,000",
    "FocusThe one that matters$20,000",
  ]);
});

test("draws bar lengths in proportion on a shared $100,000 scale", () => {
  const { container } = render(
    <ErrorBars
      caption="Errors"
      rows={[
        { label: "A", valueUsd: 50_000 },
        { label: "B", valueUsd: 250_000 },
      ]}
    />,
  );

  // The fraction of the track each bar fills (the calc() multiplier).
  const fraction = (bar: HTMLElement) =>
    Number(bar.style.width.replace(/100%|4\.5rem/g, "").match(/\d+(\.\d+)?/)?.[0]);
  const bars = container.querySelectorAll<HTMLElement>("[aria-hidden]");
  expect(fraction(bars[0])).toBe(0.5);
  // Values past the scale are clamped rather than overflowing.
  expect(fraction(bars[1])).toBe(1);
});
