/*
 * Configuration class for the test suite.
 * All configuration is loaded from environment variables and shared across all tests.
 */
export class Config {
  static readonly testId: string = process.env.TEST_ID ?? "";
  static readonly helmChartVersion: string = process.env.HELM_CHART_VERSION ?? "latest";
  static readonly agentVersion: string = process.env.AGENT_VERSION ?? "latest";
  static readonly nodeVersion: string = process.env.NODE_VERSION ?? "latest";

  static readonly helmChart: string = process.env.HELM_CHART ?? "oci://ghcr.io/kuack-io/charts/kuack";
  static readonly agentName: string = "kuack-agent";
}
