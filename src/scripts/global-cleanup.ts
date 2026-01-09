import { Helm } from "../utils/helm";
import { K8s } from "../utils/k8s";

async function main() {
  console.log("Starting global cleanup...");
  try {
    await K8s.init();
    await Helm.cleanup();
    await K8s.cleanupPods();
    console.log("Global cleanup completed successfully.");
  } catch (error) {
    console.error("Global cleanup failed:", error);
    process.exit(1);
  }
}

main();
