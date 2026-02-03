import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/projetoX/);
});

test('app loads initial state', async ({ page }) => {
    await page.goto('/');

    // Inspect what's on the page
    // If loading persists
    const loader = page.getByText('Carregando seus dados...');
    if (await loader.isVisible()) {
        console.log('Loader is visible. Waiting for it to detach...');
        await expect(loader).not.toBeVisible({ timeout: 10000 });
    }

    // If we get past loader, check for Dashboard
    await expect(page.getByRole('heading', { name: 'Atividade' })).toBeVisible({ timeout: 5000 });
});
