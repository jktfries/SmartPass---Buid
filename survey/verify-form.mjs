/**
 * Dry-runs build-form.gs against a mock of the Apps Script FormApp API and
 * prints the structure it would create.
 *
 * Apps Script can't be run locally, so without this the only way to find a
 * typo or a wrong chained setter is to paste into script.google.com and watch
 * it fail halfway through — leaving a half-built form on your Drive. This
 * catches those on the laptop instead.
 *
 *   node verify-form.mjs
 */

import { readFileSync } from 'node:fs'

const log = []
let pages = 0, grids = 0, videos = 0, choices = 0, paragraphs = 0

// Every builder returns `this`, so any chained setter that doesn't exist on the
// real API still has to at least exist here — a missing one shows up as a crash.
const chain = (kind, record) => {
  const self = {
    _kind: kind, _title: null, _rows: null, _cols: null,
    _required: false, _url: null, _choices: null,
  }
  const setters = [
    'setTitle', 'setHelpText', 'setRequired', 'setChoiceValues', 'setChoices',
    'setRows', 'setColumns', 'setVideoUrl', 'setWidth', 'setAlignment',
    'showOtherOption',
  ]
  for (const s of setters) {
    self[s] = (v) => {
      if (s === 'setTitle') self._title = v
      if (s === 'setRows') self._rows = v
      if (s === 'setColumns') self._cols = v
      if (s === 'setRequired') self._required = v
      if (s === 'setVideoUrl') self._url = v
      if (s === 'setChoiceValues' || s === 'setChoices') self._choices = v
      return self
    }
  }
  self.createChoice = (value, nav) => ({ value, nav })
  record(self)
  return self
}

const form = {
  setDescription: () => form,
  setEmailCollectionType: () => form,
  setCollectEmail: () => form,
  setProgressBar: () => form,
  setShowLinkToRespondAgain: () => form,
  setAllowResponseEdits: () => form,
  getEditUrl: () => '<edit-url>',
  getPublishedUrl: () => '<live-url>',

  addPageBreakItem: () => chain('page', (i) => { pages++; log.push(i) }),
  addVideoItem: () => chain('video', (i) => { videos++; log.push(i) }),
  addGridItem: () => chain('grid', (i) => { grids++; log.push(i) }),
  addMultipleChoiceItem: () => chain('choice', (i) => { choices++; log.push(i) }),
  addParagraphTextItem: () => chain('text', (i) => { paragraphs++; log.push(i) }),
  addSectionHeaderItem: () => chain('header', (i) => log.push(i)),
}

globalThis.FormApp = {
  create: () => form,
  Alignment: { CENTER: 'CENTER' },
  PageNavigationType: { CONTINUE: 'CONTINUE', SUBMIT: 'SUBMIT' },
  EmailCollectionType: { DO_NOT_COLLECT: 'DO_NOT_COLLECT' },
}
globalThis.Logger = { log: (m) => console.log('   ' + m) }

// Load and execute the .gs in this scope.
const src = readFileSync(new URL('./build-form.gs', import.meta.url), 'utf8')
new Function(src + '\nbuildForm();')()

console.log('\n─── STRUCTURE ───')
let page = 0
for (const item of log) {
  if (item._kind === 'page') {
    page++
    console.log(`\n[page ${page}] ${item._title}`)
    continue
  }
  const req = item._required ? ' *' : ''
  if (item._kind === 'grid') {
    console.log(`   GRID${req}  ${item._rows.length} rows x ${item._cols.length} cols`)
    item._rows.forEach(r => console.log(`          - ${r.slice(0, 74)}`))
    console.log(`          cols: ${item._cols.join(' | ')}`)
  } else if (item._kind === 'video') {
    console.log(`   VIDEO  ${item._url}`)
  } else if (item._kind === 'choice') {
    const n = Array.isArray(item._choices) ? item._choices.length : 0
    console.log(`   CHOICE${req} ${item._title.slice(0, 66)} (${n} options)`)
  } else if (item._kind === 'text') {
    console.log(`   TEXT${req}   ${item._title.slice(0, 70)}`)
  }
}

// ── assertions ──
const errs = []
const grid = log.filter(i => i._kind === 'grid')
const vids = log.filter(i => i._kind === 'video')

for (const g of grid) {
  if (!g._rows?.length) errs.push(`grid "${g._title}" has no rows`)
  if (!g._cols?.length) errs.push(`grid "${g._title}" has no columns`)
  if (!g._required) errs.push(`grid "${g._title}" is not required`)
}
const agreementGrids = grid.filter(g => g._cols.some(c => /Don't Know/.test(c)))
for (const g of agreementGrids) {
  if (g._cols.length !== 6) errs.push(`agreement grid has ${g._cols.length} cols, expected 6`)
  if (!g._cols.includes('Strongly Agree')) errs.push('agreement grid missing a "Strongly Agree" anchor')
  if (!g._cols.includes('Strongly Disagree')) errs.push('agreement grid missing a "Strongly Disagree" anchor')
}
const urls = vids.map(v => v._url)
if (new Set(urls).size !== urls.length) errs.push('duplicate video URLs')
for (const u of urls) if (!/^https:\/\//.test(u)) errs.push(`video URL not https: ${u}`)

console.log('\n─── TOTALS ───')
console.log(`   pages ${pages} · videos ${videos} · grids ${grids} · choice ${choices} · open text ${paragraphs}`)
const ratedStatements = agreementGrids.reduce((s, g) => s + g._rows.length, 0)
console.log(`   rated statements: ${ratedStatements}`)

console.log('\n─── CHECKS ───')
if (errs.length) { errs.forEach(e => console.log('   FAIL ' + e)); process.exitCode = 1 }
else console.log('   all passed')
