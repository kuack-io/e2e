import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Then("Node accepts agent successfully", async function (this: CustomWorld) {
  console.log("Verifying node accepts agent successfully");

  // Get the agent UUID from the browser UI
  const browser = this.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const agentUUID = await agentPage.getUUID();

  if (!agentUUID) {
    throw new Error("Agent UUID not found in browser UI");
  }
  console.log(`Agent UUID from browser: ${agentUUID}`);

  // Get node logs and verify the agent registration message
  const nodeLogs = await this.getNode().getLogs();
  console.log("Checking node logs for agent registration");

  // The node logs "Agent <UUID> registered with capacity: ..." when an agent connects
  const expectedMessage = `Agent ${agentUUID} registered with capacity:`;
  expect(nodeLogs).toContain(expectedMessage);
  console.log(`Node logs confirmed agent ${agentUUID} registration`);
});
