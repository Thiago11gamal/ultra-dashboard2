import { test, expect } from '@playwright/test';

test.describe('evolution smoke', () => {
  test('app boots and renders main root container', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });
});
