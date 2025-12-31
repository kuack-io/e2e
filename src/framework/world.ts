import { Node } from "../components/node";
import { BrowserInstance } from "../utils/browser";
import { Logs } from "../utils/logs";
import { World, setWorldConstructor } from "@cucumber/cucumber";

/**
 * Custom Cucumber world containing test state and utilities.
 */
export class CustomWorld extends World {
  private featureName?: string;
  private scenarioName?: string;
  private node?: Node;
  private stepLogs?: Logs;
  private browsers: Map<string, BrowserInstance> = new Map();

  /**
   * Initialize the world.
   * Called in Before hook. Can't be done in constructor because it depends on
   * the feature and scenario names which are known during execution only.
   * @param featureName - The name of the current feature.
   * @param scenarioName - The name of the current scenario.
   */
  public async init(featureName: string, scenarioName: string): Promise<void> {
    this.featureName = featureName;
    this.scenarioName = scenarioName;
    this.node = new Node(featureName, scenarioName);
    await this.node.init();
  }

  /**
   * Initialize the log capture utility for this world.
   */
  public initLogs(): void {
    this.stepLogs = new Logs();
  }

  /**
   * Start capturing console logs.
   */
  public startCaptureLogs(): void {
    this.stepLogs?.start();
  }

  /**
   * Stop capturing console logs and return the captured output.
   * @returns An array of captured log messages.
   */
  public stopCaptureLogs(): string[] {
    const captured = this.stepLogs?.stop() ?? [];
    return captured;
  }

  /**
   * Destroy the world by cleaning up resources (node, etc.).
   */
  public async destroy(): Promise<void> {
    // Close any open Playwright browsers to avoid hanging the test runner.
    const browsers = Array.from(this.browsers.values());
    await Promise.allSettled(browsers.map((b) => b.close()));
    this.browsers.clear();

    await this.node?.destroy();
  }

  /**
   * Register a browser instance with a given name.
   * @param name - The name to identify this browser instance.
   * @param browser - The browser instance to register.
   */
  public addBrowser(name: string, browser: BrowserInstance): void {
    this.browsers.set(name, browser);
  }

  /**
   * Get a registered browser instance by name.
   * @param name - The name of the browser instance.
   * @returns The browser instance.
   * @throws Error if the browser is not found.
   */
  public getBrowser(name: string): BrowserInstance {
    const browser = this.browsers.get(name);
    if (!browser) {
      throw new Error(`Browser ${name} not found`);
    }
    return browser;
  }
}

setWorldConstructor(CustomWorld);
