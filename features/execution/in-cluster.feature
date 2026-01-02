Feature: Checker execution in Cluster
  As a Kuack developer
  I want to make sure that Agent can execute payloads
  So that I can be confident that Kuack works

  Scenario: Checker is executed in cluster
    Given Agent is connected to Node
    When I deploy Checker pod for cluster
    Then Checker pod is executed successfully
    And Checker pod is processed in cluster
