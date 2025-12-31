import { Helm } from "../utils/helm";
import { Config } from "./config";

export abstract class Agent {
  public static async init(): Promise<void> {
    const values = ["node.enabled=false"];
    await Helm.install({
      releaseName: Config.agentName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
      values,
    });
  }

  public static async destroy(): Promise<void> {
    await Helm.delete(Config.agentName);
  }
}
