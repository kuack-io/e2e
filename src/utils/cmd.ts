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
   * Run a command and capture stdout/stderr (no shell).
   * First element of args array should be the binary name.
   * @param args - Command and arguments (e.g., ["helm", "install", "my-release", ...]).
   * @returns The command result with stdout, stderr, and exit code.
   */
  protected static async run(args: string[]): Promise<CmdResult> {
    const [binary, ...cmdArgs] = args;
    return new Promise((resolve, reject) => {
      const child = spawn(binary, cmdArgs, {
        shell: false,
        env: process.env,
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
   * First element of args array should be the binary name.
   * @param args - Command and arguments (e.g., ["helm", "install", "my-release", ...]).
   * @returns The command result with stdout, stderr, and exit code.
   * @throws Error if the command exits with a non-zero code.
   */
  protected static async runOrThrow(args: string[]): Promise<CmdResult> {
    const res = await Cmd.run(args);
    if (res.exitCode !== 0) {
      const printable = args.join(" ");
      throw new Error(`Command failed (${res.exitCode}): ${printable}\n${res.stderr || res.stdout}`);
    }
    return res;
  }
}
