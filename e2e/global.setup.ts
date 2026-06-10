import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { waitForParentShell } from "./helpers/parent-auth";
import { waitForStudentShell } from "./helpers/student-auth";
import { waitForTeacherShell } from "./helpers/teacher-auth";
import { PARENT_CREDENTIALS, STUDENT_CREDENTIALS, TEACHER_CREDENTIALS } from "./helpers/test-data";

const AUTH_DIR = path.join(__dirname, "../.auth");
const TEACHER_AUTH_FILE = path.join(AUTH_DIR, "teacher.json");
const STUDENT_AUTH_FILE = path.join(AUTH_DIR, "student.json");
const PARENT_AUTH_FILE = path.join(AUTH_DIR, "parent.json");

setup("authenticate as teacher", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/auth/login");
  await page.waitForLoadState("load");
  await page.getByRole("textbox", { name: "البريد الإلكتروني" }).fill(TEACHER_CREDENTIALS.email);
  await page.getByRole("textbox", { name: "كلمة المرور" }).fill(TEACHER_CREDENTIALS.password);
  await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });

  await waitForTeacherShell(page);

  await page.context().storageState({ path: TEACHER_AUTH_FILE });
});

setup("authenticate as student", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/auth/login");
  await page.waitForLoadState("load");
  await page.getByRole("textbox", { name: "البريد الإلكتروني" }).fill(STUDENT_CREDENTIALS.email);
  await page.getByRole("textbox", { name: "كلمة المرور" }).fill(STUDENT_CREDENTIALS.password);
  await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });

  await waitForStudentShell(page);

  await page.context().storageState({ path: STUDENT_AUTH_FILE });
});

setup("authenticate as parent", async ({ page }) => {
  mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/auth/login");
  await page.waitForLoadState("load");
  await page.getByRole("textbox", { name: "البريد الإلكتروني" }).fill(PARENT_CREDENTIALS.email);
  await page.getByRole("textbox", { name: "كلمة المرور" }).fill(PARENT_CREDENTIALS.password);
  await page.getByRole("button", { name: /تسجيل الدخول/ }).click();

  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });

  await waitForParentShell(page);

  await page.context().storageState({ path: PARENT_AUTH_FILE });
});
