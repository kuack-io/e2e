#!/bin/bash

# Run the tests and capture exit code
EXIT_CODE=0
npm run test:parallel || EXIT_CODE=$?
echo "Generating Allure report"
npm run report:generate
exit $EXIT_CODE
