import { CustomWorld } from "../../framework";
import * as helpers from "./helpers";
import { When } from "@cucumber/cucumber";

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

When("I deploy Checker pod for Agent", async function (this: CustomWorld) {
  await helpers.deployCheckerPodForAgent(this);
});

When("I deploy Checker pod for Cluster", async function (this: CustomWorld) {
  await helpers.deployCheckerPodForCluster(this);
});

When("I deploy {int} Checker pods for Agent", async function (this: CustomWorld, count: number) {
  await helpers.deployManyCheckerPodsForAgent(this, count);
});
