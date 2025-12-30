Feature: Kubectl Apply Workflow
  As a test engineer
  I want to apply Kubernetes resources via kubectl
  So that I can test resource lifecycle

  Scenario: Apply and verify resource
    Given I apply the Kubernetes resource "manifests/test-pod.yaml"
    When I wait for pod "test-pod" to be "Running"
    Then the pod "test-pod" should be "Running"
    And there should be 1 pods with label "app=test-pod"

  Scenario: Delete resource and verify removal
    Given I apply the Kubernetes resource "manifests/test-pod.yaml"
    And I wait for pod "test-pod" to be "Running"
    When I delete the Kubernetes resource "manifests/test-pod.yaml"
    Then the pod "test-pod" should not exist
