import { CustomWorld } from "../../framework";
import * as podHelpers from "./helpers";
import { Then, When } from "@cucumber/cucumber";

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

Then("Cluster executes Checker pod successfully", async function (this: CustomWorld) {
  const pods = this.getPods().filter(
    (p) => p.metadata?.name?.includes("checker-cluster-") || p.metadata?.name?.includes("checker-universal-"),
  );
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

Then("All pods execute successfully and logs contain {string}", async function (this: CustomWorld, message: string) {
  const pods = this.getPods();
  if (pods.length === 0) throw new Error("No pods found");
  for (const pod of pods) {
    await podHelpers.assertPodFinishedSuccessfully(pod);
    await podHelpers.assertPodLogsContainMessage(pod, message);
  }
});

Then(
  "{string} pods are processed in {string}",
  async function (this: CustomWorld, _targetPods: string, targetLocation: string) {
    const pods = this.getPods();
    if (pods.length === 0) throw new Error("No pods found");
    for (const pod of pods) {
      if (targetLocation === "Agent") {
        await podHelpers.assertPodProcessedOnAgent(pod);
      } else if (targetLocation === "Cluster") {
        await podHelpers.assertPodProcessedInCluster(pod);
      } else {
        throw new Error(`Unknown target location: ${targetLocation}`);
      }
    }
  },
);
