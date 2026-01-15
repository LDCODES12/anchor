import { test, expect } from "@playwright/test"

test("landing page loads", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("GoalGrid")).toBeVisible()
})

test("signin page loads", async ({ page }) => {
  await page.goto("/auth/signin")
  await expect(page.getByText("Welcome back")).toBeVisible()
})

test("signup page loads", async ({ page }) => {
  await page.goto("/auth/signup")
  await expect(page.getByText("Create your account")).toBeVisible()
})
