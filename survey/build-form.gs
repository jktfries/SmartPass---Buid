/**
 * Builds the SmartPass usability evaluation form.
 *
 * HOW TO RUN
 *   1. Go to https://script.google.com and create a new project.
 *   2. Delete the placeholder code, paste this whole file in, and Save.
 *   3. Pick `buildForm` from the function dropdown and click Run.
 *   4. Authorise when prompted (it only creates a form on your own Drive).
 *   5. Open View > Logs — the edit URL and the live URL are printed there.
 *
 * Running it again creates a SEPARATE new form; it never edits an existing one.
 *
 * WHY THIS EXISTS — the previous form's rating items were a 1-6 linear scale
 * labelled "Strongly Disagree" on the left and "DNK" on the right, with no
 * "Strongly Agree" anchor. A 6 was therefore ambiguous between maximum
 * agreement and "don't know", which made every quantitative item
 * uninterpretable. Google Forms cannot attach a "Don't Know" option to a
 * linear scale at all, so the rating items are built here as GRIDS, which can
 * carry a real 5-point scale plus a genuine DNK column.
 *
 * Everything you are likely to want to edit is in CONFIG below.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — edit freely; the logic below reads from here.
// ─────────────────────────────────────────────────────────────────────────────

var FORM_TITLE = 'Usability Evaluation of SmartPass: A Multi-Modal Attendance and Emotional Wellness Monitoring System';

var FORM_DESCRIPTION =
  'Thank you for participating in this usability study for SmartPass, a full-stack campus ' +
  'web platform combining automated attendance logging, emotional wellness check-ins, and ' +
  'secure role-based routing.\n\n' +
  'This study evaluates the INTERFACE AND VISUAL DESIGN of the system, not whether its ' +
  'features work. You are being asked to judge things like layout, readability, visual ' +
  'hierarchy, consistency and clarity of feedback.\n\n' +
  'It uses asynchronous video probing. Rather than navigating a live testing server, you ' +
  'will watch five short (about 90-second) demonstrations covering the Student, Professor, ' +
  'Counselor, Academic Admin and System Admin roles, plus a short bonus clip. After each clip ' +
  'you will rate the interface using the scale provided.\n\n' +
  'Please set aside about 15-20 minutes. Your responses are anonymous.\n\n' +
  'Group 1 - ITS142P_FOPM01_1Q2627\n\n' +
  'Researchers:\n' +
  'CABALLERO, JOSEL HENRI L. - jhlcaballero@mymail.mapua.edu.ph\n' +
  'CAGATIN, JOHN VICLOUIS P. - jvpcagatin@mymail.mapua.edu.ph\n' +
  'GAFFUD, YRA GEINNA B. - ygbgaffud@mymail.mapua.edu.ph';

/** The agreement scale. Order matters — it becomes the column order. */
var AGREEMENT = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
  "Don't Know / Not Applicable"
];

var SCALE_HELP =
  'Rate each statement based only on what you saw in the video above, judging the ' +
  'interface design rather than whether the feature is useful. ' +
  "Choose \"Don't Know / Not Applicable\" if the clip did not show enough for you to judge.";

/**
 * One entry per role section.
 *
 * Two rules govern every statement here.
 *
 * 1. It must be about INTERFACE DESIGN — visual hierarchy, density, grouping,
 *    readability, consistency, feedback — not about whether a feature is
 *    useful or works. This is an HCI evaluation; "the workflow was efficient"
 *    measures the product, "the layout made the important information stand
 *    out" measures the design.
 *
 * 2. It must be judgeable from the clip. The previous version asked about a
 *    facial scanner, a voice waveform, "Attendance Watch" risk cards, "Notify"
 *    alert routing, a "Triage Desk" and System Health uptime/database
 *    indicators — none of which appear in the demonstrations, and several of
 *    which do not exist in the build at all. Respondents could only have
 *    answered those by guessing, which is worse than not asking.
 */
