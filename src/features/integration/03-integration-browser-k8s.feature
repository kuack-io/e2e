Feature: Browser and Kubernetes Integration
  As a test engineer
  I want to combine browser actions with Kubernetes verification
  So that I can validate end-to-end workflows

  Scenario: UI action triggers Kubernetes pod status change
    Given I have applied the resource "manifests/test-pod.yaml" and navigated to "/"
    When I perform action "click:#trigger-button" and verify pod "test-pod" status changes to "Running"
    Then the UI should show "Operation successful" and the pod "test-pod" should be "Running"
