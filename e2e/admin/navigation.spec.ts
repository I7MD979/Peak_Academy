import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES, SIDEBAR_LINKS } from "../helpers/test-data";

test.describe("Admin sidebar navigation", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    if (!page.url().includes(ROUTES.dashboard)) {
      await admin.goTo("dashboard");
    }
  });

  test("كل روابط الشريط الجانبي ظاهرة", async () => {
    for (const { label } of SIDEBAR_LINKS) {
      await expect(admin.sidebarLink(label)).toBeVisible();
    }
  });

  for (const { label, route } of SIDEBAR_LINKS) {
    test(`${label} → ${ROUTES[route]}`, async ({ page }) => {
      await admin.navigateViaSidebar(label, ROUTES[route]);
      await expect(page).toHaveURL(new RegExp(ROUTES[route].replace(/\//g, "\\/")));
    });
  }
});
