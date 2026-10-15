import { expect, test, type Page } from '@playwright/test'

// Runs against `vite preview` of a build pointed at e2e/mock-service.mjs (the real Worker with a fake woso).
async function openAdmin(page: Page) {
  await page.goto('/admin.html')
  const pass = page.getByLabel('Admin password')
  if (await pass.isVisible().catch(() => false)) {
    await pass.fill('test-admin-pass')
    await page.getByRole('button', { name: 'Open admin' }).click()
  }
  await expect(page.getByText('Body shops and links')).toBeVisible()
}
const newPhone = () => `${Math.floor(2000000000 + Math.random() * 7999999999)}`

async function leaveContacts(page: Page, phone: string, name = 'E2E Mike', email = `${phone}@example.com`) {
  const form = page.locator('.contacts')
  await expect(form.getByText('Step 1 of 3').or(form.locator('.stepper'))).toBeVisible()
  await form.getByRole('button', { name: 'Next' }).click()
  await expect(form.getByText('Enter a phone number we can reach you on')).toBeVisible()
  await page.fill('#su-phone', phone)
  await form.getByRole('button', { name: 'Next' }).click()
  await page.fill('#su-email', email)
  await form.getByRole('button', { name: 'Next' }).click()
  await page.fill('#su-name', name)
  await form.getByRole('button', { name: 'Get my result' }).click()
}

test('client: look → render starts at once → 3 contact steps while it runs → install pop-up → result; admin sees client and cost', async ({ page, context }) => {
  const phone = newPhone()
  await page.goto('/')
  await expect(page.locator('.bar .word')).toHaveText('Auto Studio')
  await expect(page.getByText('3 free renders, no card needed')).toBeVisible()
  await expect(page.locator('.hero .ba').first()).toBeVisible()

  // The color looks are on the home screen and open tuning with the look chosen.
  await page.locator('.looks-rail').getByRole('button', { name: /Blackout/ }).click()
  await expect(page.locator('.dock')).toContainText('Blackout')
  await page.getByRole('button', { name: 'Render build' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Painting your car right now' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Render build' })).toHaveCount(0) // no second render while it runs
  await leaveContacts(page, phone)

  const inst = page.getByRole('dialog', { name: 'Install the Auto Studio app' })
  await expect(inst).toBeVisible()
  await expect(inst.getByText('On iPhone: 3 taps')).toBeVisible()
  expect(new URL(page.url()).searchParams.get('u')).toMatch(/^[a-f0-9]{16,}$/)
  expect(new URL(page.url()).searchParams.get('s')).toBe('main')
  await inst.getByRole('button', { name: 'Later' }).click()

  await expect(page.getByRole('button', { name: 'Save to Photos' })).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.result').getByText('2 free renders left')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/\$0\.|credits|cr\b/)

  await page.getByRole('button', { name: 'Gallery', exact: true }).click()
  await expect(page.getByText('1 build')).toBeVisible()
  await expect(page.locator('.cabinet')).toContainText('E2E Mike')
  await expect(page.locator('.grid .tile').first()).toContainText('Blackout')

  const admin = await context.newPage()
  await openAdmin(admin)
  const row = admin.locator('li', { hasText: 'E2E Mike' }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText(`${phone}@example.com`)
  await expect(row).toContainText('1 used · 2 left')
  await expect(admin.locator('li', { hasText: 'Blackout' }).first()).toContainText('$0.117')

  // Opening the saved home-screen address (a new phone storage) shows the same client and gallery.
  const installed = await context.browser()!.newPage({ viewport: { width: 390, height: 844 } })
  await installed.goto(page.url().replace(/\?.*$/, '') + `?${new URL(page.url()).searchParams}&tab=gal`)
  await expect(installed.getByText('1 build')).toBeVisible()
  await installed.close()
})

test('configurator: color, wheels, tint, ride height; runs out after 3 free renders', async ({ page }) => {
  const phone = newPhone()
  await page.goto('/')
  await page.getByRole('button', { name: 'Tuning', exact: true }).click()
  await page.getByRole('button', { name: 'Try with a sample car' }).click()
  await page.getByRole('button', { name: 'Red', exact: true }).click()
  await page.locator('.sw2.wheels').getByRole('button', { name: 'Bronze' }).click()
  await page.getByRole('button', { name: 'Dark' }).click()
  await page.getByRole('button', { name: 'Slammed' }).click()
  await expect(page.locator('.dock')).toContainText('Red, wheels bronze, slammed, window tint dark')
  await page.getByRole('button', { name: 'Render build' }).click()
  await leaveContacts(page, phone, 'Parts Tester')
  await page.getByRole('button', { name: 'Later' }).click()
  for (const left of ['2 free renders left', '1 free render left', 'Free renders are used up']) {
    await expect(page.locator('.result').getByText(left)).toBeVisible({ timeout: 20000 })
    if (left.startsWith('Free')) break
    await page.getByRole('button', { name: 'Change more' }).click()
    await page.getByRole('button', { name: 'Render build' }).click()
  }
  await page.getByRole('button', { name: 'Change more' }).click()
  await page.getByRole('button', { name: 'Render build' }).click()
  await expect(page.getByRole('dialog', { name: 'You have used your free renders' })).toBeVisible()
})

