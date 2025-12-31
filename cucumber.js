// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['src/**/*.ts'],
    requireModule: ['tsx'],
    format: [
      'progress-bar',
      'summary',
      'allure-cucumberjs/reporter',
      'html:allure-results/cucumber-report.html',
    ],
    formatOptions: {
      colorsEnabled: true,
      snippetInterface: 'async-await',
    },
    backtrace: true,
  },
};
