import { After, Before, BeforeAll, AfterAll, ITestCaseHookParameter, setDefaultTimeout } from "@cucumber/cucumber";
import { CustomWorld } from "./world";

setDefaultTimeout(120_000);

BeforeAll(async function () {
  // Global setup hook if needed in the future
});

AfterAll(async function () {
  // Global teardown hook if needed in the future
});

Before(async function (this: CustomWorld) {
  await this.initBrowser();
  await this.initKubernetes();
  await this.createTestNamespace();
  await this.installHelmChart();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const failed = scenario.result?.status === "failed";

  // Take screenshots from all browser instances on failure
  if (failed && this.attach) {
    // Screenshot from default browser
    if (this.page) {
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await this.attach(screenshot, "image/png");
      } catch (error) {
        // Ignore screenshot errors
      }
    }

    // Screenshots from all other browser instances
    for (const [name, instance] of this.browsers.entries()) {
      if (name === "default" && this.page === instance.page) {
        continue; // Already captured above
      }
      try {
        const screenshot = await instance.page.screenshot({ fullPage: true });
        await this.attach(screenshot, "image/png");
      } catch (error) {
        // Ignore screenshot errors
      }
    }
  }

  // Always attempt to clean up Helm and the namespace, even if the scenario failed.
  await this.cleanupKubernetesResources();
  await this.disposeBrowser();
});
