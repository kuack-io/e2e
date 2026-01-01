import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import { Chromium } from "../../utils/browser";
import { Given, When, Then } from "@cucumber/cucumber";

Given("I open agent UI", async function (this: CustomWorld) {
  console.log("Creating new browser instance");
  const browser = new Chromium();
  const agentURL = this.getAgent().getURL();
  console.log(`Opening agent UI at ${agentURL}`);
  await browser.open(agentURL);
  this.addBrowser("main", browser);
});

When("I connect agent to node", async function (this: CustomWorld) {
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const nodeURL = this.getNode().getURL();

  console.log(`Setting server URL to: ${nodeURL}`);
  await agentPage.setServerURL(nodeURL);

  console.log("Clicking connect button");
  await agentPage.connect();
});

Then("Agent connects successfully", async function (this: CustomWorld) {
  console.log("Verifying agent connection success");
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);

  // Check that status is "connected"
  await agentPage.expectConnected();
  console.log("Status confirmed as connected");

  // Check that execution logs contain the successful connection message
  await agentPage.expectLogsContain("[Agent] WebSocket connection established");
  console.log("Execution logs confirmed successful connection message");
});
