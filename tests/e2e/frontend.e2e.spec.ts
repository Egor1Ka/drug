import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Payload Website Template/)
    const heading = page.locator('h1').first()
    await expect(heading).toHaveText('Payload Website Template')
  })
})

test.describe('site layout', () => {
  test('renders header navigation and footer contacts on the en home page', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await expect(page.locator('header').getByRole('link', { name: 'Solution' })).toBeVisible()
    await expect(page.locator('footer').getByText('sales@drug-card.io')).toBeVisible()
  })

  test('switches locale while keeping the page', async ({ page }) => {
    await page.goto('http://localhost:3000/en/blog')

    await page.locator('header').getByRole('link', { name: 'UK' }).click()

    await expect(page).toHaveURL(/\/uk\/blog/)
  })

  test('opens the contact modal from the header demo button', async ({ page }) => {
    await page.goto('http://localhost:3000/en')

    await page.locator('header').getByRole('button', { name: 'Request a Demo' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
