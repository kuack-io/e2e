import { Config } from "../../components/config";
import { CustomWorld } from "../../framework";
import { K8s } from "../../utils/k8s";
import { PodFactory } from "../../utils/pod-factory";
import { Tools } from "../../utils/tools";
import { V1Pod } from "@kubernetes/client-node";
import { expect } from "@playwright/test";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

/**
 * Deploys a checker pod for agent testing.
 * @param world - The test world instance.
 */
export async function deployCheckerPodForAgent(world: CustomWorld): Promise<void> {
  console.log("Deploying checker pod for agent");
  const nodeName = world.getNode().getName();
  const podName = `checker-${nodeName}-${Tools.randomString(4)}`;
  const pod = PodFactory.checkerForAgent(podName, nodeName);
  world.addPod(podName, pod);
  await K8s.applyPod(pod);
  console.log(`Checker pod ${podName} deployed successfully`);
}

/**
 * Deploys multiple checker pods for agent testing.
 * @param world - The test world instance.
 * @param count - The number of pods to deploy.
 */
export async function deployManyCheckerPodsForAgent(world: CustomWorld, count: number): Promise<void> {
  console.log(`Deploying ${count} checker pods for agent`);
  const nodeName = world.getNode().getName();

  const deploymentPromises: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const podName = `checker-${nodeName}-${i}-${Tools.randomString(4)}`;
    const pod = PodFactory.checkerForAgent(podName, nodeName);
    world.addPod(podName, pod);
    deploymentPromises.push(K8s.applyPod(pod).then(() => {}));
  }

  await Promise.all(deploymentPromises);
  console.log(`${count} checker pods deployed successfully`);
}

/**
 * Deploys a checker pod for cluster testing.
 * @param world - The test world instance.
 */
export async function deployCheckerPodForCluster(world: CustomWorld): Promise<void> {
  console.log("Deploying checker pod for cluster");
  const podName = `checker-cluster-${Tools.randomString(6)}`;
  const pod = PodFactory.checkerForCluster(podName);
  world.addPod(podName, pod);
  await K8s.applyPod(pod);
  console.log(`Checker pod ${podName} deployed successfully`);
}

/**
 * Deploys multiple checker pods for cluster testing.
 * @param world - The test world instance.
 * @param count - The number of pods to deploy.
 */
export async function deployManyCheckerPodsForCluster(world: CustomWorld, count: number): Promise<void> {
  console.log(`Deploying ${count} checker pods for cluster`);

  const deploymentPromises: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const podName = `checker-cluster-${i}-${Tools.randomString(4)}`;
    const pod = PodFactory.checkerForCluster(podName);
    world.addPod(podName, pod);
    deploymentPromises.push(K8s.applyPod(pod).then(() => {}));
  }

  await Promise.all(deploymentPromises);
  console.log(`${count} checker pods for cluster deployed successfully`);
}

/**
 * Asserts that a pod finished successfully by checking its phase.
 * @param pod - The pod to check.
 * @throws Error if the pod did not finish successfully.
 */
export async function assertPodFinishedSuccessfully(pod: V1Pod): Promise<void> {
  console.log("Asserting that pod finished successfully");
  const podName = pod.metadata?.name;
  if (!podName) {
    throw new Error("Pod must have a name");
  }

  try {
    await K8s.waitForPodPhase(podName, "Succeeded");
    console.log(`Pod ${podName} finished successfully`);
  } catch {
    // Get the current pod state for better error diagnostics
    const currentPod = await K8s.getPod(podName);
    const phase = currentPod.status?.phase || "Unknown";
    const reason = currentPod.status?.reason || "Unknown";
    const message = currentPod.status?.message || "No message";

    // Get container status information
    const containerStatuses = currentPod.status?.containerStatuses || [];
    const containerErrors: string[] = [];
    for (const status of containerStatuses) {
      if (status.state?.waiting) {
        containerErrors.push(
          `Container ${status.name} is waiting: ${status.state.waiting.reason || "unknown"} - ${status.state.waiting.message || ""}`,
        );
      } else if (status.state?.terminated) {
        if (status.state.terminated.exitCode !== 0) {
          containerErrors.push(
            `Container ${status.name} terminated with exit code ${status.state.terminated.exitCode}: ${status.state.terminated.reason || "unknown"} - ${status.state.terminated.message || ""}`,
          );
        }
      }
    }

    const containerInfo = containerErrors.length > 0 ? `\nContainer status: ${containerErrors.join("; ")}` : "";

    throw new Error(
      `Pod ${podName} did not reach phase Succeeded within timeout. Current phase: ${phase}, Reason: ${reason}, Message: ${message}${containerInfo}`,
    );
  }
}

