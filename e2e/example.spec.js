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
        const loginButtonText = page.getByText('Já tem conta? Fazer Login');
        if (await loginButtonText.isVisible()) {
            await loginButtonText.click();
        }

        await page.getByPlaceholder('seu@email.com').fill('admin@teste.com');
        await page.getByPlaceholder('Sua senha secreta').fill('123456');
        await page.getByRole('button', { name: /Entrar na Plataforma/i }).click();

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
    await expect(page.getByRole('heading', { name: 'Atividade' })).toBeVisible({ timeout: 10000 });
});
