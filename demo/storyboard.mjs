/**
 * The demo script, as data.
 *
 * Each beat is { caption, do, hold, nav }. Keeping them declarative matters
 * because landing in the target window is an iterative timing exercise — `hold`
 * values and each storyboard's `pace` get tuned against measured runtime, and
 * that shouldn't mean rewriting driver logic on every pass.
 *
 * `nav: true` marks a beat whose action changes page: its caption is applied
 * AFTER the move, otherwise the new caption sits over the old screen.
 *
 * Selector notes:
 *  - Sidebar items are links with aria-label={item.label} (Sidebar.tsx:161).
 *  - Admin report tabs render "attendance Report" in the DOM and are only
 *    title-cased by CSS `capitalize`, so match case-insensitively.
 *  - Escape does NOT close modals (Modal.tsx binds the X and backdrop only) —
 *    always use a.closeModal().
 *  - Avoided throughout: file pickers, CSV export, drag-from-desktop, user
 *    creation, password changes, and the Maintenance Mode toggle (it locks
 *    every login).
 */

export const CREDS = {
  student:   { email: 'student@smartpass.edu',   password: 'password' },
  professor: { email: 'professor@smartpass.edu', password: 'password' },
  counselor: { email: 'counselor@smartpass.edu', password: 'password' },
  admin:     { email: 'admin@smartpass.edu',     password: 'password' },
  sysadmin:  { email: 'sysadmin@smartpass.edu',  password: 'password' },
  // Personalisation films the student account — its dashboard has the most
  // widgets to rearrange. It MUST record last: the beats change theme, accent
  // and density, which persist server-side and would otherwise bleed into
  // every later clip. Re-run `prepare.mjs before` if recording it standalone.
  personalisation: { email: 'student@smartpass.edu', password: 'password' },
}

const nav = (name) => `a[aria-label="${name}"]`

