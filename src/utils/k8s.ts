import { AppsV1Api, CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import * as fs from "fs";

export abstract class K8s {
  private static core: CoreV1Api;
  private static apps: AppsV1Api;
  private static namespace: string;
  private static kubeConfig: KubeConfig;
  private static isInCluster: boolean;

  private static readonly inClusterNamespacePath = "/var/run/secrets/kubernetes.io/serviceaccount/namespace";
  /**
   * Initialize the Kubernetes API client.
   * Uses in-cluster config if available, otherwise falls back to default kubeconfig (~/.kube/config).
   */
  public static async init(): Promise<void> {
    // Check if we're actually in-cluster by checking if the service account file exists
    const isInCluster = fs.existsSync(K8s.inClusterNamespacePath);
    const kubeConfig = new KubeConfig();

    if (isInCluster) {
      kubeConfig.loadFromCluster();
    } else {
      kubeConfig.loadFromDefault();
    }

    K8s.isInCluster = isInCluster;
    K8s.kubeConfig = kubeConfig;
    K8s.core = kubeConfig.makeApiClient(CoreV1Api);
    K8s.apps = kubeConfig.makeApiClient(AppsV1Api);
    K8s.namespace = K8s.resolveNamespace();
  }

  /**
   * Get the current namespace.
   * K8s must be initialized first.
   */
  public static getNamespace(): string {
    return K8s.namespace;
  }

  /**
   * Resolve the current namespace.
   * For in-cluster: reads from service account namespace file.
   * For local development: uses KubeConfig context namespace.
   */
  private static resolveNamespace(): string {
    if (K8s.isInCluster) {
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
   * K8s names must be lowercase alphanumeric with hyphens and <= 63 chars.
   */
  public static sanitize(name: string): string {
    let sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 63);

    if (sanitized.endsWith("-")) {
      sanitized = sanitized.substring(0, sanitized.length - 1);
    }
    return sanitized;
  }
}
