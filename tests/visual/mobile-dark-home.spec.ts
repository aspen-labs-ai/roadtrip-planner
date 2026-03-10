import { expect, test } from '@playwright/test'

test.describe('Planner mobile visual baseline @visual', () => {
  test('captures home planner shell', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('mobile-dark-home.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
