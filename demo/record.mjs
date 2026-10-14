#!/usr/bin/env node
/**
 * Records one storyboard as a video.
 *
 *   node record.mjs <role> [--all]
 *
 * Env:
 *   BASE_URL  frontend origin (default http://localhost:5174)
 *
 * Output: demo/raw/<role>.webm   (build.mjs turns these into mp4)
 */

import { chromium } from 'playwright'
import { mkdirSync, renameSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectedOverlay } from './overlay.mjs'
import { STORYBOARDS, CREDS } from './storyboard.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RAW = path.join(HERE, 'raw')
const BASE = process.env.BASE_URL ?? 'http://localhost:5174'

// 1080p exactly: the viewport must match recordVideo size or Playwright scales
// the frames and the text goes soft.
const SIZE = { width: 1920, height: 1080 }

// Pacing multiplier applied to every hold, click settle and in-beat wait, so
// clip length is one number rather than ~30 separate edits. Each storyboard
// also carries its own `pace` to even out clips that have more or fewer beats;
// the two multiply.
const PACE_ENV = Number(process.env.PACE ?? 1)
let PACE = PACE_ENV

export async function record(role) {
  const sb = STORYBOARDS[role]
  if (!sb) throw new Error(`no storyboard for "${role}"`)
  PACE = PACE_ENV * (sb.pace ?? 1)
  mkdirSync(RAW, { recursive: true })

  const browser = await chromium.launch({
    args: [
      // Lets the wellness screen open a camera without a permission prompt.
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
  })

  const ctx = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: RAW, size: SIZE },
    permissions: ['camera', 'microphone'],
    reducedMotion: 'no-preference',
  })

  await ctx.addInitScript(injectedOverlay)
  const page = await ctx.newPage()

  // Count in-flight /api/ calls ourselves. Playwright's networkidle is not
  // enough here: it can fire in the gap between the document finishing and the
  // dashboard's XHRs starting, which is how clips ended up filming KPI rows
  // reading 0 with the real numbers arriving a second later.
  const api$ = { inflight: 0, completed: 0 }
  const isApi = (r) => r.url().includes('/api/')
  page.on('request', r => { if (isApi(r)) api$.inflight++ })
  page.on('requestfinished', r => { if (isApi(r)) { api$.inflight--; api$.completed++ } })
  page.on('requestfailed', r => { if (isApi(r)) { api$.inflight--; api$.completed++ } })

  // window.confirm() blocks the page and is unrenderable in capture; it guards
  // every delete/cancel path in the admin screens.
  page.on('dialog', d => d.accept().catch(() => {}))

  const api = makeApi(page, api$)

  const t0 = Date.now()
  try {
    // The title card goes up BEFORE logging in and comes down once the
    // dashboard has settled. Two reasons: the opening frames would otherwise be
    // a blank white login page, and the sign-in round-trip happens behind the
    // card instead of costing screen time.
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[type="email"]', { timeout: 20000 })
    await page.evaluate(([e, r, s]) => window.__demo?.title(e, r, s),
      [sb.title.eyebrow, sb.title.role, sb.title.sub]).catch(() => {})
    await page.waitForTimeout(1900)

    await login(page, role)

    // Hold the title card until the dashboard has real numbers on it, so the
    // first frame after the card is never a zeroed-out KPI row.
    await api.settle({ extra: 1100 })
    // Some dashboards render literal zeros and their own empty-state copy
    // rather than a skeleton while loading, so there's no .animate-pulse for
    // settle() to catch. Those storyboards declare the copy to wait out.
    if (sb.notReadyText?.length) {
      await page.waitForFunction(
        (needles) => !needles.some(n => document.body.innerText.includes(n)),
        sb.notReadyText, { timeout: 15000 },
      ).catch(() => {})
      // One more drain: clearing the empty-state copy means the data landed,
      // but sibling widgets may still be mid-flight.
      await api.settle({ extra: 300 })
    }
    await page.evaluate(() => window.__demo?.hideTitle()).catch(() => {})
    await page.waitForTimeout(600)

    for (const beat of sb.beats) {
      if (beat.nav) {
        // A beat that changes page sets its caption AFTER the move, otherwise
        // the new caption sits over the old screen for a second — e.g. reading
        // "Appointments…" while the wellness table is still on film.
        await api.caption('')
        await beat.do(page, api)
        if (beat.caption !== undefined) await api.caption(beat.caption)
      } else {
        if (beat.caption !== undefined) await api.caption(beat.caption)
        if (beat.do) await beat.do(page, api)
      }
      if (beat.hold) await page.waitForTimeout(Math.round(beat.hold * PACE))
    }

    await api.caption('')
    await page.waitForTimeout(600)
  } finally {
    console.log(`  runtime ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    const video = page.video()
    await ctx.close()          // video is only finalised on context close
    await browser.close()
    if (video) {
      const tmp = await video.path()
      const dest = path.join(RAW, `${role}.webm`)
      if (existsSync(dest)) rmSync(dest)
      renameSync(tmp, dest)
      console.log(`  recorded -> ${path.relative(process.cwd(), dest)}`)
    }
  }
}

/** Helpers the storyboards use; keeps beat definitions declarative. */
function makeApi(page, api$) {
  const api = {
    /** PACE-scaled wait. Storyboards use this rather than page.waitForTimeout
     *  so the pacing knob controls total runtime, not just the holds. */
    async wait(ms) { await page.waitForTimeout(Math.round(ms * PACE)) },

    async caption(text) {
      await page.evaluate(t => window.__demo?.caption(t), text).catch(() => {})
    },

    async title(eyebrow, role, sub, hold) {
      await page.evaluate(([e, r, s]) => window.__demo?.title(e, r, s), [eyebrow, role, sub]).catch(() => {})
      await page.waitForTimeout(hold)
      await page.evaluate(() => window.__demo?.hideTitle()).catch(() => {})
      await page.waitForTimeout(600)
    },

    /** Glide the pointer to an element's centre — a teleporting cursor reads as a cut. */
    async moveTo(target) {
      const el = typeof target === 'string' ? page.locator(target).first() : target
      await el.scrollIntoViewIfNeeded().catch(() => {})
      const box = await el.boundingBox()
      if (!box) return null
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.mouse.move(x, y, { steps: 24 })
      return { x, y }
    },

    /** Move, pause so the viewer registers the target, then click with a pulse. */
    async click(target, { settle = 420 } = {}) {
      const el = typeof target === 'string' ? page.locator(target).first() : target
      await api.moveTo(el)
      await page.waitForTimeout(Math.round(settle * PACE))
      await page.evaluate(() => window.__demo?.clickPulse()).catch(() => {})
      await el.click({ timeout: 15000 })
    },

    /**
     * Wait until the current screen has actually finished loading.
     *
     * This is the single most important helper here. Every page's heading and
     * card chrome render immediately, while KPIs and tables arrive from
     * separate requests — so captioning on a fixed timer filmed dashboards
     * reading "Students 0 / No trend data yet" and tables showing grey
     * skeleton rows. Waiting on networkidle alone isn't enough either, because
     * the CountUp and Recharts entrance animations run afterwards.
     */
    async settle({ extra = 700, grace = 420 } = {}) {
      // Let React actually ENTER the loading state first. Without this the
      // whole check can run in the gap between a click and the skeleton
      // rendering: nothing is in flight yet, no .animate-pulse exists yet, so
      // it reports "settled" and the beat then holds on a skeleton for its
      // entire duration. That produced ~24s of blank rows in one clip.
      await page.waitForTimeout(grace)
      await page.waitForLoadState('networkidle').catch(() => {})

      // Two rounds: filter changes can kick off a second fetch just as the
      // first finishes, and a single pass would return between them.
      for (let round = 0; round < 3; round++) {
        const deadline = Date.now() + 12000
        let quietSince = null
        while (Date.now() < deadline) {
          if (api$.inflight === 0) {
            quietSince ??= Date.now()
            if (Date.now() - quietSince > 500) break
          } else {
            quietSince = null
          }
          await page.waitForTimeout(80)
        }
        // Skeleton placeholders across the app are all .animate-pulse.
        await page.waitForFunction(
          () => !document.querySelector('.animate-pulse'),
          null, { timeout: 10000 },
        ).catch(() => {})

        await page.waitForTimeout(260)
        const stillBusy = await page.evaluate(() => !!document.querySelector('.animate-pulse'))
        if (!stillBusy && api$.inflight === 0) break
      }

      await page.waitForTimeout(Math.round(extra * PACE))
    },

    /**
     * Close whatever modal is open.
     *
     * Escape does NOT work: components/ui/Modal.tsx binds onClose to the X
     * button and a backdrop click only — there is no key handler. Pressing
     * Escape therefore silently does nothing and the still-mounted overlay
     * intercepts the next click, which fails as a confusing timeout.
     */
    async closeModal() {
      const backdrop = page.locator('div.fixed.inset-0').filter({ hasText: '' }).first()
      if (await backdrop.count()) {
        // Top-left corner of the backdrop, well clear of the centred panel.
        await backdrop.click({ position: { x: 60, y: 60 }, force: true }).catch(() => {})
        await page.waitForTimeout(450)
      }
      // Custom modals (the multimodal check) own their close button instead.
      if (await page.locator('div.fixed.inset-0').count()) {
        const x = page.locator('div.fixed.inset-0 button').filter({ hasText: /^(✕|×)?$/ }).last()
        await x.click({ force: true, timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(450)
      }
    },

    /** Navigate by URL but keep the overlay alive and wait for data to settle. */
    async goto(url, { settle = 1500 } = {}) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(settle)
    },

    async type(selector, text, delay = 85) {
      await api.click(selector, { settle: 260 })
      await page.locator(selector).first().fill('')
      await page.locator(selector).first().type(text, { delay })
    },

    /**
     * Drag dashboard widget `from` onto widget `to` (indices into the visible
     * grid) in WidgetGrid's Customise mode.
     *
     * Two things make this fiddly, both verified by experiment:
     *  - dnd-kit's PointerSensor has activationConstraint { distance: 6 }, so
     *    the gesture must be a real down -> many small moves -> up.
     *    Playwright's dragTo() jumps in one step and the drag never starts.
     *  - Collision is closestCenter, comparing the dragged item's centre with
     *    the droppables' centres, so the pointer has to finish over the TARGET
     *    WIDGET'S BODY. Aiming at the target's drag handle silently no-ops —
     *    the handle is absolutely positioned outside the widget at -top-2/-left-2.
     */
    async dragWidget(from, to) {
      const handle = page.locator('[aria-label^="Reorder"]').nth(from)
      const a = await handle.boundingBox()
      if (!a) return false
      const b = await page.evaluate((i) => {
        const h = document.querySelectorAll('[aria-label^="Reorder"]')[i]
        const r = h.parentElement.getBoundingClientRect()
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
      }, to)

      const x0 = a.x + a.width / 2
      const y0 = a.y + a.height / 2
      await page.mouse.move(x0, y0, { steps: 12 })
      await page.waitForTimeout(220)
      await page.evaluate(() => window.__demo?.clickPulse()).catch(() => {})
      await page.mouse.down()
      await page.waitForTimeout(180)
      const steps = 28
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        await page.mouse.move(x0 + (b.cx - x0) * t, y0 + (b.cy - y0) * t)
        await page.waitForTimeout(20)
      }
      await page.waitForTimeout(300)
      await page.mouse.up()
      await page.waitForTimeout(700)
      return true
    },

    /** Smooth scroll — a jumped scroll looks like a dropped frame. */
    async scrollTo(y, ms = 900) {
      await page.evaluate(([top, dur]) => {
        const el = document.querySelector('main') ?? document.scrollingElement
        const start = el.scrollTop
        const t0 = performance.now()
        return new Promise(res => {
          const step = now => {
            const p = Math.min(1, (now - t0) / dur)
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
            el.scrollTop = start + (top - start) * e
            p < 1 ? requestAnimationFrame(step) : res()
          }
          requestAnimationFrame(step)
        })
      }, [y, ms])
    },

    page,
  }
  return api
}

async function login(page, role) {
  const { email, password } = CREDS[role]
  // NOTE: no goto here — record() has already navigated to /login and raised
  // the title card. Navigating again would be a full page load, which tears
  // down the injected overlay and drops the card mid-sign-in.
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 20000 })
  await page.waitForLoadState('networkidle')
  // Long enough for the dashboard's parallel fetches to land, short enough that
  // the CountUp and Recharts entrance animations are still on film.
  await page.waitForTimeout(900)
}

// CLI
const arg = process.argv[2]
if (arg) {
  const roles = arg === '--all' ? Object.keys(STORYBOARDS) : [arg]
  for (const r of roles) {
    console.log(`recording ${r}…`)
    await record(r)
  }
}
