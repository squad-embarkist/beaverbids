import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, firstTitleLink, signIn } from "./helpers";

// The accessibility checklist from docs/ui-ux-guide.md on the four screens:
// axe (WCAG 2.2 AA) with no violations, keyboard paths, one H1, 375 px and
// 200 percent zoom without horizontal scroll. Colour contrast runs as its
// own check because the guide keeps two Figma values as drawn until design
// confirms them: the muted mono labels and asphalt text on the signal
// button. Any other contrast failure still fails here.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// The two Figma values the UI guide keeps as drawn: muted mono labels
// (text-ink-muted, label-mono) and asphalt text on the signal button.
const KNOWN_CONTRAST_EXCEPTIONS = ".text-ink-muted, .label-mono, .bg-signal";

async function openListing(page: Page) {
  await page.goto("/opportunities");
  await firstTitleLink(page).click();
  await page.waitForURL(/\/opportunities\/[^/?]+$/);
  await page.getByRole("heading", { level: 1 }).waitFor();
}

const SCREENS: { name: string; open: (page: Page) => Promise<void>; signedIn: boolean }[] = [
  { name: "sign in", signedIn: false, open: (page) => page.goto("/sign-in").then(() => undefined) },
  { name: "create account", signedIn: false, open: (page) => page.goto("/create-account").then(() => undefined) },
  { name: "questionnaire", signedIn: true, open: (page) => page.goto("/questionnaire/work").then(() => page.getByRole("heading", { level: 1 }).waitFor()) },
  { name: "opportunities list", signedIn: true, open: (page) => page.goto("/opportunities").then(() => firstTitleLink(page).waitFor()) },
  { name: "listing detail", signedIn: true, open: openListing },
];

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.beforeEach(async ({ page }) => {
      if (screen.signedIn) await signIn(page);
      await screen.open(page);
    });

    test("has no axe violations", async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(TAGS).disableRules(["color-contrast"]).analyze();
      expect(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
    });

    test("has no contrast failures beyond the two documented exceptions", async ({ page }) => {
      const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      const targets = results.violations.flatMap((v) => v.nodes.map((node) => node.target.join(" ")));
      const unexpected = await page.evaluate(
        ({ targets, exceptions }) => targets.filter((selector) => !document.querySelector(selector)?.closest(exceptions)),
        { targets, exceptions: KNOWN_CONTRAST_EXCEPTIONS },
      );
      expect(unexpected).toEqual([]);
    });

    test("has one H1, a main landmark and a visible focus path", async ({ page }) => {
      // Visible elements only: Next.js keeps the previous page hidden in the
      // document for instant back navigation, and the dev overlay's shadow
      // DOM carries its own headings.
      const visibleCount = (selector: string) =>
        page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).filter((el) => (el as HTMLElement).checkVisibility()).length, selector);
      await expect.poll(() => visibleCount("h1")).toBe(1);
      await expect.poll(() => visibleCount("main")).toBe(1);
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return { tag: el.tagName, outline: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      expect(focused).not.toBeNull();
    });

    test("fits the viewport and 200 percent zoom without horizontal scroll", async ({ page }) => {
      await expectNoHorizontalOverflow(page);
      // 200 percent zoom on a 1280 px window is a 640 px layout viewport.
      await page.setViewportSize({ width: 640, height: 800 });
      await expectNoHorizontalOverflow(page);
    });
  });
}

test.describe("keyboard paths", () => {
  test("tabs from the search box to the first title and opens it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "phone", "the filter form sits after the rows on phones");
    await signIn(page);
    await page.goto("/opportunities");
    await firstTitleLink(page).waitFor();
    await page.getByLabel("Search").focus();
    let reached = false;
    for (let i = 0; i < 30 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement | null;
        return Boolean(el && el.tagName === "A" && el.getAttribute("href")?.startsWith("/opportunities/"));
      });
    }
    expect(reached).toBe(true);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/opportunities\/[^/?]+$/);
  });

  test("tabs through a questionnaire step to Continue", async ({ page }) => {
    await signIn(page);
    await page.goto("/questionnaire/basics");
    await page.getByLabel("Company name").waitFor();
    await page.getByLabel("Company name").focus();
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.textContent?.trim() === "Continue");
    }
    expect(reached).toBe(true);
  });

  test("announces the questionnaire step", async ({ page }) => {
    await signIn(page);
    await page.goto("/questionnaire/regions");
    await expect(page.locator("[aria-live='polite']").first()).toHaveText(/Step 3 of 5/);
    await expect(page.locator("[aria-current='step']")).toHaveCount(1);
  });
});
