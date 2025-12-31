import { AppsV1Api, CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import { ChildProcess, spawn } from "child_process";
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
  private static portForwardProcesses: ChildProcess[] = [];

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
    console.log(`[Kubernetes] in cluster: ${inCluster}`);
    console.log(`[Kubernetes] namespace: ${K8s.namespace}`);
  }

  /**
   * Clean up resources including port forwards.
   */
  public static async destroy(): Promise<void> {
    // Stop all port forwards
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

    const proc = spawn(
      "kubectl",
      ["port-forward", `svc/${serviceName}`, `${localPort}:${servicePort}`, "-n", K8s.namespace],
      { stdio: "pipe" },
    );

    K8s.portForwardProcesses.push(proc);

    // Wait for port-forward to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("[Kubernetes] Port-forward timeout, assuming ready");
        resolve();
      }, 5000);

      proc.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        if (output.includes("Forwarding from")) {
          clearTimeout(timeout);
          console.log(`[Kubernetes] Port-forward ready: ${output.trim()}`);
          resolve();
        }
      });

      proc.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start port-forward: ${error.message}`));
      });

      proc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Port-forward exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Stop all active port forwards.
   */
  public static async stopAllPortForwards(): Promise<void> {
    if (K8s.portForwardProcesses.length === 0) {
      return;
    }

    console.log(`[Kubernetes] Stopping ${K8s.portForwardProcesses.length} port-forward(s)`);
    for (const proc of K8s.portForwardProcesses) {
      try {
        proc.kill("SIGTERM");
      } catch {
        // Ignore errors during cleanup
      }
    }
    K8s.portForwardProcesses = [];
  }
}
