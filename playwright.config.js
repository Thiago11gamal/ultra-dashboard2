import { defineConfig, devices } from '@playwright/test';
import os from 'os';

// Fix for Windows where HOME might not be set for some tools
if (process.platform === 'win32' && !process.env.HOME) {
    process.env.HOME = process.env.USERPROFILE || os.homedir();
}

// Remove hardcode para previnir quebras se o Vite pular para 5174
const baseURL = process.env.BASE_URL || 'http://localhost:5173';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        env: {
            VITE_LOCAL_MODE: 'true'
        }
    },
});
