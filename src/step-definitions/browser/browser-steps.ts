import { CustomWorld } from "../../framework/world";
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I navigate to {string}", async function (this: CustomWorld, url: string) {
  const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
  await this.page!.goto(fullUrl, { waitUntil: "networkidle" });
});

Given("I am on the {string} page", async function (this: CustomWorld, pageName: string) {
  const pageMap: Record<string, string> = {
    home: "/",
    dashboard: "/dashboard",
    login: "/login",
  };
  const path = pageMap[pageName.toLowerCase()] || `/${pageName}`;
  await this.page!.goto(`${this.baseUrl}${path}`, { waitUntil: "networkidle" });
});

When("I click on {string}", async function (this: CustomWorld, selector: string) {
  await this.page!.click(selector);
});

When("I fill {string} with {string}", async function (this: CustomWorld, selector: string, value: string) {
  await this.page!.fill(selector, value);
});

When("I submit the form", async function (this: CustomWorld) {
  await this.page!.press("body", "Enter");
});

When("I wait for {int} seconds", async function (this: CustomWorld, seconds: number) {
  await this.page!.waitForTimeout(seconds * 1000);
});

Then("I should see {string}", async function (this: CustomWorld, text: string) {
  await expect(this.page!.locator(`text=${text}`)).toBeVisible();
});

Then("I should see element {string}", async function (this: CustomWorld, selector: string) {
  await expect(this.page!.locator(selector)).toBeVisible();
});

Then("the page title should contain {string}", async function (this: CustomWorld, titleText: string) {
  const title = await this.page!.title();
  expect(title).toContain(titleText);
});

Then("the URL should contain {string}", async function (this: CustomWorld, urlPart: string) {
  const url = this.page!.url();
  expect(url).toContain(urlPart);
});

Then("I should not see {string}", async function (this: CustomWorld, text: string) {
  await expect(this.page!.locator(`text=${text}`)).not.toBeVisible();
});

// Multiple browser instance management steps

Given("I have {int} browser instances", async function (this: CustomWorld, count: number) {
  // Ensure default browser exists
  if (!this.browser) {
    await this.initBrowser();
  }

  // Create additional browser instances
  for (let i = 1; i < count; i++) {
    await this.createBrowserInstance(`browser-${i}`);
  }
});

Given("I create a browser instance named {string}", async function (this: CustomWorld, name: string) {
  await this.createBrowserInstance(name);
});

Given("I navigate to {string} in browser {string}", async function (this: CustomWorld, url: string, browserName: string) {
  const instance = this.getBrowserInstance(browserName);
  if (!instance) {
    throw new Error(`Browser instance "${browserName}" not found`);
  }
  const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
  await instance.page.goto(fullUrl, { waitUntil: "networkidle" });
});

When("I click on {string} in browser {string}", async function (this: CustomWorld, selector: string, browserName: string) {
  const instance = this.getBrowserInstance(browserName);
  if (!instance) {
    throw new Error(`Browser instance "${browserName}" not found`);
  }
  await instance.page.click(selector);
});

Then("I should see {string} in browser {string}", async function (this: CustomWorld, text: string, browserName: string) {
  const instance = this.getBrowserInstance(browserName);
  if (!instance) {
    throw new Error(`Browser instance "${browserName}" not found`);
  }
  await expect(instance.page.locator(`text=${text}`)).toBeVisible();
});
