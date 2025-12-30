import { K8s } from "../utils/k8s";
import { Agent } from "./agent";
import { CustomWorld } from "./world";
import { After, Before, BeforeAll, AfterAll, ITestCaseHookParameter, setDefaultTimeout } from "@cucumber/cucumber";

setDefaultTimeout(60_000);

BeforeAll(async function () {
  K8s.init();
  Agent.init();
});

AfterAll(async function () {
  Agent.destroy();
});

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const featureName = (scenario as any).gherkinDocument.feature.name;
  const scenarioName = (scenario as any).pickle.name;
  this.init(featureName, scenarioName);
});

After(async function (this: CustomWorld) {
  this.destroy();
});
