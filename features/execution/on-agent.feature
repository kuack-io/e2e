Feature: Checker execution on Agent
  As a Kuack developer
  I want to make sure that Agent can execute payloads
  So that I can be confident that Kuack works

  Scenario: Agent executes Checker
    Given Agent is connected to Node
    When I deploy Checker pod for Agent
    Then Agent executes Checker pod successfully
    And Checker pod is processed on Agent
