# E2E Test Suite

End-to-end test suite for Kuack applications using TypeScript, Playwright, Cucumber, and Kubernetes integration.

## Architecture

This test suite is designed for **extreme parallelization** and **Kubernetes-native execution**:

## Features

- Browser automation with Playwright
- Kubernetes API integration (`@kubernetes/client-node`)
- kubectl command execution
- BDD with Gherkin/Cucumber
- Beautiful Allure reports
- Designed for 10,000+ parallel tests
- Runs as Kubernetes Jobs with in-cluster authentication
- Combines UI actions with backend/K8s verification
