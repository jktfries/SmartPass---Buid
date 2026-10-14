/* Builds the two submission documents. Run: node build-docs.js */

const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  ImageRun, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, PageBreak, LevelFormat, convertInchesToTwip,
} = require('docx')

const HERE = __dirname
const SHOTS = path.join(HERE, 'screenshots')

const LETTER = { size: { width: 12240, height: 15840 } }
const MARGIN = { top: 1440, right: 1440, bottom: 1440, left: 1440 }
const CONTENT_DXA = 12240 - 2880           // 9360 DXA = 6.5"
const TEAL = '0D9488'
const INK = '14212E'
const MUTED = '5B6B7C'

const MEMBERS = [
  'CABALLERO, Josel Henri L.',
  'CAGATIN, John Viclouis P.',
  'GAFFUD, Yra Geinna B.',
  'JOCOM, Nathan Absalom C.',
]

const numbering = {
  config: [
    {
      reference: 'bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.7), hanging: convertInchesToTwip(0.2) } } } },
      ],
    },
  ],
}

// ── small builders ──────────────────────────────────────────────────────────
const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: INK, font: 'Calibri' })],
})
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 },
  children: [new TextRun({ text: t, bold: true, size: 25, color: TEAL, font: 'Calibri' })],
})
const h3 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 },
  children: [new TextRun({ text: t, bold: true, size: 22, color: INK, font: 'Calibri' })],
})
const p = (t, opts = {}) => new Paragraph({
  spacing: { after: 140, line: 276 }, alignment: opts.align,
  children: [new TextRun({ text: t, size: 22, color: opts.color || INK, font: 'Calibri', italics: opts.italics, bold: opts.bold })],
})
const bullet = (t, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  spacing: { after: 70, line: 264 },
  children: [new TextRun({ text: t, size: 22, color: INK, font: 'Calibri' })],
})
const labelled = (label, body) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { after: 70, line: 264 },
  children: [
    new TextRun({ text: label + ' ', bold: true, size: 22, color: INK, font: 'Calibri' }),
    new TextRun({ text: body, size: 22, color: INK, font: 'Calibri' }),
  ],
})
const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] })
const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

function table(headers, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0)
  const scaled = widths.map(w => Math.round((w / sum) * CONTENT_DXA))
  const cell = (text, { bold = false, head = false } = {}, i = 0) => new TableCell({
    width: { size: scaled[i], type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: 'F1F5F9' } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 252 },
      children: [new TextRun({ text, bold: bold || head, size: 20, color: INK, font: 'Calibri' })],
    })],
  })
  return new Table({
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    columnWidths: scaled,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((hd, i) => cell(hd, { head: true }, i)) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(String(c), {}, i)) })),
    ],
  })
}

