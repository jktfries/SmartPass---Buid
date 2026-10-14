# SmartPass usability survey

Builds the usability evaluation form programmatically, so the question set is
version-controlled rather than living only in the Forms UI.

**What it measures:** interface and visual design — layout, hierarchy,
readability, consistency, feedback — evaluated from demonstration videos. It
deliberately does *not* measure whether features work or how useful they are.
That distinction is the point: this is an HCI evaluation, so "the workflow was
efficient" judges the product while "the layout made the important information
stand out" judges the design.

The one exception is the Feature Importance grid, which measures perceived
value rather than usability and is kept as a secondary finding.

## Run it

This is **not** deployed — the Deploy button in Apps Script is for web apps and
add-ons and is not used here. The script is run once and produces a form.

1. <https://script.google.com> → **New project**
2. Delete the `myFunction` placeholder, paste all of `build-form.gs`
3. **Ctrl+S** to save — it will not run unsaved
4. Set the function dropdown to **`buildForm`** (it may default to another one,
   and running the wrong one silently does nothing)
5. **Run**
6. Authorise — see below
7. The **Execution log** at the bottom prints the edit URL and the live URL

### The authorisation warning is expected

You will see **"Google hasn't verified this app"**. That only means the script
is yours and was never published to the Marketplace. Click through:

**Review permissions** → choose your account → **Advanced** →
**Go to <project name> (unsafe)** → **Allow**

The only permission it needs is creating a file on your own Drive.

### After it runs

- The form appears in the **root of My Drive**, titled with the full study name.
- Each run creates a **new** form; it never edits an existing one. Re-running
  after a wording change leaves you with two — delete the old one.
- Groupmates need edit access on **the form**, not on the script. Share it from
  the form's own Share button.

## Check it before sending

```bash
node verify-form.mjs
```

Dry-runs the script against a mock of the Apps Script API and prints the full
structure. Apps Script can't run locally, so without this the only way to catch
a typo or a bad chained setter is to watch it fail halfway through in the
browser and leave a half-built form on your Drive.

Then, in the browser:

- Open the **live** URL in a private window and complete it end to end
- Time that run and put the real figure in the recruitment message
- Play every embedded video — they must be **Unlisted**, not Private
- Submit a test response, open the responses sheet, confirm agreement and
  "Don't Know" are distinguishable per column
- Delete the test response

## What changed from the first version, and why

**The rating scale was rebuilt as grids.** The original used a 1–6 linear scale
labelled *Strongly Disagree* on the left and *DNK* on the right, with no
*Strongly Agree* anchor. A `6` was therefore ambiguous between maximum agreement
and "don't know", which made all 15 rating items uninterpretable. Google Forms
cannot attach a "Don't Know" option to a linear scale at all, so the items are
now **multiple-choice grids** with a true 5-point scale plus a separate DNK
column. This also collapses 15 questions into 7 grids.

**The statements were refocused from features onto design.** The original items
asked whether workflows were efficient and features useful. Every rating
statement now asks about a design property that can be judged by watching:
visual hierarchy, information density, grouping, scannability, colour meaning,
consistency across roles, and clarity of feedback.

**A heuristic evaluation section was added.** The interface as a whole is rated
against Nielsen's ten usability heuristics (Nielsen, J. 1994. *Enhancing the
explanatory power of usability heuristics*). This anchors the study to a named,
citable framework instead of an instrument invented for this form, and gives
you one clean table for the results chapter.

Two heuristics — error recovery, and help and documentation — are genuinely
hard to observe in a demo. That's why every grid carries a "Don't Know" column.
A high DNK rate on those rows is itself worth reporting: it says the
demonstrations never surfaced an error state, which is a fair limitation to
name rather than hide.

**Six items asked about things the videos never show.** Each statement is now
written against something that actually appears on screen, verified against
`../demo/storyboard.mjs`:

| Removed | Reason |
|---|---|
| Facial scanner feedback, voice waveform, summary card | The clip stops at the feature splash; the scan never runs |
| "Attendance Watch" risk cards | No such feature — the at-risk widget is an unfinished placeholder |
| Routing a "Notify" alert | No such feature |
| System Health (Uptime, Database Status) | Those indicators don't exist in the build |
| "Triage Desk" | The content is shown, but that name isn't used anywhere in the app |

Those names appear to come from an earlier design document rather than the
delivered system — worth keeping in mind when writing up, since a reader who
watches the clips will notice the mismatch.

**Other fixes:** the bonus customization clip now has a question (it was
embedded but never asked about); the feature-ranking grid has a title (it had
none); the stray `4.` on the last open question and the `"if non"` typo are
gone; all demographics are consistently required; declining consent now skips
to submit; email collection is explicitly off to match the anonymity promise;
and a two-item overall measure was added so there's a single metric to report.

Module lengths were evened out to 4–6 statements each (they were 4/3/3/2/3) so
cross-role comparison is fair.
