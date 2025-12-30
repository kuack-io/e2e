import type { CustomWorld } from "./world";

export async function attachScreenshot(world: CustomWorld, name = "screenshot"): Promise<void> {
  if (!world.page || !world.attach) {
    return;
  }

  const screenshot = await world.page.screenshot({ fullPage: true });
  await world.attach(screenshot, "image/png");
}
