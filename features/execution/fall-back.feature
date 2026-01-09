@execution
Feature: Fallback Execution
  As a Kuack user
  I want to make sure that workload can run on regular nodes if Agent is missing
  So that my application is resilient

  Scenario: Pods go to regular node when Agent is disconnected
    Given Agent has processed a workload
    When I disconnect agent
    And I deploy Checker pod for Cluster
    Then Cluster executes Checker pod successfully
