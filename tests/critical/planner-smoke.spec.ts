import { expect, test } from '@playwright/test'

test.describe('Planner home smoke @critical', () => {
  test('loads timeline shell and quick add action @critical', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Chicago to Montreal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quick add activity' })).toBeVisible()
    await expect(page.getByText('Roadtrip Planner')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tue' }).first()).toBeVisible()
  })
})
