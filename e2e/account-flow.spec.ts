import { expect, test } from "@playwright/test";
import { confirmUserByEmail, deleteUserByEmail, resetRateLimits } from "./db";
import { listEmails, waitForEmailLink } from "./email";
import { banner, expectNoHorizontalOverflow, signUp } from "./helpers";

// The account flow around sign up (docs/plans/account-flow-plan.md,
// slice 4 tests): an unconfirmed account cannot log in and lands on Check
// inbox with a fresh link, a used link never creates a second session, a
// dead link shows the banner with a working resend, a duplicate sign up
// looks exactly like a new one, and the resend cooldown holds.

const PASSWORD = "beaverbids-e2e";

test.describe("account flow", () => {
  let email = "";

  test.beforeEach(async () => {
    email = `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@beaverbids.test`;
    await resetRateLimits();
  });

  test.afterEach(async () => {
    await deleteUserByEmail(email);
  });

  test("an unconfirmed account cannot log in and gets a new link instead", async ({ page }) => {
    await signUp(page, { name: "E2E Unconfirmed", email, password: PASSWORD });
    await waitForEmailLink(email);

    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("PASSWORD", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/check-inbox");
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    // No session was created, and a second email went out.
    await page.goto("/opportunities");
    await page.waitForURL("**/sign-in");
    await waitForEmailLink(email, { after: 1 });
  });

  test("a wrong password on an unconfirmed account shows the one banner and reveals nothing", async ({ page }) => {
    await signUp(page, { name: "E2E Wrong", email, password: PASSWORD });
    await page.goto("/sign-in");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("PASSWORD", { exact: true }).fill("not-the-password-12");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(banner(page)).toHaveText(/that email and password do not match/i);
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("the confirmation link works once, then only redirects to log in", async ({ page, context }) => {
    await signUp(page, { name: "E2E Once", email, password: PASSWORD });
    const link = await waitForEmailLink(email);

    await page.goto(link);
    await page.waitForURL("**/questionnaire/basics");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/tell us about your company/i);

    // Same link, fresh browser: the address is confirmed, no session is
    // created, the person simply logs in.
    await context.clearCookies();
    await page.goto(link);
    await page.waitForURL("**/sign-in");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("PASSWORD", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/questionnaire/basics");
  });

  test("Check inbox moves on by itself once the link is opened in another tab", async ({ page, context }) => {
    await signUp(page, { name: "E2E Two Tabs", email, password: PASSWORD });
    const link = await waitForEmailLink(email);

    // Same browser, second tab: the link confirms the address and starts
    // the session there.
    const other = await context.newPage();
    await other.goto(link);
    await other.waitForURL("**/questionnaire/basics");

    // Back on the first tab, the page notices the session within one poll
    // and lands where the link did, with the pending cookie gone.
    await page.bringToFront();
    await page.waitForURL("**/questionnaire/basics", { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/tell us about your company/i);
    expect((await context.cookies()).find((cookie) => cookie.name === "bb_pending_email")).toBeUndefined();
    await other.close();
  });

  test("a dead link lands on Check inbox with the banner and a working resend", async ({ page }) => {
    await signUp(page, { name: "E2E Dead", email, password: PASSWORD });
    const link = await waitForEmailLink(email);
    const dead = link.replace(/token=[^&]+/, "token=not-a-real-token");

    await page.goto(dead);
    await page.waitForURL("**/check-inbox?error=link");
    await expect(banner(page)).toHaveText(/that link has expired or was already used/i);

    // The cooldown from the sign up is still running, so the button waits.
    await expect(page.getByRole("button", { name: "Send it again" })).toBeDisabled();
    await resetRateLimits();
    await page.reload();
    await page.getByRole("button", { name: "Send it again" }).click();
    await expect(banner(page).filter({ hasText: /sent\. give it a minute\./i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send it again" })).toBeDisabled();
    await waitForEmailLink(email, { after: 1 });
  });

  test("a second sign up with the same address looks exactly like the first", async ({ page }) => {
    const expectCheckInbox = async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/check your inbox/i);
      await expect(page.getByText(email, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Send it again" })).toBeDisabled();
      await expect(page.locator("body")).not.toContainText(/already (exists|has an account)|is taken/i);
      expect(banner(page)).toHaveCount(0);
    };

    await signUp(page, { name: "E2E Twice", email, password: PASSWORD });
    await expectCheckInbox();
    await waitForEmailLink(email);

    // Unconfirmed: the same screen and one more confirmation email.
    await resetRateLimits();
    await signUp(page, { name: "E2E Twice", email, password: "another-password-12" });
    await expectCheckInbox();
    await waitForEmailLink(email, { after: 1 });

    // Confirmed: the same screen again and no new email at all.
    await confirmUserByEmail(email);
    await resetRateLimits();
    await signUp(page, { name: "E2E Twice", email, password: "another-password-12" });
    await expectCheckInbox();
    await page.waitForTimeout(4_000);
    expect(await listEmails(email)).toHaveLength(2);
  });

  test("Check inbox opened cold asks for the address", async ({ page }) => {
    await page.goto("/check-inbox");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/check your inbox/i);
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send it again" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("the resend limit refuses the sixth attempt in an hour", async ({ page }) => {
    await signUp(page, { name: "E2E Limit", email, password: PASSWORD });
    await waitForEmailLink(email);
    for (let i = 0; i < 5; i++) {
      await clearCooldownOnly();
      await page.reload();
      await page.getByRole("button", { name: "Send it again" }).click();
      await expect(banner(page).filter({ hasText: /sent/i })).toBeVisible();
    }
    await clearCooldownOnly();
    await page.reload();
    await page.getByRole("button", { name: "Send it again" }).click();
    await expect(banner(page)).toHaveText(/too many tries/i);
  });
});

// Leaves the hourly resend limit in place and clears only the 60 second
// cooldown, so a spec can press "Send it again" several times quickly.
async function clearCooldownOnly() {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DELETE FROM "rateLimit" WHERE key LIKE 'app:resend:cooldown:%'`);
  } finally {
    await client.end();
  }
}
