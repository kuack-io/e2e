# E2E Test Suite

End-to-end test suite for Kuack applications using TypeScript, Playwright, Cucumber, and Kubernetes integration.

## Architecture

This test suite is designed for **extreme parallelization** and **Kubernetes-native execution**:

- **Language**: TypeScript (no Java dependency)
- **Browser Engine**: Playwright (high-performance, shardable)
- **BDD Framework**: Cucumber.js (Gherkin syntax)
- **Reporting**: Allure Report + ReportPortal
- **Execution**: Kubernetes Jobs (highly parallelizable)

## Features

- Browser automation with Playwright
- Kubernetes API integration (`@kubernetes/client-node`)
- kubectl command execution
- BDD with Gherkin/Cucumber
- Beautiful Allure reports
- Designed for 10,000+ parallel tests
- Runs as Kubernetes Jobs with in-cluster authentication
- Combines UI actions with backend/K8s verification

## Project Structure

```
e2e/
├── src/
│   ├── features/              # Gherkin feature files (organized by domain)
│   │   ├── browser/
│   │   ├── kubernetes/
│   │   └── integration/
│   ├── step-definitions/      # Cucumber step definitions (organized by domain)
│   │   ├── browser/
│   │   ├── kubernetes/
│   │   ├── integration/
│   │   └── common/
│   ├── framework/             # Test framework (World, hooks, Allure)
│   │   ├── world.ts           # CustomWorld class
│   │   ├── hooks.ts           # Before/After hooks
│   │   └── allure-reporter.ts
│   └── utils/                 # Helper utilities (K8s, etc.)
├── k8s/                       # Kubernetes infrastructure manifests
│   ├── namespace.yaml
│   ├── serviceaccount.yaml
│   └── job-example.yaml
├── manifests/                 # Test Kubernetes resources (used in scenarios)
│   ├── test-pod.yaml
│   └── test-service.yaml
├── Dockerfile                 # Test image
├── package.json
├── tsconfig.json
└── playwright.config.ts
```

## Environment Variables

Tests require the following environment variables (use .env file to set them):

**Required:**
- `HELM_CHART` - Helm chart to install before each test (e.g., `myrepo/mychart` or `./charts/mychart`)

**Optional:**
- `BASE_URL` - Base URL for the application under test (default: `http://localhost:3000`)
- `HEADED` - Run browsers in headed mode (default: `false`)
- `CUCUMBER_WORKERS` - Number of parallel workers (default: `4`)
- `SHARD_INDEX` - Shard index for parallel execution (default: `0`)
- `HELM_RELEASE_PREFIX` - Prefix for Helm release names (default: `kuack-e2e`)
- `HELM_VALUES` - Comma-separated list of values files (e.g., `values1.yaml,values2.yaml`)
- `HELM_EXTRA_ARGS` - Additional arguments to pass to helm install
- `KUBECONFIG` - Path to kubeconfig file (default: in-cluster or `~/.kube/config`)

Example `.env` file:

```bash
BASE_URL=http://localhost:3000
HELM_CHART=./charts/my-app
HELM_VALUES=values-test.yaml
HEADED=false
CUCUMBER_WORKERS=4
```

## Kubernetes Execution

1. **Build and push Docker image:**
```bash
make docker-build
make docker-push
```

2. **Deploy test infrastructure:**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/serviceaccount.yaml
```

3. **Run tests as Kubernetes Job:**
```bash
kubectl apply -f k8s/job-example.yaml
```

4. **Check test results:**
```bash
kubectl logs -f job/e2e-tests-shard-0 -n e2e-tests
```

## Running Tests

### Running All Tests

```bash
npm run build
npm test
```

### Running a Single Test

You can run a specific test scenario in several ways:

#### Option 1: By File and Line Number

Find the line number where your scenario starts in the feature file, then run:

```bash
npm run build
npx cucumber-js dist/features/kubernetes/04-kubectl-apply-workflow.feature:12
```

Or using the npm script:

```bash
npm test -- dist/features/kubernetes/04-kubectl-apply-workflow.feature:12
```

#### Option 2: By Scenario Name

```bash
npm run build
npx cucumber-js dist/features --name "Apply and verify resource"
```

Or:

```bash
npm test -- --name "Apply and verify resource"
```

#### Option 3: By Tag

Add a tag to your scenario in the feature file:

```gherkin
@focus
Scenario: Apply and verify resource
  Given I apply the Kubernetes resource "manifests/test-pod.yaml"
  ...
