import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";
import { Tools } from "../utils/tools";
import { Config } from "./config";

/**
 * Agent component for managing the Kuack agent in tests.
 */
export abstract class Agent {
  private static agentURL: string;

  /**
   * Initialize the agent by installing it via Helm.
   */
  public static async init(): Promise<void> {
    const values = ["node.enabled=false"];
    if (Config.testId) {
      // Double escape backslash: shell consumes one, Helm uses the other to escape the dot
      values.push(`global.labels.kuack\\\\.io/test-id=${Tools.sanitize(Config.testId)}`);
    }
    await Helm.install({
      releaseName: Config.agentName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values,
    });
    const namespace = K8s.getNamespace();
    this.agentURL = `http://${Config.agentName}.${namespace}.svc.cluster.local:8080/`;
  }

  /**
   * Destroy the agent by uninstalling the Helm release.
   */
  public static async destroy(): Promise<void> {
    await Helm.delete(Config.agentName);
  }

  /**
   * Get the URL to access the agent UI.
   * Returns localhost URL when running locally (port-forwarded), or in-cluster URL otherwise.
   * @returns The agent UI URL.
   */
  public static getURL(): string {
    if (K8s.isInCluster()) {
      return `http://${Config.agentName}.${K8s.getNamespace()}.svc.cluster.local:8080/`;
    }
    return "http://localhost:8080/"; // Port-forwarded
  }
}
