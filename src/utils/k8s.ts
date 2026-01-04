import { Network } from "./network";
import { AppsV1Api, CoreV1Api, KubeConfig, PortForward, V1Node, V1Pod } from "@kubernetes/client-node";
import * as fs from "fs";

/**
 * Configuration for port forwarding a Kubernetes service.
 */
export interface PortForwardConfig {
  serviceName: string;
  servicePort: number;
  localPort: number;
}

/**
 * Kubernetes utility class for cluster operations.
 */
export abstract class K8s {
  private static core: CoreV1Api;
  private static apps: AppsV1Api;
  private static namespace: string;
  private static kubeConfig: KubeConfig;
  private static inCluster: boolean;

  private static readonly inClusterNamespacePath = "/var/run/secrets/kubernetes.io/serviceaccount/namespace";
  /**
   * Initialize the Kubernetes API client.
   * Uses in-cluster config if available, otherwise falls back to default kubeconfig (~/.kube/config).
   */
  public static async init(): Promise<void> {
    // Check if we're actually in-cluster by checking if the service account file exists
    const inCluster = fs.existsSync(K8s.inClusterNamespacePath);
    const kubeConfig = new KubeConfig();

    if (inCluster) {
      kubeConfig.loadFromCluster();
    } else {
      kubeConfig.loadFromDefault();
    }

    K8s.inCluster = inCluster;
    K8s.kubeConfig = kubeConfig;
    K8s.core = kubeConfig.makeApiClient(CoreV1Api);
    K8s.apps = kubeConfig.makeApiClient(AppsV1Api);
    K8s.namespace = K8s.resolveNamespace();
    console.log(`[Kubernetes] In cluster: ${inCluster}`);
    console.log(`[Kubernetes] Namespace: ${K8s.namespace}`);
  }

  /**
   * Clean up resources including port forwards.
   */
  public static async destroy(): Promise<void> {
    await Network.stopAllTCPServers();
  }

  /**
   * Check if running inside a Kubernetes cluster.
   * @returns True if running in-cluster, false otherwise.
   */
  public static isInCluster(): boolean {
    return K8s.inCluster;
  }

  /**
   * Get the current namespace.
   * K8s must be initialized first.
   * @returns The current Kubernetes namespace.
   */
  public static getNamespace(): string {
    return K8s.namespace;
  }

  /**
   * Get the CoreV1Api client.
   * K8s must be initialized first.
   * @returns The CoreV1Api client instance.
   */
  public static getCoreApi(): CoreV1Api {
    return K8s.core;
  }

  /**
   * Resolve the current namespace.
   * For in-cluster: reads from service account namespace file.
   * For local development: uses KubeConfig context namespace.
   * @returns The resolved namespace.
   */
  private static resolveNamespace(): string {
    if (K8s.inCluster) {
      // In-cluster: read from service account namespace file
      // This is the standard way to get namespace when running in a pod
      const namespace = fs.readFileSync(K8s.inClusterNamespacePath, "utf8").trim();
      return namespace;
    } else {
      // Local development: use KubeConfig context namespace
      const context = K8s.kubeConfig.getCurrentContext();
      const contextObj = K8s.kubeConfig.getContextObject(context);

      if (contextObj?.namespace) {
        return contextObj.namespace;
      }
      throw new Error(`No namespace set in kubeconfig context '${context}'`);
    }
  }

