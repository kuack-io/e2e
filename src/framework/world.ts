import { Node } from "../components/node";
import { Logs } from "../utils/logs";
import { World, setWorldConstructor } from "@cucumber/cucumber";

export class CustomWorld extends World {
  private featureName?: string;
  private scenarioName?: string;
  private node?: Node;

  /** Current step's log capture instance, managed by BeforeStep/AfterStep hooks */
  public stepLogs?: Logs;

  /*
   * Initialize the world.
   * Called in Before hook. Can't be done in constructor because it depends on
   * the feature and scenario names which are known during execution only.
   */
  public async init(featureName: string, scenarioName: string): Promise<void> {
    this.featureName = featureName;
    this.scenarioName = scenarioName;
    this.node = new Node(featureName, scenarioName);
    await this.node.init();
  }

  public async destroy(): Promise<void> {
    await this.node?.destroy();
  }
}

setWorldConstructor(CustomWorld);
