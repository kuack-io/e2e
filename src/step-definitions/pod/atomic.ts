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

When(
  "I deploy {string} pod with command {string} for {string}",
  async function (this: CustomWorld, image: string, commandStr: string, target: string) {
    let cmd: string[];
    if (image.includes("python")) {
      cmd = ["python3", "-c", commandStr];
    } else if (image.includes("node")) {
      cmd = ["node", "-e", commandStr];
    } else {
      cmd = ["/bin/sh", "-c", commandStr];
    }

    if (target === "Agent") {
      await helpers.deployGenericPodForAgent(this, image, cmd);
    } else if (target === "Cluster") {
      await helpers.deployGenericPodForCluster(this, image, cmd);
    } else {
      throw new Error(`Unknown target: ${target}`);
    }
  },
);
