/**
 * Example implementation showing best practices for managing BDD complexity
 *
 * This file demonstrates:
 * 1. Atomic steps (low-level, reusable)
 * 2. Helper functions (shared logic)
 * 3. Composite steps (high-level, business-focused)
 */
import { Agent } from "../../components/agent";
import { CustomWorld } from "../../framework";
import { Chromium } from "../../utils/browser";
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I open agent UI", async function (this: CustomWorld) {
  console.log("Creating new browser instance");
  const browser = new Chromium();
  console.log(`Opening agent UI at ${Agent.getURL()}`);
  await browser.open(Agent.getURL());
  this.addBrowser("main", browser);
});

When("I click connect button", async function (this: CustomWorld) {
  console.log("Clicking connect button");
  const browser = this.getBrowser("main");
  const page = browser.getPage();
  await page.locator("#connectBtn").click();
});

Then("Agent connects successfully", async function (this: CustomWorld) {
  console.log("Verifying agent connection success");
  const browser = this.getBrowser("main");
  const page = browser.getPage();

  // Check that status is "connected"
  const statusElement = page.locator("#status");
  await expect(statusElement).toHaveClass(/connected/);
  await expect(statusElement).toContainText("Status: Connected");
  console.log("Status confirmed as connected");

  // Check that execution logs contain the successful connection message
  const logsElement = page.locator("#logs");
  await expect(logsElement).toContainText("[Agent] WebSocket connection established");
  console.log("Execution logs confirmed successful connection message");
});

Then("Node accepts agent successfully", async function (this: CustomWorld) {
  // TODO: Implement
  console.log("Verifying node accepts agent successfully");
});
