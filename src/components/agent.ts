import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";
import { Tools } from "../utils/tools";
import { Config } from "./config";

/**
 * Agent component for managing the Kuack agent in tests.
 */
export abstract class Agent {
  private static agentName: string;
  private static agentURL: string;
  private static readonly localPort: number = 8080;

  /**
   * Initialize the agent by installing it via Helm.
   */
  public static async init(): Promise<void> {
    this.agentName = Config.agentName;
    if (K8s.isInCluster()) {
      this.agentURL = `http://${this.agentName}.${K8s.getNamespace()}.svc.cluster.local:8080/`;
    } else {
      this.agentURL = "http://localhost:8080/";
    }
    const values = ["node.enabled=false"];
    if (Config.testId) {
      // NOTE: This must use an escaped dot so Helm treats "kuack.io/..." as one key segment.
      values.push(`global.labels.kuack\\.io/test-id=${Tools.sanitize(Config.testId)}`);
    }
    await Helm.install({
      releaseName: Config.agentName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values,
    });
    if (!K8s.isInCluster()) {
      await K8s.startPortForward({
        serviceName: this.agentName,
        servicePort: 8080,
        localPort: this.localPort,
      });
    }
  }

  /**
   * Destroy the agent by uninstalling the Helm release.
   */
  public static async destroy(): Promise<void> {
    if (!K8s.isInCluster()) {
      await K8s.stopPortForward(this.localPort);
    }
    await Helm.delete(Config.agentName);
  }

  /**
   * Get the URL to access the agent UI.
   * @returns The agent UI URL.
   */
  public static getURL(): string {
    return this.agentURL;
  }
}
