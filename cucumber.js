// https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['dist/**/*.js'],
    format: [
      'progress-bar',
      'summary',
      '@cucumber/pretty-formatter',
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
