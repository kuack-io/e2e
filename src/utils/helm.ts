import { Cmd } from "./cmd";

export class Helm extends Cmd {
  public static async install(params: { releaseName: string; chartRef: string; chartVersion: string }): Promise<void> {
    const cmd = ["helm install", params.releaseName, params.chartRef, "--version", params.chartVersion]
      .filter(Boolean)
      .join(" ")
      .trim();

    await Cmd.runOrThrow(cmd);
  }

  public static async delete(releaseName: string): Promise<void> {
    const cmd = ["helm delete", releaseName, "--purge"].filter(Boolean).join(" ").trim();

    await Cmd.runOrThrow(cmd);
  }
}
