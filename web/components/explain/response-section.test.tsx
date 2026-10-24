import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { failure } from "@/lib/api/errors";
import { sweep } from "@/lib/api/client";
import type { FeatureName } from "@/lib/housing/features";
import type { SweepPoint } from "@/lib/housing/types";
import { EXAMPLE_INPUT } from "@/test/fixtures";
import { ResponseSection } from "./response-section";

vi.mock("@/lib/api/client", () => ({ sweep: vi.fn() }));
const sweepMock = vi.mocked(sweep);

function points(feature: FeatureName, values: number[], failed: number[] = []): SweepPoint[] {
  return values.map((value, i) => ({
    value,
    predicted_value_usd: failed.includes(i) ? null : 100_000 + i * 10_000,
  }));
}

function respond(feature: FeatureName, values: number[], failed: number[] = []) {
  sweepMock.mockResolvedValue({ ok: true, data: { feature, points: points(feature, values, failed) } });
}

beforeEach(() => {
  sweepMock.mockReset();
  respond("MedInc", [2, 5, 8.3252, 10]);
});

describe("ResponseSection", () => {
  test("asks how the estimate responds to income by default", async () => {
    render(<ResponseSection input={EXAMPLE_INPUT} />);
    await screen.findByText("Current value: $83,252 a year");

    expect(sweepMock).toHaveBeenCalledWith(
      { input: EXAMPLE_INPUT, feature: "MedInc" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("figure", { name: /median household income varies/ })).toBeInTheDocument();
  });

  test("says it shows model behaviour, not cause and effect", async () => {
    render(<ResponseSection input={EXAMPLE_INPUT} />);
    expect(await screen.findByText(/not cause and effect/)).toBeInTheDocument();
    expect(screen.getByText(/The line joins 4 separate estimates/)).toBeInTheDocument();
  });

  test("offers the numbers as a table, marking the current value", async () => {
    const user = userEvent.setup();
    render(<ResponseSection input={EXAMPLE_INPUT} />);
    await user.click(await screen.findByText("Show the numbers"));

    const table = screen.getByRole("table", { name: /estimate at each value of median household income/ });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "$20,000 a year$100,000",
      "$50,000 a year$110,000",
      "$83,252 a year (current)$120,000",
      "$100,000 a year$130,000",
    ]);
  });

  test("switches to another input and never shows the old input's curve", async () => {
    const user = userEvent.setup();
    render(<ResponseSection input={EXAMPLE_INPUT} />);
    await screen.findByText("Current value: $83,252 a year");

    respond("HouseAge", [10, 41, 52]);
    await user.selectOptions(screen.getByLabelText("Input to vary"), "HouseAge");

    expect(screen.queryByText("Current value: $83,252 a year")).not.toBeInTheDocument();
    expect(await screen.findByText("Current value: 41 years")).toBeInTheDocument();
    expect(sweepMock).toHaveBeenLastCalledWith(
      { input: EXAMPLE_INPUT, feature: "HouseAge" },
      expect.anything(),
    );
  });

  test("notes points that couldn't be estimated", async () => {
    respond("MedInc", [2, 5, 8.3252, 10], [1, 3]);
    render(<ResponseSection input={EXAMPLE_INPUT} />);
    expect(await screen.findByText(/2 points couldn’t be estimated and are left as gaps/)).toBeInTheDocument();
  });

  test("marks the region beyond the training data when it is shown", async () => {
    respond("Population", [88, 322, 50_000]);
    const user = userEvent.setup();
    render(<ResponseSection input={{ ...EXAMPLE_INPUT, Population: 50_000 }} />);
    await user.selectOptions(screen.getByLabelText("Input to vary"), "Population");

    expect(await screen.findByText("Beyond every area in the training data")).toBeInTheDocument();
  });

  test("waits for valid inputs", () => {
    render(<ResponseSection input={null} />);
    expect(screen.getByText("Fix the highlighted fields to see how the model responds.")).toBeInTheDocument();
    expect(sweepMock).not.toHaveBeenCalled();
  });

  test("shows a safe error and retries", async () => {
    sweepMock.mockResolvedValueOnce(failure("unavailable"));
    const user = userEvent.setup();
    render(<ResponseSection input={EXAMPLE_INPUT} />);

    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Current value: $83,252 a year")).toBeInTheDocument();
    expect(sweepMock).toHaveBeenCalledTimes(2);
  });
});
