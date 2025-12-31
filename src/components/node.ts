import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";
import { Network } from "../utils/network";
import { Tools } from "../utils/tools";
import { Config } from "./config";

/**
 * Node component for managing Kuack node instances in tests.
 */
export class Node {
  private readonly featureName: string;
  private readonly scenarioName: string;
  private readonly randomSuffix: string;
  private readonly releaseName: string;
  private localPort?: number;
  private nodeURL?: string;

  constructor(featureName: string, scenarioName: string) {
    this.featureName = featureName;
    this.scenarioName = scenarioName;
    this.randomSuffix = Tools.randomString(10);
    this.releaseName = `kuack-node-${this.randomSuffix}`;
  }

  /**
   * Initialize the node by installing it via Helm with feature and scenario labels.
   */
  public async init(): Promise<void> {
    const values = [
      "agent.enabled=false",
      `fullnameOverride=${this.releaseName}`,
      // NOTE: This must use an escaped dot so Helm treats "kuack.io/..." as one key segment.
      `global.labels.kuack\\.io/feature=${Tools.sanitize(this.featureName)}`,
      `global.labels.kuack\\.io/scenario=${Tools.sanitize(this.scenarioName)}`,
    ];
    if (Config.testId) {
      values.push(`global.labels.kuack\\.io/test-id=${Tools.sanitize(Config.testId)}`);
    }
    await Helm.install({
      releaseName: this.releaseName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values: values,
    });
    if (K8s.isInCluster()) {
      // In-cluster: use the service DNS name directly
      this.nodeURL = `http://${this.releaseName}.${K8s.getNamespace()}.svc.cluster.local:8080/`;
    } else {
      // Local development: find a free port and set up port forwarding
      this.localPort = await Network.findFreePort();
      await K8s.startPortForward({
        serviceName: this.releaseName,
        servicePort: 8080,
        localPort: this.localPort,
      });
      this.nodeURL = `http://localhost:${this.localPort}/`;
    }
  }

  /**
   * Destroy the node by uninstalling the Helm release.
   */
  public async destroy(): Promise<void> {
    if (!K8s.isInCluster() && this.localPort !== undefined) {
      console.log(`[Kubernetes] Stopping port-forward: localhost:${this.localPort} -> svc/${this.releaseName}:8080`);
      await K8s.stopPortForward(this.localPort);
    }
    await Helm.delete(this.releaseName);
  }

  /**
   * Get the URL to access the node.
   * @returns The node URL.
   * @throws Error if the node has not been initialized.
   */
  public getURL(): string {
    if (!this.nodeURL) {
      throw new Error("Node has not been initialized");
    }
    return this.nodeURL;
  }
}
