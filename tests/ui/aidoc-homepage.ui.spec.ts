import { test, expect } from '@playwright/test';

test.describe('Aidoc commercial website', () => {
  test('TC-WEB-001: homepage loads successfully', async ({ page }) => {
    await page.goto('https://www.aidoc.com/');

    await expect(page).toHaveTitle(/Aidoc/i);
  });
});
