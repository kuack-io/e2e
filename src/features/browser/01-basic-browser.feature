Feature: Basic Browser Operations
  As a test engineer
  I want to interact with a web application
  So that I can verify UI behavior

  Scenario: Navigate to a page and verify content
    Given I navigate to "/"
    Then I should see element "body"
