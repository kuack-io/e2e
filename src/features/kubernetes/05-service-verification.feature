Feature: Service Verification
  As a test engineer
  I want to verify Kubernetes services
  So that I can ensure proper service configuration

  Scenario: Verify service exists and is accessible
    Given I apply the Kubernetes resource "manifests/test-service.yaml"
    When I wait for deployment "test-deployment" to be ready
    Then the service "test-service" should exist
    And I navigate to "http://test-service:8080"
    And I should see element "body"
