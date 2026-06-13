import { test, expect } from "@playwright/test";
import {
  gotoLanding,
  revealScrollSections,
  scrollToSection,
  selectStudyLevelDesktop
} from "../helpers/landing-page";

test.describe("Landing Page — Hero Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
  });

  test("الصفحة بتفتح وعنوان الـ tab صح", async ({ page }) => {
    await expect(page).toHaveTitle(/Peak Academy/);
  });

  test('الـ Hero heading الرئيسي ظاهر ("مش بس حصص")', async ({ page }) => {
    await expect(page.getByText("مش بس حصص", { exact: true })).toBeVisible();
  });

  test('الـ hero sub-text ظاهر ("ده مستقبلك")', async ({ page }) => {
    await expect(page.getByText("ده مستقبلك")).toBeVisible();
  });

  test('زر "ابدأ رحلتك" ظاهر وشغّال', async ({ page }) => {
    const cta = page.getByRole("link", { name: /ابدأ رحلتك/ });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('زر "استكشف المناهج" ظاهر وشغّال', async ({ page }) => {
    const explore = page.getByRole("link", { name: "استكشف المناهج" });
    await expect(explore).toBeVisible();
    await expect(explore).toHaveAttribute("href", "#levels");
    await explore.click();
    await expect(page.locator("#levels")).toBeInViewport();
  });

  test("الـ hero لا يعرض نسبة خصم تلقائياً", async ({ page }) => {
    await expect(page.locator(".landing-hero").getByText(/خصم\s*\d+/)).toHaveCount(0);
  });

  test('أزرار اختيار المرحلة ("طالب إعدادي" و "طالب ثانوي") ظاهرين', async ({
    page
  }) => {
    await expect(page.getByRole("tab", { name: "طالب إعدادي" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "طالب ثانوي" })).toBeVisible();
  });

  test('الضغط على "طالب ثانوي" يغيّر الـ active state', async ({ page }) => {
    const registerLink = page.getByRole("link", { name: /ابدأ رحلتك/ });
    await expect(registerLink).toHaveAttribute("href", "/auth/register?level=prep");
    await selectStudyLevelDesktop(page, "طالب ثانوي");
    await expect(registerLink).toHaveAttribute("href", "/auth/register?level=sec");
  });

  test('الضغط على "طالب إعدادي" يرجع الـ active state', async ({ page }) => {
    const registerLink = page.getByRole("link", { name: /ابدأ رحلتك/ });
    await selectStudyLevelDesktop(page, "طالب ثانوي");
    await expect(registerLink).toHaveAttribute("href", "/auth/register?level=sec");
    await selectStudyLevelDesktop(page, "طالب إعدادي");
    await expect(registerLink).toHaveAttribute("href", "/auth/register?level=prep");
  });
});

test.describe("Landing Page — Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
  });

  test("الـ navbar ظاهر", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByLabel("Peak Academy").first()).toBeVisible();
  });

  test('لينك "المناهج" موجود ويـ scroll للـ section الصح', async ({ page }) => {
    const link = page.locator("header").getByRole("link", { name: "المناهج" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/#levels/);
    await expect(page.locator("#levels")).toBeInViewport();
  });

  test('لينك "المميزات" موجود ويـ scroll لـ #features', async ({ page }) => {
    const link = page.locator("header").getByRole("link", { name: "المميزات" });
    await link.click();
    await revealScrollSections(page);
    await expect(page).toHaveURL(/#features/);
    await expect(page.locator("#features")).toBeInViewport();
  });

  test('لينك "الأسعار" موجود ويـ scroll لـ #pricing', async ({ page }) => {
    const link = page.locator("header").getByRole("link", { name: "الأسعار" });
    await link.click();
    await revealScrollSections(page);
    await expect(page).toHaveURL(/#pricing/);
    await expect(page.locator("#pricing")).toBeInViewport();
  });

  test('لينك "كيف تبدأ" موجود', async ({ page }) => {
    const link = page.locator("header").getByRole("link", { name: "كيف تبدأ" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "#how");
  });

  test('زر "تسجيل الدخول" في الـ nav موجود ورابطه /auth/login', async ({ page }) => {
    const login = page.locator("header").getByRole("link", { name: "تسجيل الدخول" });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", "/auth/login");
  });

  test('زر "ابدأ الآن" في الـ nav موجود ورابطه /auth/register', async ({ page }) => {
    const register = page.locator("header").getByRole("link", { name: "ابدأ الآن" });
    await expect(register).toBeVisible();
    await expect(register).toHaveAttribute("href", "/auth/register");
  });
});

test.describe("Landing Page — Stats Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await scrollToSection(page, ".landing-section-light .scroll-reveal");
  });

  test("الـ stats section ظاهرة (مش فاضية)", async ({ page }) => {
    await expect(page.getByText("لوحات متخصصة")).toBeVisible();
    await expect(page.getByText("معلّم معتمد")).toBeVisible();
  });

  test("فيها على الأقل 4 stat cards", async ({ page }) => {
    const cards = page.locator(".landing-section-light .scroll-reveal.grid > div");
    await expect(cards).toHaveCount(4);
  });

  test("كل card فيها icon وعنوان", async ({ page }) => {
    const titles = ["لوحات متخصصة", "معلّم معتمد", "جلسة لايف شهرياً", "تبدأ من 80 جنيه"];
    for (const title of titles) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.locator(".landing-section-light .material-symbols-outlined")).toHaveCount(4);
  });

  test("الـ icons ظاهرة (مش broken)", async ({ page }) => {
    const stats = page.locator(".landing-section-light .scroll-reveal");
    const icons = stats.locator(".material-symbols-outlined");
    await expect(icons).toHaveCount(4);
    for (const icon of ["groups", "schedule", "live_tv", "payments"]) {
      await expect(stats.locator(".material-symbols-outlined", { hasText: icon })).toBeVisible();
    }
  });
});

