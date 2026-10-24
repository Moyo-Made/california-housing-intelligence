import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { MethodSection } from "./method-section";

function errorTable(name: RegExp) {
  return screen.getByRole("table", { name });
}

function rowValue(table: HTMLElement, rowName: RegExp) {
  return within(within(table).getByRole("row", { name: rowName })).getByRole("cell").textContent;
}

describe("MethodSection", () => {
  test("is the #method anchor target with its three parts", () => {
    render(<MethodSection />);
    expect(screen.getByRole("region", { name: "Method and limits" })).toHaveAttribute("id", "method");
    for (const name of ["What it predicts", "How it was evaluated", "What it can’t tell you"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });

  test("says the model predicts an area's median, not a house's price", () => {
    render(<MethodSection />);
    expect(screen.getByText(/describes one California census block group in 1990: an area, not a house/)).toBeInTheDocument();
  });

  test("compares the three models on the test set as recorded in the notebook", () => {
    render(<MethodSection />);
    const table = errorTable(/Average error on the 4,128 test areas/);

    expect(rowValue(table, /Always guess the median/)).toBe("$87,404");
    expect(rowValue(table, /Linear regression/)).toBe("$53,320");
    expect(rowValue(table, /Random forest/)).toBe("$32,773");
    expect(screen.getByText(/error is 63% lower than always guessing the median/)).toBeInTheDocument();
  });

  test("explains the train/test gap as overfitting", () => {
    render(<MethodSection />);
    const table = errorTable(/familiar areas vs unseen ones/);

    expect(rowValue(table, /Areas it trained on/)).toBe("$12,210");
    expect(rowValue(table, /Areas it never saw/)).toBe("$32,773");
    expect(screen.getByText(/about 2.7 times larger/)).toHaveTextContent("overfitting");
  });

  test("shows the depth comparison behind the final model", async () => {
    render(<MethodSection />);
    await userEvent.click(screen.getByText("How the tree depth was chosen"));

    const table = screen.getByRole("table", { name: "Validation error by maximum tree depth" });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getByRole("row", { name: /Unlimited \(used\)/ })).toHaveTextContent("$34,475");
  });

  test.each([
    ["1990, not today", /not adjusted for inflation/],
    ["areas, not homes", /says nothing about the price of any particular house/],
    ["above \\$500,000", /965 areas were recorded at the \$500,001 cap/],
    ["cause and effect", /not what would happen to real prices/],
    ["unfamiliar places", /picked at random/],
    ["used more than once", /isn’t a perfectly untouched final check/],
    ["No uncertainty", /not a range for any individual estimate/],
  ])("lists the limit: %s", (title, body) => {
    render(<MethodSection />);
    const heading = screen.getByRole("heading", { level: 4, name: new RegExp(title) });
    expect(heading.parentElement).toHaveTextContent(body);
  });
});
