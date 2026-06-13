import type { Page } from "@playwright/test";

/** Force scroll-reveal sections visible (IntersectionObserver is flaky in headless). */
export async function revealScrollSections(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".scroll-reveal").forEach((el) => {
      el.classList.add("visible");
    });
  });
}

export async function gotoLanding(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  await page
    .locator(".landing-hero")
    .getByRole("link", { name: /ابدأ رحلتك/ })
    .waitFor({ state: "visible", timeout: 30_000 });
  await revealScrollSections(page);
}

export async function scrollToSection(page: Page, selector: string) {
  const section = page.locator(selector);
  await section.scrollIntoViewIfNeeded();
  await revealScrollSections(page);
  await section.waitFor({ state: "visible", timeout: 15_000 });
}

/** Switch hero study level via tab buttons (all viewports). */
export async function selectStudyLevelDesktop(
  page: Page,
  level: "طالب إعدادي" | "طالب ثانوي"
) {
  await page
    .locator(".landing-hero [role='tablist']")
    .getByRole("tab", { name: level, exact: true })
    .click();
}

/** @deprecated Use selectStudyLevelDesktop — mobile now uses the same tab control. */
export async function selectStudyLevelMobile(
  page: Page,
  level: "طالب إعدادي" | "طالب ثانوي"
) {
  await selectStudyLevelDesktop(page, level);
}
