# E2E Test Suite

End-to-end test suite for Kuack applications using TypeScript, Playwright, Cucumber, and Kubernetes integration.

## Dependencies

- Node.js
- helm

For `make test-minikube`:
- kubectl
- minikube

## Architecture

This test suite is designed for **extreme parallelization** and **Kubernetes-native execution**:

## Features

- Browser automation with Playwright
- Kubernetes API integration
- BDD with Gherkin/Cucumber
- Beautiful Allure reports
- Designed for 10,000+ parallel tests
- Runs as Kubernetes Jobs with in-cluster authentication
- Combines UI actions with backend/K8s verification
- Helm installations
- Port-forwarding support for local executions

## Running Tests

Locally:

```bash
make test-local
```

Locally in parallel:

```bash
make test-local-parallel
```

Locally in debug mode (with Playwright debugging console):

```bash
npm run test:debug
```

Locally in minikube (it has minikube-specific volume mounts to download reports):

```bash
make test-minikube
```

## Open Allure Report

Once tests are done, you can generate and open Allure report with:

```bash
make report
```
