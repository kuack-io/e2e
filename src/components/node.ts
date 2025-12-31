import { Helm } from "../utils/helm";
import { Tools } from "../utils/tools";
import { Config } from "./config";

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

  public async init(): Promise<void> {
    console.log("[Node] Installing", this.releaseName);
    const values = [
      "agent.enabled=false",
      `fullnameOverride=${this.releaseName}`
    ];
    await Helm.install({
      releaseName: this.releaseName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values: values,
    });
    console.log("[Node] Installed", this.releaseName);
  }

  public async destroy(): Promise<void> {
    await Helm.delete(this.releaseName);
  }
}
