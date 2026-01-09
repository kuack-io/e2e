Feature: Multiple Agents
  As a Kuack user
  I want to make sure that multiple Agents can connect to the same Node
  So that I can scale my cluster capacity

  Scenario: Two agents connect to the same Node
    Given I open agent "agent-1" UI
    And I open agent "agent-2" UI
    When I connect agent "agent-1" to node
    And I connect agent "agent-2" to node
    Then Agent "agent-1" connects successfully
    And Agent "agent-2" connects successfully
