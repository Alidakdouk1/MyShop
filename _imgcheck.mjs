import { chromium } from 'playwright-core'
import path from 'node:path'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(process.env.TEMP, 'myshop_shots')
const UDD = path.join(process.env.TEMP, 'imgcheck_profile')
const APP = 'http://127.0.0.1:5173'
const log = (...a) => console.log(...a)

const ctx = await chromium.launchPersistentContext(UDD, {
  executablePath: CHROME, headless: true, viewport: { width: 1280, height: 900 },
})
const page = ctx.pages()[0] || await ctx.newPage()
try {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const pw = await page.$('input[type=password]')
  if (pw) {
    await page.fill('input[type=email]', 'alice@example.com')
    await page.fill('input[type=password]', 'Password123!')
    await page.click('button[type=submit]')
    await page.waitForTimeout(4000)
    log('logged in, url=', page.url())
  } else { log('already authed') }

  await page.goto(`${APP}/products/floral-wrap-dress`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000) // allow refresh-token session restore
  await page.getByRole('button', { name: /add to cart/i }).first().click()
  await page.waitForTimeout(2000)
  await page.click('[aria-label="Open cart"]')
  await page.waitForTimeout(1800)
  // check the cart item image actually loaded
  const cartImg = await page.evaluate(() => {
    const imgs = [...document.images].filter(i => i.naturalWidth > 0 && /unsplash|backend|placehold/.test(i.currentSrc || i.src))
    const broken = [...document.images].filter(i => (i.currentSrc||i.src) && i.naturalWidth === 0).map(i => i.src)
    return { loadedCount: imgs.length, brokenSrcs: broken.slice(0, 4) }
  })
  log('CART IMG CHECK:', JSON.stringify(cartImg))
  await page.screenshot({ path: path.join(OUT, 'fix-cart.png') })

  await page.goto(`${APP}/checkout`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(OUT, 'fix-checkout.png'), fullPage: true })
} catch (e) { log('ERROR', e.message) }
await ctx.close()
log('DONE')
