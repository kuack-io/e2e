import { Config } from "../components/config";
import { PodBuilder } from "./pod-builder";
import { V1Pod } from "@kubernetes/client-node";

/**
 * Factory class for creating pods for testing.
 */
export abstract class PodFactory {
  private static checkerBase(name: string): PodBuilder {
    const podBuilder = new PodBuilder(name).withImage(Config.checkerImage).withEnv("TARGET_URL", "https://kuack.io");
    return podBuilder;
  }

  /**
   * Creates a checker pod for agent testing.
   * @param podName - The name of the pod.
   * @param nodeName - The name of the node to schedule the pod on.
   * @returns The created pod.
   */
  public static checkerForAgent(podName: string, nodeName: string): V1Pod {
    const pod = this.checkerBase(podName)
      .withNodeSelectors({
        "kuack.io/node-type": "kuack-node",
        "kubernetes.io/hostname": nodeName,
      })
      .withTolerations({
        "kuack.io/provider": "kuack",
        effect: "NoSchedule",
      })
      .build();
    return pod;
  }

  /**
   * Creates a checker pod for cluster testing.
   * @param podName - The name of the pod.
   * @returns The created pod.
   */
  public static checkerForCluster(podName: string): V1Pod {
    const pod = this.checkerBase(podName)
      .withRestartPolicy("Never") // kubernetes tries to restart finished non-Job pods
      .build();
    return pod;
  }
}