export const STORYBOARDS = {
  // ─── STUDENT ──────────────────────────────────────────────────────────────
  student: {
    pace: 1.13,
    title: { eyebrow: 'SmartPass', role: 'Student', sub: 'Attendance, wellness and everything in between' },
    // Trends and mood load in a second wave after the main dashboard call, so
    // the API-drain check can slip through the gap between them. Wait for the
    // empty-state copy to clear instead.
    notReadyText: ['No trend data yet', 'No mood data yet'],
    beats: [
      { caption: 'A personal dashboard — attendance rate, presence and mood at a glance', hold: 4200 },

      { caption: 'Weekly attendance plotted across the term',
        do: async (p, a) => { await a.scrollTo(260, 1000) }, hold: 3600 },

      { caption: 'Per-class breakdown and a two-week mood trend',
        do: async (p, a) => { await a.scrollTo(620, 1000) }, hold: 3600 },

      { nav: true, caption: 'Every enrolled course, summarised',
        do: async (p, a) => { await a.scrollTo(0, 600); await a.click(nav('Attendance')); await a.settle() }, hold: 3400 },

      { caption: 'Expand any course for the full dated record',
        do: async (p, a) => { await a.click('button:has-text("View More")'); await a.wait(900) }, hold: 3400 },

      { caption: 'Present, late, absent and excused — every session accounted for',
        do: async (p, a) => { await a.scrollTo(420, 1100) }, hold: 3400 },

      { caption: 'Simulate an RFID tap — exactly what the reader would send',
        do: async (p, a) => {
          await a.scrollTo(0, 700)
          await a.click('button:has-text("Simulate RFID Scan")')
          await a.wait(900)
        }, hold: 2800 },

      { caption: 'Status is derived from the system clock — present or late, automatically',
        do: async (p, a) => {
          const val = await p.locator('select option').nth(1).getAttribute('value')
          await a.moveTo('select'); await a.wait(300)
          await p.selectOption('select', val)
          await a.wait(700)
          await a.click('button:has-text("Tap Card")')
          await a.wait(1800)
        }, hold: 4200 },

      { nav: true, caption: 'AI-assisted wellness: facial, voice and combined assessment',
        do: async (p, a) => {
          const done = p.getByRole('button', { name: /^Done$/ })
          if (await done.count()) await a.click(done)
          await a.wait(700)
          await a.click(nav('Wellness'))
          await a.settle()
          await a.click('button:has-text("MultiModal Analysis")')
          await a.wait(1400)
        }, hold: 4000 },

      { caption: 'Or log how you feel in seconds — step one, pick a mood',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(800)
          await a.click('button:has-text("Standard Log")')
          await a.wait(1200)
        }, hold: 3200 },

      { caption: 'Step two — what\'s driving it',
        do: async (p, a) => {
          // Choosing a mood auto-advances to the factors step.
          await a.click('button:has-text("Good")', { settle: 500 })
          await a.wait(1400)
        }, hold: 3400 },

      { caption: 'Tag the contributing factors',
        do: async (p, a) => {
          const chips = p.locator('button:has-text("academic")')
          if (await chips.count()) await a.click(chips.first(), { settle: 350 })
          await a.wait(800)
        }, hold: 3000 },

      { nav: true, caption: 'Counselling appointments, requested and tracked',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(700)
          await a.click(nav('Appointments'))
          await a.settle()
        }, hold: 3800 },

      { nav: true, caption: 'Alerts for attendance breaches and wellness flags',
        do: async (p, a) => { await a.click(nav('Notifications')); await a.settle() }, hold: 3400 },

      { caption: 'Expand one for the detail',
        do: async (p, a) => {
          const more = p.locator('button:has-text("Show more")')
          if (await more.count()) await a.click(more.first(), { settle: 400 })
          await a.wait(900)
        }, hold: 3000 },

      { nav: true, caption: 'Direct messaging with staff and support',
        do: async (p, a) => {
          await a.click(nav('Messages'))
          await a.settle()
          // MessagesPage has no skeleton — it renders "No conversations yet"
          // while loading, which settle() can't detect. Wait for a real row.
          await p.waitForSelector('[role="button"]', { timeout: 8000 }).catch(() => {})
          await a.wait(500)
          const convo = p.locator('[role="button"]').filter({ hasText: /Prof\.|Dr\.|Joco/ }).first()
          if (await convo.count()) { await a.click(convo, { settle: 500 }); await a.settle({ extra: 400 }) }
        }, hold: 4000 },
    ],
  },

  // ─── PROFESSOR ────────────────────────────────────────────────────────────
  professor: {
    pace: 1.56,
    title: { eyebrow: 'SmartPass', role: 'Professor', sub: 'Class rosters and attendance, without the paperwork' },
    beats: [
      { caption: 'Enrollment and attendance across every class you teach', hold: 4200 },

      { nav: true, caption: 'Three sections, ten students each',
        do: async (p, a) => { await a.click(nav('My Classes')); await a.settle() }, hold: 3600 },

      { nav: true, caption: 'Open a class for the full attendance matrix',
        do: async (p, a) => { await a.click('text=View attendance'); await a.settle() }, hold: 3600 },

      { caption: 'Per-student totals and attendance rate',
        do: async (p, a) => { await a.scrollTo(200, 1000) }, hold: 3600 },

      { caption: 'Every student, every session, colour-coded',
        do: async (p, a) => { await a.scrollTo(520, 1100) }, hold: 3800 },

      { caption: 'The record runs the length of the term',
        do: async (p, a) => {
          await p.evaluate(() => {
            const sc = [...document.querySelectorAll('div')].find(d => d.scrollWidth > d.clientWidth + 80)
            if (sc) sc.scrollTo({ left: sc.scrollWidth, behavior: 'smooth' })
          })
          await a.wait(1600)
        }, hold: 3400 },

      { caption: 'Correct a record by hand when you need to',
        do: async (p, a) => {
          await a.scrollTo(0, 800)
          await a.click('button:has-text("Log Attendance")')
          await a.wait(1200)
        }, hold: 3800 },

      { caption: 'Or simulate a card tap for a student on the spot',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(800)
          await a.click('button:has-text("Simulate RFID Scan")')
          await a.wait(1300)
        }, hold: 3800 },

      { nav: true, caption: 'Each section keeps its own roster and schedule',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(600)
          await a.click(nav('My Classes'))
          await a.settle()
          const cards = p.locator('text=View attendance')
          if (await cards.count() > 1) { await a.click(cards.nth(1)); await a.settle() }
        }, hold: 4000 },

      { nav: true, caption: 'Threshold breaches surface as notifications',
        do: async (p, a) => { await a.click(nav('Notifications')); await a.settle() }, hold: 3600 },

      { nav: true, caption: 'And a direct line to students and guidance',
        do: async (p, a) => {
          await a.click(nav('Messages'))
          await a.settle()
          // MessagesPage has no skeleton — it renders "No conversations yet"
          // while loading, which settle() can't detect. Wait for a real row.
          await p.waitForSelector('[role="button"]', { timeout: 8000 }).catch(() => {})
          await a.wait(500)
          const convo = p.locator('[role="button"]').filter({ hasText: /Dr\.|Student|Joco/ }).first()
          if (await convo.count()) { await a.click(convo, { settle: 500 }); await a.settle({ extra: 400 }) }
        }, hold: 3800 },

      { nav: true, caption: 'Support tickets, tracked to resolution',
        do: async (p, a) => { await a.click(nav('Support Tickets')); await a.settle() }, hold: 3800 },
    ],
  },

  // ─── COUNSELOR ────────────────────────────────────────────────────────────
  counselor: {
    pace: 1.4,
    title: { eyebrow: 'SmartPass', role: 'Guidance Counselor', sub: 'Spot students at risk before it becomes a crisis' },
    beats: [
      { caption: 'Caseload risk distribution, updated as students check in', hold: 4400 },

      { caption: 'Eight weeks of risk split, week by week',
        do: async (p, a) => { await a.scrollTo(280, 1000) }, hold: 3800 },

      { nav: true, caption: 'Every wellness log across the caseload',
        do: async (p, a) => { await a.scrollTo(0, 600); await a.click(nav('Wellness Logs')); await a.settle() }, hold: 3600 },

      { caption: 'Filter by risk level to triage quickly',
        do: async (p, a) => {
          const sel = p.locator('select').first()
          await a.moveTo(sel); await a.wait(350)
          await sel.selectOption({ index: 2 }).catch(() => {})
          await a.settle({ extra: 500 })
        }, hold: 3400 },

      { caption: 'Or narrow to just what nobody has looked at yet',
        do: async (p, a) => {
          const sel = p.locator('select').first()
          await sel.selectOption({ index: 0 }).catch(() => {})
          await a.settle({ extra: 300 })
          await a.click('input[type="checkbox"]', { settle: 400 })
          await a.settle({ extra: 500 })
        }, hold: 3600 },

      { caption: 'Paged, so a full term stays manageable',
        do: async (p, a) => {
          await a.click('input[type="checkbox"]', { settle: 300 })
          await a.settle({ extra: 400 })
          await a.scrollTo(700, 900)
          const page2 = p.getByRole('button', { name: '2', exact: true })
          if (await page2.count()) { await a.click(page2, { settle: 400 }); await a.settle({ extra: 400 }) }
        }, hold: 3400 },

      { caption: 'Review a log, set a risk level, leave a note',
        do: async (p, a) => {
          await a.scrollTo(0, 700)
          await a.click('button:has-text("Review")')
          await a.wait(1400)
        }, hold: 4200 },

      { nav: true, caption: 'Appointments, with status tracked end to end',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(700)
          await a.click(nav('Appointments'))
          await a.settle()
        }, hold: 3800 },

      { caption: 'Approve, decline, complete — or reschedule',
        do: async (p, a) => {
          await a.click('button:has-text("Update")')
          await a.wait(1300)
        }, hold: 3600 },

      { caption: 'Choosing Rescheduled asks for the new time',
        do: async (p, a) => {
          // Scope to the modal: the page behind it has its own status filter
          // select, and an unscoped .last() is a coin flip between them.
          const sel = p.locator('div.fixed.inset-0 select').first()
          await a.moveTo(sel); await a.wait(400)
          await sel.selectOption('Rescheduled').catch(() => {})
          await a.wait(1600)
        }, hold: 4000 },

      { nav: true, caption: 'Critical flags arrive as notifications',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(700)
          await a.click(nav('Notifications'))
          await a.settle()
        }, hold: 3600 },

      { nav: true, caption: 'And a private channel to every student on the caseload',
        do: async (p, a) => {
          await a.click(nav('Messages'))
          await a.settle()
          // MessagesPage has no skeleton — it renders "No conversations yet"
          // while loading, which settle() can't detect. Wait for a real row.
          await p.waitForSelector('[role="button"]', { timeout: 8000 }).catch(() => {})
          await a.wait(500)
          const convo = p.locator('[role="button"]').filter({ hasText: /Joco|Student|Prof\./ }).first()
          if (await convo.count()) { await a.click(convo, { settle: 500 }); await a.settle({ extra: 400 }) }
        }, hold: 3800 },
    ],
  },

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  admin: {
    pace: 1.42,
    title: { eyebrow: 'SmartPass', role: 'Administration', sub: 'Institution-wide attendance and wellbeing' },
    // This dashboard shows "0" and its own empty copy while loading rather than
    // a skeleton, so settle() can't detect it — wait for the copy to clear.
    notReadyText: ['No trend data yet', 'No program data yet'],
    beats: [
      { caption: 'Key metrics across the whole institution', hold: 4400 },

      { caption: 'Attendance trends over the term',
        do: async (p, a) => { await a.scrollTo(300, 1000) }, hold: 3800 },

      { caption: 'Wellbeing distribution across the student body',
        do: async (p, a) => { await a.scrollTo(520, 1000) }, hold: 3600 },

      { caption: 'Per-program breakdown, side by side',
        do: async (p, a) => { await a.scrollTo(760, 1000) }, hold: 3600 },

      { caption: 'A full attendance report, student by student',
        do: async (p, a) => { await a.scrollTo(1050, 1000) }, hold: 3800 },

      { caption: 'Switch the same view to wellbeing reporting',
        do: async (p, a) => {
          const tab = p.getByRole('button', { name: /wellness report/i })
          await a.click(tab)
          await a.settle({ extra: 600 })
        }, hold: 4000 },

      { nav: true, caption: 'Academic structure — courses and everything around them',
        do: async (p, a) => {
          await a.click(nav('Academic')); await a.settle()
          // The default tab (Academic Years) renders "No records."; Courses has rows.
          await a.click('button:has-text("Courses")'); await a.settle({ extra: 400 })
        }, hold: 3800 },

      { caption: 'Programs, grouped under their department',
        do: async (p, a) => { await a.click('button:has-text("Programs")'); await a.settle({ extra: 400 }) }, hold: 3400 },

      { caption: 'And the class sections students actually enrol in',
        do: async (p, a) => { await a.click('button:has-text("Class Sections")'); await a.settle({ extra: 400 }) }, hold: 3800 },

      { nav: true, caption: 'Enrollment, managed per student',
        do: async (p, a) => {
          await a.click(nav('Enrollment'))
          await a.settle()
          // The right pane is an empty prompt until a student is picked.
          const first = p.locator('button, li, div[role="button"]').filter({ hasText: /2024-CS-/ }).first()
          if (await first.count()) { await a.click(first, { settle: 450 }); await a.settle({ extra: 400 }) }
        }, hold: 4200 },

      { nav: true, caption: 'A shared support queue across the institution',
        do: async (p, a) => { await a.click(nav('Support Queue')); await a.settle() }, hold: 3800 },

      { nav: true, caption: 'With alerts when a cohort needs attention',
        do: async (p, a) => { await a.click(nav('Notifications')); await a.settle() }, hold: 3600 },
    ],
  },

  // ─── SYSADMIN ─────────────────────────────────────────────────────────────
  sysadmin: {
    pace: 1.59,
    title: { eyebrow: 'SmartPass', role: 'System Administrator', sub: 'Oversight across accounts, approvals and audit' },
    beats: [
      { caption: 'System health, user breakdown and recent activity', hold: 4400 },

      { caption: 'Every account on the system, by role',
        do: async (p, a) => { await a.scrollTo(220, 1000) }, hold: 3600 },

      { caption: 'Live activity feed and the open support queue',
        do: async (p, a) => { await a.scrollTo(520, 1000) }, hold: 3800 },

      { nav: true, caption: 'Every account, searchable instantly',
        do: async (p, a) => {
          await a.scrollTo(0, 500)
          await a.click(nav('Accounts'))
          await a.settle()
          await a.type('input[placeholder*="Search name"]', 'cruz', 95)
          await a.wait(1000)
        }, hold: 3200 },

      { caption: 'Filter the directory by role',
        do: async (p, a) => {
          await p.locator('input[placeholder*="Search name"]').first().fill('')
          await a.wait(600)
          const sel = p.locator('select').first()
          await a.moveTo(sel); await a.wait(400)
          await sel.selectOption({ index: 1 }).catch(() => {})
          await a.wait(1200)
        }, hold: 3400 },

      { nav: true, caption: 'Approval requests routed for review',
        do: async (p, a) => { await a.click(nav('Approvals')); await a.settle() }, hold: 3600 },

      { caption: 'Approve or reject, with the full request payload in view',
        do: async (p, a) => {
          await a.click('button:has-text("Review")')
          await a.wait(1400)
        }, hold: 4200 },

      { nav: true, caption: 'A complete audit trail of every change',
        do: async (p, a) => {
          await a.closeModal()
          await a.wait(700)
          await a.click(nav('Audit Logs'))
          await a.settle()
        }, hold: 3800 },

      { caption: 'Filterable by severity, category and date',
        do: async (p, a) => {
          const sel = p.locator('select').nth(1)
          await a.moveTo(sel); await a.wait(400)
          // Only pick values known to have rows — several categories are empty.
          await sel.selectOption({ index: 1 }).catch(() => {})
          await a.settle({ extra: 500 })
        }, hold: 3600 },

      { nav: true, caption: 'System settings, applied live',
        do: async (p, a) => { await a.click(nav('Settings')); await a.settle() }, hold: 3600 },

      { caption: 'Toggle a setting and it saves immediately',
        do: async (p, a) => {
          // Deliberately NOT Maintenance Mode — that one locks every login.
          const card = p.locator('div').filter({ hasText: /Live Alerts/ }).last()
          const toggle = card.locator('button').first()
          if (await toggle.count()) { await a.click(toggle, { settle: 450 }); await a.wait(1600) }
        }, hold: 3400 },

      { caption: 'Toggled back — nothing left changed',
        do: async (p, a) => {
          const card = p.locator('div').filter({ hasText: /Live Alerts/ }).last()
          const toggle = card.locator('button').first()
          if (await toggle.count()) { await a.click(toggle, { settle: 400 }); await a.wait(1500) }
        }, hold: 3000 },

      { nav: true, caption: 'And the support queue, end to end',
        do: async (p, a) => { await a.click(nav('Support Queue')); await a.settle() }, hold: 3800 },
    ],
  },

  // ─── PERSONALISATION ──────────────────────────────────────────────────────
  // Every role gets these, so showing them once here keeps the five role clips
  // about what actually differs between roles.
  personalisation: {
    pace: 1.21,
    title: { eyebrow: 'SmartPass', role: 'Make It Yours', sub: 'Every account personalises its own workspace' },
    notReadyText: ['No trend data yet', 'No mood data yet'],
    beats: [
      { nav: true, caption: 'Appearance settings live on every account',
        do: async (p, a) => { await a.click(nav('My Account')); await a.settle() }, hold: 3400 },

      { caption: 'Pick an accent — the whole interface recolours instantly',
        do: async (p, a) => {
          await a.click('button[aria-label="Violet"]')
          await a.wait(1500)
          await a.click('button[aria-label="Amber"]')
          await a.wait(1500)
          await a.click('button[aria-label="Sky"]')
          await a.wait(1200)
        }, hold: 3000 },

      { caption: 'Or bring your own — any colour, by hex',
        do: async (p, a) => {
          await a.type('input[aria-label="Custom accent hex value"]', '#C2410C', 110)
          await a.wait(1600)
        }, hold: 3200 },

      { caption: 'Readable text is worked out automatically, whatever you pick',
        do: async (p, a) => {
          await a.type('input[aria-label="Custom accent hex value"]', '#FACC15', 110)
          await a.wait(1800)
        }, hold: 3600 },

      { caption: 'Colours close to a status meaning get a quiet heads-up',
        do: async (p, a) => {
          await a.type('input[aria-label="Custom accent hex value"]', '#DC2626', 110)
          await a.wait(1700)
        }, hold: 3800 },

      { caption: 'Dark mode, applied across every screen',
        do: async (p, a) => {
          await a.click('button[aria-label="Teal"]')
          await a.wait(900)
          await a.click('button:has-text("Dark")')
          await a.wait(1600)
        }, hold: 3400 },

      { caption: 'Compact density fits noticeably more on screen',
        do: async (p, a) => {
          await a.click('button:has-text("Compact")')
          await a.wait(1700)
        }, hold: 3600 },

      { caption: 'Expand the sidebar when you want labels instead of icons',
        do: async (p, a) => {
          await a.click('button:has-text("Expanded")')
          await a.wait(1700)
        }, hold: 3400 },

      { nav: true, caption: 'Dashboards are rearrangeable too',
        do: async (p, a) => {
          await a.click('button:has-text("Comfortable")')
          await a.wait(800)
          await a.click('button:has-text("Light")')
          await a.wait(900)
          await a.click(nav('Dashboard'))
          await a.settle()
          await a.click('button:has-text("Customise")')
          await a.wait(1300)
        }, hold: 3400 },

      { caption: 'Drag a card to reorder it',
        do: async (p, a) => {
          await a.dragWidget(2, 1)
          await a.wait(900)
        }, hold: 3400 },

      { caption: 'Resize it — four widths per card',
        do: async (p, a) => {
          const steppers = p.locator('[aria-label*="of 4 columns"]')
          await a.click(steppers.nth(1), { settle: 400 })
          await a.wait(1400)
        }, hold: 3200 },

      { caption: 'Hide what you don\'t use',
        do: async (p, a) => {
          await a.click('[aria-label^="Hide"]')
          await a.wait(1500)
        }, hold: 3200 },

      { caption: 'And put it all back with one click',
        do: async (p, a) => {
          await a.click('button:has-text("Reset layout")')
          await a.wait(1600)
          await a.click('button:has-text("Done")')
          await a.wait(900)
        }, hold: 3600 },
    ],
  },
}