function figure(file, caption, n) {
  const data = fs.readFileSync(path.join(SHOTS, file))
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 60 },
      children: [new ImageRun({ data, type: 'png', transformation: { width: 600, height: 375 } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: 'Figure ' + n + '. ' + caption, size: 18, italics: true, color: MUTED, font: 'Calibri' })],
    }),
  ]
}

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT 1 — FA2.2
// ════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  ['Attendance Management', [
    ['RFID presence logging.', 'Students tap an RFID card at a reader and attendance is written against the matching class section automatically, with no manual roll call.'],
    ['Automatic status determination.', 'The system compares the scan time against the class start time plus a configurable late threshold and records the student as present or late without staff input.'],
    ['Per-course attendance records.', 'Each enrolled course keeps a running summary of present, late, absent and excused sessions, with an expandable dated breakdown of every session.'],
    ['Manual logging and correction.', 'Professors can record or amend an attendance entry by hand for a specific student and date when a reader is unavailable or a record is disputed.'],
    ['Absence threshold alerts.', 'Warning and critical thresholds are configured per class section; crossing one raises a notification to the student and the professor.'],
    ['Class attendance matrix.', 'A single view showing every enrolled student against every session held, colour-coded by status, with per-student totals and attendance rates.'],
  ]],
  ['Emotional Wellness Monitoring', [
    ['Multi-modal wellness check-in.', 'Combines facial expression analysis, voice analysis and a combined AI assessment to estimate a student’s emotional state.'],
    ['Standard mood check-in.', 'A three-step guided form in which a student selects a mood, tags contributing factors such as academic stress or workload, and adds optional notes.'],
    ['Risk classification.', 'Each wellness entry is assigned a risk level of normal, struggling or critical, derived from the reported mood and contributing factors.'],
    ['Counselor review and triage.', 'Counselors filter the caseload by risk level, isolate entries nobody has reviewed yet, and record an override risk level with private notes.'],
    ['Caseload analytics.', 'A risk distribution chart and an eight-week risk trend show how the assigned student population is moving over time.'],
    ['Counseling appointments.', 'Students request sessions and counselors approve, decline, reschedule, complete or cancel them, with a date and time captured on reschedule.'],
  ]],
  ['Communication', [
    ['In-app direct messaging.', 'Private threaded conversations between students and staff, including file and image attachments.'],
    ['Notifications.', 'Attendance breaches, wellness flags, appointment updates and new messages are surfaced in a notification centre with read and unread states.'],
    ['Support ticketing.', 'Users raise tickets against categories such as account, attendance, technical or wellness, each with a priority and a status tracked to resolution.'],
    ['Broadcast announcements.', 'Administrators compose an announcement that is delivered to every user of the system at once.'],
  ]],
  ['Academic Administration', [
    ['Academic structure management.', 'Academic years, terms, departments, programs, sections, courses and class sections are each maintained from a single tabbed interface.'],
    ['Enrollment management.', 'Students are enrolled into or dropped from class sections individually, with their current enrollments listed alongside.'],
    ['Institution-wide reporting.', 'Dashboards covering attendance rate, total absences, wellness log volume and per-program performance, switchable between attendance and wellbeing views.'],
    ['Data export.', 'Attendance and wellness reports are exportable to CSV for offline analysis.'],
  ]],
  ['System Administration', [
    ['Role-based access control.', 'Five distinct roles — Student, Professor, Guidance Counselor, Academic Administrator and System Administrator — each see only the screens and data their role permits.'],
    ['Account management.', 'Accounts are created, searched, filtered by role and deactivated from a central directory.'],
    ['Approval workflow.', 'Requests such as excused absences and enrollment overrides are routed for review, with the full request payload visible before a decision is recorded.'],
    ['Audit trail.', 'Every successful change to the system is logged with actor, action, category, severity and timestamp, and is filterable and exportable.'],
    ['System settings.', 'Maintenance mode, live alerts, automatic synchronisation and a global RFID grace period are toggled centrally and take effect immediately.'],
  ]],
  ['Personalisation', [
    ['Accent colour.', 'Seven preset accent colours plus a custom picker accepting any hexadecimal value, applied across the entire interface.'],
    ['Readable contrast.', 'Foreground text on accent-coloured controls is recalculated automatically so any chosen colour remains legible.'],
    ['Dark mode and layout density.', 'A light, dark or system-matched theme, and a comfortable or compact layout density that adjusts spacing throughout.'],
    ['Sidebar mode.', 'The navigation rail switches between a compact icon-only strip and a labelled expanded form.'],
    ['Dashboard customisation.', 'Dashboard cards are reordered by dragging, resized across four widths, hidden individually, and restored to defaults in one action.'],
  ]],
]

