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
  setDefaultTimeout,
} from "@cucumber/cucumber";
import * as fs from "node:fs";

// Timeout for test steps (2 minutes to account for helm install --wait)
const STEP_TIMEOUT_MS = 120_000;
// Internal timeout fires slightly before Cucumber's to allow error capture
const INIT_TIMEOUT_MS = STEP_TIMEOUT_MS - 2_000;

setDefaultTimeout(STEP_TIMEOUT_MS);

/**
 * Run an async function with a timeout.
 * Throws a TimeoutError if the function doesn't complete in time.
 * @param fn - The async function to run.
 * @param timeoutMs - The timeout in milliseconds.
 * @param label - A label for the timeout error message.
 * @returns The result of the async function.
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${label} did not complete within ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// Module-level agent instance for this worker.
// Each parallel worker has its own process and thus its own agent.
let workerAgent: Agent;

/**
 * Get the agent instance for this worker.
 * @returns The agent instance.
 * @throws Error if the agent has not been initialized.
 */
export function getAgent(): Agent {
  if (!workerAgent) {
    throw new Error("Agent has not been initialized");
  }
  return workerAgent;
}

BeforeAll(async function () {
  Logs.init();
  console.log("[BeforeAll] Initializing K8s");
  await K8s.init();
  console.log("[BeforeAll] Initializing Agent");
  workerAgent = new Agent();
  await workerAgent.init();
});

AfterAll(async function () {
  console.log("[AfterAll] Destroying Agent");
  await workerAgent.destroy();
  console.log("[AfterAll] Deinitializing K8s");
  await K8s.destroy();
});

Before({ name: "Initialize scenario" }, async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const scenarioName = scenario.pickle.name;
  const featureName = scenario.gherkinDocument?.feature?.name ?? "";

  const logs = new Logs();
  logs.start();
  let initError: unknown = null;
  try {
    await withTimeout(
      () => this.init(featureName, scenarioName),
      INIT_TIMEOUT_MS,
      `Initialize scenario "${scenarioName}"`,
    );
  } catch (error) {
    initError = error;
    console.error(`[Before] Failed to initialize scenario "${scenarioName}":`, error);
  } finally {
    const captured = logs.stop();
    // Attach captured logs
    if (captured.length > 0) {
      this.attach(captured.join("\n"), { mediaType: "text/plain", fileName: "console.log" });
    }
  }
  // If there was an error, attach it separately to ensure it's visible in the report
  // This is done outside finally to avoid unsafe throw in finally block
  if (initError) {
    const errorMessage =
      initError instanceof Error ? `${initError.message}\n\nStack trace:\n${initError.stack}` : String(initError);
    this.attach(errorMessage, { mediaType: "text/plain", fileName: "error.txt" });
    throw initError;
  }
});

After({ name: "Cleanup scenario" }, async function (this: CustomWorld) {
  const logs = new Logs();
  logs.start();
  try {
    // Get browsers before destroying (they'll be closed in destroy())
    const browsers = Array.from(this.getBrowsers().entries());

    await this.destroy();

    // Attach videos from all browsers after they're closed (videos are finalized on close)
    // Videos are only attached if recording was enabled (Config.recordVideo)
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

AfterStep(async function (this: CustomWorld, { result: _result }: ITestStepHookParameter) {
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
