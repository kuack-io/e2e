Feature: Basic Kubernetes Operations
  As a test engineer
  I want to interact with Kubernetes resources
  So that I can verify cluster state

  Scenario: Verify pod status via kubectl
    When I execute kubectl command "get pods"
    Then the last kubectl command should succeed

  Scenario: Check pod exists and is running
    Given a pod named "test-pod" exists in namespace "default"
    When I wait for pod "test-pod" to be "Running"
    Then the pod "test-pod" should be "Running"

  Scenario: Verify deployment readiness
    Given a deployment named "test-deployment" exists
    When I wait for deployment "test-deployment" to be ready
    Then the deployment "test-deployment" should have 1 ready replicas
