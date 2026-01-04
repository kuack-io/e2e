import { CustomWorld } from "../../framework";
import * as podHelpers from "./helpers";
import { Then } from "@cucumber/cucumber";

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

Then("Cluster executes Checker pod successfully", async function (this: CustomWorld) {
  const pod = this.getSinglePod();
  await podHelpers.assertPodFinishedSusscessfully(pod);
  await podHelpers.assertPodLogsContainCheckerResult(pod);
  await podHelpers.assertPodProcessedInCluster(pod);
});
