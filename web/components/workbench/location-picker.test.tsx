import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { LocationPicker } from "./location-picker";

function setup(props: Partial<Parameters<typeof LocationPicker>[0]> = {}) {
  const onMove = vi.fn();
  render(
    <LocationPicker latitude={37.88} longitude={-122.23} isOutside={false} onMove={onMove} {...props} />,
  );
  return { onMove, map: screen.getByRole("group", { name: "Location on a map of California" }) };
}

describe("LocationPicker", () => {
  test("is a labelled, focusable map with instructions", () => {
    const { map } = setup();
    expect(map).toHaveAttribute("tabindex", "0");
    expect(map).toHaveAccessibleDescription(/arrow keys move it by 0.05° \(Shift: 0.5°\)/);
  });

  test.each([
    ["{ArrowUp}", 37.93, -122.23],
    ["{ArrowDown}", 37.83, -122.23],
    ["{ArrowRight}", 37.88, -122.18],
    ["{ArrowLeft}", 37.88, -122.28],
    ["{Shift>}{ArrowUp}{/Shift}", 38.38, -122.23],
  ])("%s moves the pin", async (keys, latitude, longitude) => {
    const { map, onMove } = setup();
    map.focus();
    await userEvent.keyboard(keys);
    expect(onMove).toHaveBeenLastCalledWith(latitude, longitude);
  });

  test("announces keyboard moves", async () => {
    const { map } = setup();
    map.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByText("37.93°N, 122.23°W")).toBeInTheDocument();
  });

  test("keeps the pin inside the accepted range", async () => {
    const { map, onMove } = setup({ latitude: 41.9, longitude: -124.4 });
    map.focus();
    await userEvent.keyboard("{Shift>}{ArrowUp}{ArrowLeft}{/Shift}");
    expect(onMove).toHaveBeenNthCalledWith(1, 42, -124.4);
    expect(onMove).toHaveBeenNthCalledWith(2, 41.9, -124.5);
  });

  test("does nothing with the keyboard while a coordinate is invalid", async () => {
    const { map, onMove } = setup({ latitude: undefined });
    map.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByTestId("location-pin")).not.toBeInTheDocument();
  });

  test("places the pin near a chosen city", async () => {
    const { onMove } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Place near a city" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fresno" }));
    expect(onMove).toHaveBeenCalledWith(36.74, -119.79);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("colours the pin as a notice when the point is outside California", () => {
    setup({ latitude: 36.17, longitude: -115.14, isOutside: true });
    expect(screen.getByTestId("location-pin")).toHaveAttribute("fill", "var(--notice)");
  });
});
