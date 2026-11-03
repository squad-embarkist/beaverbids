import { expect, test, type Page } from "@playwright/test";
import { confirmUserByEmail, deleteUserByEmail, expireResetLinks, issueResetLink, resetRateLimits } from "./db";
import { listEmails, waitForEmailLink } from "./email";
import { banner, signIn, signUp } from "./helpers";

// The password reset (docs/plans/account-flow-plan.md, slice 5): a full
// reset through the file transport that signs out an older session, an
// expired link, a used link, an unknown address that gets the same screen
// and no email, an unconfirmed account that gets the confirmation email
// instead, and the field errors on Set new password.

const OLD_PASSWORD = "beaverbids-e2e-old";
const NEW_PASSWORD = "beaverbids-e2e-new";
const RESET_SUBJECT = /reset your beaverbids password/i;

async function requestReset(page: Page, email: string): Promise<void> {
  await page.goto("/forgot-password");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(banner(page).filter({ hasText: /a reset link is on its way/i })).toContainText(email);
  // The drawn note stays, and the form stays for a second submit.
  await expect(banner(page).filter({ hasText: /same message whether or not/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
}

async function expectDeadLink(page: Page): Promise<void> {
  await expect(banner(page)).toHaveText(/that link has expired or was already used/i);
  await expect(page.getByRole("link", { name: "Send me a new one" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByLabel("NEW PASSWORD")).toHaveCount(0);
}

test.describe("password reset", () => {
  let email = "";

  test.beforeEach(async () => {
    email = `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@beaverbids.test`;
    await resetRateLimits();
  });

  test.afterEach(async () => {
    await deleteUserByEmail(email);
  });

  test("resets the password end to end, signs out the old session, and the link dies", async ({ page, browser }, testInfo) => {
    await signUp(page, { name: "E2E Reset", email, password: OLD_PASSWORD });
    await confirmUserByEmail(email);

    // An older session on another device.
    const olderDevice = await browser.newContext();
    const olderPage = await olderDevice.newPage();
    await signIn(olderPage, { email, password: OLD_PASSWORD });

    await requestReset(page, email);
    const link = await waitForEmailLink(email, { subject: RESET_SUBJECT });
    await page.goto(link);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/set a new password/i);
    if (testInfo.project.name === "desktop") {
      await expect(page.getByText(email, { exact: true })).toBeVisible();
      await expect(page.getByText(/expires in \d+ min/i)).toBeVisible();
    }
    await page.getByLabel("NEW PASSWORD").fill(NEW_PASSWORD);
    await page.getByLabel("TYPE IT AGAIN").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Save and log me in" }).click();

    // Not signed in: Log in with the saved banner.
    await page.waitForURL("**/sign-in?reset=done");
    await expect(banner(page)).toHaveText(/password saved/i);
    await page.goto("/opportunities");
    await page.waitForURL(/\/sign-in/);

    // The older device is out on its next navigation.
    await olderPage.goto("/opportunities");
    await olderPage.waitForURL(/\/sign-in/);
    await olderDevice.close();

    // The old password is gone, the new one works.
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("PASSWORD", { exact: true }).fill(OLD_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(banner(page)).toHaveText(/do not match/i);
    await signIn(page, { email, password: NEW_PASSWORD });

    // The same link a second time.
    await page.goto(link);
    await expectDeadLink(page);
  });

  test("an expired link shows the banner with a way to ask for a new one", async ({ page }) => {
    await signUp(page, { name: "E2E Expired", email, password: OLD_PASSWORD });
    await confirmUserByEmail(email);
    await requestReset(page, email);
    const link = await waitForEmailLink(email, { subject: RESET_SUBJECT });
    await expireResetLinks(email);

    await page.goto(link);
    await expectDeadLink(page);
    await page.getByRole("link", { name: "Send me a new one" }).click();
    await page.waitForURL("**/forgot-password");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/send me a link/i);
  });

  test("an unknown address gets the same screen and no email", async ({ page }) => {
    await requestReset(page, email);
    await page.waitForTimeout(3_000);
    expect(await listEmails(email)).toHaveLength(0);
  });

  test("an unconfirmed account gets the confirmation email again, never a reset", async ({ page }) => {
    await signUp(page, { name: "E2E Unconfirmed Reset", email, password: OLD_PASSWORD });
    await waitForEmailLink(email, { subject: /confirm your email/i });
    // Sign up started the resend cooldown; the request respects it.
    await resetRateLimits();

    await requestReset(page, email);
    await waitForEmailLink(email, { after: 1, subject: /confirm your email/i });
    await page.waitForTimeout(2_000);
    const messages = await listEmails(email);
    expect(messages).toHaveLength(2);
    expect(messages.some((m) => RESET_SUBJECT.test(m.subject))).toBe(false);
  });

  test("errors sit under the fields and the old password again is refused and still works", async ({ page }) => {
    await signUp(page, { name: "E2E Fields", email, password: OLD_PASSWORD });
    await confirmUserByEmail(email);
    // The link comes straight from the database here: this case is about
    // the form, and the email round trip is covered above.
    await page.goto(await issueResetLink(email));

    const password = page.getByLabel("NEW PASSWORD");
    const confirm = page.getByLabel("TYPE IT AGAIN");
    const save = page.getByRole("button", { name: "Save and log me in" });

    await password.fill("short");
    await confirm.fill("short");
    await save.click();
    await expect(page.locator("#password-error")).toHaveText(/use at least 12 characters/i);

    await password.fill(NEW_PASSWORD);
    await confirm.fill(`${NEW_PASSWORD}-typo`);
    await save.click();
    await expect(page.locator("#confirm-error")).toHaveText(/both boxes need the same password/i);
    await expect(page.locator("#password-error")).toHaveCount(0);

    await password.fill(OLD_PASSWORD);
    await confirm.fill(OLD_PASSWORD);
    await save.click();
    await expect(page.locator("#password-error")).toHaveText(/your last password/i);
    await expect(page).toHaveURL(/\/reset-password/);

    // Nothing was saved: the old password still logs in.
    await signIn(page, { email, password: OLD_PASSWORD });
  });
});