const PROFILES = [
  {
    role: 'Students',
    age: '16 – 25 (predominantly 18 – 22)',
    gender: 'All genders; no feature is gender-dependent',
    tech: 'High. Daily smartphone and laptop users, comfortable with web applications without training.',
    goals: 'Track their own attendance standing, understand how close they are to an absence threshold, log how they are coping, and request counseling discreetly.',
    pains: 'Manual roll call wastes class time and is error-prone; attendance disputes are hard to settle; asking for mental health support in person carries social cost.',
  },
  {
    role: 'Professors / Faculty',
    age: '25 – 65',
    gender: 'All genders',
    tech: 'Moderate to high. Familiar with learning management systems; prefer interfaces that require no training.',
    goals: 'Take attendance without disrupting the lecture, see which students are at risk of exceeding absence limits, and correct records when a reader fails.',
    pains: 'Paper roll call consumes teaching time; spotting an at-risk student across several sections requires manual tallying.',
  },
  {
    role: 'Guidance Counselors',
    age: '28 – 60',
    gender: 'All genders',
    tech: 'Moderate. Comfortable with records systems; value clarity over density.',
    goals: 'Identify students in distress early, triage a caseload by severity, keep session notes, and manage an appointment calendar.',
    pains: 'Students in difficulty are usually identified only after a crisis; wellness information is scattered and not linked to attendance patterns.',
  },
  {
    role: 'Academic Administrators / Registrar Staff',
    age: '25 – 60',
    gender: 'All genders',
    tech: 'Moderate to high. Heavy spreadsheet users.',
    goals: 'Maintain the academic structure, manage enrollment, and report institution-wide attendance and wellbeing to leadership.',
    pains: 'Consolidating attendance across programs is manual and slow; data is inconsistent between departments.',
  },
  {
    role: 'IT / System Administrators',
    age: '22 – 55',
    gender: 'All genders',
    tech: 'High. Expect fine-grained control and full visibility.',
    goals: 'Manage accounts and permissions, review approval requests, audit every change, and take the system offline safely for maintenance.',
    pains: 'Without an audit trail, changes cannot be traced; account administration across several systems is duplicated effort.',
  },
]

const FIGURES = [
  ['01-login.png', 'Sign-in screen with role-based authentication'],
  ['02-student-dashboard.png', 'Student dashboard: attendance rate, presence counts, weekly trend and mood history'],
  ['03-student-attendance.png', 'Student attendance: per-course summary with the dated session record expanded'],
  ['04-student-rfid-scan.png', 'Simulated RFID tap, with the class section selected before logging'],
  ['05-student-wellness-multimodal.png', 'Multi-modal wellness check-in: facial, voice and combined AI assessment'],
  ['06-student-wellness-log.png', 'Standard mood check-in, step one of three'],
  ['07-professor-dashboard.png', 'Professor dashboard: class count, total enrollment and average class size'],
  ['08-professor-classes.png', 'Class sections taught, with enrollment and schedule per section'],
  ['09-professor-attendance-matrix.png', 'Class attendance matrix: every student against every session, colour-coded by status'],
  ['10-professor-log-attendance.png', 'Manual attendance entry for a single student and date'],
  ['11-counselor-dashboard.png', 'Counselor dashboard: caseload risk distribution and eight-week risk trend'],
  ['12-counselor-wellness-logs.png', 'Wellness logs across the assigned caseload, filterable by risk level'],
  ['13-counselor-review-log.png', 'Reviewing a wellness log with a risk override and counselor notes'],
  ['14-counselor-appointments.png', 'Counseling appointments with full status lifecycle'],
  ['15-admin-dashboard.png', 'Institution-wide metrics: attendance rate, absences and wellness log volume'],
  ['16-admin-reports.png', 'Attendance report by student, switchable to wellbeing reporting'],
  ['17-admin-academic-structure.png', 'Academic structure: class sections with course, term, professor and schedule'],
  ['18-admin-enrollment.png', 'Enrollment management for an individual student'],
  ['19-sysadmin-dashboard.png', 'System administrator dashboard: user breakdown, recent activity and open tickets'],
  ['20-sysadmin-accounts.png', 'Central account directory with search and role filtering'],
  ['21-sysadmin-approval-review.png', 'Approval request review showing the full submitted payload'],
  ['22-sysadmin-audit-logs.png', 'Audit trail of every change, filterable by category, severity and date'],
  ['23-sysadmin-settings.png', 'System settings applied live across the platform'],
  ['24-appearance-personalisation.png', 'Personalisation: accent colour, theme, density and sidebar mode'],
]

