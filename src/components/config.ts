/**
 * Configuration class for the test suite.
 * All configuration is loaded from environment variables and shared across all tests.
 */
export class Config {
  static readonly testId: string = process.env.TEST_ID ?? "";
  static readonly helmChartVersion: string = process.env.HELM_CHART_VERSION || "latest";
  static readonly agentVersion: string = process.env.AGENT_VERSION || "latest";
  static readonly nodeVersion: string = process.env.NODE_VERSION || "latest";
  static readonly helmChart: string = process.env.HELM_CHART || "oci://ghcr.io/kuack-io/charts/kuack";
  static readonly playwrightDebug: boolean = process.env.PWDEBUG === "1" || process.env.PWDEBUG === "true";
  static readonly recordVideo: boolean = process.env.RECORD_VIDEO !== "0" && process.env.RECORD_VIDEO !== "false";
  static readonly checkerImage: string = process.env.CHECKER_IMAGE || "ghcr.io/kuack-io/checker:latest";

  /**
   * External Agent URL. When set, tests connect to this existing agent
   * instead of deploying a new one via Helm. Useful for testing against
   * devspace deployments.
   */
  static readonly externalAgentURL: string = process.env.AGENT_URL ?? "";

  /**
   * External Node URL. When set, tests connect to this existing node
   * instead of deploying a new one via Helm. Useful for testing against
   * devspace deployments.
   */
  static readonly externalNodeURL: string = process.env.NODE_URL ?? "";

  // Constants
  static readonly agentName: string = "kuack-agent";
  static readonly checkerUrl: string = "https://kuack.io";
}
