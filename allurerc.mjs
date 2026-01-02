import { defineConfig } from "allure";

// https://allurereport.org/docs/v3/configure/
export default defineConfig({
  name: "Kuack E2E Tests",
  appendHistory: false,
  plugins: {
    awesome: {
      // https://allurereport.org/docs/v3/configure/#_10-plugin-options
      options: {
        singleFile: true,
        theme: "auto", // follow system light/dark mode
      },
    },
  },
});
