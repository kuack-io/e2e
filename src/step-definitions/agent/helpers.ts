import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import { Chromium } from "../../utils/browser";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

/**
 * Opens the agent UI in a browser.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */

/**
 * Opens the agent UI in a browser.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function openAgentUI(world: CustomWorld, browserName: string = "main"): Promise<void> {
  console.log(`Creating new browser instance: ${browserName}`);
  const browser = new Chromium();
  const agentURL = world.getAgent().getURL();
  console.log(`Opening agent UI for ${browserName} at ${agentURL}`);
  await browser.open(agentURL);
  world.addBrowser(browserName, browser);
}

/**
 * Connects the agent to the node by setting the server URL and clicking connect.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function connectAgentToNode(world: CustomWorld, browserName: string = "main"): Promise<void> {
  const browser = world.getBrowser(browserName);
  const agentPage = new AgentPage(browser);
  const nodeURL = world.getNode().getURL();

  console.log(`[${browserName}] Setting server URL to: ${nodeURL}`);
  await agentPage.setServerURL(nodeURL);

  console.log(`[${browserName}] Clicking connect button`);
  await agentPage.connect();
}

/**
 * Disconnects the agent from the node.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function disconnectAgent(world: CustomWorld, browserName: string = "main"): Promise<void> {
  const browser = world.getBrowser(browserName);
  const agentPage = new AgentPage(browser);

  console.log(`[${browserName}] Clicking disconnect button`);
  await agentPage.disconnect();
}

/**
 * Asserts that the agent connection was successful by checking status and logs.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function assertAgentConnectionSuccess(world: CustomWorld, browserName: string = "main"): Promise<void> {
  console.log(`[${browserName}] Asserting agent connection success`);
  const browser = world.getBrowser(browserName);
  const agentPage = new AgentPage(browser);

  // Check that status is "connected"
  await agentPage.expectConnected();
  console.log(`[${browserName}] Agent status confirmed as connected`);

  // Check that execution logs contain the successful connection message
  await agentPage.expectLogsContain("[Agent] WebSocket connection established");
  console.log(`[${browserName}] Execution logs confirmed successful connection message`);
}

/**
 * Asserts that the agent is disconnected.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function assertAgentDisconnected(world: CustomWorld, browserName: string = "main"): Promise<void> {
  console.log(`[${browserName}] Asserting agent disconnected`);
  const browser = world.getBrowser(browserName);
  const agentPage = new AgentPage(browser);

  await agentPage.expectDisconnected();
  console.log(`[${browserName}] Agent confirmed disconnected`);
}

/**
 * Asserts that the agent executed a specific number of pods.
 * @param world - The test world instance.
 * @param count - The expected number of executed pods.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function assertAgentExecutedPods(
  world: CustomWorld,
  count: number,
  browserName: string = "main",
): Promise<void> {
  console.log(`[${browserName}] Asserting agent executed ${count} pods`);
  const browser = world.getBrowser(browserName);
  const agentPage = new AgentPage(browser);

  await agentPage.expectExecutedPods(count);
  console.log(`[${browserName}] Agent executed pods count confirmed: ${count}`);
}

/**
 * Ensures that an agent is open and connected to the node.
 * This encapsulates opening the UI, connecting, and asserting success.
 * @param world - The test world instance.
 * @param browserName - The name of the browser instance (default: "main").
 */
export async function ensureAgentConnected(world: CustomWorld, browserName: string = "main"): Promise<void> {
  await openAgentUI(world, browserName);
  await connectAgentToNode(world, browserName);
  await assertAgentConnectionSuccess(world, browserName);
}