test('same email on another phone opens the same account with the shared limit', async ({ browser }) => {
  const phone = newPhone()
  const a = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })
  await a.goto('/?s=main')
  await a.getByRole('button', { name: 'Tuning', exact: true }).click()
  await a.getByRole('button', { name: 'Try with a sample car' }).click()
  await a.getByRole('button', { name: 'Red', exact: true }).click()
  await a.getByRole('button', { name: 'Render build' }).click()
  await leaveContacts(a, phone, 'Twin')
  await a.getByRole('button', { name: 'Later' }).click()
  await expect(a.locator('.result').getByText('2 free renders left')).toBeVisible({ timeout: 20000 })

  const b = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })
  await b.goto('/?s=main')
  await b.getByRole('button', { name: 'Tuning', exact: true }).click()
  await b.getByRole('button', { name: 'Try with a sample car' }).click()
  await b.getByRole('button', { name: 'White', exact: true }).click()
  await b.getByRole('button', { name: 'Render build' }).click()
  await leaveContacts(b, newPhone(), 'Twin', `${phone}@example.com`) // another phone, the same email
  await expect(b.getByText(/Welcome back/)).toBeVisible()
  await b.getByRole('button', { name: 'Later' }).click()
  await expect(b.locator('.result').getByText('1 free render left')).toBeVisible({ timeout: 20000 })
  await b.getByRole('button', { name: 'Gallery', exact: true }).click()
  await expect(b.getByText('2 builds')).toBeVisible()
})

test('language: picks Russian and Spanish from the home screen', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Language').selectOption('ru')
  await expect(page.getByRole('button', { name: 'Загрузить машину' })).toBeVisible()
  await page.getByLabel('Язык').selectOption('es')
  await expect(page.getByRole('button', { name: 'Sube tu auto' })).toBeVisible()
})

test('the page behind an open sheet does not scroll', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  const before = await page.evaluate(() => document.body.style.position)
  expect(before).toBe('fixed')
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(300)
  await expect(page.locator('.bar')).toBeInViewport()
  await page.getByRole('button', { name: 'Done' }).click()
  expect(await page.evaluate(() => document.body.style.position)).toBe('')
})

test('admin: create a body shop link; clients from it see that shop and are marked with it', async ({ page, context }) => {
  await openAdmin(page)
  await page.getByRole('button', { name: 'Add a body shop' }).click()
  await page.getByLabel('Shop name').fill("Joe's Collision")
  await page.getByLabel('Phone clients can call').fill('(555) 777-0000')
  await page.locator('.editor input[type=file]').setInputFiles('public/pwa-512x512.png')
  await expect(page.locator('.phone .ph-bar')).toContainText("Joe's Collision")
  await page.getByRole('button', { name: 'Create link' }).click()
  const li = page.locator('.shop-list li', { hasText: "Joe's Collision" })
  await expect(li).toContainText('Link is ready')
  const link = await li.locator('input').inputValue()
  expect(link).toMatch(/\?s=[a-z0-9]{8}$/)

  const app = await context.browser()!.newPage({ viewport: { width: 390, height: 844 } })
  await app.goto(link.replace(/^https?:\/\/[^/]+/, 'http://localhost:4173'))
  await expect(app.locator('.bar .word')).toHaveText("Joe's Collision")
  await expect(app.locator('.bar img.mark')).toHaveAttribute('src', /logo\?shop=/)
  await expect(app.locator('.shopfoot .callbtn')).toHaveAttribute('href', 'tel:5557770000')
  await expect(app).toHaveTitle("Joe's Collision")
  // The main link stays neutral.
  const main = await context.browser()!.newPage()
  await main.goto('/?s=main')
  await expect(main.locator('.bar .word')).toHaveText('Auto Studio')

  await page.reload()
  await page.locator('.shop-list li', { hasText: "Joe's Collision" }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).last().click()
  await expect(page.locator('.shop-list li', { hasText: "Joe's Collision" })).toHaveCount(0)
})

test('admin rejects a wrong password', async ({ page }) => {
  await page.goto('/admin.html')
  await page.getByLabel('Admin password').fill('wrong')
  await page.getByRole('button', { name: 'Open admin' }).click()
  await expect(page.getByText('Wrong password')).toBeVisible()
})
