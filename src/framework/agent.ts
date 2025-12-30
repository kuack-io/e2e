import { Helm } from "../utils/helm";
import { Config } from "./config";

export class Agent {
  public static instance: Agent;

  /**
   * Initialize the singleton Agent instance.
   * Should be called once in BeforeAll hook.
   * Since agent is fully static, there's always just one single copy
   * of it deployed as individual helm chart.
   */
  static init(): void {
    Agent.instance = new Agent();
    Helm.install({
      releaseName: Config.agentName,
      chartRef: Config.helmChart,
      chartVersion: Config.helmChartVersion,
    });
  }

  static destroy(): void {
    Helm.delete(Config.agentName);
  }
}