var MODULES = [
  {
    key: 'STUDENT MODULE',
    blurb: 'Watch the Student workflow demonstration, then rate your agreement with the statements below.',
    video: 'https://www.youtube.com/watch?v=hqn_1N2hkTg',
    caption: 'Student workflow (about 90 seconds)',
    statements: [
      'The dashboard layout made the most important information stand out first.',
      'The attendance summary cards could be understood at a glance, without reading every detail.',
      'Colour was used consistently and meaningfully to indicate status (present, late, absent).',
      'The interface gave clear visual confirmation after an action was completed.',
      'The amount of information on each screen felt manageable rather than crowded.'
    ]
  },
  {
    key: 'PROFESSOR MODULE',
    blurb: 'Watch the Professor workflow demonstration, then rate your agreement with the statements below.',
    video: 'https://www.youtube.com/watch?v=G5_IgpKBNu4',
    caption: 'Professor workflow (about 90 seconds)',
    statements: [
      'The attendance matrix presented a large amount of data in a readable, well-structured way.',
      'It was visually obvious which students had attendance problems.',
      'The dialogs for recording attendance were clearly laid out and easy to follow.',
      'This role’s screens felt visually consistent with the Student role shown earlier.',
      'Related information was grouped together in a way that made sense.'
    ]
  },
  {
    key: 'GUIDANCE COUNSELOR MODULE',
    blurb: 'Watch the Counselor workflow demonstration, then rate your agreement with the statements below.',
    video: 'https://www.youtube.com/watch?v=AAk1X44NMkk',
    caption: 'Guidance Counselor workflow (about 90 seconds)',
    statements: [
      'The charts communicated the overall picture of the caseload at a glance.',
      'The wellness log table was easy to scan and compare row to row.',
      'Filter and pagination controls were easy to locate and understand.',
      'Changing a filter produced a visible, understandable change on screen.',
      'The review dialog made it clear what information was being asked for.'
    ]
  },
  {
    key: 'ACADEMIC ADMIN MODULE',
    blurb: 'Watch the Academic Admin workflow demonstration, then rate your agreement with the statements below.',
    video: 'https://www.youtube.com/watch?v=O8VH_KynKc0',
    caption: 'Academic Admin workflow (about 90 seconds)',
    statements: [
      'The key metrics were arranged so the most important numbers stood out.',
      'The charts were labelled clearly enough to interpret without explanation.',
      'The tabbed structure made it clear where each kind of record lives.',
      'Dense tables remained readable and were not visually overwhelming.',
      'This role’s screens felt visually consistent with the other roles shown.'
    ]
  },
  {
    key: 'SYSTEM ADMIN MODULE',
    blurb: 'Watch the IT System Admin workflow demonstration, then rate your agreement with the statements below.',
    video: 'https://www.youtube.com/watch?v=9PUsnnuS8uA',
    caption: 'System Administrator workflow (about 90 seconds)',
    statements: [
      'The dashboard made the overall state of the system understandable at a glance.',
      'Long tables such as accounts and audit logs stayed readable and easy to scan.',
      'The approval dialog presented the request details in a clear, structured way.',
      'Controls clearly communicated their current state (for example, whether a setting was on or off).',
      'This role’s screens felt visually consistent with the other roles shown.'
    ]
  }
];

/** Bonus clip — previously embedded but never asked about. */
var BONUS_VIDEO = 'https://www.youtube.com/watch?v=n7ZCj52YAAQ';

var FEATURES = [
  'Tap-In / Tap-Out RFID Presence Logging',
  'Multi-Modal Emotional Analysis (Face + Voice)',
  'Automated Absence Threshold Alerts',
  'Secure In-App Direct Messaging',
  'Centralized Academic Record Management',
  'In-App IT Support Ticketing System',
  'System-Wide Personalisation (accent colour, dark mode, density, dashboard layout)'
];

var IMPORTANCE = [
  '1 - Unimportant',
  '2 - Of Little Importance',
  '3 - Important',
  '4 - Very Important'
];

