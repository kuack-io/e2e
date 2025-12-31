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
  console.log("[AfterAll] Destroying K8s");
  await K8s.destroy();
});

Before({ name: "Initialize test" }, async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const scenarioName = scenario.pickle.name;
  const featureName = scenario.gherkinDocument?.feature?.name ?? "";

  const logs = new Logs();
  logs.start();
  try {
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
    await this.destroy();
  } finally {
    const captured = logs.stop();
    if (captured.length > 0) {
      this.attach(captured.join("\n"), "text/plain");
    }
  }
});

BeforeStep(async function (this: CustomWorld) {
  this.initLogs();
  this.startCaptureLogs();
});

AfterStep(async function (this: CustomWorld) {
  const captured = this.stopCaptureLogs() ?? [];
  if (captured.length > 0) {
    this.attach(captured.join("\n"), "text/plain");
  }
});
