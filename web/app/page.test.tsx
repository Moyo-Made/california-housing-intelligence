import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Home from "./page";

vi.mock("@/lib/api/client", () => ({
  predict: vi.fn(() => new Promise(() => {})),
  sweep: vi.fn(() => new Promise(() => {})),
}));

test("states what the model estimates and what it is not", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /median home value of a 1990 California neighbourhood/ }),
  ).toBeInTheDocument();
  expect(screen.getByText(/not the price of an individual home/)).toBeInTheDocument();
  expect(screen.getByText(/not a current valuation/)).toBeInTheDocument();
});

test("links from the header to the method section", () => {
  render(<Home />);
  expect(screen.getByRole("link", { name: "Method and limits" })).toHaveAttribute("href", "#method");
  expect(document.getElementById("method")).not.toBeNull();
});

test("credits the data source and disclaims advice", () => {
  render(<Home />);
  const footer = screen.getByRole("contentinfo");
  expect(footer).toHaveTextContent("Pace and Barry (1997)");
  expect(footer).toHaveTextContent("Not financial or real-estate advice.");
});

// Guards the product's framing: an educational model of 1990 areas, never a
// valuation or investment tool, and never claiming cause and effect.
test.each([
  /\bworth\b/i,
  /\binvest/i,
  /apprais/i,
  /\bcauses\b/i,
  /\bwill (raise|increase|lower|reduce)\b/i,
  /confidence interval/i,
  /\baccurate\b/i,
])("page copy avoids %s", (pattern) => {
  const { container } = render(<Home />);
  expect(container.textContent).not.toMatch(pattern);
});
