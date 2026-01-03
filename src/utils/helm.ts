import { Cmd } from "./cmd";
import { K8s } from "./k8s";

/**
 * Helm utility class for managing Helm chart installations.
 */
export abstract class Helm extends Cmd {
  /**
   * Install a Helm chart.
   * @param params - Installation parameters.
   * @param params.releaseName - The name for the Helm release.
   * @param params.chartRef - The chart reference (e.g., oci://... or repo/chart).
   * @param params.chartVersion - The chart version to install.
   * @param params.values - Optional array of --set values.
   */
  public static async install(params: {
    releaseName: string;
    chartRef: string;
    chartVersion: string;
    values?: string[];
  }): Promise<void> {
    const namespace = K8s.getNamespace();
    const args: string[] = ["helm", "install", params.releaseName, params.chartRef, "--wait", "--namespace", namespace];
    if (params.chartVersion && params.chartVersion !== "latest") {
      args.push("--version", params.chartVersion);
    }
    if (params.values) {
      for (const value of params.values) {
        args.push("--set", value);
      }
    }
    const printable = args.join(" ");
    console.log(`[Helm] Installing: ${printable}`);
    try {
      const result = await Cmd.runOrThrow(args);
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(result.stderr);
      }
    } catch (error) {
      // Log the full error details before rethrowing
      if (error instanceof Error) {
        console.error(`[Helm] Install failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a Helm release.
   * @param releaseName - The name of the release to delete.
   */
  public static async delete(releaseName: string): Promise<void> {
    const namespace = K8s.getNamespace();
    const args = ["helm", "uninstall", releaseName, "--wait", "--namespace", namespace];
    const printable = args.join(" ");
    console.log(`[Helm] Deleting: ${printable}`);
    try {
      const result = await Cmd.run(args);
      // Always log output for debugging
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(result.stderr);
      }
      if (result.exitCode !== 0) {
        // Check if the error is "release: not found" - this is acceptable during cleanup
        if (result.stderr.includes("release: not found") || result.stderr.includes("not found")) {
          console.log(`[Helm] Release ${releaseName} not found, skipping uninstall`);
          return;
        }
        // For other errors, log but don't throw during cleanup
        console.error(`[Helm] Delete failed (${result.exitCode}): ${printable}`);
      }
    } catch (error) {
      // Log errors but don't throw - cleanup should be best-effort
      console.error(`[Helm] Delete error for ${releaseName}:`, error);
    }
  }
}
