import { K8s } from "./k8s";
import { V1Pod, V1Container, V1Toleration } from "@kubernetes/client-node";

/**
 * Fluent builder for creating Kubernetes Pods programmatically.
 *
 * This follows the builder pattern similar to CDK8s and aligns with
 * the functional option pattern used in the Go testutil package.
 *
 * Example usage:
 * ```typescript
 * const pod = new PodBuilder("my-pod")
 *   .withImage("myapp:v1.0.0")
 *   .withRequestCPU("1")
 *   .withRequestMemory("4Gi")
 *   .withNodeSelector("kuack.io/node", "node-1")
 *   .build();
 *
 * await pod.apply();
 * ```
 */
export class PodBuilder {
  private pod: V1Pod;
  private currentContainer: V1Container;

  /**
   * Create a new PodBuilder instance.
   * @param name - Pod name (required)
   */
  constructor(name: string) {
    this.pod = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name,
        namespace: K8s.getNamespace(),
      },
      spec: {
        containers: [],
      },
    };

    // Initialize with a default container
    this.currentContainer = {
      name: "main",
      image: "",
    };
    this.pod.spec!.containers = [this.currentContainer];
  }

  /**
   * Set the container image.
   * @param image - Container image (e.g. "myapp:v1.0.0")
   * @returns The builder instance for method chaining
   */
  public withImage(image: string): this {
    this.currentContainer.image = image;
    return this;
  }

  /**
   * Set the container name.
   * @param name - Container name
   * @returns The builder instance for method chaining
   */
  public withContainerName(name: string): this {
    this.currentContainer.name = name;
    return this;
  }

  /**
   * Add a new container to the pod (multi-container pod support).
   * @param name - Container name
   * @param image - Container image
   * @returns The builder instance for method chaining
   */
  public addContainer(name: string, image: string): this {
    const container: V1Container = {
      name,
      image,
    };
    this.pod.spec!.containers!.push(container);
    this.currentContainer = container;
    return this;
  }

  /**
   * Ensure the current container has a resources object.
   * @private
   */
  private ensureResources(): void {
    if (!this.currentContainer.resources) {
      this.currentContainer.resources = {};
    }
  }

  /**
   * Set CPU request.
   * @param cpu - CPU request (e.g., "1", "500m", "0.5")
   * @returns The builder instance for method chaining
   */
  public withRequestCPU(cpu: string): this {
    this.ensureResources();
    if (!this.currentContainer.resources!.requests) {
      this.currentContainer.resources!.requests = {};
    }
    this.currentContainer.resources!.requests.cpu = cpu;
    return this;
  }

  /**
   * Set memory request.
   * @param memory - Memory request (e.g., "4Gi", "512Mi", "1G")
   * @returns The builder instance for method chaining
   */
  public withRequestMemory(memory: string): this {
    this.ensureResources();
    if (!this.currentContainer.resources!.requests) {
      this.currentContainer.resources!.requests = {};
    }
    this.currentContainer.resources!.requests.memory = memory;
    return this;
  }

  /**
   * Set CPU limit.
   * @param cpu - CPU limit
   * @returns The builder instance for method chaining
   */
  public withLimitCPU(cpu: string): this {
    this.ensureResources();
    if (!this.currentContainer.resources!.limits) {
      this.currentContainer.resources!.limits = {};
    }
    this.currentContainer.resources!.limits.cpu = cpu;
    return this;
  }

  /**
   * Set memory limit.
   * @param memory - Memory limit
   * @returns The builder instance for method chaining
   */
  public withLimitMemory(memory: string): this {
    this.ensureResources();
    if (!this.currentContainer.resources!.limits) {
      this.currentContainer.resources!.limits = {};
    }
    this.currentContainer.resources!.limits.memory = memory;
    return this;
  }

  /**
   * Set both CPU and memory requests.
   * @param cpu - CPU request
   * @param memory - Memory request
   * @returns The builder instance for method chaining
   */
  public withRequests(cpu: string, memory: string): this {
    return this.withRequestCPU(cpu).withRequestMemory(memory);
  }

  /**
   * Set both CPU and memory limits.
   * @param cpu - CPU limit
   * @param memory - Memory limit
   * @returns The builder instance for method chaining
   */
  public withLimits(cpu: string, memory: string): this {
    return this.withLimitCPU(cpu).withLimitMemory(memory);
  }

  /**
   * Add a node selector (simple key-value pair).
   * @param key - Label key
   * @param value - Label value
   * @returns The builder instance for method chaining
   */
  public withNodeSelector(key: string, value: string): this {
    if (!this.pod.spec!.nodeSelector) {
      this.pod.spec!.nodeSelector = {};
    }
    this.pod.spec!.nodeSelector[key] = value;
    return this;
  }

  /**
   * Set node selector with multiple key-value pairs.
   * @param selectors - Object with label key-value pairs
   * @returns The builder instance for method chaining
   */
  public withNodeSelectors(selectors: Record<string, string>): this {
    if (!this.pod.spec!.nodeSelector) {
      this.pod.spec!.nodeSelector = {};
    }
    Object.assign(this.pod.spec!.nodeSelector, selectors);
    return this;
  }

  /**
   * Add a single toleration to the pod.
   * @param key - Taint key
   * @param value - Taint value (required if operator is "Equal")
   * @param effect - Taint effect (NoSchedule, PreferNoSchedule, NoExecute)
   * @param operator - Taint operator (Equal or Exists, defaults to "Equal")
   * @param tolerationSeconds - Optional toleration seconds for NoExecute effect
   * @returns The builder instance for method chaining
   */
  public withToleration(
    key: string,
    value?: string,
    effect?: "NoSchedule" | "PreferNoSchedule" | "NoExecute",
    operator: "Equal" | "Exists" = "Equal",
    tolerationSeconds?: number,
  ): this {
    if (!this.pod.spec!.tolerations) {
      this.pod.spec!.tolerations = [];
    }

    const toleration: V1Toleration = {
      key,
      operator,
    };

    if (value !== undefined) {
      toleration.value = value;
    }

    if (effect !== undefined) {
      toleration.effect = effect;
    }

    if (tolerationSeconds !== undefined) {
      toleration.tolerationSeconds = tolerationSeconds;
    }

    this.pod.spec!.tolerations.push(toleration);
    return this;
  }

  /**
   * Add tolerations using a simplified object format.
   * Supports a format where label-like keys are treated as toleration key-value pairs,
   * and special keys like "effect", "operator", "tolerationSeconds" are treated as toleration properties.
   *
   * Example:
   * ```typescript
   * .withTolerations({
   *   "kuack.io/provider": "kuack",
   *   "effect": "NoSchedule"
   * })
   * ```
   *
   * @param tolerations - Object with toleration properties. The first non-special key-value pair
   *                      becomes the toleration key/value. Special keys: "effect", "operator", "tolerationSeconds"
   * @returns The builder instance for method chaining
   */
  public withTolerations(tolerations: Record<string, string | number>): this {
    if (!this.pod.spec!.tolerations) {
      this.pod.spec!.tolerations = [];
    }

    const specialKeys = new Set(["effect", "operator", "tolerationSeconds"]);
    let key: string | undefined;
    let value: string | undefined;
    let effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute" | undefined;
    let operator: "Equal" | "Exists" = "Equal";
    let tolerationSeconds: number | undefined;

    // Parse the object
    for (const [k, v] of Object.entries(tolerations)) {
      if (specialKeys.has(k)) {
        if (k === "effect") {
          effect = v as "NoSchedule" | "PreferNoSchedule" | "NoExecute";
        } else if (k === "operator") {
          operator = v as "Equal" | "Exists";
        } else if (k === "tolerationSeconds") {
          tolerationSeconds = typeof v === "number" ? v : parseInt(String(v), 10);
        }
      } else {
        // First non-special key becomes the toleration key
        if (key === undefined) {
          key = k;
          value = String(v);
        }
      }
    }

    if (!key) {
      throw new Error("Toleration must have a key. Provide at least one non-special key in the tolerations object.");
    }

    const toleration: V1Toleration = {
      key,
      operator,
    };

    if (value !== undefined && operator === "Equal") {
      toleration.value = value;
    }

    if (effect !== undefined) {
      toleration.effect = effect;
    }

    if (tolerationSeconds !== undefined) {
      toleration.tolerationSeconds = tolerationSeconds;
    }

    this.pod.spec!.tolerations.push(toleration);
    return this;
  }

  /**
   * Add a label to the pod metadata.
   * @param key - Label key
   * @param value - Label value
   * @returns The builder instance for method chaining
   */
  public withLabel(key: string, value: string): this {
    if (!this.pod.metadata!.labels) {
      this.pod.metadata!.labels = {};
    }
    this.pod.metadata!.labels[key] = value;
    return this;
  }

  /**
   * Add multiple labels to the pod metadata.
   * @param labels - Object with label key-value pairs
   * @returns The builder instance for method chaining
   */
  public withLabels(labels: Record<string, string>): this {
    if (!this.pod.metadata!.labels) {
      this.pod.metadata!.labels = {};
    }
    Object.assign(this.pod.metadata!.labels, labels);
    return this;
  }

  /**
   * Add an annotation to the pod metadata.
   * @param key - Annotation key
   * @param value - Annotation value
   * @returns The builder instance for method chaining
   */
  public withAnnotation(key: string, value: string): this {
    if (!this.pod.metadata!.annotations) {
      this.pod.metadata!.annotations = {};
    }
    this.pod.metadata!.annotations[key] = value;
    return this;
  }

  /**
   * Set the restart policy.
   * @param policy - Restart policy (Always, OnFailure, Never)
   * @returns The builder instance for method chaining
   */
  public withRestartPolicy(policy: "Always" | "OnFailure" | "Never"): this {
    this.pod.spec!.restartPolicy = policy;
    return this;
  }

  /**
   * Add an environment variable to the current container.
   * @param name - Environment variable name
   * @param value - Environment variable value
   * @returns The builder instance for method chaining
   */
  public withEnv(name: string, value: string): this {
    if (!this.currentContainer.env) {
      this.currentContainer.env = [];
    }
    this.currentContainer.env.push({ name, value });
    return this;
  }

  /**
   * Add multiple environment variables.
   * @param env - Object with environment variable key-value pairs
   * @returns The builder instance for method chaining
   */
  public withEnvs(env: Record<string, string>): this {
    for (const [name, value] of Object.entries(env)) {
      this.withEnv(name, value);
    }
    return this;
  }

  /**
   * Add a command to the container.
   * @param command - Command array (e.g., ["/bin/sh", "-c"])
   * @returns The builder instance for method chaining
   */
  public withCommand(command: string[]): this {
    this.currentContainer.command = command;
    return this;
  }

  /**
   * Add command arguments.
   * @param args - Arguments array
   * @returns The builder instance for method chaining
   */
  public withArgs(args: string[]): this {
    this.currentContainer.args = args;
    return this;
  }

  /**
   * Build and return the V1Pod object.
   * @returns The configured V1Pod object
   */
  public build(): V1Pod {
    // Validate that we have at least one container with an image
    if (!this.pod.spec!.containers || this.pod.spec!.containers.length === 0) {
      throw new Error("Pod must have at least one container");
    }

    for (const container of this.pod.spec!.containers) {
      if (!container.image) {
        throw new Error(`Container "${container.name}" must have an image`);
      }
    }

    return this.pod;
  }

  /**
   * Build the pod and apply it to the cluster.
   * This is a convenience method that combines build() and apply().
   * @returns The created pod from the API
   */
  public async apply(): Promise<V1Pod> {
    const pod = this.build();
    return K8s.applyPod(pod);
  }

  /**
   * Build the pod and delete it from the cluster (idempotent).
   * @returns Promise that resolves when the pod is deleted
   */
  public async delete(): Promise<void> {
    const pod = this.build();
    return K8s.deletePod(pod);
  }
}