function buildFeaturesDoc() {
  const children = []

  // Title page
  children.push(spacer(1800))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: 'SmartPass', bold: true, size: 56, color: TEAL, font: 'Calibri' })],
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 500 },
    children: [new TextRun({ text: 'A Multi-Modal Attendance and Emotional Wellness Monitoring System', size: 26, color: INK, font: 'Calibri' })],
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 700 },
    children: [new TextRun({ text: 'Features of the Application, User Profile, and Graphical User Interface', bold: true, size: 24, color: INK, font: 'Calibri' })],
  }))
  children.push(p('ITS142P – Human-Computer Interaction 2', { align: AlignmentType.CENTER }))
  children.push(p('ITS142P_FOPM01_1Q2627  ·  Group 1', { align: AlignmentType.CENTER }))
  children.push(spacer(400))
  children.push(p('Submitted by:', { align: AlignmentType.CENTER, bold: true }))
  MEMBERS.forEach(m => children.push(p(m, { align: AlignmentType.CENTER })))
  children.push(pageBreak())

  // I. Overview
  children.push(h1('I.  Project Overview'))
  children.push(p('SmartPass is a web-based campus platform that brings together two responsibilities that are normally handled separately: recording whether students are physically present, and noticing when they are not coping.'))
  children.push(p('Attendance is captured automatically through RFID card taps. When a student taps in, the system identifies the class section, compares the time of the tap against the scheduled start time plus a configurable grace period, and records the student as present or late without any staff intervention. Thresholds are set per class section, so once a student accumulates enough absences or late arrivals, warnings are raised to both the student and the professor before the situation becomes unrecoverable.'))
  children.push(p('Alongside this, students complete wellness check-ins. These can be a short guided form in which they select a mood and tag what is contributing to it, or a multi-modal assessment that combines facial expression analysis, voice analysis and a combined evaluation. Each entry is assigned a risk level, and guidance counselors work from a single triage view where the caseload can be filtered by severity and reviewed systematically rather than reactively.'))
  children.push(p('Because attendance and wellbeing sit in the same system, a pattern of absences and a pattern of declining mood are visible to the same people at the same time, which is the point: the two are usually related, and institutions normally only connect them after an incident.'))
  children.push(p('Access is governed by five roles — Student, Professor, Guidance Counselor, Academic Administrator and System Administrator — each with its own dashboard and permissions, so sensitive wellness data is visible only to those responsible for it.'))

  // II. Features
  children.push(pageBreak())
  children.push(h1('II.  Functions and Features'))
  children.push(p('The system’s capabilities are grouped below by the area of the institution they serve.'))
  FEATURES.forEach(([group, items], gi) => {
    children.push(h2((gi + 1) + '.  ' + group))
    items.forEach(([label, body]) => children.push(labelled(label, body)))
  })

  // III. Target users
  children.push(pageBreak())
  children.push(h1('III.  Target User Profile'))
  children.push(p('SmartPass is designed for a university campus population. Five stakeholder groups use the system directly, each with a different relationship to the data it holds. No function of the system differs by gender; the profiles below describe all genders within each group.'))
  children.push(spacer(100))
  children.push(table(
    ['Stakeholder group', 'Age range', 'Technical proficiency'],
    PROFILES.map(x => [x.role, x.age, x.tech.split('.')[0] + '.']),
    [34, 22, 44],
  ))
  children.push(spacer(260))
  PROFILES.forEach(x => {
    children.push(h3(x.role))
    children.push(labelled('Age range:', x.age))
    children.push(labelled('Gender:', x.gender))
    children.push(labelled('Technical proficiency:', x.tech))
    children.push(labelled('Primary goals:', x.goals))
    children.push(labelled('Problems the system addresses:', x.pains))
  })

  // IV. GUI
  children.push(pageBreak())
  children.push(h1('IV.  Graphical User Interface'))
  children.push(p('The following screens show the major functions of the system across all five roles. All screenshots were taken from a running instance of the application.'))
  FIGURES.forEach(([file, caption], i) => {
    figure(file, caption, i + 1).forEach(el => children.push(el))
  })

  return new Document({
    numbering,
    creator: MEMBERS[0],
    title: 'SmartPass — Features of the Application, User Profile, and Graphical User Interface',
    description: 'ITS142P_FOPM01_1Q2627 · Group 1',
    sections: [{ properties: { page: { size: LETTER.size, margin: MARGIN } }, children }],
  })
}

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT 2 — SA2.0 narration script
// ════════════════════════════════════════════════════════════════════════════
const BLOCKS = [
  {
    member: 'CABALLERO, Josel Henri L.',
    title: 'Block 1 — Introduction and Student Role',
    range: '0:00 – 1:31',
    lines: [
      ['0:03', 'Title card — "Student"',
        'Good day. We are Group 1, and this is SmartPass — a multi-modal attendance and emotional wellness monitoring system for university campuses. We will walk through it as each of its five user roles sees it.'],
      ['0:16', 'Student dashboard: attendance ring, counters, trend and mood',
        'We begin with the student. The dashboard opens on their standing — overall attendance rate, sessions present, absent and late, weekly attendance across the term, and a two-week mood trend.'],
      ['0:25', 'Attendance page; a course expands to show dated records',
        'The attendance page summarises every enrolled course. Expanding one reveals the full dated record, session by session.'],
      ['0:34', 'Simulate RFID Scan dialog; class selected',
        'Attendance itself is captured by RFID. Here a tap is simulated — the student selects the class and taps.'],
      ['0:44', 'Scan result: status recorded automatically',
        'The system sets the status itself, comparing the tap against the scheduled start plus a grace period. No roll call, and no staff input.'],
      ['0:53', 'Wellness check-in; multi-modal splash screen',
        'The second half of the student experience is wellness. The multi-modal check-in combines facial expression analysis, voice analysis and a combined assessment.'],
      ['1:02', 'Standard mood log; mood selected, then contributing factors',
        'For a faster entry, the standard check-in captures a mood and the factors driving it in a few seconds.'],
      ['1:13', 'Appointments list',
        'Counseling appointments can be requested and tracked from the same place.'],
      ['1:22', 'Notifications, then direct messages',
        'Alerts for attendance breaches and wellness flags arrive here, alongside direct messaging with staff.'],
    ],
  },
  {
    member: 'CAGATIN, John Viclouis P.',
    title: 'Block 2 — Professor and Guidance Counselor',
    range: '1:31 – 4:28',
    lines: [
      ['1:36', 'Title card — "Professor"; dashboard loads',
        'Next, the professor. Their dashboard summarises every class they teach — the number of sections, total enrollment across them, and average class size.'],
      ['1:49', 'My Classes; three class sections listed',
        'Each section is listed with its course, schedule and room, so a professor teaching several groups can move between them without hunting.'],
      ['1:58', 'Class attendance matrix, colour-coded by status',
        'Opening one gives the class attendance matrix: every enrolled student against every session held this term. Patterns that would otherwise take a spreadsheet to find are visible immediately.'],
      ['2:08', 'Per-student totals and attendance rates',
        'Each student carries their own running totals and attendance rate, so the professor can see who is approaching a threshold without tallying anything by hand.'],
      ['2:17', 'Matrix scrolled across the full term',
        'The record runs the length of the term, so a run of absences beginning is obvious rather than buried.'],
      ['2:26', 'Log Attendance dialog opens',
        'When a reader is unavailable or a record is disputed, attendance can be corrected manually for a specific student and date.'],
      ['2:36', 'Simulate RFID Scan for an individual student',
        'A card tap can also be simulated for one student on the spot.'],
      ['2:44', 'A second class section opened',
        'Each section keeps its own roster and schedule.'],
      ['2:52', 'Notifications; messages; support tickets',
        'Threshold breaches reach the professor as notifications, and direct messaging connects them to students and to guidance.'],
      ['3:06', 'Title card — "Guidance Counselor"; risk distribution and trend',
        'The guidance counselor works from a different vantage point. Their dashboard opens on the risk distribution across the entire assigned caseload, with an eight-week trend showing how that distribution is moving.'],
      ['3:22', 'Wellness logs table; filtered by risk level',
        'Every wellness check-in submitted by their students is collected here, and the caseload can be filtered by risk level so the most serious cases surface first.'],
      ['3:36', 'Unreviewed-only filter applied',
        'It can also be narrowed to only the entries nobody has looked at yet.'],
      ['3:45', 'Pagination through the full caseload',
        'And it is paged, so a full term of check-ins stays manageable rather than overwhelming.'],
      ['3:54', 'Review dialog; risk override and counselor notes',
        'Reviewing a log lets the counselor confirm or override the risk level the system assigned, and attach private notes for continuity between sessions.'],
      ['4:04', 'Appointments; update dialog opens',
        'Counseling appointments are tracked end to end — pending, approved, declined, completed, cancelled or rescheduled.'],
      ['4:14', 'Rescheduled selected; date and time field appears',
        'Choosing to reschedule asks for the new date and time before the change is accepted, so an appointment is never left without one.'],
      ['4:22', 'Notifications and messages',
        'Critical flags arrive as notifications, and a private channel connects the counselor to every student on the caseload.'],
    ],
  },
  {
    member: 'GAFFUD, Yra Geinna B.',
    title: 'Block 3 — Academic Administration and System Administration',
    range: '4:28 – 7:21',
    lines: [
      ['4:34', 'Title card — "Administration"; institution-wide metrics',
        'The academic administrator sees the institution rather than the individual. Attendance rate, total absences and wellness log volume are aggregated across the entire student body.'],
      ['4:46', 'Attendance trend across the term; wellbeing distribution',
        'Attendance is trended at institution scale, which is where a systemic problem shows up — a week where attendance drops across every program at once reads very differently from one student falling behind.'],
      ['4:56', 'Per-program rates; full attendance report',
        'Performance is broken down per program so faculties can be compared directly, and a full report lists every student with their present, late, absent and excused totals.'],
      ['5:04', 'Report switched to wellbeing reporting',
        'The same view switches to wellbeing reporting, and both export to CSV for offline analysis.'],
      ['5:13', 'Academic structure; courses and programs',
        'The academic structure is maintained here — academic years, terms, departments, programs, sections and courses.'],
      ['5:29', 'Class sections tab',
        'And the class sections students actually enrol in, each with its course, term, professor, room and schedule.'],
      ['5:38', 'Enrollment manager; a student selected',
        'Enrollment is managed per student, adding or dropping them from class sections directly.'],
      ['5:46', 'Support queue',
        'A shared support queue runs across the institution.'],
      ['5:58', 'Title card — "System Administrator"; dashboard',
        'Finally, the system administrator. Their dashboard reports on the platform itself: total accounts broken down by role, recent system activity, and the open support queue.'],
      ['6:13', 'Accounts directory; search',
        'Every account is searchable instantly from a central directory, so administering a campus-sized user base does not mean scrolling.'],
      ['6:30', 'Directory filtered by role',
        'It can also be filtered by role.'],
      ['6:39', 'Approvals list; review dialog showing the payload',
        'Requests such as excused absences and enrollment overrides are routed here for review. The full submitted payload is visible before any decision is recorded, so approvals are never made blind.'],
      ['6:56', 'Audit logs; filtered by category',
        'Every successful change to the system is written to an audit trail with the actor, the action, its category and its severity — filterable by date and exportable for review.'],
      ['7:06', 'System settings; a toggle switched and saved',
        'Platform-wide settings such as maintenance mode, live alerts and the global RFID grace period are toggled centrally and take effect immediately.'],
      ['7:14', 'Setting toggled back',
        'Changes apply live, and are just as easily reversed.'],
    ],
  },
  {
    member: 'JOCOM, Nathan Absalom C.',
    title: 'Block 4 — Personalisation and Closing',
    range: '7:21 – 8:51',
    lines: [
      ['7:26', 'Title card — "Make It Yours"; account settings open',
        'One capability belongs to every role rather than any single one: personalisation. Each account configures its own workspace, and the settings follow the user to any device.'],
      ['7:38', 'Accent swatches clicked; interface recolours live',
        'Choosing an accent recolours the entire interface instantly — navigation, buttons, charts and highlights all follow in one step.'],
      ['7:48', 'Custom hexadecimal colour entered',
        'Beyond the presets, any colour can be entered by hexadecimal value, and the system recalculates text colour so the interface stays readable whatever is chosen.'],
      ['7:58', 'Warning shown for a colour close to a status colour',
        'It also warns quietly when a colour sits close to one already used to signal a status, such as the red that marks an absence.'],
      ['8:07', 'Dark mode applied across the interface',
        'There is a dark theme applied across every screen.'],
      ['8:16', 'Compact density; sidebar expanded to labels',
        'A compact density fits noticeably more on screen, and the sidebar switches between icons and full labels.'],
      ['8:26', 'Dashboard in customise mode',
        'Dashboards themselves are rearrangeable.'],
      ['8:34', 'A card dragged into a new position, then resized',
        'Cards can be dragged into a new order and resized across four widths.'],
      ['8:43', 'A card hidden; layout reset; closing frames',
        'They can be hidden when they are not useful, and the whole layout returns to its defaults in a single click. That completes our walkthrough of SmartPass — attendance captured automatically, wellbeing monitored deliberately, and both visible to the people responsible for acting on them. Thank you for watching.'],
    ],
  },
]

