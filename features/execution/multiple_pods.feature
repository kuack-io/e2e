@execution
Feature: Multiple Pods Execution
  As a Kuack user
  I want to make sure that the Agent can execute multiple pods
  So that I can run concurrent workloads

  Background:
    Given Agent is connected to Node

  Scenario: Agent executes multiple pods
    When I deploy 5 Checker pods for Agent
    Then Agent executes all 5 Checker pods successfully
    And Agent shows 5 processed pods
