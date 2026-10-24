import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { FEATURE_NAMES, FEATURES } from "@/lib/housing/features";
import { Workbench } from "./workbench";

function sentValue(name: string) {
  const panel = screen.getByRole("region", { name: "What the model receives" });
  return within(panel).getByText(name, { selector: "dt" }).nextElementSibling?.textContent;
}

describe("Workbench", () => {
  test("labels every feature's input", () => {
    render(<Workbench />);
    for (const name of FEATURE_NAMES) {
      expect(screen.getByRole("textbox", { name: FEATURES[name].label })).toBeInTheDocument();
    }
  });

  test("starts from a clearly labelled synthetic profile", () => {
    render(<Workbench />);
    expect(screen.getByText("Synthetic profile.")).toBeInTheDocument();
    expect(screen.getByText(/not a real block group/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  test("shows income in dollars and sends it in tens of thousands", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const income = screen.getByRole("textbox", { name: "Median household income" });

    await user.clear(income);
    await user.type(income, "83,252");

    expect(sentValue("MedInc")).toBe("8.3252");
    expect(screen.getByText("Constructed inputs.")).toBeInTheDocument();
  });

  test("shows an error after leaving an invalid field and blocks the model", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const latitude = screen.getByRole("textbox", { name: "Latitude" });

    await user.clear(latitude);
    await user.type(latitude, "51.5");
    expect(latitude).not.toHaveAttribute("aria-invalid");

    await user.tab();
    expect(latitude).toHaveAttribute("aria-invalid", "true");
    expect(latitude).toHaveAccessibleDescription(/Latitude must be between 32.5 and 42/);
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 field needs fixing before the model can be asked.",
    );
    expect(sentValue("Latitude")).toBe("—invalid");
  });

  test("warns about values beyond the training data without blocking", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const population = screen.getByRole("textbox", { name: "Population" });

    await user.clear(population);
    await user.type(population, "50000");

    expect(population).toHaveAccessibleDescription(/Outside the training data/);
    expect(screen.getByRole("status")).toHaveTextContent("All eight values are valid.");
  });

  test("arrow keys step the value; Shift steps ten times further", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const age = screen.getByRole("textbox", { name: "Median house age" });

    await user.click(age);
    await user.keyboard("{ArrowUp}");
    expect(age).toHaveValue("30");
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(age).toHaveValue("20");
  });

  test("loads a real record from the menu and resets back", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.click(screen.getByRole("button", { name: "Load an example" }));
    await user.click(await screen.findByRole("menuitem", { name: /Berkeley hills/ }));

    expect(screen.getByText("Real 1990 record.")).toBeInTheDocument();
    expect(screen.getByText(/Dataset row 0, Berkeley hills/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Median household income" })).toHaveValue("83,252");
    expect(sentValue("AveRooms")).toBe("6.984127");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Synthetic profile.")).toBeInTheDocument();
  });

  test("explains a feature in its help popover", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.click(screen.getByRole("button", { name: "About median house age" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/52 years or more were all recorded as 52/);
    expect(dialog).toHaveTextContent("HouseAge");
  });
});