```

Then run:

```bash
npm run build
npx cucumber-js dist/features --tags @focus
```

Or:

```bash
npm test -- --tags @focus
```

**Note**: After making changes to feature files or step definitions, remember to run `npm run build` to compile TypeScript before running tests.

## Writing Tests

### Feature Files (Gherkin)

Create `.feature` files in `src/features/`:

```gherkin
Feature: My Feature
  Scenario: Test something
    Given I navigate to "/dashboard"
    When I click on "button#submit"
    Then I should see "Success"
    And the pod "backend-pod" should be "Running"
```

### Step Definitions

Step definitions are in `src/step-definitions/`. Available steps include:

**Browser Steps:**
- `Given I navigate to {string}` - Navigate to a URL in the default browser
- `Given I am on the {string} page` - Navigate to a named page (home, dashboard, login)
- `When I click on {string}` - Click an element in the default browser
- `When I fill {string} with {string}` - Fill an input field in the default browser
- `When I submit the form` - Submit the current form
- `When I wait for {int} seconds` - Wait for a specified number of seconds
- `Then I should see {string}` - Verify text is visible in the default browser
- `Then I should see element {string}` - Verify an element is visible
- `Then the page title should contain {string}` - Verify page title contains text
- `Then the URL should contain {string}` - Verify URL contains text
- `Then I should not see {string}` - Verify text is not visible

**Multiple Browser Steps:**
- `Given I have {int} browser instances` - Create multiple browser instances (default + additional)
- `Given I create a browser instance named {string}` - Create a named browser instance
- `Given I navigate to {string} in browser {string}` - Navigate in a specific browser instance
- `When I click on {string} in browser {string}` - Click in a specific browser instance
- `Then I should see {string} in browser {string}` - Verify text in a specific browser instance

**Kubernetes Steps:**
- `Given I apply the Kubernetes resource {string}`
- `When I wait for pod {string} to be {string}`
- `Then the pod {string} should be {string}`
- `Then the deployment {string} should have {int} ready replicas`

**Integration Steps:**
- `Given I have applied the resource {string} and navigated to {string}`
- `Then the UI should show {string} and the pod {string} should be {string}`

### Multiple Browser Instances

Some tests require multiple browser instances running simultaneously (e.g., testing multi-user interactions, WebSocket connections, or real-time collaboration features).

The framework supports multiple browser instances per scenario:

```gherkin
Feature: Multi-user Collaboration
  Scenario: Two users interact simultaneously
    Given I have 2 browser instances
    Given I navigate to "/chat" in browser "browser-0"
    Given I navigate to "/chat" in browser "browser-1"
    When I fill "input#message" with "Hello" in browser "browser-0"
    When I click on "button#send" in browser "browser-0"
    Then I should see "Hello" in browser "browser-1"
```

Or create named instances:

```gherkin
Feature: Admin and User Views
  Scenario: Admin sees different UI than user
    Given I create a browser instance named "admin"
    Given I create a browser instance named "user"
    Given I navigate to "/dashboard" in browser "admin"
    Given I navigate to "/dashboard" in browser "user"
    Then I should see "Admin Panel" in browser "admin"
    Then I should not see "Admin Panel" in browser "user"
```

**Programmatic Access:**

In step definitions, you can access browser instances programmatically:

```typescript
import { CustomWorld } from '../../framework/world';

