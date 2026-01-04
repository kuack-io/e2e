import { CustomWorld } from "../../framework";
import * as helpers from "./helpers";
import { Given, When, Then } from "@cucumber/cucumber";

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

Given("I open agent UI", async function (this: CustomWorld) {
  await helpers.openAgentUI(this);
});

When("I connect agent to node", async function (this: CustomWorld) {
  await helpers.connectAgentToNode(this);
});

Then("Agent connects successfully", async function (this: CustomWorld) {
  await helpers.assertAgentConnectionSuccess(this);
});
