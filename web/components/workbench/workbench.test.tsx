import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { predict } from "@/lib/api/client";
import { FEATURE_NAMES, FEATURES } from "@/lib/housing/features";
import { getPreset } from "@/lib/housing/presets";
import { Workbench } from "./workbench";

vi.mock("@/lib/api/client", () => ({ predict: vi.fn(), sweep: vi.fn(() => new Promise(() => {})) }));
const predictMock = vi.mocked(predict);

beforeEach(() => {
  predictMock.mockReset();
  predictMock.mockResolvedValue({ ok: true, data: { predicted_value_usd: 213_456.78 } });
});

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

describe("Workbench predictions", () => {
  test("asks the model for the starting profile and shows the estimate", async () => {
    render(<Workbench />);

    expect(await screen.findByTestId("prediction-value")).toHaveTextContent("$213,000");
    expect(predictMock).toHaveBeenCalledTimes(1);
    expect(predictMock.mock.calls[0][0]).toEqual(getPreset("median").values);
  });

  test("asks again with the edited inputs", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    await screen.findByTestId("prediction-value");
    predictMock.mockResolvedValue({ ok: true, data: { predicted_value_usd: 301_000 } });

    const age = screen.getByRole("textbox", { name: "Median house age" });
    await user.clear(age);
    await user.type(age, "45");

    await waitFor(() => expect(screen.getByTestId("prediction-value")).toHaveTextContent("$301,000"));
    expect(predictMock).toHaveBeenLastCalledWith(
      { ...getPreset("median").values, HouseAge: 45 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("stops asking while a field is invalid", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    await screen.findByTestId("prediction-value");
    const callsBefore = predictMock.mock.calls.length;

    const latitude = screen.getByRole("textbox", { name: "Latitude" });
    await user.clear(latitude);
    await user.type(latitude, "99");
    await user.tab();
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(predictMock).toHaveBeenCalledTimes(callsBefore);
    expect(screen.getByText("Fix the highlighted field to update the estimate.")).toBeInTheDocument();
    expect(screen.getByText("Out of date")).toBeInTheDocument();
  });
});

describe("Workbench comparison", () => {
  test("pins an estimate and compares later edits against it", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    await waitFor(() => expect(screen.getByTestId("prediction-value")).toHaveTextContent("$213,000"));

    await user.click(screen.getByRole("button", { name: "Pin as baseline" }));
    expect(screen.getByRole("button", { name: "Pin current as baseline" })).toBeDisabled();

    predictMock.mockResolvedValue({ ok: true, data: { predicted_value_usd: 258_900 } });
    const age = screen.getByRole("textbox", { name: "Median house age" });
    await user.clear(age);
    await user.type(age, "45");

    const panel = await screen.findByRole("region", { name: "Compared with your baseline" });
    expect(await within(panel).findByText(/estimate is \$46,000 higher than for the baseline/)).toBeInTheDocument();
    expect(panel).toHaveTextContent("the synthetic median profile$213,000");
    expect(within(panel).getByRole("listitem")).toHaveTextContent("Median house age29 years →changed to 45 years");

    await user.click(within(panel).getByRole("button", { name: "Clear baseline" }));
    expect(screen.queryByRole("region", { name: "Compared with your baseline" })).not.toBeInTheDocument();
  });

  test("keeps the baseline while another example is loaded", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    await waitFor(() => expect(screen.getByTestId("prediction-value")).toHaveTextContent("$213,000"));
    await user.click(screen.getByRole("button", { name: "Pin as baseline" }));

    predictMock.mockResolvedValue({ ok: true, data: { predicted_value_usd: 430_217.29 } });
    await user.click(screen.getByRole("button", { name: "Load an example" }));
    await user.click(await screen.findByRole("menuitem", { name: /Berkeley hills/ }));

    const panel = screen.getByRole("region", { name: "Compared with your baseline" });
    expect(await within(panel).findByText(/\$217,000 higher/)).toBeInTheDocument();
    expect(within(panel).getAllByRole("listitem")).toHaveLength(8);
  });
});

describe("Workbench location", () => {
  test("places the area near a city and marks the inputs as constructed", async () => {
    const user = userEvent.setup();
    render(<Workbench />);

    await user.click(screen.getByRole("button", { name: "Place near a city" }));
    await user.click(await screen.findByRole("menuitem", { name: "San Diego" }));

    expect(screen.getByRole("textbox", { name: "Latitude" })).toHaveValue("32.72");
    expect(screen.getByRole("textbox", { name: "Longitude" })).toHaveValue("-117.16");
    expect(screen.getByText("Constructed inputs.")).toBeInTheDocument();
  });

  test("warns when the point is outside California", async () => {
    const user = userEvent.setup();
    render(<Workbench />);
    const latitude = screen.getByRole("textbox", { name: "Latitude" });
    const longitude = screen.getByRole("textbox", { name: "Longitude" });

    await user.clear(longitude);
    await user.type(longitude, "-115.14");
    await user.clear(latitude);
    await user.type(latitude, "36.17");

    expect(screen.getByText(/outside California or offshore/)).toBeInTheDocument();
  });
});
