import { CustomWorld } from "../../framework/world";
import { KubernetesUtils } from "../../utils/k8s-utils";
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

// Integration steps that combine browser and Kubernetes actions

Given(
  "I have applied the resource {string} and navigated to {string}",
  async function (this: CustomWorld, resourcePath: string, url: string) {
    // Apply Kubernetes resource
    const result = await this.kubectl(`apply -f ${resourcePath}`);
    if (result.stderr && !result.stderr.includes("Warning")) {
      throw new Error(`Failed to apply resource: ${result.stderr}`);
    }

    // Wait a bit for resource to be ready
    await this.page!.waitForTimeout(2_000);

    // Navigate to page
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
    await this.page!.goto(fullUrl, { waitUntil: "networkidle" });
  },
);

When(
  "I perform action {string} and verify pod {string} status changes to {string}",
  async function (this: CustomWorld, action: string, podName: string, expectedStatus: string) {
    // Perform browser action (e.g., click a button that triggers backend)
    if (action.startsWith("click:")) {
      const selector = action.replace("click:", "");
      await this.page!.click(selector);
    } else if (action.startsWith("fill:")) {
      const [selector, value] = action.replace("fill:", "").split("|");
      await this.page!.fill(selector, value);
    }

    // Wait for Kubernetes pod status to change
    const k8sUtils = new KubernetesUtils(this);
    const success = await k8sUtils.waitForPodStatus(podName, expectedStatus, 30_000);

    if (!success) {
      throw new Error(`Pod ${podName} did not reach status ${expectedStatus} after action`);
    }
  },
);

Then(
  "the UI should show {string} and the pod {string} should be {string}",
  async function (this: CustomWorld, uiText: string, podName: string, expectedPodStatus: string) {
    // Verify UI state
    await expect(this.page!.locator(`text=${uiText}`)).toBeVisible();

    // Verify Kubernetes state
    const k8sUtils = new KubernetesUtils(this);
    const pod = await k8sUtils.getPod(podName);

    if (!pod) {
      throw new Error(`Pod ${podName} not found`);
    }

    const actualStatus = pod.status?.phase?.toLowerCase();
    expect(actualStatus).toBe(expectedPodStatus.toLowerCase());
  },
);

Then(
  "I should see {string} in the browser and {int} pods running",
  async function (this: CustomWorld, uiText: string, expectedPodCount: number) {
    // Verify browser state
    await expect(this.page!.locator(`text=${uiText}`)).toBeVisible();

    // Verify Kubernetes state
    const k8sUtils = new KubernetesUtils(this);
    const pods = await k8sUtils.listPods("status.phase=Running");
    const runningPods = pods.filter((pod) => pod.status?.phase === "Running");

    expect(runningPods.length).toBeGreaterThanOrEqual(expectedPodCount);
  },
);
