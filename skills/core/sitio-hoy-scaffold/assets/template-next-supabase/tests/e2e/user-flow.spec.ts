import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const viewport = testInfo.project.use.viewport
  const folder = String(viewport?.width ?? testInfo.project.name)
  const dir = path.join(process.cwd(), '.sitiohoy/qa/e2e', folder)
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}

async function gotoOk(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'networkidle' })
  expect(response, `La ruta ${route} no respondió`).not.toBeNull()
  expect(response!.status(), `La ruta ${route} devolvió HTTP ${response!.status()}`).toBeLessThan(400)
}

function productCards(page: Page) {
  return page.locator('a[href*="/productos/"], article:has(a[href*="/productos/"]), [data-testid="product-card"]')
}

test.describe('SitioHoy user flow', () => {
  test('home, nav, catalogo, producto, carrito, checkout y contacto', async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    const httpErrors: string[] = []
    const siteOrigin = new URL(process.env.SITE_URL ?? 'http://localhost:3000').origin
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))
    page.on('response', (response) => {
      const status = response.status()
      if (status >= 400 && response.url().startsWith(siteOrigin)) {
        httpErrors.push(`${status} ${response.url()}`)
      }
    })

    await gotoOk(page, '/')
    await expect(page.locator('body')).toBeVisible()
    await screenshot(page, testInfo, '01-home')

    const viewportWidth = testInfo.project.use.viewport?.width ?? 1280
    if (viewportWidth <= 768) {
      const menuButton = page
        .getByRole('button', { name: /menu|menú|abrir|hamburguesa/i })
        .first()
        .or(page.locator('[aria-label*="menu" i], [data-testid="mobile-menu-button"]').first())
      await expect(menuButton, 'No se encontró botón hamburguesa en mobile/tablet').toBeVisible()
      await menuButton.click()
      await expect(page.getByRole('link', { name: /productos|catálogo|catalogo/i }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: /ver todo|categor/i }).first()).toBeVisible()
      await screenshot(page, testInfo, '02-menu-mobile')
    } else {
      await expect(page.getByRole('navigation').first(), 'No se encontró navegación desktop').toBeVisible()
      await screenshot(page, testInfo, '02-nav-desktop')
    }

    await gotoOk(page, '/productos')
    const cards = productCards(page)
    await expect(cards.first(), 'Catálogo sin productos visibles').toBeVisible()
    await screenshot(page, testInfo, '03-catalogo')

    const firstProductLink = page.locator('a[href*="/productos/"]').first()
    await expect(firstProductLink, 'No se encontró link al primer producto').toBeVisible()
    await firstProductLink.click()
    await page.waitForLoadState('networkidle')
    expect(page.url(), 'El click del primer producto no navegó a detalle').toContain('/productos/')
    await expect(page.locator('h1').first(), 'Detalle de producto sin h1 visible').toBeVisible()
    await screenshot(page, testInfo, '04-producto')

    const addToCart = page.getByRole('button', { name: /agregar.*carrito|sumar.*carrito|comprar/i }).first()
    await expect(addToCart, 'No se encontró botón Agregar al carrito').toBeVisible()
    await addToCart.click()
    await gotoOk(page, '/carrito')
    await expect(page.locator('body'), 'Carrito no cargó').toContainText(/carrito|total|producto/i)
    await screenshot(page, testInfo, '05-carrito')

    await gotoOk(page, '/checkout')
    await expect(page.locator('form, input[name*="email" i], input[type="email"]').first(), 'Checkout sin formulario de envío/datos').toBeVisible()
    await screenshot(page, testInfo, '06-checkout')

    await gotoOk(page, '/contacto')
    await expect(page.locator('form').first(), 'Contacto sin formulario visible').toBeVisible()
    await expect(page.locator('input[type="email"], textarea').first(), 'Formulario de contacto incompleto').toBeVisible()
    await screenshot(page, testInfo, '07-contacto')

    expect(httpErrors, `Rutas o recursos con HTTP 4xx/5xx:\n${httpErrors.join('\n')}`).toHaveLength(0)
    expect(consoleErrors, `Errores JS en consola:\n${consoleErrors.join('\n')}`).toHaveLength(0)
  })
})
