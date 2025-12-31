Feature: Agent Connectivity
  As a Kuack user
  I want to make sure that Agent can connect to Node
  So that I can be confident that connectivity works

  Scenario: Agent can connect to Node
    Given I open agent UI
    When I click connect button
    Then Agent connects successfully

  Scenario: Node accepts connected agent
    Given I open agent UI
    When I click connect button
    Then Node accepts agent successfully