test.describe("Landing Page — How It Works Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await scrollToSection(page, "#how");
  });

  test('section id="how" ظاهر', async ({ page }) => {
    await expect(page.locator("#how")).toBeVisible();
  });

  test('العنوان "كيف تبدأ رحلة القمة؟" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: /كيف تبدأ رحلة القمة/ })).toBeVisible();
  });

  test("4 خطوات ظاهرة", async ({ page }) => {
    const steps = page.locator("#how h4");
    await expect(steps).toHaveCount(4);
  });

  for (const stepTitle of ["سجّل حسابك", "اختر مرحلتك", "احجز حصتك", "انطلق للقمة"]) {
    test(`${stepTitle} ظاهر`, async ({ page }) => {
      await expect(page.getByText(stepTitle, { exact: true })).toBeVisible();
    });
  }
});

test.describe("Landing Page — Features Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await scrollToSection(page, "#features");
  });

  test('section id="features" ظاهر', async ({ page }) => {
    await expect(page.locator("#features")).toBeVisible();
  });

  test('العنوان "لماذا تختار Peak Academy؟" ظاهر', async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /لماذا تختار.*Peak Academy/ })
    ).toBeVisible();
  });

  for (const feature of [
    "اهتمام شخصي وتفاعل حقيقي",
    "حصص مباشرة",
    "تقارير المتابعة",
    "محتوى حصري",
    "تكلفة ذكية"
  ]) {
    test(`${feature} ظاهر`, async ({ page }) => {
      await expect(page.getByRole("heading", { name: feature })).toBeVisible();
    });
  }

  test("الـ icons (material-symbols-outlined) مش broken", async ({ page }) => {
    const icons = page.locator("#features .material-symbols-outlined");
    expect(await icons.count()).toBeGreaterThanOrEqual(5);
    await expect(icons.first()).toBeVisible();
  });
});

test.describe("Landing Page — Pricing Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await scrollToSection(page, "#pricing");
  });

  test('section id="pricing" ظاهر', async ({ page }) => {
    await expect(page.locator("#pricing")).toBeVisible();
  });

  test('العنوان "استثمارك في مستقبلك" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: /استثمارك في مستقبلك/ })).toBeVisible();
  });

  test("فيه على الأقل 2 pricing cards", async ({ page }) => {
    const cards = page.locator("#pricing .grid > div.rounded-3xl");
    expect(await cards.count()).toBeGreaterThanOrEqual(2);
  });

  test("كل card فيها سعر وقائمة features وCTA", async ({ page }) => {
    const cards = page.locator("#pricing .grid > div.rounded-3xl");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < Math.min(count, 4); i += 1) {
      const card = cards.nth(i);
      await expect(card.locator("ul li").first()).toBeVisible();
      await expect(card.getByRole("link").first()).toBeVisible();
    }
  });

  test("الـ featured plan ظاهر ومتميّز", async ({ page }) => {
    await expect(page.getByText("الأكثر طلباً")).toBeVisible();
    await expect(page.locator("#pricing .landing-card-accent-featured")).toBeVisible();
  });

  test("الـ features list مش فاضية (✓ items موجودة)", async ({ page }) => {
    const checks = page.locator("#pricing ul li span.text-landing-orange");
    expect(await checks.count()).toBeGreaterThanOrEqual(2);
  });

  test("لينكات الـ CTA بتوجّه لـ /auth/register", async ({ page }) => {
    const ctas = page.locator("#pricing").getByRole("link");
    const count = await ctas.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i += 1) {
      await expect(ctas.nth(i)).toHaveAttribute("href", /\/auth\/register/);
    }
  });
});

