module.exports = {
  default: {
    require: ['dist/step-definitions/**/*.js', 'dist/framework/**/*.js'],
    format: [
      'progress-bar',
      'json:allure-results/cucumber-report.json',
      'message:allure-results/cucumber-messages.ndjson',
      'html:allure-results/cucumber-report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
  },
};
