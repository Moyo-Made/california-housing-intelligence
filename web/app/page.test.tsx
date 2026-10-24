import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("states what the model estimates and what it is not", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: /median home value of a 1990 California neighbourhood/ }),
  ).toBeInTheDocument();
  expect(screen.getByText(/not the price of an individual home/)).toBeInTheDocument();
  expect(screen.getByText(/not a current valuation/)).toBeInTheDocument();
});
