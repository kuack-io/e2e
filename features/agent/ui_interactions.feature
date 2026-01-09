@agent
Feature: Agent UI Interactions
  As a user
  I want to interact with the Agent UI controls
  So that I can manage the agent connection and view logs

  Background:
    Given I open agent UI

  Scenario: Clear logs button works
    Given I connect agent to node
    And Agent execution logs contain "WebSocket connection established"
    When I click the "Clear" button
    Then Agent execution logs should be empty

  Scenario: Initial button states
    Then "Connect" button should be enabled
    And "Disconnect" button should be disabled

  Scenario: Button states after connection
    When I connect agent to node
    Then "Connect" button should be disabled
    And "Disconnect" button should be enabled

  Scenario: Button states after disconnection
    Given I connect agent to node
    When I disconnect agent
    Then "Connect" button should be enabled
    And "Disconnect" button should be disabled

  Scenario: Initial password visibility
    Then Agent token should be hidden

  Scenario: Toggle password visibility
    When I check "Show" password checkbox
    Then Agent token should be visible

  Scenario: Hide password visibility through toggle
    Given I check "Show" password checkbox
    When I uncheck "Show" password checkbox
    Then Agent token should be hidden