  /**
   * Start port forwarding for a service.
   * Only works when running outside the cluster (local development).
   * @param config - Port forward configuration with service name, service port, and local port.
   */
  public static async startPortForward(config: PortForwardConfig): Promise<void> {
    if (K8s.inCluster) {
      console.log("[Kubernetes] Skipping port-forward: running in-cluster");
      return;
    }

    const { serviceName, servicePort, localPort } = config;
    console.log(`[Kubernetes] Starting port-forward: localhost:${localPort} -> svc/${serviceName}:${servicePort}`);

    // If we already have a port-forward on this local port (previous scenario),
    // stop it first to avoid "address already in use".
    await Network.stopTCPServer(localPort);
    await Network.assertLocalPortFree(localPort);

    // Find a pod backing the service and resolve target port
    const { podName, targetPort } = await K8s.findPodForService(serviceName, servicePort);
    console.log(`[Kubernetes] Found pod ${podName} for service ${serviceName} (target port: ${targetPort})`);

    // Create port forwarder
    const forward = new PortForward(K8s.kubeConfig);

    // Create local TCP server using Network utility for pure network operations
    await Network.createTCPServer({
      port: localPort,
      host: "127.0.0.1",
      onConnection: (socket) => {
        forward.portForward(K8s.namespace, podName, [targetPort], socket, null, socket);
      },
      onError: (error) => {
        console.warn(`[Kubernetes] Port-forward error on ${localPort}:`, error.message);
      },
    });

    console.log(`[Kubernetes] Port-forward ready on localhost:${localPort}`);
  }

  /**
   * Find a pod name that backs a given service and resolve the target port.
   * @param serviceName - The service name.
   * @param servicePort - The service port to resolve to a target port.
   * @returns The pod name and target port.
   */
  private static async findPodForService(
    serviceName: string,
    servicePort: number,
  ): Promise<{ podName: string; targetPort: number }> {
    // Get the service to find its selector and target port
    const service = await K8s.core.readNamespacedService({
      name: serviceName,
      namespace: K8s.namespace,
    });

    const selector = service.spec?.selector;
    if (!selector || Object.keys(selector).length === 0) {
      throw new Error(`Service ${serviceName} has no selector`);
    }

    // Find the target port for the given service port
    const portSpec = service.spec?.ports?.find((p) => p.port === servicePort);
    if (!portSpec) {
      throw new Error(`Service ${serviceName} has no port ${servicePort}`);
    }

    // targetPort can be a number or a named port string; we only support numeric
    const targetPort =
      typeof portSpec.targetPort === "number"
        ? portSpec.targetPort
        : typeof portSpec.targetPort === "object" && typeof (portSpec.targetPort as unknown) === "number"
          ? (portSpec.targetPort as unknown as number)
          : servicePort; // fallback to servicePort if targetPort not specified

    // Convert selector to label selector string
    const labelSelector = Object.entries(selector)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");

    // Find pods matching the selector
    const pods = await K8s.core.listNamespacedPod({
      namespace: K8s.namespace,
      labelSelector,
    });

    // Find a running pod
    const runningPod = pods.items.find((pod: V1Pod) => pod.status?.phase === "Running" && pod.metadata?.name);

    if (!runningPod?.metadata?.name) {
      throw new Error(`No running pods found for service ${serviceName}`);
    }

    return { podName: runningPod.metadata.name, targetPort };
  }

  /**
   * Stop a specific port forward by local port.
   * @param localPort - The local port that was forwarded.
   */
  public static async stopPortForward(localPort: number): Promise<void> {
    await Network.stopTCPServer(localPort);
  }

  /**
   * Get logs from a pod by label selector.
   * @param labelSelector - Label selector to find pods (e.g., "app.kubernetes.io/instance=kuack-node-xyz").
   * @param container - Optional container name if pod has multiple containers.
   * @returns The pod logs as a string.
   */
  public static async getPodLogs(labelSelector: string, container?: string): Promise<string> {
    const pods = await K8s.core.listNamespacedPod({
      namespace: K8s.namespace,
      labelSelector,
    });

    if (pods.items.length === 0) {
      throw new Error(`No pods found matching selector: ${labelSelector}`);
    }

    const podName = pods.items[0].metadata?.name;
    if (!podName) {
      throw new Error("Pod has no name");
    }

    const response = await K8s.core.readNamespacedPodLog({
      name: podName,
      namespace: K8s.namespace,
      container,
    });

    return response;
  }

