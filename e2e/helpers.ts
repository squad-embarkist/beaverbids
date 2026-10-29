import { expect, type Page } from "@playwright/test";

export const DEV_ACCOUNT = { email: "dev@beaverbids.test", password: "beaverbids-dev" };

export async function signIn(page: Page, { email, password } = DEV_ACCOUNT): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(opportunities|questionnaire)/);
}

// The first listing on the list page, as a link, in either layout.
export function firstTitleLink(page: Page) {
  return page.locator("main a[href^='/opportunities/']:visible").first();
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}