/**
 * Nielsen's 10 usability heuristics (Nielsen, 1994), phrased so they can be
 * judged from a demonstration video.
 *
 * This is the part that anchors the study to a named framework rather than an
 * instrument invented for this form — it gives you something citable in the
 * methodology chapter and one clean table in the results.
 *
 * Two of them (error recovery, help and documentation) are genuinely hard to
 * observe in a demo, which is exactly why every grid carries a "Don't Know"
 * column. A high DNK rate on those rows is itself a reportable finding — it
 * says the demonstrations never surfaced an error state, which is a fair
 * limitation to name in the write-up rather than hide.
 */
var HEURISTICS = [
  '1. Visibility of system status — the interface keeps the user informed about what is happening.',
  '2. Match with the real world — wording and concepts suit a campus setting rather than technical jargon.',
  '3. User control and freedom — users appear able to cancel, undo or back out of actions.',
  '4. Consistency and standards — layout, controls and terminology are consistent across the five roles.',
  '5. Error prevention — the design appears to prevent mistakes before they happen.',
  '6. Recognition rather than recall — options are visible when needed rather than needing to be remembered.',
  '7. Flexibility and efficiency — filters, search and shortcuts would speed up frequent tasks.',
  '8. Aesthetic and minimalist design — screens show what is relevant, without unnecessary clutter.',
  '9. Error recovery — error messages appear clear and would help a user recover.',
  '10. Help and documentation — guidance or explanatory text is available where a user might need it.'
];

/**
 * Summary items. The previous form had no overall metric, so there was no
 * single number to report in the findings. Delete this block if your rubric
 * does not want it.
 */
var OVERALL = [
  'Overall, the interface felt well designed.',
  'Overall, the visual design felt professional and appropriate for a campus system.'
];

var OPEN_QUESTIONS = [
  'Across all five roles, which screen or design element did you find clearest or most effective, and why?',
  'Which screen or design element did you find most confusing, cluttered or hard to read?',
  'Privacy & Comfort: Would you feel comfortable using a system that links your automated daily attendance with facial/vocal wellness scans? Why or why not?',
  'What specific changes to the interface or visual design would you recommend?'
];

// ─────────────────────────────────────────────────────────────────────────────
// BUILD
// ─────────────────────────────────────────────────────────────────────────────

function buildForm() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(FORM_DESCRIPTION);

  // The consent text promises anonymised feedback, so the setting has to match.
  // setCollectEmail was superseded by setEmailCollectionType; try the current
  // API first so this keeps working, and fall back for older runtimes.
  try {
    form.setEmailCollectionType(FormApp.EmailCollectionType.DO_NOT_COLLECT);
  } catch (e) {
    form.setCollectEmail(false);
  }

  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setAllowResponseEdits(false);

  addConsent(form);
  addDemographics(form);

  for (var i = 0; i < MODULES.length; i++) {
    addModule(form, MODULES[i]);
  }

  addHeuristics(form);
  addFeatureRanking(form);
  addQualitative(form);

  Logger.log('EDIT: ' + form.getEditUrl());
  Logger.log('LIVE: ' + form.getPublishedUrl());
  Logger.log('Open the LIVE url in a private window and complete it once before sending.');
}

function addConsent(form) {
  var consent = form.addMultipleChoiceItem();
  consent
    .setTitle('I confirm that I am participating voluntarily and consent to my anonymized feedback being analyzed for this study.')
    .setChoices([
      // Declining skips straight to submit rather than walking someone through
      // ten pages of a study they just opted out of.
      consent.createChoice('Yes, I agree to proceed', FormApp.PageNavigationType.CONTINUE),
      consent.createChoice('No, I do not wish to participate', FormApp.PageNavigationType.SUBMIT)
    ])
    .setRequired(true);
}

