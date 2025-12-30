import { CustomWorld } from "../../framework/world";
import { KubernetesUtils } from "../../utils/k8s-utils";
import { Given, Then } from "@cucumber/cucumber";

// Common step definitions that might be used across multiple features

Given(
  "a pod named {string} exists in namespace {string}",
  async function (this: CustomWorld, podName: string, namespace: string) {
    this.namespace = namespace;
    const k8sUtils = new KubernetesUtils(this);
    const pod = await k8sUtils.getPod(podName);

    if (!pod) {
      throw new Error(`Pod ${podName} does not exist in namespace ${namespace}`);
    }
  },
);

Given("a deployment named {string} exists", async function (this: CustomWorld, deploymentName: string) {
  const k8sUtils = new KubernetesUtils(this);
  const deployment = await k8sUtils.getDeployment(deploymentName);

  if (!deployment) {
    throw new Error(`Deployment ${deploymentName} does not exist`);
  }
});

Then("the last kubectl command should succeed", async function (this: CustomWorld) {
  const result = this.testData.get("lastKubectlResult");
  if (!result) {
    throw new Error("No kubectl command was executed");
  }
  // kubectl commands that fail will throw, so if we got here, it succeeded
  // But we can check stderr for warnings
  if ((result as { stderr?: string }).stderr && (result as { stderr?: string }).stderr!.includes("Error")) {
    throw new Error(`kubectl command failed: ${(result as { stderr?: string }).stderr}`);
  }
});

Then("the pod {string} should not exist", async function (this: CustomWorld, podName: string) {
  const k8sUtils = new KubernetesUtils(this);
  const pod = await k8sUtils.getPod(podName);

  if (pod) {
    throw new Error(`Pod ${podName} still exists but should not`);
  }
});
