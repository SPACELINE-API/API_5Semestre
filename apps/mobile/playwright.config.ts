import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './src',
	testMatch: '**/*.spec.ts',
	testIgnore: '**/node_modules/**',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:5183',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'pnpm exec expo start --web --port 5183',
		url: 'http://127.0.0.1:5183',
		reuseExistingServer: true,
		timeout: 120_000,
	},
});
