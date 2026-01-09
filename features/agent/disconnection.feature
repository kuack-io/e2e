Feature: Agent Disconnection
  As a Kuack user
  I want to be able to disconnect the Agent
  So that I can stop processing workloads

  Scenario: Disconnect agent manually
    Given Agent is connected to Node
    When I disconnect agent
    Then Agent status is disconnected
