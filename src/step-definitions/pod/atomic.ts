import { CustomWorld } from "../../framework";
import * as helpers from "./helpers";
import { When } from "@cucumber/cucumber";

// ============================================================================
// ATOMIC STEPS (Low-level, reusable building blocks)
// ============================================================================

When("I deploy Checker pod for Agent", async function (this: CustomWorld) {
  await helpers.deployCheckerPodForAgent(this);
});

When("I deploy Checker pod for Cluster", async function (this: CustomWorld) {
  await helpers.deployCheckerPodForCluster(this);
});

When("I deploy Universal Checker pod", async function (this: CustomWorld) {
  await helpers.deployUniversalCheckerPod(this);
});

When("I deploy {int} Checker pods for Agent", async function (this: CustomWorld, count: number) {
  await helpers.deployManyCheckerPodsForAgent(this, count);
});

When(
  "I deploy {string} pod with command {string} for {string}",
  async function (this: CustomWorld, image: string, commandStr: string, target: string) {
    // Parse shell-style command string, respecting quoted arguments
    // Also handles escaped quotes (e.g., \" inside quotes)
    const parseCommand = (input: string): string[] => {
      const args: string[] = [];
      let current = "";
      let inQuote = false;
      let quoteChar = "";

      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const nextChar = i + 1 < input.length ? input[i + 1] : null;

        // Handle escaped quotes inside quoted strings
        if (inQuote && char === "\\" && nextChar === quoteChar) {
          // Skip the backslash, add the quote character
          current += quoteChar;
          i++; // Skip the next character (the quote)
          continue;
        }

        if ((char === '"' || char === "'") && !inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuote) {
          inQuote = false;
          quoteChar = "";
        } else if (char === " " && !inQuote) {
          if (current.length > 0) {
            args.push(current);
            current = "";
          }
        } else {
          current += char;
        }
      }

      if (current.length > 0) {
        args.push(current);
      }

      return args;
    };

    const cmd = parseCommand(commandStr.trim());

    console.log(`[Atomic] Deploying ${target} pod ${image} with cmd: ${JSON.stringify(cmd)}`);

    if (target === "Agent") {
      await helpers.deployGenericPodForAgent(this, image, cmd);
    } else if (target === "Cluster") {
      await helpers.deployGenericPodForCluster(this, image, cmd);
    } else {
      throw new Error(`Unknown target: ${target}`);
    }
  },
);

When(
  "I deploy {string} pod with script for {string}:",
  async function (this: CustomWorld, image: string, target: string, script: string) {
    // Build command based on image type
    // The script is passed via docstring (triple quotes in Gherkin)
    const cmd = helpers.buildScriptCommand(image, script);

    console.log(`[Atomic] Deploying ${target} pod ${image} with script (${script.split("\n").length} lines)`);

    if (target === "Agent") {
      await helpers.deployGenericPodForAgent(this, image, cmd);
    } else if (target === "Cluster") {
      await helpers.deployGenericPodForCluster(this, image, cmd);
    } else {
      throw new Error(`Unknown target: ${target}`);
    }
  },
);