Given('I do something with multiple browsers', async function (this: CustomWorld) {
  // Create additional browser instances
  const name1 = await this.createBrowserInstance('user1');
  const name2 = await this.createBrowserInstance('user2');

  // Get a specific instance
  const instance = this.getBrowserInstance('user1');
  if (instance) {
    await instance.page.goto('http://example.com');
  }

  // Close a specific instance
  await this.closeBrowserInstance('user1');

  // All browsers are automatically closed in the After hook
});
```

**Note**: All browser instances are automatically closed after each scenario, even if the test fails. Screenshots are captured from all browser instances on failure.

### Custom Steps

Add custom steps in `src/step-definitions/`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../../framework/world';

Given('I do something custom', async function (this: CustomWorld) {
  // Your implementation
  // Access default browser: this.page
  // Access multiple browsers: this.getBrowserInstance('name')
});
```

## Parallelization

### Sharding

Split tests across multiple Kubernetes Jobs:

```bash
# Job 1: Run features with @shard-0 tag
SHARD_INDEX=0 npm run test:shard

# Job 2: Run features with @shard-1 tag
SHARD_INDEX=1 npm run test:shard
```

Tag your features:
```gherkin
@shard-0
Feature: My Feature
  ...
```

### Parallel Workers

Run multiple scenarios in parallel within a single job:

```bash
CUCUMBER_WORKERS=10 npm run test:parallel
```

### Kubernetes Job Parallelism

Configure in `k8s/job-example.yaml`:

```yaml
spec:
  parallelism: 4  # Run 4 pods simultaneously
  completions: 4  # Each pod runs a subset of tests
```

## Kubernetes Integration

### In-Cluster Authentication

When running as a Kubernetes Job, tests automatically authenticate using the ServiceAccount:

```yaml
spec:
  serviceAccountName: e2e-test-runner
```

The ServiceAccount has permissions to:
- Get/list/watch pods, services, deployments
- Create/update/delete test resources
- Execute kubectl commands

### Kubernetes Client

Access Kubernetes API in step definitions:

```typescript
import { KubernetesUtils } from '../utils/k8s-utils';

const k8sUtils = new KubernetesUtils(this);
const pod = await k8sUtils.getPod('my-pod');
```

### kubectl Commands

Execute kubectl commands:

```typescript
const result = await this.kubectl('get pods');
console.log(result.stdout);
```

## Reporting

### Allure Reports

Generate HTML reports:

```bash
npm run report:allure
npm run report:serve
```

Reports include:
- Test execution timeline
- Screenshots on failure
- Step-by-step logs
- Video recordings (on failure)

### ReportPortal Integration

To integrate with ReportPortal:

1. Deploy ReportPortal in your cluster
2. Add ReportPortal agent to `package.json`
3. Configure in `src/framework/hooks.ts`

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: |
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/serviceaccount.yaml
    kubectl apply -f k8s/job-example.yaml
    kubectl wait --for=condition=complete job/e2e-tests-shard-0 -n e2e-tests --timeout=600s
```

### Sharding Strategy

For 10,000 tests across 100 shards:

```bash
for i in {0..99}; do
  kubectl create job e2e-tests-shard-$i \
    --from=job/e2e-tests-shard-0 \
    --env="SHARD_INDEX=$i"
done
```

## Best Practices

1. **Idempotent Tests**: Tests should be able to run multiple times
2. **Cleanup**: Always clean up test resources in `After` hooks
3. **Isolation**: Each test should be independent
4. **Tags**: Use tags for test organization and sharding
5. **Timeouts**: Set appropriate timeouts for K8s operations
6. **Error Handling**: Provide clear error messages in assertions

## Contributing

1. Add feature files in `src/features/`
2. Implement step definitions in `src/step-definitions/`
3. Add utilities in `src/utils/`
4. Update this README as needed