test.describe("Landing Page — Testimonials Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("heading", { name: /قصص نجاح/ }).scrollIntoViewIfNeeded();
    await revealScrollSections(page);
  });

  test("section الـ testimonials ظاهرة", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /قصص نجاح ملهمة/ })).toBeVisible();
  });

  test('العنوان "قصص نجاح ملهمة" ظاهر', async ({ page }) => {
    await expect(page.getByText("قصص نجاح")).toBeVisible();
    await expect(page.getByText("ملهمة")).toBeVisible();
  });

  test("3 testimonial cards ظاهرة", async ({ page }) => {
    await expect(page.getByText("أحمد محمد", { exact: true })).toBeVisible();
    await expect(page.getByText("سارة علي", { exact: true })).toBeVisible();
    await expect(page.getByText("محمود سامي", { exact: true })).toBeVisible();
  });

  for (const name of ["أحمد محمد", "سارة علي", "محمود سامي"]) {
    test(`${name} ظاهر`, async ({ page }) => {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    });
  }

  test("كل card فيها quote text", async ({ page }) => {
    await expect(page.getByText(/تجربة الأونلاين في Peak Academy/)).toBeVisible();
    await expect(page.getByText(/المدرسون رائعون جداً/)).toBeVisible();
    await expect(page.getByText(/ساعدتني المنصة على تنظيم وقتي/)).toBeVisible();
  });
});

test.describe("Landing Page — Footer", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await page.locator("footer").scrollIntoViewIfNeeded();
    await revealScrollSections(page);
  });

  test("الـ footer ظاهر", async ({ page }) => {
    await expect(page.locator("footer")).toBeVisible();
  });

  test('الـ footer فيه logo أو اسم "Peak Academy"', async ({ page }) => {
    const footer = page.locator("footer");
    const visibleLogo = footer.locator('a[aria-label="Peak Academy"]').locator("visible=true");
    await expect(visibleLogo.first()).toBeVisible();
    await expect(footer).toContainText("Peak Academy");
  });

  test("الـ footer فيه رؤيتنا text كامل (مش مقطوع)", async ({ page }) => {
    const vision = footerVision(page);
    await expect(vision).toBeVisible();
    await expect(vision).toContainText("رؤيتنا تمكين كل طالب");
    await expect(vision).toContainText("يتجاوز الحدود التقليدية.");
  });

  test('section "المنصة" موجود مع الروابط المطلوبة', async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByRole("heading", { name: "المنصة" })).toBeVisible();
    for (const label of ["إنشاء حساب", "تسجيل الدخول", "الأسعار", "المناهج"]) {
      await expect(footer.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test('section "القانونية" موجود مع الروابط المطلوبة', async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByRole("heading", { name: "القانونية" })).toBeVisible();
    for (const label of ["سياسة الخصوصية", "الشروط والأحكام", "تواصل معنا"]) {
      await expect(footer.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test('copyright text "Peak Academy" والسنة ظاهر', async ({ page }) => {
    const year = new Date().getFullYear().toString();
    await expect(page.locator("footer")).toContainText(`Peak Academy`);
    await expect(page.locator("footer")).toContainText(year);
  });

  test('لينك "إنشاء حساب" في الـ footer رابطه /auth/register', async ({ page }) => {
    await expect(page.locator("footer").getByRole("link", { name: "إنشاء حساب" })).toHaveAttribute(
      "href",
      "/auth/register"
    );
  });

  test('لينك "تسجيل الدخول" في الـ footer رابطه /auth/login', async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "تسجيل الدخول" })
    ).toHaveAttribute("href", "/auth/login");
  });

  test('لينك "سياسة الخصوصية" رابطه /privacy', async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "سياسة الخصوصية" })
    ).toHaveAttribute("href", "/privacy");
  });

  test('لينك "الشروط والأحكام" رابطه /terms', async ({ page }) => {
    await expect(
      page.locator("footer").getByRole("link", { name: "الشروط والأحكام" })
    ).toHaveAttribute("href", "/terms");
  });
});

test.describe("Landing Page — CTA Section", () => {
  test.beforeEach(async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("heading", { name: /هل أنت مستعد/ }).scrollIntoViewIfNeeded();
    await revealScrollSections(page);
  });

  test("الـ CTA section ظاهر", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /هل أنت مستعد.*للقمة/ })).toBeVisible();
  });

  test('لينك التسجيل في الـ CTA موجود ويوجّه لـ /auth/register', async ({ page }) => {
    const register = page.getByRole("link", { name: /سجّل الآن مجاناً/ });
    await expect(register).toBeVisible();
    await expect(register).toHaveAttribute("href", "/auth/register");
  });
});

function footerVision(page: import("@playwright/test").Page) {
  return page.locator("footer p").filter({ hasText: "رؤيتنا" });
}
