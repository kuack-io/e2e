import { Config } from "../components/config";
import { Browser, BrowserContext, Page, chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Interface for browser instances used in tests.
 */
export interface BrowserInstance {
  open(url: string, headless?: boolean): Promise<void>;
  close(): Promise<void>;
  screenshot(): Promise<Buffer | undefined>;
  getVideoPath(): Promise<string | undefined>;
  getPage(): Page;
}

/**
 * Chromium browser implementation for Playwright-based tests.
 */
export class Chromium implements BrowserInstance {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private videoPath?: string;

  /**
   * Get the directory path for storing videos.
   * Videos are stored in allure-results/playwright-videos directory.
   * @returns The directory path for storing videos.
   */
  private static getVideoDir(): string {
    const videoDir = path.join(process.cwd(), "allure-results", "playwright-videos");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    return videoDir;
  }

  /**
   * Launch the browser and navigate to the specified URL.
   * Video recording is enabled when Config.recordVideo is true (default: true).
   * @param url - The URL to navigate to.
   * @param headless - Whether to run in headless mode (default: true).
   */
  public async open(url: string, headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({
      headless: headless,
      args: [
        // Disable network throttling and improve download performance
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-ipc-flooding-protection",
        "--disable-client-side-phishing-detection",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-sync",
        "--disable-translate",
        // Improve performance for WASM
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-sandbox",
        "--ignore-certificate-errors",
        // Enable WASM optimizations
        "--enable-features=WebAssemblyBaseline,WebAssemblyLazyCompilation",
      ],
    });
    const videoDir = Chromium.getVideoDir();
    this.context = await this.browser.newContext({
      recordVideo: Config.recordVideo
        ? {
            dir: videoDir,
            size: { width: 1280, height: 720 },
          }
        : undefined,
    });
    this.page = await this.context.newPage();
    // Force document.hidden to be false to prevent the Agent from reporting itself as throttled
    // This is necessary because in headless mode (even with throttling flags disabled),
    // the browser might still report hidden=true, causing the Node provider to de-prioritize or skip scheduling.
    await this.page.addInitScript(`
      Object.defineProperty(document, "hidden", {
        get: () => false,
        configurable: true,
      });
      Object.defineProperty(document, "visibilityState", {
        get: () => "visible",
        configurable: true,
      });
      window.dispatchEvent(new Event("visibilitychange"));
    `);
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  /**
   * Get the Playwright page instance for direct interaction.
   * @returns The page instance.
   * @throws Error if the page is not available (browser not opened yet).
   */
  public getPage(): Page {
    const page = this.page;
    if (!page) {
      throw new Error("Page is not available. Call open() first.");
    }
    return page;
  }

  /**
   * Take a screenshot of the current page.
   * @returns A buffer containing the screenshot, or undefined if no page is open.
   */
  public async screenshot(): Promise<Buffer | undefined> {
    if (!this.page) {
      return undefined;
    }
    return await this.page.screenshot({ type: "png", fullPage: true });
  }

  /**
   * Get the path to the recorded video file.
   * Must be called after closing the page/context for the video to be finalized.
   * @returns The path to the video file, or undefined if no video was recorded.
   */
  public async getVideoPath(): Promise<string | undefined> {
    // Return cached video path if available (set during close)
    if (this.videoPath) {
      return this.videoPath;
    }
    if (!this.page) {
      return undefined;
    }
    const video = this.page.video();
    if (!video) {
      return undefined;
    }
    return await video.path();
  }

  /**
   * Close the browser and clean up resources.
   * Saves the video path before closing the context so videos can be accessed later.
   * Uses timeouts to prevent indefinite hangs during cleanup.
   */
  public async close(): Promise<void> {
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | undefined> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<undefined>((resolve) => {
        timeoutId = setTimeout(() => resolve(undefined), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      });
    };

    // Get video path before closing context (Playwright finalizes video on context close)
    if (this.page) {
      const video = this.page.video();
      if (video) {
        try {
          this.videoPath = await withTimeout(video.path(), 2000);
        } catch {
          // Video path may not be available yet, will try again later
        }
      }
    }

    if (this.context) {
      await withTimeout(this.context.close(), 5000);
      // After closing context, the video path should be finalized
      // Try to get it again if we didn't get it before
      if (!this.videoPath && this.page) {
        const video = this.page.video();
        if (video) {
          try {
            this.videoPath = await withTimeout(video.path(), 2000);
          } catch {
            // Video may not be available
          }
        }
      }
      this.context = undefined;
    }
    if (this.browser) {
      await withTimeout(this.browser.close(), 5000);
      this.browser = undefined;
    }
    this.page = undefined;
  }
}
