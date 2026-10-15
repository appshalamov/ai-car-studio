import { expect, test, type Page } from '@playwright/test'

// Runs against `vite preview` of a build pointed at e2e/mock-service.mjs (the real Worker with a fake woso).
async function openAdmin(page: Page) {
  await page.goto('/admin.html')
  const pass = page.getByLabel('Admin password')
  if (await pass.isVisible().catch(() => false)) {
    await pass.fill('test-admin-pass')
    await page.getByRole('button', { name: 'Open admin' }).click()
  }
  await expect(page.getByText('Your brand')).toBeVisible()
}

test('client: style → sign-up → render → gallery, cost never shown; admin sees the client and the cost', async ({ page, context }) => {
  const phone = `${Math.floor(2000000000 + Math.random() * 7999999999)}`
  await page.goto('/')
  await expect(page.getByText('Your Shop Name').first()).toBeVisible()
  await expect(page.getByText('3 free renders, no card needed')).toBeVisible()

  await page.getByRole('button', { name: /Blackout/ }).first().click()
  await expect(page.getByText('5 changes')).toBeVisible()
  await page.getByRole('button', { name: 'Render build' }).click()

  const sheet = page.getByRole('dialog', { name: 'Get your free renders' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /Get free renders/ }).click()
  await expect(sheet.getByText('Enter a phone number we can reach you on')).toBeVisible()
  await page.fill('#su-name', 'E2E Mike')
  await page.fill('#su-phone', phone)
  await page.fill('#su-email', `${phone}@example.com`)
  await sheet.getByRole('button', { name: /Get free renders/ }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Rendering your build' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save to gallery' })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('2 free renders left')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/\$0\.|credits|cr\b/)

  await page.getByRole('button', { name: 'Save to gallery' }).click()
  await page.getByRole('button', { name: 'Gallery', exact: true }).click()
  await expect(page.getByText('1 build')).toBeVisible()

  const admin = await context.newPage()
  await openAdmin(admin)
  const row = admin.locator('li', { hasText: 'E2E Mike' }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText(`${phone}@example.com`)
  await expect(row).toContainText('1 used · 2 left')
  await expect(admin.locator('li', { hasText: 'Blackout' }).first()).toContainText('$0.117')
})

test('parts tab builds a custom render and runs out after 3 free renders', async ({ page }) => {
  const phone = `${Math.floor(2000000000 + Math.random() * 7999999999)}`
  await page.goto('/')
  await page.getByRole('button', { name: 'Tuning', exact: true }).click()
  await page.getByRole('button', { name: 'Try with a sample car' }).click()
  await page.getByRole('tab', { name: 'Parts' }).click()
  await page.getByRole('button', { name: 'Red', exact: true }).click()
  await page.getByRole('button', { name: 'Slammed' }).click()
  await expect(page.getByText('2 changes')).toBeVisible()
  await page.getByRole('button', { name: 'Render build' }).click()
  await page.fill('#su-phone', phone)
  await page.fill('#su-email', `${phone}@example.com`)
  await page.getByRole('button', { name: /Get free renders/ }).click()
  for (const left of ['2 free renders left', '1 free render left', 'Free renders are used up']) {
    await expect(page.getByText(left)).toBeVisible({ timeout: 20000 })
    if (left.startsWith('Free')) break
    await page.getByRole('button', { name: 'Change more' }).click()
    await page.getByRole('button', { name: 'Render build' }).click()
  }
  await page.getByRole('button', { name: 'Change more' }).click()
  await page.getByRole('button', { name: 'Render build' }).click()
  await expect(page.getByRole('dialog', { name: 'You have used your free renders' })).toBeVisible()
})

test('admin: rename the shop and upload a logo, the client app shows them', async ({ page, context }) => {
  await openAdmin(page)
  await page.getByLabel('Business name').fill("Joe's Collision")
  await page.getByLabel('Phone clients can call').fill('(555) 777-0000')
  await page.locator('input[type=file]').setInputFiles('public/pwa-512x512.png')
  await expect(page.locator('.logo-row img.mark')).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()

  const app = await context.newPage()
  await app.goto('/')
  await expect(app.locator('.bar .word')).toHaveText("Joe's Collision")
  await expect(app.locator('.bar img.mark')).toBeVisible()
  await expect(app.locator('.shopfoot a')).toHaveText('(555) 777-0000')
  await expect(app).toHaveTitle("Joe's Collision")

  // reset for other runs
  await page.getByLabel('Business name').fill('')
  await page.getByLabel('Phone clients can call').fill('')
  await page.getByRole('button', { name: 'Remove logo' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()
})

test('admin rejects a wrong password', async ({ page }) => {
  await page.goto('/admin.html')
  await page.getByLabel('Admin password').fill('wrong')
  await page.getByRole('button', { name: 'Open admin' }).click()
  await expect(page.getByText('Wrong password')).toBeVisible()
})
