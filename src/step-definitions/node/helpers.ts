import { AgentPage } from "../../components/agentPage";
import { CustomWorld } from "../../framework";
import { expect } from "@playwright/test";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

/**
 * Verifies that the node accepts the agent by checking node logs for agent registration.
 * @param world - The test world instance.
 */
export async function assertNodeAcceptsAgent(world: CustomWorld): Promise<void> {
  console.log("Verifying node accepts agent successfully");

  // Get the agent UUID from the browser UI
  const browser = world.getBrowser("main");
  const agentPage = new AgentPage(browser);
  const agentUUID = await agentPage.getUUID();

  if (!agentUUID) {
    throw new Error("Agent UUID not found in browser UI");
  }
  console.log(`Agent UUID from browser: ${agentUUID}`);

  // The node logs "Agent <UUID> registered with capacity: ..." when an agent connects
  const expectedMessage = `Agent ${agentUUID} registered with capacity:`;

  await expect
    .poll(
      async () => {
        try {
          return await world.getNode().getLogs();
        } catch (e) {
          console.warn("Failed to get node logs, retrying...", e);
          return "";
        }
      },
      {
        // Wait up to 30 seconds for the log to appear
        timeout: 30000,
        message: `Node logs did not contain registration message for agent ${agentUUID}`,
      },
    )
    .toContain(expectedMessage);
  console.log(`Node logs confirmed agent ${agentUUID} registration`);
}
