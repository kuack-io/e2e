import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import { Chromium } from "../../utils/browser";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

/**
 * Opens the agent UI in a browser.
 * @param world - The test world instance.
 */
export async function openAgentUI(world: CustomWorld): Promise<void> {
  console.log("Creating new browser instance");
  const browser = new Chromium();
  const agentURL = world.getAgent().getURL();
  console.log(`Opening agent UI at ${agentURL}`);
  await browser.open(agentURL);
  world.addBrowser("main", browser);
}

/**
 * Connects the agent to the node by setting the server URL and clicking connect.
 * @param world - The test world instance.
 */
export async function connectAgentToNode(world: CustomWorld): Promise<void> {
  const browser = world.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const nodeURL = world.getNode().getURL();

  console.log(`Setting server URL to: ${nodeURL}`);
  await agentPage.setServerURL(nodeURL);

  console.log("Clicking connect button");
  await agentPage.connect();
}

/**
 * Asserts that the agent connection was successful by checking status and logs.
 * @param world - The test world instance.
 */
export async function assertAgentConnectionSuccess(world: CustomWorld): Promise<void> {
  console.log("Asserting agent connection success");
  const browser = world.getBrowser("main");
  const agentPage = new AgentPage(browser);

  // Check that status is "connected"
  await agentPage.expectConnected();
  console.log("Agent status confirmed as connected");

  // Check that execution logs contain the successful connection message
  await agentPage.expectLogsContain("[Agent] WebSocket connection established");
  console.log("Execution logs confirmed successful connection message");
}
