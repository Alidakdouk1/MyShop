import { chromium } from 'playwright-core'
import path from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(process.env.TEMP, 'myshop_shots')
const APP = 'http://127.0.0.1:5173'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
// iPhone-ish: 390x844 @3x, touch + mobile
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()

async function shot(name, url, full = true) {
  try {
    await page.goto(`${APP}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
    // report horizontal overflow (a key mobile bug)
    const overflow = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }))
    await page.screenshot({ path: path.join(OUT, `m-${name}.png`), fullPage: full })
    console.log(`${name}: saved | overflowX=${overflow.overflow}px (doc ${overflow.docW} vs win ${overflow.winW})`)
  } catch (e) {
    console.log(`${name}: ERROR ${e.message}`)
  }
}

await shot('home', '/')
await shot('shop', '/shop')
await shot('product', '/products/floral-wrap-dress')

await browser.close()
console.log('DONE')
