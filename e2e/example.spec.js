import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/projetoX/);
});

test('app loads initial state', async ({ page }) => {
    await page.goto('/');

    // 1. Simulate Login (Cloud-First Requirement)
    // Check if we are at login page
    const loginHeading = page.getByRole('heading', { name: /Bem-vindo de volta|Criar Conta/i });
    if (await loginHeading.isVisible()) {
        console.log('Login page detected. Logging in...');

        // Ensure we are in "Login" mode not "Register"
        const loginButtonText = page.getByText('Já tem uma conta? Faça login');
        if (await loginButtonText.isVisible()) {
            await loginButtonText.click();
        }

        await page.getByPlaceholder('seu@email.com').fill('admin@teste.com');
        await page.getByPlaceholder('••••••••').fill('123456');
        await page.getByRole('button', { name: /ENTRAR/i }).click();

        // Wait for login to process
        await page.waitForTimeout(2000);
    }

    // 2. Handle Loading State
    const loader = page.locator('.animate-spin');
    if (await loader.isVisible()) {
        console.log('Loader is visible. Waiting for it to detach...');
        await expect(loader).not.toBeVisible({ timeout: 15000 });
    }

    // 3. Verify Dashboard Access
    // We check for "Visão Geral" or the Header user name to ensure dashboard loaded
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
});
