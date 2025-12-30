import { Helm } from "../utils/helm";
import { Tools } from "../utils/random";
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

    Helm.install({
      releaseName: this.releaseName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
    });
  }

  public async destroy(): Promise<void> {
    Helm.delete(this.releaseName);
  }
}
