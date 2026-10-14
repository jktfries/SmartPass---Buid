/**
 * Captures a consistent GUI screenshot set for documentation.
 *
 *   node capture-gui.mjs
 *
 * Writes to ../submission/screenshots/.
 *
 * Reuses the load-detection approach from record.mjs: waiting a fixed time
 * after a click repeatedly caught skeleton rows and zeroed KPI counters,
 * because networkidle can fire before a page's XHRs have even started and
 * React only enters its loading state on the next render.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '..', 'submission', 'screenshots')
const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const SIZE = { width: 1600, height: 1000 }

mkdirSync(OUT, { recursive: true })

const CREDS = {
  student:   'maria.santos@sp.edu',
  professor: 'professor@smartpass.edu',
  counselor: 'counselor@smartpass.edu',
  admin:     'admin@smartpass.edu',
  sysadmin:  'sysadmin@smartpass.edu',
}

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-device-scale-factor=1'] })
let shot = 0
const taken = []

function mkApi(page, api$) {
  return {
    async settle({ extra = 700, grace = 420 } = {}) {
      await page.waitForTimeout(grace)
      await page.waitForLoadState('networkidle').catch(() => {})
      for (let r = 0; r < 3; r++) {
        const deadline = Date.now() + 12000
        let quiet = null
        while (Date.now() < deadline) {
          if (api$.inflight === 0) { quiet ??= Date.now(); if (Date.now() - quiet > 500) break }
          else quiet = null
          await page.waitForTimeout(80)
        }
        await page.waitForFunction(() => !document.querySelector('.animate-pulse'), null, { timeout: 10000 }).catch(() => {})
        await page.waitForTimeout(260)
        if (!(await page.evaluate(() => !!document.querySelector('.animate-pulse'))) && api$.inflight === 0) break
      }
      await page.waitForTimeout(extra)
    },
    // Escape does not close modals — Modal.tsx binds only the X and backdrop.
    async closeModal() {
      const bd = page.locator('div.fixed.inset-0').first()
      if (await bd.count()) {
        await bd.click({ position: { x: 60, y: 60 }, force: true }).catch(() => {})
        await page.waitForTimeout(450)
      }
      // The multimodal wellness check is a custom modal, not Modal.tsx, and
      // ignores a backdrop click — it owns its own close button.
      if (await page.locator('div.fixed.inset-0').count()) {
        const x = page.locator('div.fixed.inset-0 button').filter({ hasText: /^(✕|×)?$/ }).last()
        await x.click({ force: true, timeout: 4000 }).catch(() => {})
        await page.waitForTimeout(500)
      }
    },
    async scroll(top) {
      await page.evaluate((t) => {
        const el = document.querySelector('main') ?? document.scrollingElement
        el.scrollTo({ top: t, behavior: 'instant' })
      }, top)
      await page.waitForTimeout(700)
    },
  }
}

async function session(role, fn) {
  const ctx = await browser.newContext({ viewport: SIZE })
  const page = await ctx.newPage()
  page.on('dialog', d => d.accept().catch(() => {}))
  const api$ = { inflight: 0 }
  const isApi = r => r.url().includes('/api/')
  page.on('request', r => { if (isApi(r)) api$.inflight++ })
  page.on('requestfinished', r => { if (isApi(r)) api$.inflight-- })
  page.on('requestfailed', r => { if (isApi(r)) api$.inflight-- })
  const a = mkApi(page, api$)

  const grab = async (name) => {
    shot++
    const file = path.join(OUT, String(shot).padStart(2, '0') + '-' + name + '.png')
    await page.screenshot({ path: file })
    taken.push(String(shot).padStart(2, '0') + '-' + name)
    console.log('  ' + String(shot).padStart(2, '0') + '  ' + name)
  }

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="email"]', { timeout: 20000 })
  if (role === 'LOGIN') { await page.waitForTimeout(900); await grab('login'); await ctx.close(); return }

  await page.fill('input[type="email"]', CREDS[role])
  await page.fill('input[type="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 25000 })
  await a.settle({ extra: 1400 })

  await fn(page, a, grab)
  await ctx.close()
}

const nav = n => 'a[aria-label="' + n + '"]'

try {
  console.log('capturing...')
  await session('LOGIN', async () => {})

  await session('student', async (p, a, grab) => {
    await grab('student-dashboard')
    await p.click(nav('Attendance')); await a.settle()
    await p.click('button:has-text("View More")'); await p.waitForTimeout(1100)
    await grab('student-attendance')
    await a.scroll(0)
    await p.click('button:has-text("Simulate RFID Scan")'); await p.waitForTimeout(1200)
    const val = await p.locator('select option').nth(1).getAttribute('value')
    await p.selectOption('select', val); await p.waitForTimeout(800)
    await grab('student-rfid-scan')
    await a.closeModal()
    await p.click(nav('Wellness')); await a.settle()
    await p.click('button:has-text("MultiModal Analysis")'); await p.waitForTimeout(1600)
    await grab('student-wellness-multimodal')
    await a.closeModal()
    await p.click('button:has-text("Standard Log")'); await p.waitForTimeout(1300)
    await grab('student-wellness-log')
  })

  await session('professor', async (p, a, grab) => {
    await grab('professor-dashboard')
    await p.click(nav('My Classes')); await a.settle()
    await grab('professor-classes')
    await p.click('text=View attendance'); await a.settle()
    await a.scroll(320)
    await grab('professor-attendance-matrix')
    await a.scroll(0)
    await p.click('button:has-text("Log Attendance")'); await p.waitForTimeout(1300)
    await grab('professor-log-attendance')
  })

  await session('counselor', async (p, a, grab) => {
    await grab('counselor-dashboard')
    await p.click(nav('Wellness Logs')); await a.settle()
    await grab('counselor-wellness-logs')
    await p.click('button:has-text("Review")'); await p.waitForTimeout(1400)
    await grab('counselor-review-log')
    await a.closeModal()
    await p.click(nav('Appointments')); await a.settle()
    await grab('counselor-appointments')
  })

  await session('admin', async (p, a, grab) => {
    await grab('admin-dashboard')
    await a.scroll(980)
    await grab('admin-reports')
    await p.click(nav('Academic')); await a.settle()
    await p.click('button:has-text("Class Sections")'); await a.settle({ extra: 500 })
    await grab('admin-academic-structure')
    await p.click(nav('Enrollment')); await a.settle()
    const s = p.locator('button, li, div[role="button"]').filter({ hasText: /2024-CS-/ }).first()
    if (await s.count()) { await s.click(); await a.settle({ extra: 500 }) }
    await grab('admin-enrollment')
  })

  await session('sysadmin', async (p, a, grab) => {
    await grab('sysadmin-dashboard')
    await p.click(nav('Accounts')); await a.settle()
    await grab('sysadmin-accounts')
    await p.click(nav('Approvals')); await a.settle()
    await p.click('button:has-text("Review")'); await p.waitForTimeout(1400)
    await grab('sysadmin-approval-review')
    await a.closeModal()
    await p.click(nav('Audit Logs')); await a.settle()
    await grab('sysadmin-audit-logs')
    await p.click(nav('Settings')); await a.settle()
    await grab('sysadmin-settings')
    await p.click(nav('My Account')); await a.settle()
    await grab('appearance-personalisation')
  })

  console.log('\n' + taken.length + ' screenshots -> submission/screenshots/')
} catch (e) {
  console.log('FAILED: ' + e.message.split('\n')[0])
  process.exitCode = 1
} finally {
  await browser.close()
}
