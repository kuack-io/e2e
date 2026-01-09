import { CustomWorld } from "../../framework";
import * as podHelpers from "./helpers";
import { Then, When } from "@cucumber/cucumber";

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

Then("Cluster executes Checker pod successfully", async function (this: CustomWorld) {
  const pods = this.getPods().filter((p) => p.metadata?.name?.includes("checker-cluster-"));
  if (pods.length === 0) throw new Error("No cluster pods found");
  const pod = pods[pods.length - 1];
  await podHelpers.verifyPodSuccess(pod);
  await podHelpers.assertPodProcessedInCluster(pod);
});

Then("All pods execute successfully", async function (this: CustomWorld) {
  const pods = this.getPods();
  for (const pod of pods) {
    await podHelpers.verifyPodSuccess(pod);
  }
});

Then("Cluster pods are processed in Cluster", async function (this: CustomWorld) {
  const pods = this.getPods().filter((p) => p.metadata?.name?.includes("checker-cluster-"));
  if (pods.length === 0) throw new Error("No cluster pods found");
  for (const pod of pods) {
    await podHelpers.assertPodProcessedInCluster(pod);
  }
});

When(
  "I deploy mixed workload of {int} Agent pods and {int} Cluster pods",
  async function (this: CustomWorld, agentCount: number, clusterCount: number) {
    await podHelpers.deployManyCheckerPodsForAgent(this, agentCount);
    await podHelpers.deployManyCheckerPodsForCluster(this, clusterCount);
  },
);
