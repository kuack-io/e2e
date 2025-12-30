import { AllureRuntime, AllureConfig } from 'allure-js-commons';

const config: AllureConfig = {
  resultsDir: './allure-results',
  testMapper: (test) => {
    // Map test results to Allure format
    return test;
  },
};

export default config;
