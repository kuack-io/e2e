@execution
Feature: C2W Complex Execution
  As a Kuack developer
  I want to run complex, real-world code in c2w converted images
  So that I can prove Kuack executes actual Python/Node/Shell, not just simple echo commands

  Background:
    Given Agent is connected to Node
  # ============================================
  # Python: Computation + Timing + JSON Output
  # ============================================

  Scenario Outline: Python computation with timing on <target>
    When I deploy "ghcr.io/kuack-io/c2w-examples/python:3.14-alpine" pod with script for "<target>":
      """
      import time
      import json

      def fibonacci(n):
          if n <= 1:
              return n
          a, b = 0, 1
          for _ in range(2, n + 1):
              a, b = b, a + b
          return b

      start = time.perf_counter()
      result = fibonacci(30)
      elapsed_ms = (time.perf_counter() - start) * 1000

      output = {
          "test": "fibonacci",
          "input": 30,
          "result": result,
          "elapsed_ms": round(elapsed_ms, 3),
          "runtime": "python"
      }
      print(json.dumps(output, indent=2))
      """
    Then All pods execute successfully and logs contain "fibonacci"
    And All pods execute successfully and logs contain "runtime"
    And "<target>" pods are processed in "<target>"

    Examples:
      | target  |
      | Cluster |
      | Agent   |
  # ============================================
  # Node.js: Async Timing + Promise-based Code
  # ============================================

  Scenario Outline: Node.js async timing measurement on <target>
    When I deploy "ghcr.io/kuack-io/c2w-examples/node:24-alpine" pod with script for "<target>":
      """
      const measure = async (label, fn) => {
        const start = performance.now();
        const result = await fn();
        return { label, result, ms: Math.round((performance.now() - start) * 100) / 100 };
      };

      (async () => {
        const tests = await Promise.all([
          measure('sort', async () => {
            const arr = Array.from({ length: 5000 }, Math.random);
            arr.sort((a, b) => a - b);
            return arr.length;
          }),
          measure('json', async () => {
            const obj = { items: Array.from({ length: 50 }, (_, i) => i) };
            return JSON.parse(JSON.stringify(obj)).items.length;
          })
        ]);
        console.log(JSON.stringify({ test: 'node_bench', tests, runtime: 'nodejs' }));
      })();
      """
    Then All pods execute successfully and logs contain "node_bench"
    And All pods execute successfully and logs contain "runtime"
    And "<target>" pods are processed in "<target>"

    Examples:
      | target  |
      | Cluster |
      | Agent   |
  # ============================================
  # Shell: Environment Inspection + Timing Loop
  # ============================================

  Scenario Outline: Shell environment diagnostics on <target>
    When I deploy "ghcr.io/kuack-io/c2w-examples/alpine:latest" pod with script for "<target>":
      """
      #!/bin/sh
      echo "{"
      echo "  \"test\": \"shell_diagnostics\","

      # Measure time for a simple loop
      start=$(date +%s%N 2>/dev/null || echo 0)
      sum=0
      i=0
      while [ $i -lt 1000 ]; do
        sum=$((sum + i))
        i=$((i + 1))
      done
      end=$(date +%s%N 2>/dev/null || echo 0)

      if [ "$start" != "0" ] && [ "$end" != "0" ]; then
        elapsed_ns=$((end - start))
        elapsed_ms=$((elapsed_ns / 1000000))
      else
        elapsed_ms=0
      fi

      echo "  \"loop_result\": $sum,"
      echo "  \"elapsed_ms\": $elapsed_ms,"
      echo "  \"shell\": \"$(echo $SHELL 2>/dev/null || echo sh)\","
      echo "  \"user\": \"$(whoami 2>/dev/null || echo unknown)\","
      echo "  \"hostname\": \"$(hostname 2>/dev/null || echo unknown)\","
      echo "  \"runtime\": \"shell\""
      echo "}"
      """
    Then All pods execute successfully and logs contain "shell_diagnostics"
    And All pods execute successfully and logs contain "runtime"
    And "<target>" pods are processed in "<target>"

    Examples:
      | target  |
      | Cluster |
      | Agent   |
