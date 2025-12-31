import { BrowserInstance } from "../utils/browser";
import { Page, expect } from "@playwright/test";

/**
 * Connection status values for the Agent page.
 */
export type ConnectionStatus = "connected" | "connecting" | "disconnected";

/**
 * AgentPage provides methods to interact with the Agent UI page.
 * Unlike the abstract Agent class which manages the helm deployment,
 * AgentPage represents an instance of the Agent UI in a browser.
 */
export class AgentPage {
  private readonly page: Page;

  constructor(browser: BrowserInstance) {
    this.page = browser.getPage();
  }

  /**
   * Get the agent UUID displayed on the page.
   * @returns The agent UUID, or null if not available.
   */
  public async getUUID(): Promise<string | null> {
    const text = await this.page.locator("#uuid").textContent();
    if (!text || text === "-") {
      return null;
    }
    return text;
  }

  /**
   * Get the current connection status.
   * @returns The connection status based on the status element's class.
   */
  public async getConnectionStatus(): Promise<ConnectionStatus> {
    const statusElement = this.page.locator("#status");
    const classList = await statusElement.getAttribute("class");

    if (classList?.includes("connected")) {
      return "connected";
    } else if (classList?.includes("connecting")) {
      return "connecting";
    }
    return "disconnected";
  }

  /**
   * Set the server URL in the input field.
   * @param serverURL - The server URL to set.
   */
  public async setServerURL(serverURL: string): Promise<void> {
    await this.page.locator("#serverUrl").fill(serverURL);
  }

  /**
   * Click the connect button.
   */
  public async connect(): Promise<void> {
    await this.page.locator("#connectBtn").click();
  }

  /**
   * Click the disconnect button.
   */
  public async disconnect(): Promise<void> {
    await this.page.locator("#disconnectBtn").click();
  }

  /**
   * Get the execution logs text.
   * @returns The logs text content.
   */
  public async getLogs(): Promise<string> {
    return (await this.page.locator("#logs").textContent()) ?? "";
  }

  /**
   * Clear the execution logs.
   */
  public async clearLogs(): Promise<void> {
    await this.page.locator("#clearLogsBtn").click();
  }

  /**
   * Get the number of executed pods.
   * @returns The executed pods count.
   */
  public async getExecutedPods(): Promise<string> {
    return (await this.page.locator("#pods").textContent()) ?? "?";
  }

  /**
   * Get the CPU information.
   * @returns The CPU info text.
   */
  public async getCPU(): Promise<string> {
    return (await this.page.locator("#cpu").textContent()) ?? "?";
  }

  /**
   * Get the memory information.
   * @returns The memory info text.
   */
  public async getMemory(): Promise<string> {
    return (await this.page.locator("#memory").textContent()) ?? "?";
  }

  /**
   * Get the GPU information.
   * @returns The GPU info text.
   */
  public async getGPU(): Promise<string> {
    return (await this.page.locator("#gpu").textContent()) ?? "?";
  }

  /**
   * Wait for the agent to be connected.
   * Asserts that the status element has the "connected" class and shows "Status: Connected".
   */
  public async expectConnected(): Promise<void> {
    const statusElement = this.page.locator("#status");
    await expect(statusElement).toHaveClass(/connected/);
    await expect(statusElement).toContainText("Status: Connected");
  }

  /**
   * Expect the logs to contain a specific message.
   * @param message - The message to expect in the logs.
   */
  public async expectLogsContain(message: string): Promise<void> {
    await expect(this.page.locator("#logs")).toContainText(message);
  }
}
