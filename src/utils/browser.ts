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
   * Video recording is enabled automatically when Config.playwrightDebug is true.
   * @param url - The URL to navigate to.
   * @param headless - Whether to run in headless mode (default: true).
   */
  public async open(url: string, headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({ headless: headless });
    const videoDir = Chromium.getVideoDir();
    this.context = await this.browser.newContext({
      recordVideo: Config.playwrightDebug
        ? {
            dir: videoDir,
            size: { width: 1280, height: 720 },
          }
        : undefined,
    });
    this.page = await this.context.newPage();
    await this.page.goto(url, { waitUntil: "networkidle" });
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
   */
  public async close(): Promise<void> {
    // Get video path before closing context (Playwright finalizes video on context close)
    if (this.page) {
      const video = this.page.video();
      if (video) {
        try {
          this.videoPath = await video.path();
        } catch {
          // Video path may not be available yet, will try again later
        }
      }
    }

    if (this.context) {
      await this.context.close();
      // After closing context, the video path should be finalized
      // Try to get it again if we didn't get it before
      if (!this.videoPath && this.page) {
        const video = this.page.video();
        if (video) {
          try {
            this.videoPath = await video.path();
          } catch {
            // Video may not be available
          }
        }
      }
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
    this.page = undefined;
  }
}
