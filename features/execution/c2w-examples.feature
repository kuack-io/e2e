@execution
Feature: C2W Examples
  As a Kuack developer
  I want to make sure that c2w converted images can be executed on different nodes
  So that I can be confident that Kuack works with common c2w images

  Background:
    Given Agent is connected to Node

  Scenario Outline: Execute <image> on <target>
    When I deploy "<image>" pod with command "<command>" for "<target>"
    Then All pods execute successfully and logs contain "<expected_log>"
    And "<target>" pods are processed in "<target>"

    Examples:
      | target  | image                                            | command                                  | expected_log       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/python:3.14-alpine | python3 -c 'print(\"Python works\")'     | Python works       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/python:3.14-alpine | python3 -c 'print(\"Python works\")'     | Python works       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/busybox:latest     | sh -c 'echo Hello from BusyBox'          | Hello from BusyBox |
      | Agent   | ghcr.io/kuack-io/c2w-examples/busybox:latest     | sh -c 'echo Hello from BusyBox'          | Hello from BusyBox |
      | Cluster | ghcr.io/kuack-io/c2w-examples/node:24-alpine     | node -e 'console.log(\"NodeJS works\")'  | NodeJS works       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/node:24-alpine     | node -e 'console.log(\"NodeJS works\")'  | NodeJS works       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/ubuntu:24.04       | sh -c 'echo Ubuntu works'                | Ubuntu works       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/ubuntu:24.04       | sh -c 'echo Ubuntu works'                | Ubuntu works       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/alpine:latest      | sh -c 'echo Alpine works'                | Alpine works       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/alpine:latest      | sh -c 'echo Alpine works'                | Alpine works       |
