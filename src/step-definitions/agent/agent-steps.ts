/**
 * Example implementation showing best practices for managing BDD complexity
 *
 * This file demonstrates:
 * 1. Atomic steps (low-level, reusable)
 * 2. Helper functions (shared logic)
 * 3. Composite steps (high-level, business-focused)
 */
import { CustomWorld } from "../../framework";
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

async function openAgentUI(world: CustomWorld): Promise<void> {
  const agentUrl = `${world.baseUrl}/agent`;
  const defaultInstance = world.getBrowserInstance("default");
  if (!defaultInstance) {
    throw new Error("Default browser instance not initialized");
  }
  await defaultInstance.page.goto(agentUrl, { waitUntil: "networkidle" });
}

async function clickConnectButton(world: CustomWorld): Promise<void> {
  const defaultInstance = world.getBrowserInstance("default");
  if (!defaultInstance) {
    throw new Error("Default browser instance not initialized");
  }
  await defaultInstance.page.click("button#connect");
}

async function waitForConnection(world: CustomWorld, timeout: number = 10000): Promise<void> {
  const defaultInstance = world.getBrowserInstance("default");
  if (!defaultInstance) {
    throw new Error("Default browser instance not initialized");
  }
  await defaultInstance.page.waitForSelector(".connection-status.connected", { timeout });
}

async function verifyConnectionStatus(world: CustomWorld, expectedStatus: string): Promise<void> {
  const defaultInstance = world.getBrowserInstance("default");
  if (!defaultInstance) {
    throw new Error("Default browser instance not initialized");
  }
  const statusElement = defaultInstance.page.locator(".connection-status");
  await expect(statusElement).toHaveText(expectedStatus);
}

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

Given("I open agent UI", async function (this: CustomWorld) {
  await openAgentUI(this);
});

When("I click connect button", async function (this: CustomWorld) {
  await clickConnectButton(this);
});

Then("Agent connects successfully", async function (this: CustomWorld) {
  await waitForConnection(this);
  await verifyConnectionStatus(this, "Connected");
});

Then("Node accepts agent successfully", async function (this: CustomWorld) {
  await waitForConnection(this);
  // Additional verification that node accepted
  const defaultInstance = this.getBrowserInstance("default");
  if (!defaultInstance) {
    throw new Error("Default browser instance not initialized");
  }
  const nodeStatus = defaultInstance.page.locator(".node-status");
  await expect(nodeStatus).toHaveText("Agent Connected");
});

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

/**
 * This composite step encapsulates the entire connection flow.
 * Use this in complex scenarios where connection is just a prerequisite.
 */
Given("connection is established", async function (this: CustomWorld) {
  // Reuse the atomic steps via helper functions
  await openAgentUI(this);
  await clickConnectButton(this);
  await waitForConnection(this);

  // Verify connection succeeded
  await verifyConnectionStatus(this, "Connected");
});

/**
 * Another composite step for a more complex setup
 */
Given("agent is connected and authenticated", async function (this: CustomWorld) {
  // First establish connection
  await openAgentUI(this);
  await clickConnectButton(this);
  await waitForConnection(this);

  // Then authenticate (if needed)
  // await authenticateAgent(this);
});

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Simple test (uses atomic steps):
 *
 * Feature: Agent Connectivity
 *   Scenario: Agent can connect
 *     Given I open agent UI
 *     When I click connect button
 *     Then Agent connects successfully
 */

/**
 * Complex test (uses composite step):
 *
 * Feature: Complex Workflow
 *   Scenario: Perform action after connection
 *     Given connection is established
 *     When I perform complex action
 *     Then I should see expected result
 */

/**
 * Multiple scenarios with Background (uses composite step):
 *
 * Feature: Complex Workflow
 *   Background:
 *     Given connection is established
 *
 *   Scenario: Action A
 *     When I perform action A
 *     Then result A is visible
 *
 *   Scenario: Action B
 *     When I perform action B
 *     Then result B is visible
 */
