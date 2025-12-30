import { CustomWorld } from "../framework/world";
import { CoreV1Api, V1Pod, V1Deployment, V1Service } from "@kubernetes/client-node";

export class KubernetesUtils {
  constructor(private world: CustomWorld) {}

  async getPod(name: string): Promise<V1Pod | null> {
    try {
      const response = await this.world.k8sCoreApi!.readNamespacedPod(name, this.world.namespace);
      return response.body;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async waitForPodStatus(podName: string, expectedStatus: string, timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeout) {
      const pod = await this.getPod(podName);
      if (pod) {
        const phase = pod.status?.phase?.toLowerCase();
        if (phase === expectedStatus.toLowerCase()) {
          return true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return false;
  }

  async getDeployment(name: string): Promise<V1Deployment | null> {
    try {
      const response = await this.world.k8sAppsApi!.readNamespacedDeployment(name, this.world.namespace);
      return response.body;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async waitForDeploymentReady(deploymentName: string, timeout: number = 120000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds

    while (Date.now() - startTime < timeout) {
      const deployment = await this.getDeployment(deploymentName);
      if (deployment) {
        const status = deployment.status;
        const readyReplicas = status?.readyReplicas || 0;
        const replicas = status?.replicas || 0;
        const updatedReplicas = status?.updatedReplicas || 0;

        if (readyReplicas === replicas && updatedReplicas === replicas && replicas > 0) {
          return true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return false;
  }

  async listPods(labelSelector?: string): Promise<V1Pod[]> {
    try {
      const response = await this.world.k8sCoreApi!.listNamespacedPod(
        this.world.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector,
      );
      return response.body.items;
    } catch (error) {
      throw error;
    }
  }

  async getService(name: string): Promise<V1Service | null> {
    try {
      const response = await this.world.k8sCoreApi!.readNamespacedService(name, this.world.namespace);
      return response.body;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
