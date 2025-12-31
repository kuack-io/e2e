import { Cmd } from "./cmd";
import { K8s } from "./k8s";

export class Helm extends Cmd {
  public static async install(params: {
    releaseName: string;
    chartRef: string;
    chartVersion: string;
    values?: string[];
  }): Promise<void> {
    const namespace = K8s.getNamespace();
    const cmdParts = ["helm install", params.releaseName, params.chartRef, "--wait", "--namespace", namespace];
    if (params.chartVersion !== "latest") {
      cmdParts.push("--version", params.chartVersion);
    }
    if (params.values) {
      for (const value of params.values) {
        cmdParts.push("--set", value);
      }
    }
    const cmd = cmdParts.filter(Boolean).join(" ").trim();
    console.log(`[Helm] Installing: ${cmd}`);
    try {
      const result = await Cmd.runOrThrow(cmd);
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

  public static async delete(releaseName: string): Promise<void> {
    const namespace = K8s.getNamespace();
    const cmd = `helm uninstall ${releaseName} --wait --namespace ${namespace}`;
    console.log(`[Helm] Deleting: ${cmd}`);
    const result = await Cmd.run(cmd);
    if (result.exitCode !== 0) {
      // Check if the error is "release: not found" - this is acceptable during cleanup
      if (result.stderr.includes("release: not found") || result.stderr.includes("not found")) {
        console.log(`[Helm] Release ${releaseName} not found, skipping uninstall`);
        return;
      }
      // For other errors, throw
      throw new Error(`Command failed (${result.exitCode}): ${cmd}\n${result.stderr || result.stdout}`);
    }
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.log(result.stderr);
    }
  }
}
