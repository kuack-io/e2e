@execution
Feature: Mixed Workload Execution
  As a Kuack user
  I want to be able to execute pods both on Agent and Cluster simultaneously
  So that I can use hybrid infrastructure

  Background:
    Given Agent is connected to Node

  Scenario: Mixed workload execution
    When I deploy mixed workload of 2 Agent pods and 2 Cluster pods
    Then All pods execute successfully
    And Agent pods are processed on Agent
    And Cluster pods are processed in Cluster
