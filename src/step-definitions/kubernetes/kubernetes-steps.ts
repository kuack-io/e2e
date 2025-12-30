import { CustomWorld } from "../../framework/world";
import { KubernetesUtils } from "../../utils/k8s-utils";
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I apply the Kubernetes resource {string}", async function (this: CustomWorld, resourcePath: string) {
  const result = await this.kubectl(`apply -f ${resourcePath}`);
  if (result.stderr && !result.stderr.includes("Warning")) {
    throw new Error(`Failed to apply resource: ${result.stderr}`);
  }
  this.testData.set("lastAppliedResource", resourcePath);
});

Given("I delete the Kubernetes resource {string}", async function (this: CustomWorld, resourcePath: string) {
  const result = await this.kubectl(`delete -f ${resourcePath}`);
  // Ignore "not found" errors as resource might already be deleted
  if (result.stderr && !result.stderr.includes("not found")) {
    throw new Error(`Failed to delete resource: ${result.stderr}`);
  }
});

When("I execute kubectl command {string}", async function (this: CustomWorld, command: string) {
  const result = await this.kubectl(command);
  this.testData.set("lastKubectlResult", result);
});

When("I wait for pod {string} to be {string}", async function (this: CustomWorld, podName: string, status: string) {
  const k8sUtils = new KubernetesUtils(this);
  const success = await k8sUtils.waitForPodStatus(podName, status, 60_000);
  if (!success) {
    throw new Error(`Pod ${podName} did not reach status ${status} within timeout`);
  }
});

When("I wait for deployment {string} to be ready", async function (this: CustomWorld, deploymentName: string) {
  const k8sUtils = new KubernetesUtils(this);
  const success = await k8sUtils.waitForDeploymentReady(deploymentName, 120_000);
  if (!success) {
    throw new Error(`Deployment ${deploymentName} did not become ready within timeout`);
  }
});

Then(
  "the pod {string} should be {string}",
  async function (this: CustomWorld, podName: string, expectedStatus: string) {
    const k8sUtils = new KubernetesUtils(this);
    const pod = await k8sUtils.getPod(podName);

    if (!pod) {
      throw new Error(`Pod ${podName} not found`);
    }

    const actualStatus = pod.status?.phase?.toLowerCase();
    expect(actualStatus).toBe(expectedStatus.toLowerCase());
  },
);

Then(
  "the deployment {string} should have {int} ready replicas",
  async function (this: CustomWorld, deploymentName: string, expectedReplicas: number) {
    const k8sUtils = new KubernetesUtils(this);
    const deployment = await k8sUtils.getDeployment(deploymentName);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentName} not found`);
    }

    const readyReplicas = deployment.status?.readyReplicas || 0;
    expect(readyReplicas).toBe(expectedReplicas);
  },
);

Then(
  "there should be {int} pods with label {string}",
  async function (this: CustomWorld, expectedCount: number, labelSelector: string) {
    const k8sUtils = new KubernetesUtils(this);
    const pods = await k8sUtils.listPods(labelSelector);
    expect(pods.length).toBe(expectedCount);
  },
);

Then("the service {string} should exist", async function (this: CustomWorld, serviceName: string) {
  const k8sUtils = new KubernetesUtils(this);
  const service = await k8sUtils.getService(serviceName);

  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }

  expect(service.metadata?.name).toBe(serviceName);
});
