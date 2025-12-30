import { World, IWorldOptions, setWorldConstructor } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page, chromium } from "@playwright/test";
import { AppsV1Api, CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

export interface CustomWorldParameters {
  baseUrl: string;
  namespace?: string;
  kubeconfig?: string;
}

export interface KubectlResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  name: string;
}

export class CustomWorld extends World<CustomWorldParameters> {
  // Default browser instance (for backward compatibility)
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  // Multiple browser instances support
  browsers: Map<string, BrowserInstance> = new Map();

  baseUrl: string;
  namespace: string;
  kubeconfig?: string;

  k8sCoreApi?: CoreV1Api;
  k8sAppsApi?: AppsV1Api;

  /** Namespace created specifically for this scenario (for Helm + tests). */
  testNamespace?: string;
  /** Helm release name used in this scenario. */
  helmReleaseName?: string;

  testData: Map<string, unknown> = new Map();

  constructor(options: IWorldOptions<CustomWorldParameters>) {
    super(options);

    this.baseUrl = options.parameters.baseUrl;
    this.namespace = options.parameters.namespace || "default";
    this.kubeconfig = options.parameters.kubeconfig;
  }

  /**
   * Initialize the default browser instance (for backward compatibility).
   * This is automatically called in Before hook.
   */
  async initBrowser(): Promise<void> {
    if (this.browser && this.context && this.page) {
      return;
    }

    // Create default instance with name "default"
    await this.createBrowserInstance("default");
    const defaultInstance = this.browsers.get("default")!;
    this.browser = defaultInstance.browser;
    this.context = defaultInstance.context;
    this.page = defaultInstance.page;
  }

  /**
   * Create a new browser instance with an optional name.
   * If no name is provided, a unique name is generated.
   * Returns the name of the created instance.
   */
  async createBrowserInstance(name?: string): Promise<string> {
    const instanceName = name || `browser-${this.browsers.size}`;

    if (this.browsers.has(instanceName)) {
      return instanceName; // Already exists
    }

    const headed = process.env.HEADED === "true";
    const browser = await chromium.launch({ headless: !headed });
    const context = await browser.newContext();
    const page = await context.newPage();

    const instance: BrowserInstance = {
      browser,
      context,
      page,
      name: instanceName,
    };

    this.browsers.set(instanceName, instance);
    return instanceName;
  }

  /**
   * Get a browser instance by name. Returns the default instance if name is not provided.
   */
  getBrowserInstance(name?: string): BrowserInstance | undefined {
    if (!name) {
      // Return default instance if it exists
      if (this.browser && this.context && this.page) {
        return {
          browser: this.browser,
          context: this.context,
          page: this.page,
          name: "default",
        };
      }
      return undefined;
    }
    return this.browsers.get(name);
  }

  /**
   * Close a specific browser instance by name.
   */
  async closeBrowserInstance(name: string): Promise<void> {
    const instance = this.browsers.get(name);
    if (!instance) {
      return;
    }

    try {
      await instance.context.close();
    } catch {
      // Ignore errors during cleanup
    }

    try {
      await instance.browser.close();
    } catch {
      // Ignore errors during cleanup
    }

    this.browsers.delete(name);

    // If this was the default instance, clear the default references
    if (name === "default" || (this.browser === instance.browser)) {
      this.browser = undefined;
      this.context = undefined;
      this.page = undefined;
    }
  }

  /**
   * Close all browser instances.
   */
  async disposeBrowser(): Promise<void> {
    const closePromises = Array.from(this.browsers.keys()).map((name) =>
      this.closeBrowserInstance(name),
    );
    await Promise.allSettled(closePromises);
    this.browsers.clear();
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
  }

  async initKubernetes(): Promise<void> {
    if (this.k8sCoreApi && this.k8sAppsApi) {
      return;
    }

    const kc = new KubeConfig();
    if (this.kubeconfig) {
      kc.loadFromFile(this.kubeconfig);
    } else {
      // Try in-cluster config first, then fallback to default kubeconfig
      try {
        kc.loadFromCluster();
      } catch {
        kc.loadFromDefault();
      }
    }

    this.k8sCoreApi = kc.makeApiClient(CoreV1Api);
    this.k8sAppsApi = kc.makeApiClient(AppsV1Api);
  }

  async kubectl(command: string): Promise<KubectlResult> {
    const [cmd, ...args] = command.split(" ");

    return new Promise((resolve, reject) => {
      const child = spawn("kubectl", [...args], { env: process.env });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
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
   * Create a unique namespace for this scenario, label it for GC, and
   * set it as the active namespace for subsequent operations.
   */
  async createTestNamespace(): Promise<void> {
    if (this.testNamespace) {
      return;
    }

    const shard = process.env.SHARD_INDEX ?? "0";
    const id = uuidv4().split("-")[0];
    const ns = `kuack-e2e-${shard}-${id}`;
    this.testNamespace = ns;
    this.namespace = ns;

    // Create namespace and label it for garbage collection.
    await this.kubectl(
      `create namespace ${ns}`,
    );
    await this.kubectl(
      `label namespace ${ns} kuack-e2e=true kuack-e2e-shard=${shard} --overwrite`,
    );
  }

  /**
   * Install the Helm chart required for this scenario into the test namespace.
   * Chart details are driven by environment variables so this framework stays generic:
   *   HELM_RELEASE_PREFIX (default: kuack-e2e)
   *   HELM_CHART (required, e.g. myrepo/mychart or ./charts/mychart)
   *   HELM_VALUES (optional, comma-separated list of -f value files)
   *   HELM_EXTRA_ARGS (optional, appended as-is)
   */
  async installHelmChart(): Promise<void> {
    if (!this.testNamespace) {
      await this.createTestNamespace();
    }

    const chart = process.env.HELM_CHART;
    if (!chart) {
      throw new Error("HELM_CHART environment variable is required to install Helm chart");
    }

    const prefix = process.env.HELM_RELEASE_PREFIX ?? "kuack-e2e";
    const shard = process.env.SHARD_INDEX ?? "0";
    const id = this.testNamespace!.split("-").slice(-1)[0];
    const releaseName = `${prefix}-${shard}-${id}`;
    this.helmReleaseName = releaseName;

    const values = (process.env.HELM_VALUES ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => `-f ${v}`)
      .join(" ");

    const extraArgs = process.env.HELM_EXTRA_ARGS ?? "";

    const cmd = `helm install ${releaseName} ${chart} --namespace ${this.testNamespace} ${values} ${extraArgs}`.trim();
    await this.execHelm(cmd);
  }

  /**
   * Teardown Helm release and namespace. Failures here should not fail the test.
   */
  async cleanupKubernetesResources(): Promise<void> {
    const ns = this.testNamespace;
    const release = this.helmReleaseName;

    // Best-effort cleanup; ignore errors.
    try {
      if (release && ns) {
        await this.execHelm(`helm uninstall ${release} -n ${ns}`);
      }
    } catch {
      // ignore
    }

    try {
      if (ns) {
        await this.kubectl(`delete namespace ${ns} --wait=false`);
      }
    } catch {
      // ignore
    }
  }

  private async execHelm(fullCommand: string): Promise<void> {
    const [binary, ...args] = fullCommand.split(" ");

    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, { env: process.env });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed (${binary}): ${stderr || stdout}`));
        } else {
          resolve();
        }
      });
    });
  }
}

setWorldConstructor(CustomWorld);
