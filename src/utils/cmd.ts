import { spawn } from "child_process";

export interface CmdResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export abstract class Cmd {
  /**
   * Run a command and capture stdout/stderr. Uses `shell: true` so callers can pass a full command string.
   */
  protected static run(command: string, opts?: { cwd?: string; env?: NodeJS.ProcessEnv }): Promise<CmdResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        env: opts?.env ?? process.env,
        cwd: opts?.cwd,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });
    });
  }

  /**
   * Run a command and throw if exitCode != 0.
   */
  protected static async runOrThrow(
    command: string,
    opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): Promise<CmdResult> {
    const res = await Cmd.run(command, opts);
    if (res.exitCode !== 0) {
      throw new Error(`Command failed (${res.exitCode}): ${command}\n${res.stderr || res.stdout}`);
    }
    return res;
  }
}