function buildScriptDoc() {
  const children = []

  children.push(spacer(1400))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: 'SmartPass', bold: true, size: 48, color: TEAL, font: 'Calibri' })],
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'Video Presentation — Narration Script', bold: true, size: 28, color: INK, font: 'Calibri' })],
  }))
  children.push(p('ITS142P – Human-Computer Interaction 2', { align: AlignmentType.CENTER }))
  children.push(p('ITS142P_FOPM01_1Q2627  ·  Group 1', { align: AlignmentType.CENTER }))
  children.push(spacer(300))
  children.push(p('Total running time: 8 minutes 51 seconds', { align: AlignmentType.CENTER }))
  children.push(pageBreak())

  children.push(h1('Recording Notes'))
  children.push(bullet('Each member records one continuous block. No block is split mid-section, so the four recordings drop straight onto four time ranges without cutting across a feature.'))
  children.push(bullet('Read at a natural pace — roughly 135 words per minute. The timings below have slack built in; it is better to pause between sentences than to rush.'))
  children.push(bullet('The "On screen" column is the reference to follow. Timecodes were taken from the finished video, but watch the screen rather than a stopwatch — if the picture moves on, move with it.'))
  children.push(bullet('Record in a quiet room, keeping a consistent distance from the microphone. Leave two seconds of silence at the start and end of each block to make alignment easier.'))
  children.push(bullet('Blocks are self-contained, so members may swap them without any rewriting.'))

  children.push(h1('Speaking Assignments'))
  children.push(table(
    ['Member', 'Block', 'Timecode'],
    BLOCKS.map(b => [b.member, b.title.replace(/^Block \d+ — /, ''), b.range]),
    [40, 42, 18],
  ))
  children.push(pageBreak())

  BLOCKS.forEach((b, i) => {
    children.push(h1(b.title))
    children.push(p(b.member + '   ·   ' + b.range, { italics: true, color: MUTED }))
    children.push(spacer(120))
    children.push(table(
      ['Time', 'On screen', 'Narration'],
      b.lines.map(l => [l[0], l[1], l[2]]),
      [10, 28, 62],
    ))
    if (i < BLOCKS.length - 1) children.push(pageBreak())
  })

  return new Document({
    numbering,
    creator: MEMBERS[0],
    title: 'SmartPass — Video Presentation Narration Script',
    description: 'ITS142P_FOPM01_1Q2627 · Group 1',
    sections: [{ properties: { page: { size: LETTER.size, margin: MARGIN } }, children }],
  })
}

