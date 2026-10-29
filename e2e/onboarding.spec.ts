import { expect, test } from "@playwright/test";
import { deleteUserByEmail } from "./db";
import { firstTitleLink } from "./helpers";

// The M3 acceptance test: create an account, answer the five steps with
// the sample profile's answers, land on the scored list, see the sample
// tender at 92, and open it. The worker scores the profile after the last
// save, so the list is polled until the score shows.

test.describe("onboarding", () => {
  let email = "";

  test.beforeEach(() => {
    email = `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@beaverbids.test`;
  });

  test.afterEach(async () => {
    await deleteUserByEmail(email);
  });

  test("signs up, completes the questionnaire and opens a scored listing", async ({ page }) => {
    await page.goto("/create-account");
    await page.getByLabel("Your name").fill("E2E Tester");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("beaverbids-e2e");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/questionnaire/basics");

    // Step 1
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/tell us about your company/i);
    await page.getByLabel("Company name").fill("Sample Technology Partners Inc.");
    await page.getByLabel("Website").fill("https://sample-technology.example.com");
    await page.getByLabel("Head office province").selectOption("ON");
    await page.getByLabel("6 to 10 people").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/questionnaire/work");

    // Step 2, with a validation round trip first
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert").first()).toHaveText(/choose at least one category/i);
    for (const label of ["IT managed services and cloud", "Cybersecurity and data protection", "Custom software and enterprise SaaS"]) {
      await page.getByLabel(label).check();
    }
    for (const label of ["Municipal government", "Provincial government", "Health authorities and hospitals", "Crown corporations and utilities"]) {
      await page.getByLabel(label).check();
    }
    await page.getByLabel("The work you most want to win").fill("Managed IT, cloud migrations and security assessments for public sector teams of 200 to 2,000 staff.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/questionnaire/regions");

    // Step 3
    await page.getByLabel("Ontario").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/questionnaire/size");

    // Step 4
    await page.getByLabel("Smallest contract you would bid on").fill("250,000");
    await page.getByLabel("Largest contract you would bid on").fill("3000000");
    await page.getByLabel("Days you need to prepare a bid").fill("10");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/questionnaire/credentials");

    // Step 5
    await page.getByLabel("Other certifications").fill("SOC 2 Type II");
    await page.getByRole("button", { name: "See my opportunities" }).click();
    await page.waitForURL("**/opportunities");

    // The worker scores the profile within seconds; poll the list until the
    // sample tender shows its 92.
    const sampleRow = page.locator("main").getByText("IT Managed Services and Cloud Infrastructure Support").first();
    await expect
      .poll(
        async () => {
          await page.reload();
          await page.getByRole("heading", { level: 1 }).waitFor();
          return (await sampleRow.count()) > 0 && (await page.locator("main").getByText("92", { exact: true }).count()) > 0;
        },
        { timeout: 60_000, intervals: [1_000, 2_000, 3_000] },
      )
      .toBe(true);

    await expect(firstTitleLink(page)).toHaveText("IT Managed Services and Cloud Infrastructure Support");
    await firstTitleLink(page).click();
    await page.waitForURL(/\/opportunities\/[^/?]+$/);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/IT Managed Services and Cloud Infrastructure Support/i);
    await expect(page.locator("[aria-labelledby='score-panel']").getByText("92", { exact: true })).toBeVisible();
    const meters = page.getByRole("meter");
    await expect(meters).toHaveCount(5);
    await expect(meters.first()).toHaveAttribute("aria-valuenow", "38");
    await expect(meters.first()).toHaveAttribute("aria-valuemax", "40");
    await expect(page.getByText("38 / 40")).toBeVisible();
    for (const heading of ["In your favour", "Gaps to close", "Could rule you out"]) {
      await expect(page.getByRole("heading", { level: 3, name: heading })).toBeVisible();
    }
    const notice = page.getByRole("link", { name: /Open the notice on/ });
    await expect(notice).toHaveAttribute("target", "_blank");
    await expect(notice).toHaveAttribute("rel", /noopener/);
  });
});
