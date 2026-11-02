import { expect, type Page } from "@playwright/test";

export const DEV_ACCOUNT = { email: "dev@beaverbids.test", password: "beaverbids-dev" };

export async function signIn(page: Page, { email, password } = DEV_ACCOUNT): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("PASSWORD", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(opportunities|questionnaire)/);
}

// Fills the create account form and lands on Check inbox. The account is
// unconfirmed until the link from the email is opened (e2e/email.ts).
export async function signUp(page: Page, { name, email, password }: { name: string; email: string; password: string }): Promise<void> {
  await page.goto("/create-account");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("PASSWORD", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/check-inbox");
}

// The first listing on the list page, as a link, in either layout.
export function firstTitleLink(page: Page) {
  return page.locator("main a[href^='/opportunities/']:visible").first();
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}

// The form banners (src/components/ui/banner.tsx). getByRole("alert") on
// its own also matches Next.js's route announcer, which is always present
// and empty.
export function banner(page: Page) {
  return page.locator('[data-slot="banner"]');
}
