import { AppsV1Api, CoreV1Api, KubeConfig, V1Deployment, V1Pod, V1Service } from "@kubernetes/client-node";

export abstract class K8s {
  private static core: CoreV1Api;
  private static apps: AppsV1Api;

  /**
   * Initialize the Kubernetes API client.
   * Tries in-cluster first, then falls back to default kubeconfig (~/.kube/config).
   */
  public static init(): void {
    const kc = new KubeConfig();
    try {
      kc.loadFromCluster();
    } catch {
      kc.loadFromDefault();
    }

    K8s.core = kc.makeApiClient(CoreV1Api);
    K8s.apps = kc.makeApiClient(AppsV1Api);
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
