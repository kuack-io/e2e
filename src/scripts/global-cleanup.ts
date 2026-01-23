import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";

async function main() {
  console.log("Starting global cleanup...");
  try {
    await K8s.init();
    await Helm.cleanup();
    const usesExternal = (process.env.AGENT_URL ?? "") !== "" || (process.env.NODE_URL ?? "") !== "";
    const podPattern = usesExternal ? /^checker-/ : /^(checker-|kuack-)/;
    if (usesExternal) {
      console.log("[Cleanup] External node/agent detected; skipping kuack-* pod cleanup.");
    }
    await K8s.cleanupPods(podPattern);
    console.log("Global cleanup completed successfully.");
  } catch (error) {
    console.error("Global cleanup failed:", error);
    process.exit(1);
  }
}

main();
