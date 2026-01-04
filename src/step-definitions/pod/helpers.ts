import { Config } from "../../components/config";
import { CustomWorld } from "../../framework";
import { K8s } from "../../utils/k8s";
import { PodFactory } from "../../utils/pod-factory";
import { Tools } from "../../utils/tools";
import { V1Pod } from "@kubernetes/client-node";

// ============================================================================
// HELPER FUNCTIONS (Shared logic, not directly used in Gherkin)
// ============================================================================

/**
 * Deploys a checker pod for agent testing.
 * @param world - The test world instance.
 */
export async function deployCheckerPodForAgent(world: CustomWorld): Promise<void> {
  console.log("Deploying checker pod for agent");
  const nodeName = world.getNode().getName(); // node name already includes random string
  const podName = `checker-${nodeName}`;
  const pod = PodFactory.checkerForAgent(podName, nodeName);
  world.addPod(podName, pod);
  await K8s.applyPod(pod);
  console.log(`Checker pod ${podName} deployed successfully`);
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
 * Asserts that a pod finished successfully by checking its phase.
 * @param pod - The pod to check.
 * @throws Error if the pod did not finish successfully.
 */
export async function assertPodFinishedSusscessfully(pod: V1Pod): Promise<void> {
  console.log("Asserting that pod finished successfully");
  const podName = pod.metadata?.name;
  if (!podName) {
    throw new Error("Pod must have a name");
  }
  const succeededPod = await K8s.waitForPodPhase(podName, "Succeeded");

  if (succeededPod.status?.phase !== "Succeeded") {
    const reason = succeededPod.status?.reason || "Unknown";
    const message = succeededPod.status?.message || "No message";
    throw new Error(
      `Pod ${podName} did not finish successfully. Phase: ${succeededPod.status?.phase}, Reason: ${reason}, Message: ${message}`,
    );
  }
  console.log(`Pod ${podName} finished successfully`);
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
  const logs = await K8s.getPodLogsByName(podName);

  if (!logs.includes(message)) {
    throw new Error(
      `Pod ${podName} logs do not contain expected message "${message}". Logs: ${logs.substring(0, 500)}...`,
    );
  }
  console.log(`Pod ${podName} logs contain message "${message}"`);
}

/**
 * Asserts that pod logs contain checker result indicators (URL, total time, success flag).
 * @param pod - The pod to check.
 */
export async function assertPodLogsContainCheckerResult(pod: V1Pod): Promise<void> {
  await assertPodLogsContainMessage(pod, `"url": "${Config.checkerUrl}"`);
  await assertPodLogsContainMessage(pod, '"total_time_ms"');
  await assertPodLogsContainMessage(pod, '"success": true');
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
