import { Agent } from "../components/agent";
import { K8s } from "../utils/k8s";
import { Logs } from "../utils/logs";
import { CustomWorld } from "./world";
import {
  After,
  Before,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep,
  ITestCaseHookParameter,
  ITestStepHookParameter,
  Status,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import * as fs from "node:fs";

setDefaultTimeout(60_000);

BeforeAll(async function () {
  Logs.init();
  console.log("[BeforeAll] Initializing K8s");
  await K8s.init();
  console.log("[BeforeAll] Initializing Agent");
  await Agent.init();
});

AfterAll(async function () {
  console.log("[AfterAll] Destroying Agent");
  await Agent.destroy();
  console.log("[AfterAll] Destroying K8s");
  await K8s.destroy();
});

Before({ name: "Initialize test" }, async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const scenarioName = scenario.pickle.name;
  const featureName = scenario.gherkinDocument?.feature?.name ?? "";

  const logs = new Logs();
  logs.start();
  try {
    await this.init(featureName, scenarioName);
  } finally {
    const captured = logs.stop();
    if (captured.length > 0) {
      this.attach(captured.join("\n"), { mediaType: "text/plain", fileName: "console.log" });
    }
  }
});

After({ name: "Tear down test" }, async function (this: CustomWorld) {
  const logs = new Logs();
  logs.start();
  try {
    // Get browsers before destroying (they'll be closed in destroy())
    const browsers = Array.from(this.getBrowsers().entries());

    await this.destroy();

    // Attach videos from all browsers after they're closed (videos are finalized on close)
    // Videos are only attached if recording was enabled (Config.playwrightDebug)
    // Add a small delay to ensure video files are fully written to disk
    await new Promise((resolve) => setTimeout(resolve, 100));

    for (const [name, browser] of browsers) {
      try {
        const videoPath = await browser.getVideoPath();
        if (videoPath) {
          // Retry checking if file exists (Playwright may need a moment to finalize)
          let exists = fs.existsSync(videoPath);
          if (!exists) {
            // Wait a bit more and retry
            await new Promise((resolve) => setTimeout(resolve, 200));
            exists = fs.existsSync(videoPath);
          }

          if (exists) {
            const videoBuffer = fs.readFileSync(videoPath);
            this.attach(videoBuffer, {
              mediaType: "video/webm",
              fileName: `${name}-video.webm`,
            });
          }
        }
      } catch {
        // Video may not be available, ignore
      }
    }
  } finally {
    const captured = logs.stop();
    if (captured.length > 0) {
      this.attach(captured.join("\n"), { mediaType: "text/plain", fileName: "console.log" });
    }
  }
});

BeforeStep(async function (this: CustomWorld) {
  this.initLogs();
  this.startCaptureLogs();
});

AfterStep(async function (this: CustomWorld, { result }: ITestStepHookParameter) {
  const captured = this.stopCaptureLogs() ?? [];
  if (captured.length > 0) {
    this.attach(captured.join("\n"), { mediaType: "text/plain", fileName: "console.log" });
  }

  // Attach screenshots from all active browsers
  const browsers = this.getBrowsers();
  for (const [name, browser] of browsers) {
    try {
      const screenshot = await browser.screenshot();
      if (screenshot) {
        this.attach(screenshot, {
          mediaType: "image/png",
          fileName: `${name}-screenshot.png`,
        });
      }
    } catch {
      // Browser may be closed or in an invalid state, ignore
    }
  }
});
