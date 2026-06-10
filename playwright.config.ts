import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://peak-academy-kappa.vercel.app";
const isCI = Boolean(process.env.CI);
const TEACHER_AUTH_FILE = path.join(__dirname, ".auth/teacher.json");
const STUDENT_AUTH_FILE = path.join(__dirname, ".auth/student.json");
const PARENT_AUTH_FILE = path.join(__dirname, ".auth/parent.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"]
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      timeout: 120_000
    },
    {
      name: "landing",
      testMatch: /landing\/.*\.spec\.ts/,
      retries: isCI ? 2 : 1,
      // CSP strict-dynamic blocks Next.js chunks in headless without bypass
      use: { bypassCSP: true }
    },
    {
      name: "admin",
      testMatch: /admin\/(?!login\.).*\.spec\.ts/,
      retries: isCI ? 2 : 1,
      use: { bypassCSP: true }
    },
    {
      name: "login",
      testMatch: /admin\/login\.spec\.ts/,
      use: { bypassCSP: true }
    },
    {
      name: "teacher",
      testMatch: /teacher\/.*\.spec\.ts/,
      dependencies: ["setup"],
      timeout: 90_000,
      retries: isCI ? 2 : 1,
      use: {
        storageState: TEACHER_AUTH_FILE,
        bypassCSP: true
      }
    },
    {
      name: "student",
      testMatch: /student\/.*\.spec\.ts/,
      dependencies: ["setup"],
      timeout: 90_000,
      retries: isCI ? 2 : 1,
      use: {
        storageState: STUDENT_AUTH_FILE,
        bypassCSP: true
      }
    },
    {
      name: "parent",
      testMatch: /parent\/.*\.spec\.ts/,
      dependencies: ["setup"],
      timeout: 90_000,
      retries: isCI ? 2 : 1,
      use: {
        storageState: PARENT_AUTH_FILE,
        bypassCSP: true
      }
    }
  ]
});
