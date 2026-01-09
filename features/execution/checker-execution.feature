Feature: Checker execution
  As a Kuack developer
  I want to make sure that checker can be executed on different nodes
  So that I can be confident that Kuack works

  Background:
    Given Agent is connected to Node

  Scenario: Agent executes Checker
    When I deploy Checker pod for Agent
    Then Agent executes Checker pod successfully
    And Agent shows 1 processed pods

  Scenario: Cluster executes Checker
    When I deploy Checker pod for Cluster
    Then Cluster executes Checker pod successfully
