import { Helm } from "../utils/helm";
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
  }

  /**
   * Destroy the node by uninstalling the Helm release.
   */
  public async destroy(): Promise<void> {
    await Helm.delete(this.releaseName);
  }
}
