import { CustomWorld } from "../../framework";
import * as helpers from "./helpers";
import { Then } from "@cucumber/cucumber";

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

Then("Node accepts agent successfully", async function (this: CustomWorld) {
  await helpers.assertNodeAcceptsAgent(this);
});
