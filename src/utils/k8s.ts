import { Network } from "./network";
import { AppsV1Api, CoreV1Api, KubeConfig, PortForward, V1Pod } from "@kubernetes/client-node";
import * as fs from "fs";
import * as net from "net";

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
  private static portForwards: Map<number, net.Server> = new Map();

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
    await K8s.stopAllPortForwards();
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
    await K8s.stopPortForward(localPort);
    await Network.assertLocalPortFree(localPort);

    // Find a pod backing the service and resolve target port
    const { podName, targetPort } = await K8s.findPodForService(serviceName, servicePort);
    console.log(`[Kubernetes] Found pod ${podName} for service ${serviceName} (target port: ${targetPort})`);

    // Create port forwarder
    const forward = new PortForward(K8s.kubeConfig);

    // Create local TCP server to handle connections
    const server = net.createServer((socket) => {
      forward.portForward(K8s.namespace, podName, [targetPort], socket, null, socket);
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(localPort, "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    K8s.portForwards.set(localPort, server);
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
    const server = K8s.portForwards.get(localPort);
    if (!server) {
      return;
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    K8s.portForwards.delete(localPort);
  }

  /**
   * Stop all active port forwards.
   */
  public static async stopAllPortForwards(): Promise<void> {
    if (K8s.portForwards.size === 0) {
      return;
    }

    console.log(`[Kubernetes] Stopping ${K8s.portForwards.size} port-forward(s)`);

    const ports = Array.from(K8s.portForwards.keys());
    await Promise.allSettled(ports.map((p) => K8s.stopPortForward(p)));
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
}
