/**
 * Log capture utility for isolating console output per test step.
 *
 * Usage:
 * 1. Call Logs.init() once at test startup
 * 2. Create a new Logs instance per step/hook
 * 3. Call instance.start() to begin capturing
 * 4. Call instance.stop() to end capturing and get logs
 */
export class Logs {
  private static originalLog: typeof console.log;
  private static originalError: typeof console.error;
  private static originalWarn: typeof console.warn;
  private static currentCapture: Logs | null = null;

  private logs: string[] = [];

  /**
   * Install global console wrappers. Call once at test startup.
   * This replaces console methods with wrappers that capture to the current Logs instance.
   */
  public static init(): void {
    Logs.originalLog = console.log;
    Logs.originalError = console.error;
    Logs.originalWarn = console.warn;

    console.log = (...args: unknown[]) => {
      if (Logs.currentCapture) {
        const logMsg = `[LOG] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`;
        Logs.currentCapture.logs.push(logMsg);
      }
      Logs.originalLog(...args);
    };

    console.error = (...args: unknown[]) => {
      if (Logs.currentCapture) {
        const logMsg = `[ERROR] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`;
        Logs.currentCapture.logs.push(logMsg);
      }
      Logs.originalError(...args);
    };

    console.warn = (...args: unknown[]) => {
      if (Logs.currentCapture) {
        const logMsg = `[WARN] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`;
        Logs.currentCapture.logs.push(logMsg);
      }
      Logs.originalWarn(...args);
    };
  }

  /**
   * Start capturing logs to this instance.
   * Any previous capture is automatically stopped.
   */
  public start(): void {
    this.logs = [];
    Logs.currentCapture = this;
  }

  /**
   * Stop capturing and return collected logs.
   * @returns An array of captured log messages.
   */
  public stop(): string[] {
    if (Logs.currentCapture === this) {
      Logs.currentCapture = null;
    }
    return this.logs;
  }
}
