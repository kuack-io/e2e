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
      | target  | image                                            | command                         | expected_log       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/python:3.14-alpine | print('Python 3.14 works')      | Python 3.14 works  |
      | Agent   | ghcr.io/kuack-io/c2w-examples/python:3.14-alpine | print('Python 3.14 works')      | Python 3.14 works  |
      | Cluster | ghcr.io/kuack-io/c2w-examples/busybox:latest     | echo Hello from BusyBox         | Hello from BusyBox |
      | Agent   | ghcr.io/kuack-io/c2w-examples/busybox:latest     | echo Hello from BusyBox         | Hello from BusyBox |
      | Cluster | ghcr.io/kuack-io/c2w-examples/node:24-alpine     | console.log('NodeJS v24 works') | NodeJS v24 works   |
      | Agent   | ghcr.io/kuack-io/c2w-examples/node:24-alpine     | console.log('NodeJS v24 works') | NodeJS v24 works   |
      | Cluster | ghcr.io/kuack-io/c2w-examples/ubuntu:24.04       | cat /etc/os-release             | Ubuntu 24.04       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/ubuntu:24.04       | cat /etc/os-release             | Ubuntu 24.04       |
      | Cluster | ghcr.io/kuack-io/c2w-examples/alpine:latest      | cat /etc/os-release             | Alpine Linux       |
      | Agent   | ghcr.io/kuack-io/c2w-examples/alpine:latest      | cat /etc/os-release             | Alpine Linux       |
