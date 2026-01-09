@execution
Feature: Agent Lifecycle and Handover
  As a Kuack user
  I want to verify that pod processing, counters, and agent handover work correctly
  So that I can trust the system stability

  Scenario: Pod counter resets on disconnection
    Given Agent has processed a workload
    When I disconnect and reconnect agent
    And I deploy Checker pod for Agent
    Then Agent executes Checker pod successfully
    And Agent shows 1 processed pods

  Scenario: Workload handover between agents
    Given Agent "agent-1" has processed a workload
    And I open agent "agent-2" UI
    When I switch workload from "agent-1" to "agent-2"
    And I deploy Checker pod for Agent
    Then Agent "agent-2" shows 1 processed pods
