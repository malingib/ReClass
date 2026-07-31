import { test as setup } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';

const ADMIN = { email: 'admin@school.ac.ke', password: 'ReClass2026!' };
const authFile = 'playwright/.auth/user.json';

setup('authenticate admin once', async ({ page }) => {
  if (existsSync(authFile)) return;
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin/);
  await page.waitForLoadState('networkidle');
  mkdirSync('playwright/.auth', { recursive: true });
  await page.context().storageState({ path: authFile });
});
