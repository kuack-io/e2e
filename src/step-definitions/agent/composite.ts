import { CustomWorld } from "../../framework";
import * as podHelpers from "../pod/helpers";
import * as helpers from "./helpers";
import { Given, Then, When } from "@cucumber/cucumber";

// ============================================================================
// COMPOSITE STEPS (High-level, business-focused)
// ============================================================================

/**
 * This composite step encapsulates the entire connection flow.
 * Use this in complex scenarios where connection is just a prerequisite.
 */
Given("Agent is connected to Node", async function (this: CustomWorld) {
  await helpers.ensureAgentConnected(this);
});

Then("Agent executes Checker pod successfully", async function (this: CustomWorld) {
  const pods = this.getPods();
  if (pods.length === 0) throw new Error("No pods found");
  const pod = pods[pods.length - 1];
  await podHelpers.verifyPodSuccess(pod);
  await podHelpers.assertPodProcessedOnAgent(pod);
});

Then("Agent executes all {int} Checker pods successfully", async function (this: CustomWorld, count: number) {
  const pods = this.getPods();
  if (pods.length !== count) {
    throw new Error(`Expected ${count} pods, but found ${pods.length}`);
  }
  for (const pod of pods) {
    await podHelpers.verifyPodSuccess(pod);
    await podHelpers.assertPodProcessedOnAgent(pod);
  }
});

Then("Agent pods are processed on Agent", async function (this: CustomWorld) {
  const pods = this.getPods().filter((p) => !p.metadata?.name?.includes("checker-cluster-"));
  if (pods.length === 0) throw new Error("No agent pods found");
  for (const pod of pods) {
    await podHelpers.assertPodProcessedOnAgent(pod);
  }
});

Given("Agent has processed a workload", async function (this: CustomWorld) {
  await helpers.ensureAgentConnected(this);
  await podHelpers.deployCheckerPodForAgent(this);
  const pod = this.getSinglePod();
  await podHelpers.verifyPodSuccess(pod);
  await podHelpers.assertPodProcessedOnAgent(pod);
  await helpers.assertAgentExecutedPods(this, 1);
});

Given("Agent {string} has processed a workload", async function (this: CustomWorld, agentName: string) {
  await helpers.ensureAgentConnected(this, agentName);
  await podHelpers.deployManyCheckerPodsForAgent(this, 1); // Using 'many' to ensure unique names if needed, or just standard
  const pods = this.getPods();
  const pod = pods[pods.length - 1];
  if (!pod) throw new Error("No pod found after deployment");

  await podHelpers.verifyPodSuccess(pod);
  await podHelpers.assertPodProcessedOnAgent(pod);
  await helpers.assertAgentExecutedPods(this, 1, agentName);
});

When("I disconnect and reconnect agent", async function (this: CustomWorld) {
  await helpers.disconnectAgent(this);
  await helpers.assertAgentDisconnected(this);
  await helpers.assertAgentExecutedPods(this, 0); // verify reset
  await helpers.connectAgentToNode(this);
  await helpers.assertAgentConnectionSuccess(this);
});

When(
  "I switch workload from {string} to {string}",
  async function (this: CustomWorld, fromAgent: string, toAgent: string) {
    await helpers.disconnectAgent(this, fromAgent);
    await helpers.connectAgentToNode(this, toAgent);
    await helpers.assertAgentConnectionSuccess(this, toAgent);
  },
);
