import * as net from "net";

/**
 * Configuration for creating a TCP server.
 */
export interface TCPServerConfig {
  port: number;
  host?: string;
  onConnection?: (socket: net.Socket) => void;
  onError?: (error: Error) => void;
}

/**
 * Network utility class for port and connection operations.
 */
export abstract class Network {
  private static tcpServers: Map<number, net.Server> = new Map();
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

  /**
   * Create and start a TCP server.
   * @param config - TCP server configuration.
   * @returns The created TCP server.
   */
  public static async createTCPServer(config: TCPServerConfig): Promise<net.Server> {
    const host = config.host ?? "127.0.0.1";
    const server = net.createServer((socket) => {
      // Handle socket errors gracefully - these can happen during cleanup
      socket.on("error", (err) => {
        // Ignore common socket errors that occur during cleanup
        if (err.message.includes("ended by the other party") || err.message.includes("ECONNRESET")) {
          return;
        }
        if (config.onError) {
          config.onError(err);
        }
      });

      if (config.onConnection) {
        try {
          config.onConnection(socket);
        } catch (error) {
          // Ignore errors during connection setup - socket may already be closed
          if (error instanceof Error && error.message.includes("ended by the other party")) {
            return;
          }
          if (config.onError) {
            config.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    });

    // Handle server-level errors
    server.on("error", (err) => {
      // Ignore errors when server is already closed
      if (err.message.includes("EADDRINUSE") || err.message.includes("closed")) {
        return;
      }
      if (config.onError) {
        config.onError(err);
      }
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, host, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    Network.tcpServers.set(config.port, server);
    return server;
  }

  /**
   * Stop a specific TCP server by port.
   * @param port - The port number of the server to stop.
   */
  public static async stopTCPServer(port: number): Promise<void> {
    const server = Network.tcpServers.get(port);
    if (!server) {
      return;
    }

    // Remove from map first to prevent double cleanup
    Network.tcpServers.delete(port);

    try {
      // Close the server gracefully with a timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            // Force close if graceful close takes too long
            server.close(() => resolve());
          }, 1000);
        }),
      ]);
    } catch (error) {
      // Ignore errors during cleanup - socket may already be closed
      // This is common in parallel test execution where cleanup happens concurrently
      console.warn(
        `[Network] Error stopping TCP server on ${port}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Stop all active TCP servers.
   */
  public static async stopAllTCPServers(): Promise<void> {
    if (Network.tcpServers.size === 0) {
      return;
    }

    console.log(`[Network] Stopping ${Network.tcpServers.size} TCP server(s)`);

    const ports = Array.from(Network.tcpServers.keys());
    const results = await Promise.allSettled(ports.map((p) => Network.stopTCPServer(p)));

    // Log any failures but don't throw - cleanup errors shouldn't fail tests
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        console.warn(`[Network] Failed to stop TCP server on ${ports[i]}:`, result.reason);
      }
    }
  }
}
