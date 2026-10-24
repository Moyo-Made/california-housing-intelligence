import { expect, test } from "@playwright/test";

const ENTRIES: [label: string, feature: string, typed: string, sent: string][] = [
  ["Latitude", "Latitude", "37.88", "37.88"],
  ["Longitude", "Longitude", "-122.23", "-122.23"],
  ["Median household income", "MedInc", "83252", "8.3252"],
  ["Population", "Population", "322", "322"],
  ["Average people per household", "AveOccup", "2.56", "2.56"],
  ["Median house age", "HouseAge", "41", "41"],
  ["Average rooms per household", "AveRooms", "6.98", "6.98"],
  ["Average bedrooms per household", "AveBedrms", "1.02", "1.02"],
];

test("every field can be completed with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("region", { name: "What the model receives" });

  // Load a real record through the menu using only the keyboard.
  await page.getByRole("button", { name: "Load an example" }).focus();
  await page.keyboard.press("Enter");
  const record = page.getByRole("menuitem", { name: /Downtown Los Angeles/ });
  for (let i = 0; i < 8 && !(await record.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(record).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Real 1990 record.")).toBeVisible();

  // Tab forward to each field in page order and type a new value.
  for (const [label, feature, typed, sent] of ENTRIES) {
    const input = page.getByRole("textbox", { name: label, exact: true });
    for (let i = 0; i < 10 && !(await input.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(input).toBeFocused();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(typed);

    await expect(panel.locator(`dt:text-is("${feature}") + dd`)).toHaveText(sent);
  }

  await expect(page.getByText("Constructed inputs.", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("All eight values are valid.");
});

test("sliders respond to arrow keys", async ({ page }) => {
  await page.goto("/");
  const slider = page.getByRole("slider", { name: "Adjust median house age" });

  await slider.focus();
  await page.keyboard.press("ArrowRight");

  await expect(slider).toHaveAttribute("aria-valuenow", "30");
  await expect(page.getByRole("textbox", { name: "Median house age" })).toHaveValue("30");
});
