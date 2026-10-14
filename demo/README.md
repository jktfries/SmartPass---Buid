# SmartPass demo video

Scripted walkthrough of each role, recorded from the running app and rendered
to video. Re-runnable: when the UI changes, re-record instead of re-shooting a
manual screen capture.

Output is six ~1:30 clips (five roles plus a Personalisation clip) and one
stitched ~8:50 cut.

The Personalisation clip covers the customization features — accent colours,
the custom hex picker, dark mode, density, sidebar, and dashboard widget
drag/resize/hide. Those are identical for every role, so they live in one clip
rather than being repeated five times.

## Prerequisites

All three services must be up (see `.claude/skills/run-smartpass/SKILL.md`):

| Service | Port |
|---|---|
| Laravel API | 8000 |
| Vite dev server | 5174 |
| Voice service | 5001 |

Then, once:

```bash
cd demo && npm install
```

Demo data is topped up by a separate seeder — `support_tickets` is empty in the
base seed, several roles have no notifications, and the attendance trend chart
plots 0% for weeks with no records. It is idempotent, so running it again is a
no-op:

```bash
cd backend && php artisan db:seed --class=DemoSeeder
```

## Recording

```bash
cd demo
node prepare.mjs before          # stash prefs, apply demo appearance
BASE_URL=http://localhost:5174 node record.mjs --all
node build.mjs                   # webm -> mp4 + stitched cut
node prepare.mjs after           # restore prefs, reverse the RFID tap
```

Clips land in `demo/out/`. `demo/raw/` holds the intermediate webm captures.

### Tuning length

`PACE` scales every hold, click pause and in-beat wait; each storyboard also has
its own `pace` that multiplies with it. Clips currently land at 85–91s with
`PACE=0.62`. Raise it for a slower cut:

```bash
PACE=0.75 node record.mjs student
```

`build.mjs` prints each clip's duration and flags anything outside 80–100s
(`TARGET` at the top of that file).

Only ~two thirds of a clip's runtime scales with `pace` — page loads and data
waits are fixed — so when re-fitting, over-correct rather than using the naive
ratio. Adding or removing a beat is the better lever for a large change.

## How it works

| File | Role |
|---|---|
| `storyboard.mjs` | The script as data — one array of beats per role |
| `overlay.mjs` | Injected cursor, caption bar and title card |
| `record.mjs` | Playwright driver; one webm per role |
| `build.mjs` | ffmpeg: H.264 at a fixed 30fps, then concat |
| `prepare.mjs` | Pre/post state — preferences and write reversal |

A beat is `{ caption, do, hold, nav }`. `nav: true` means the action changes
page, so the caption is applied *after* the move rather than before — otherwise
the new caption sits over the old screen for a second.

## Things that were not obvious

- **Playwright video has no mouse cursor.** Without the injected one in
  `overlay.mjs`, the demo looks like the UI is operating itself. Clicks also
  interpolate the pointer over ~24 steps; a teleporting cursor reads as a cut.
- **`networkidle` is not "loaded".** It can fire in the gap between the document
  finishing and a dashboard's XHRs starting, which filmed KPI rows reading 0 and
  tables of grey skeletons. `record.mjs` counts in-flight `/api/` requests
  itself and waits for them to stay drained.
- **Some dashboards render literal zeros instead of skeletons** while loading,
  so there is nothing to detect. Those storyboards declare `notReadyText` — the
  empty-state copy to wait out.
- **Escape does not close modals.** `components/ui/Modal.tsx` binds only the X
  button and a backdrop click, so pressing Escape silently does nothing and the
  overlay then intercepts the next click. Use `api.closeModal()`.
- **Theme, accent and density are stored server-side per user**, so whatever the
  last session left behind leaks into the footage. `prepare.mjs` pins them and
  puts them back.
- **The fake camera is a test pattern, not a face.** Chromium's synthetic feed
  is a rotating green shape, so the facial detector finds nothing. The wellness
  beat therefore stops at the feature splash and cuts to the standard log rather
  than filming a "no face detected" state.
- **Never toggle Maintenance Mode** on camera — it locks every login.
- **`settle()` can return before loading has even started.** A click sets React
  into its loading state on the *next* render, so checking immediately finds no
  in-flight request and no skeleton, reports "settled", and the beat then holds
  on a skeleton for its whole duration. Hence the leading `grace` delay — it
  cost ~24s of blank rows in one clip before being found.
- **Never click a `<select>` before `selectOption()`.** The click opens the
  native dropdown and the selection silently fails to stick. Use
  `a.moveTo(sel)` so the cursor still travels there, then `selectOption`.
- **Conversation rows are `div[role="button"]`**, not buttons or links — a
  `getByText` match lands on an inner node with no click handler and the thread
  never opens.
- **`/tickets` shows a submitter only their own tickets**, so staff roles need
  their own seeded ticket or the page is empty for them.
- **dnd-kit needs a real drag gesture** aimed at the target widget's *body*.
  See `api.dragWidget` — `dragTo()` and aiming at the target's handle both
  silently no-op.