/**
 * Asserts that pod logs contain a specific message.
 * @param pod - The pod to check.
 * @param message - The message to look for in the logs.
 * @throws Error if the message is not found in the logs.
 */
export async function assertPodLogsContainMessage(pod: V1Pod, message: string): Promise<void> {
  console.log(`Asserting that pod logs contain message "${message}"`);
  const podName = pod.metadata?.name;
  if (!podName) {
    throw new Error("Pod must have a name");
  }
  await expect
    .poll(
      async () => {
        try {
          return await K8s.getPodLogsByName(podName);
        } catch {
          return "";
        }
      },
      {
        timeout: 30000,
        message: `Pod ${podName} logs did not contain expected message "${message}" within timeout.`,
      },
    )
    .toContain(message);
  console.log(`Pod ${podName} logs contain message "${message}"`);
}

/**
 * Asserts that pod logs contain checker result indicators (URL, total time, success flag).
 * @param pod - The pod to check.
 */
export async function assertPodLogsContainCheckerResult(pod: V1Pod): Promise<void> {
  await assertPodLogsContainMessage(pod, `"${Config.checkerUrl}"`);
  await assertPodLogsContainMessage(pod, '"total_time_ms":');
  await assertPodLogsContainMessage(pod, '"success":');
}

/**
 * Asserts that a pod was processed in the cluster (not on a kuack node).
 * @param pod - The pod to check.
 * @throws Error if the pod was scheduled on a kuack node or not scheduled yet.
 */
export async function assertPodProcessedInCluster(pod: V1Pod): Promise<void> {
  console.log("Asserting that pod was processed in the cluster");
  const podName = pod.metadata?.name;
  if (!podName) {
    throw new Error("Pod must have a name");
  }
  const currentPod = await K8s.getPod(podName);

  const nodeName = currentPod.spec?.nodeName;
  if (!nodeName) {
    throw new Error(`Pod ${podName} has not been scheduled yet (no nodeName)`);
  }

  const isKuack = await K8s.isKuackNode(nodeName);
  if (isKuack) {
    throw new Error(`Pod ${podName} was scheduled on kuack node "${nodeName}", not in cluster`);
  }
  console.log(`Pod ${podName} was processed in the cluster`);
}

/**
 * Asserts that a pod was processed on an Agent (kuack node).
 * @param pod - The pod to check.
 * @throws Error if the pod was not scheduled on a kuack node or not scheduled yet.
 */
export async function assertPodProcessedOnAgent(pod: V1Pod): Promise<void> {
  console.log("Asserting that pod was processed on agent");
  const podName = pod.metadata?.name;
  if (!podName) {
    throw new Error("Pod must have a name");
  }
  const currentPod = await K8s.getPod(podName);

  const nodeName = currentPod.spec?.nodeName;
  if (!nodeName) {
    throw new Error(`Pod ${podName} has not been scheduled yet (no nodeName)`);
  }

  const isKuack = await K8s.isKuackNode(nodeName);
  if (!isKuack) {
    throw new Error(`Pod ${podName} was scheduled on cluster node "${nodeName}", not on kuack node`);
  }
  console.log(`Pod ${podName} was processed on agent (kuack node: ${nodeName})`);
}

/**
 * Verifies that a pod completed successfully and produced the expected checker output.
 * Encapsulates success phase check and log verification.
 * @param pod - The pod to check.
 */
export async function verifyPodSuccess(pod: V1Pod): Promise<void> {
  await assertPodFinishedSuccessfully(pod);
  await assertPodLogsContainCheckerResult(pod);
}
