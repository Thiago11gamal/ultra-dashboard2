import { test, expect } from '@playwright/test';

test.describe('Core User Journey', () => {
  test('Dashboard loads correctly and navigation works', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to hydrate
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    
    // Handle Local Mode Login Screen
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123456');
    const loginButton = page.locator('button', { hasText: 'ENTRAR' });
    await expect(loginButton).toBeVisible({ timeout: 15000 });
    await loginButton.click();
    
    // Dismiss the welcome screen
    const welcomeEnterButton = page.locator('text=Entrar').nth(1); // or just locator('button', { hasText: 'Entrar' }) if the first one is gone
    // Since the first ENTRAR button is unmounted, 'text=Entrar' might just match the welcome screen one
    await expect(page.locator('text=Bem-vindo')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Entrar")').click();

    // Check if the sidebar or main navigation is present (adjust selectors based on actual DOM)
    // Assuming there is a nav element or a sidebar
    const dashboardTitle = page.locator('text=/Sequência|Eficiência|Equilíbrio|Flashcards/i').first();
    await expect(dashboardTitle).toBeVisible({ timeout: 15000 });

    // Ensure no severe errors exist on the page
    const errorBoundaryMessage = page.locator('text=Algo deu errado');
    await expect(errorBoundaryMessage).toHaveCount(0);
  });
});
