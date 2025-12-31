Feature: Agent Connectivity
  As a Kuack user
  I want to make sure that Agent can connect to Node
  So that I can be confident that connectivity works

  Scenario: Agent can connect to Node
    Given I open agent UI
    When I connect agent to node
    Then Agent connects successfully

  Scenario: Node accepts connected agent
    Given I open agent UI
    When I connect agent to node
    Then Node accepts agent successfully
