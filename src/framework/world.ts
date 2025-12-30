import { Node } from "./node";
import { World, setWorldConstructor } from "@cucumber/cucumber";

export class CustomWorld extends World {
  private featureName?: string;
  private scenarioName?: string;
  private node?: Node;

  /*
   * Initialize the world.
   * Called in Before hook. Can't be done in constructor because it depends on
   * the feature and scenario names which are known during execution only.
   */
  public async init(featureName: string, scenarioName: string): Promise<void> {
    this.node = new Node(featureName, scenarioName);
  }

  public async destroy(): Promise<void> {
    this.node?.destroy();
  }
}

setWorldConstructor(CustomWorld);
