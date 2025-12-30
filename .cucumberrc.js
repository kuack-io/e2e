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
    worldParameters: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      namespace: process.env.NAMESPACE, // Namespace will be generated per test
      kubeconfig: process.env.KUBECONFIG,
    },
  },
};
