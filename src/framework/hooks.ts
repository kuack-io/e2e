import { Agent } from "../components/agent";
import { K8s } from "../utils/k8s";
import { Logs } from "../utils/logs";
import { CustomWorld } from "./world";
import {
  After,
  Before,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep,
  ITestCaseHookParameter,
  setDefaultTimeout,
} from "@cucumber/cucumber";

setDefaultTimeout(60_000);

BeforeAll(async function () {
  Logs.init();
  console.log("[BeforeAll] Initializing K8s");
  await K8s.init();
  console.log("[BeforeAll] Initializing Agent");
  await Agent.init();
});

AfterAll(async function () {
  console.log("[AfterAll] Destroying Agent");
  await Agent.destroy();
});

Before({ name: "Initialize test" }, async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const featureName = scenario.gherkinDocument?.feature?.name ?? "";
  const scenarioName = scenario.pickle.name;

  if (!featureName) {
    throw new Error("Feature name must be defined");
  }

  const logs = new Logs();
  logs.start();
  try {
    console.log("[Before] Initializing test", featureName, "->", scenarioName);
    await this.init(featureName, scenarioName);
  } finally {
    const captured = logs.stop();
    if (captured.length > 0) {
      this.attach(captured.join("\n"), "text/plain");
    }
  }
});

After({ name: "Tear down test" }, async function (this: CustomWorld) {
  const logs = new Logs();
  logs.start();
  try {
    console.log("[After] Tearing down test");
    await this.destroy();
  } finally {
    const captured = logs.stop();
    if (captured.length > 0) {
      this.attach(captured.join("\n"), "text/plain");
    }
  }
});

BeforeStep(async function (this: CustomWorld) {
  this.stepLogs = new Logs();
  this.stepLogs.start();
});

AfterStep(async function (this: CustomWorld) {
    const captured = this.stepLogs?.stop() ?? [];
    if (captured.length > 0) {
      this.attach(captured.join("\n"), "text/plain");
    }
});
