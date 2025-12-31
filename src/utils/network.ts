import * as net from "net";

/**
 * Network utility class for port and connection operations.
 */
export abstract class Network {
  /**
   * Check if a connection can be established to a given port.
   * @param port - The port number to check.
   * @returns A promise that resolves to true if connection is possible, false otherwise.
   */
  public static async canConnect(port: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.setTimeout(500);
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * Find a free port on the local machine.
   * Uses the OS to allocate an available port by binding to port 0.
   * @returns A promise that resolves to an available port number.
   */
  public static async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          const port = address.port;
          server.close(() => resolve(port));
        } else {
          server.close(() => reject(new Error("Failed to get port from server address")));
        }
      });
      server.once("error", reject);
    });
  }

  /**
   * Assert that a local port is free (not in use).
   * @param localPort - The port number to check.
   * @throws Error if the port is already in use.
   */
  public static async assertLocalPortFree(localPort: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const server = net.createServer();
      server.once("error", (err) => {
        reject(new Error(`Local port ${localPort} is already in use: ${(err as Error).message}`));
      });
      server.listen(localPort, "127.0.0.1", () => {
        server.close(() => resolve());
      });
    });
  }
}
