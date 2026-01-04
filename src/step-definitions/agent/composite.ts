import { CustomWorld } from "../../framework";
import * as podHelpers from "../pod/helpers";
import * as helpers from "./helpers";
import { Given, Then } from "@cucumber/cucumber";

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

/**
 * This composite step encapsulates the entire connection flow.
 * Use this in complex scenarios where connection is just a prerequisite.
 */
Given("Agent is connected to Node", async function (this: CustomWorld) {
  await helpers.openAgentUI(this);
  await helpers.connectAgentToNode(this);
  await helpers.assertAgentConnectionSuccess(this);
});

Then("Agent executes Checker pod successfully", async function (this: CustomWorld) {
  const pod = this.getSinglePod();
  await podHelpers.assertPodFinishedSusscessfully(pod);
  await podHelpers.assertPodLogsContainCheckerResult(pod);
  await podHelpers.assertPodProcessedInCluster(pod);
});
