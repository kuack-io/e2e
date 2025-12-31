import { Browser, BrowserContext, Page, chromium } from "@playwright/test";

/**
 * Interface for browser instances used in tests.
 */
export interface BrowserInstance {
  open(url: string, headless: boolean): Promise<void>;
  close(): Promise<void>;
}

/**
 * Chromium browser implementation for Playwright-based tests.
 */
export class Chromium implements BrowserInstance {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  /**
   * Launch the browser and navigate to the specified URL.
   * @param url - The URL to navigate to.
   * @param headless - Whether to run in headless mode (default: true).
   */
  public async open(url: string, headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({ headless: headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    await this.page.goto(url, { waitUntil: "networkidle" });
  }

  /**
   * Close the browser and clean up resources.
   */
  public async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
    this.page = undefined;
  }
}
