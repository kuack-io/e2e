# Project Structure

This document describes the architecture and organization of the E2E test suite.

## Directory Layout

```
e2e/
├── src/                          # Source code (TypeScript)
│   ├── features/                 # Gherkin feature files
│   │   ├── 01-basic-browser.feature
│   │   ├── 02-kubernetes-basic.feature
│   │   ├── 03-integration-browser-k8s.feature
│   │   ├── 04-kubectl-apply-workflow.feature
│   │   └── 05-service-verification.feature
│   ├── step-definitions/         # Cucumber step definitions
│   │   ├── browser-steps.ts      # Browser automation steps
│   │   ├── kubernetes-steps.ts   # K8s API/kubectl steps
│   │   ├── integration-steps.ts  # Combined browser+K8s steps
│   │   └── common-steps.ts       # Common/reusable steps
│   ├── support/                  # Test framework support
│   │   ├── world.ts              # CustomWorld class (Playwright + K8s)
│   │   ├── hooks.ts              # Before/After hooks
│   │   ├── allure-reporter.ts    # Allure reporting utilities
│   │   └── index.ts              # Support files index
│   └── utils/                    # Utility functions
│       └── k8s-utils.ts          # Kubernetes helper functions
│
├── k8s/                          # Kubernetes manifests
│   ├── namespace.yaml            # Test namespace
│   ├── serviceaccount.yaml       # ServiceAccount + RBAC
│   └── job-example.yaml         # Example test job
│
├── manifests/                    # Test Kubernetes resources
│   ├── example-pod.yaml
│   └── example-service.yaml
│
├── scripts/                      # Utility scripts
│   └── setup.sh                 # Setup script
│
├── dist/                         # Compiled JavaScript (generated)
├── allure-results/               # Allure test results (generated)
├── allure-report/                # Allure HTML reports (generated)
│
├── .github/workflows/            # CI/CD examples
│   └── e2e-tests.yml.example
│
├── Dockerfile                    # Test image definition
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── playwright.config.ts          # Playwright configuration
├── .cucumberrc.js               # Cucumber configuration
├── Makefile                      # Common commands
└── README.md                     # This file
```

## Key Components

### 1. Feature Files (`src/features/`)

Gherkin syntax feature files that describe test scenarios in plain language:

```gherkin
Feature: My Feature
  Scenario: Test something
    Given I navigate to "/dashboard"
    When I click on "button#submit"
    Then I should see "Success"
```

### 2. Step Definitions (`src/step-definitions/`)

TypeScript implementations of Gherkin steps:

- **browser-steps.ts**: Playwright-based browser automation
- **kubernetes-steps.ts**: Kubernetes API and kubectl operations
- **integration-steps.ts**: Steps that combine browser and K8s actions
- **common-steps.ts**: Reusable common steps

### 3. CustomWorld (`src/support/world.ts`)

Extends Cucumber's World class to provide:
- Playwright browser/page/context instances
- Kubernetes API clients (CoreV1Api, AppsV1Api, etc.)
- kubectl command execution
- Test data storage
- Automatic initialization and cleanup

### 4. Hooks (`src/support/hooks.ts`)

Cucumber hooks for:
- Browser initialization (Before)
- Kubernetes client setup (Before)
- Screenshot capture on failure (After)
- Resource cleanup (After)

### 5. Kubernetes Utils (`src/utils/k8s-utils.ts`)

Helper functions for common K8s operations:
- `getPod()`: Get pod by name
- `waitForPodStatus()`: Wait for pod to reach status
- `getDeployment()`: Get deployment by name
- `waitForDeploymentReady()`: Wait for deployment readiness
- `listPods()`: List pods with optional label selector
- `getService()`: Get service by name

## Execution Flow

1. **Build**: TypeScript → JavaScript (`npm run build`)
2. **Load**: Cucumber loads feature files and step definitions
3. **Initialize**: Hooks initialize browser and K8s clients
4. **Execute**: Steps execute scenarios
5. **Report**: Allure collects results and generates reports
6. **Cleanup**: Hooks clean up resources

## Parallelization Strategy

### Level 1: Feature Sharding
Split features across multiple Kubernetes Jobs:
- Tag features: `@shard-0`, `@shard-1`, etc.
- Run each shard in separate Job
- Scale to 100+ shards for 10,000 tests

### Level 2: Scenario Parallelization
Within each Job, run scenarios in parallel:
- Use `--parallel` flag with Cucumber
- Configure `CUCUMBER_WORKERS` environment variable
- Each worker runs scenarios independently

### Level 3: Job Parallelism
Configure Kubernetes Job parallelism:
```yaml
spec:
  parallelism: 4  # 4 pods run simultaneously
  completions: 4   # Each pod handles a subset
```

## Data Flow

```
Feature File (Gherkin)
    ↓
Step Definition (TypeScript)
    ↓
CustomWorld (Browser + K8s)
    ↓
Playwright / K8s API
    ↓
Application / Kubernetes
    ↓
Results → Allure → ReportPortal (optional)
```

## Extension Points

### Adding New Steps

1. Create step in `src/step-definitions/`
2. Use `CustomWorld` for browser/K8s access
3. Import utilities from `src/utils/`

### Adding New Features

1. Create `.feature` file in `src/features/`
2. Use existing steps or add new ones
3. Tag appropriately for sharding

### Custom Utilities

Add to `src/utils/`:
- API clients
- Helper functions
- Test data generators

## Best Practices

1. **Idempotency**: Tests should be rerunnable
2. **Isolation**: No shared state between tests
3. **Cleanup**: Always clean up in After hooks
4. **Tags**: Use tags for organization and sharding
5. **Timeouts**: Set appropriate timeouts for async operations
6. **Error Messages**: Provide clear, actionable error messages
