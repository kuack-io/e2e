import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import * as helpers from "./helpers";
import { Given, When, Then } from "@cucumber/cucumber";

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

Given("I open agent UI", async function (this: CustomWorld) {
  await helpers.openAgentUI(this);
});

Given("I open agent {string} UI", async function (this: CustomWorld, agentName: string) {
  await helpers.openAgentUI(this, agentName);
});

// Connection Steps

Given("I connect agent to node", async function (this: CustomWorld) {
  await helpers.connectAgentToNode(this);
});

When("I connect agent {string} to node", async function (this: CustomWorld, agentName: string) {
  await helpers.connectAgentToNode(this, agentName);
});

When("I disconnect agent", async function (this: CustomWorld) {
  await helpers.disconnectAgent(this);
});

When("I disconnect agent {string}", async function (this: CustomWorld, agentName: string) {
  await helpers.disconnectAgent(this, agentName);
});

Then("Agent connects successfully", async function (this: CustomWorld) {
  await helpers.assertAgentConnectionSuccess(this);
});

Then("Agent {string} connects successfully", async function (this: CustomWorld, agentName: string) {
  await helpers.assertAgentConnectionSuccess(this, agentName);
});

Then("Agent status is disconnected", async function (this: CustomWorld) {
  await helpers.assertAgentDisconnected(this);
});

Then("Agent shows {int} processed pods", async function (this: CustomWorld, count: number) {
  await helpers.assertAgentExecutedPods(this, count);
});

Then("Agent {string} shows {int} processed pods", async function (this: CustomWorld, agentName: string, count: number) {
  await helpers.assertAgentExecutedPods(this, count, agentName);
});

// UI Interaction Steps

When("I click the {string} button", async function (this: CustomWorld, buttonName: string) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);

  if (buttonName === "Clear") {
    await agentPage.clearLogs();
  } else {
    throw new Error(`Unknown button: ${buttonName}`);
  }
});

Then("Agent execution logs should be empty", async function (this: CustomWorld) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  await agentPage.expectLogsEmpty();
});

Then("Agent execution logs contain {string}", async function (this: CustomWorld, message: string) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  await agentPage.expectLogsContain(message);
});

Then("{string} button should be {word}", async function (this: CustomWorld, buttonName: string, state: string) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const isEnabled = state === "enabled";

  if (buttonName === "Connect") {
    await agentPage.expectConnectButtonEnabled(isEnabled);
  } else if (buttonName === "Disconnect") {
    await agentPage.expectDisconnectButtonEnabled(isEnabled);
  } else {
    throw new Error(`Unknown button: ${buttonName}`);
  }
});

Then("Agent token should be {word}", async function (this: CustomWorld, visibility: string) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const isVisible = visibility === "visible";
  await agentPage.expectTokenVisible(isVisible);
});

When("I {word} {string} password checkbox", async function (this: CustomWorld, action: string, checkboxName: string) {
  if (checkboxName !== "Show") {
    throw new Error(`Unknown checkbox: ${checkboxName}`);
  }
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const shouldCheck = action === "check";
  await agentPage.toggleShowPassword(shouldCheck);
});