// ── write ───────────────────────────────────────────────────────────────────
;(async () => {
  const out1 = path.join(HERE, 'FA2.2 - SmartPass Features, User Profile and GUI.docx')
  const out2 = path.join(HERE, 'SA2.0 - SmartPass Video Presentation Script.docx')

  fs.writeFileSync(out1, await Packer.toBuffer(buildFeaturesDoc()))
  console.log('wrote ' + path.basename(out1))

  fs.writeFileSync(out2, await Packer.toBuffer(buildScriptDoc()))
  console.log('wrote ' + path.basename(out2))

  // Pacing check. A block whose speech is far shorter than its video segment
  // leaves the narrator sitting in silence; far longer means rushing.
  const SECS = { 'Block 1': 91, 'Block 2': 177, 'Block 3': 172, 'Block 4': 90 }
  let total = 0
  BLOCKS.forEach(b => {
    const w = b.lines.reduce((a, l) => a + l[2].split(/\s+/).length, 0)
    total += w
    const key = b.title.match(/Block \d/)[0].replace('Block ', 'Block ')
    const secs = SECS[key]
    const spoken = Math.round(w / 135 * 60)
    const fill = Math.round(spoken / secs * 100)
    console.log('  ' + key + ': ' + String(w).padStart(4) + ' words  ~' + String(spoken).padStart(3) +
      's spoken / ' + String(secs).padStart(3) + 's video  = ' + fill + '% full')
  })
  console.log('  TOTAL  : ' + total + ' words  ~' + Math.round(total / 135 * 60) + 's / 531s video')
})()