function addDemographics(form) {
  form.addPageBreakItem()
    .setTitle('Demographic Profile')
    .setHelpText('A few quick questions so responses can be grouped by stakeholder type.');

  form.addMultipleChoiceItem()
    .setTitle('Age Group')
    .setChoiceValues(['Under 18', '18-21', '22-25', '26-30', 'Above 30'])
    .setRequired(true);

  // Not used by any usability analysis — kept because it was in the original.
  // Safe to delete this whole item if you would rather collect less.
  form.addMultipleChoiceItem()
    .setTitle('Gender Identity')
    .setChoiceValues(['Male', 'Female', 'Prefer not to say'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Which stakeholder role most closely aligns with your current daily occupation?')
    .setChoiceValues([
      'Undergraduate / Graduate Student',
      'Faculty Member / Professor',
      'Guidance / Mental Health Counselor',
      'Academic Administrator / Registrar Staff',
      'IT / System Administrator',
      'General User'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Was the only optional demographic in the original — made consistent here.
  form.addMultipleChoiceItem()
    .setTitle('Daily Technology Usage')
    .setChoiceValues(['Less than 2 hours', '2-4 hours', '5-7 hours', '8+ hours'])
    .setRequired(true);
}

/** One page per role: heading, video, then a single grid of statements. */
function addModule(form, cfg) {
  form.addPageBreakItem()
    .setTitle(cfg.key)
    .setHelpText(cfg.blurb);

  form.addVideoItem()
    .setTitle(cfg.caption)
    .setVideoUrl(cfg.video)
    .setWidth(480)
    .setAlignment(FormApp.Alignment.CENTER);

  form.addGridItem()
    .setTitle('Rate your agreement with each statement')
    .setHelpText(SCALE_HELP)
    .setRows(cfg.statements)
    .setColumns(AGREEMENT)
    .setRequired(true);
}

function addFeatureRanking(form) {
  form.addPageBreakItem()
    .setTitle('Feature Importance Ranking')
    .setHelpText(
      'Based on the ecosystem demonstrated, rate how important each feature would be for a ' +
      'modern university campus. The clip below covers the personalisation features included ' +
      'in the last row.'
    );

  form.addVideoItem()
    .setTitle('Bonus: system-wide customization (about 90 seconds)')
    .setVideoUrl(BONUS_VIDEO)
    .setWidth(480)
    .setAlignment(FormApp.Alignment.CENTER);

  // The original grid had no title at all — just a bare asterisk.
  form.addGridItem()
    .setTitle('How important is each feature for a modern university campus?')
    .setRows(FEATURES)
    .setColumns(IMPORTANCE)
    .setRequired(true);
}

/**
 * Heuristic evaluation plus the two summary items, on one page — both are
 * cross-cutting judgements about the interface as a whole rather than about
 * any single role.
 */
function addHeuristics(form) {
  form.addPageBreakItem()
    .setTitle('Overall Interface Assessment')
    .setHelpText(
      'Now thinking about the interface as a whole, across all five roles. These statements ' +
      "follow Nielsen's ten usability heuristics."
    );

  form.addGridItem()
    .setTitle('Based on everything you saw, rate the interface against each principle')
    .setHelpText(
      "Use \"Don't Know / Not Applicable\" freely — a demonstration video cannot show " +
      'everything, and it is more useful to us than a guess.'
    )
    .setRows(HEURISTICS)
    .setColumns(AGREEMENT)
    .setRequired(true);

  form.addGridItem()
    .setTitle('Overall impression')
    .setRows(OVERALL)
    .setColumns(AGREEMENT)
    .setRequired(true);
}

function addQualitative(form) {
  form.addPageBreakItem()
    .setTitle('Qualitative Feedback')
    .setHelpText('Short answers are fine. Type "N/A" if you have nothing to add.');

  for (var i = 0; i < OPEN_QUESTIONS.length; i++) {
    form.addParagraphTextItem()
      .setTitle(OPEN_QUESTIONS[i])
      .setHelpText('Type "N/A" if none.')
      .setRequired(true);
  }
}
