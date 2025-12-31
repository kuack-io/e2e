import { spawn } from "child_process";

/**
 * Result of executing a shell command.
 */
export interface CmdResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Base class for executing shell commands.
 */
export abstract class Cmd {
  /**
   * Run a command and capture stdout/stderr. Uses `shell: true` so callers can pass a full command string.
   * @param command - The shell command to execute.
   * @param opts - Optional execution options.
   * @param opts.cwd - Working directory for the command.
   * @param opts.env - Environment variables to use.
   * @returns The command result with stdout, stderr, and exit code.
   */
  protected static run(command: string, opts?: { cwd?: string; env?: typeof process.env }): Promise<CmdResult> {
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
   * @param command - The shell command to execute.
   * @param opts - Optional execution options.
   * @param opts.cwd - Working directory for the command.
   * @param opts.env - Environment variables to use.
   * @returns The command result with stdout, stderr, and exit code.
   * @throws Error if the command exits with a non-zero code.
   */
  protected static async runOrThrow(
    command: string,
    opts?: { cwd?: string; env?: typeof process.env },
  ): Promise<CmdResult> {
    const res = await Cmd.run(command, opts);
    if (res.exitCode !== 0) {
      throw new Error(`Command failed (${res.exitCode}): ${command}\n${res.stderr || res.stdout}`);
    }
    return res;
  }
}
