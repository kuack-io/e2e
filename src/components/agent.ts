import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";
import { Network } from "../utils/network";
import { Tools } from "../utils/tools";
import { Config } from "./config";

/**
 * Agent component for managing Kuack agent instances in tests.
 * Each parallel worker gets its own Agent instance with a unique name and port.
 */
export class Agent {
  private readonly randomSuffix: string;
  private readonly releaseName: string;
  private localPort?: number;
  private agentURL?: string;

  constructor() {
    this.randomSuffix = Tools.randomString(10);
    this.releaseName = `kuack-agent-${this.randomSuffix}`;
  }

  /**
   * Initialize the agent by installing it via Helm.
   */
  public async init(): Promise<void> {
    const values = [
      "node.enabled=false",
      `fullnameOverride=${this.releaseName}`,
    ];
    if (Config.testId) {
      // NOTE: This must use an escaped dot so Helm treats "kuack.io/..." as one key segment.
      values.push(`global.labels.kuack\\.io/test-id=${Tools.sanitize(Config.testId)}`);
    }
    await Helm.install({
      releaseName: this.releaseName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values,
    });
    if (K8s.isInCluster()) {
      // In-cluster: use the service DNS name directly
      this.agentURL = `http://${this.releaseName}.${K8s.getNamespace()}.svc.cluster.local:8080/`;
    } else {
      // Local development: find a free port and set up port forwarding
      this.localPort = await Network.findFreePort();
      await K8s.startPortForward({
        serviceName: this.releaseName,
        servicePort: 8080,
        localPort: this.localPort,
      });
      this.agentURL = `http://localhost:${this.localPort}/`;
    }
  }

  /**
   * Destroy the agent by uninstalling the Helm release.
   */
  public async destroy(): Promise<void> {
    if (!K8s.isInCluster() && this.localPort !== undefined) {
      console.log(`[Kubernetes] Stopping port-forward: localhost:${this.localPort} -> svc/${this.releaseName}:8080`);
      await K8s.stopPortForward(this.localPort);
    }
    await Helm.delete(this.releaseName);
  }

  /**
   * Get the URL to access the agent UI.
   * @returns The agent UI URL.
   * @throws Error if the agent has not been initialized.
   */
  public getURL(): string {
    if (!this.agentURL) {
      throw new Error("Agent has not been initialized");
    }
    return this.agentURL;
  }
}