  /**
   * Type guard to check if an error has a statusCode property.
   * @param error - The error to check
   * @returns True if the error has a statusCode property
   */
  private static hasStatusCode(error: unknown): error is { statusCode: number } {
    return (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode: unknown }).statusCode === "number"
    );
  }

  /**
   * Apply a pod to the cluster using the K8s API client.
   * @param pod - The pod to apply
   * @returns The created pod from the API
   */
  public static async applyPod(pod: V1Pod): Promise<V1Pod> {
    const namespace = pod.metadata?.namespace || K8s.getNamespace();
    const name = pod.metadata?.name;

    if (!name) {
      throw new Error("Pod must have a name");
    }

    try {
      // Try to create the pod
      const response = await K8s.core.createNamespacedPod({
        namespace,
        body: pod,
      });
      // The response from @kubernetes/client-node is the V1Pod directly
      return response as unknown as V1Pod;
    } catch (error: unknown) {
      // If pod already exists, update it
      if (K8s.hasStatusCode(error) && error.statusCode === 409) {
        const response = await K8s.core.replaceNamespacedPod({
          name,
          namespace,
          body: pod,
        });
        return response as unknown as V1Pod;
      }
      throw error;
    }
  }

  /**
   * Delete a pod from the cluster (idempotent).
   * @param pod - The pod to delete
   */
  public static async deletePod(pod: V1Pod): Promise<void> {
    const namespace = pod.metadata?.namespace || K8s.getNamespace();
    const name = pod.metadata?.name;

    if (!name) {
      throw new Error("Pod must have a name");
    }

    try {
      await K8s.core.deleteNamespacedPod({
        name,
        namespace,
      });
    } catch (error: unknown) {
      // Ignore 404 errors (pod doesn't exist) - idempotent behavior
      if (!K8s.hasStatusCode(error) || error.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Get an existing pod from the cluster.
   * @param name - Pod name
   * @returns The pod if found
   */
  public static async getPod(name: string): Promise<V1Pod> {
    const ns = K8s.getNamespace();

    const response = await K8s.core.readNamespacedPod({
      name,
      namespace: ns,
    });

    // The response from @kubernetes/client-node is the V1Pod directly
    return response as unknown as V1Pod;
  }

  /**
   * Wait for a pod to reach a specific phase.
   * @param name - Pod name
   * @param phase - Desired phase (Pending, Running, Succeeded, Failed, Unknown)
   * @param timeoutMs - Timeout in milliseconds (default: 60000)
   * @returns The pod in the desired phase
   */
  public static async waitForPodPhase(
    name: string,
    phase: "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown",
    timeoutMs: number = 60000,
  ): Promise<V1Pod> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const pod = await K8s.getPod(name);

      if (pod.status?.phase === phase) {
        return pod;
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Pod ${name} did not reach phase ${phase} within ${timeoutMs}ms`);
  }

  /**
   * Get a node from the cluster by name.
   * @param name - Node name
   * @returns The node if found
   */
  public static async getNode(name: string): Promise<V1Node> {
    const response = await K8s.core.readNode({ name });

    // The response from @kubernetes/client-node is the V1Node directly
    return response as unknown as V1Node;
  }

  /**
   * Check if a node is a Kuack node by examining multiple properties.
   * @param nodeName - Node name to check
   * @returns True if the node is a Kuack node, false otherwise
   */
  public static async isKuackNode(nodeName: string): Promise<boolean> {
    // Quick check: node name pattern
    if (nodeName.includes("kuack-node")) {
      return true;
    }

    // Fetch the actual node object and check its properties
    const node = await K8s.getNode(nodeName);

    // Check node labels
    const nodeLabels = node.metadata?.labels;
    if (nodeLabels && nodeLabels["kuack.io/node-type"] === "kuack-node") {
      return true;
    }

    // Check node architecture (kuack nodes have wasm32 architecture)
    const architecture = node.status?.nodeInfo?.architecture;
    if (architecture === "wasm32") {
      return true;
    }

    // Check node OS (kuack nodes have wasm OS)
    const os = node.status?.nodeInfo?.operatingSystem;
    if (os === "wasm") {
      return true;
    }

    return false;
  }
}
