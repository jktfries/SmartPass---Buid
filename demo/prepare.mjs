#!/usr/bin/env node
/**
 * Pre/post-recording state for the demo.
 *
 *   node prepare.mjs before   — stash current prefs, apply demo prefs
 *   node prepare.mjs after    — restore whatever was stashed
 *
 * Two things need setting up before filming, both through the app's own
 * preferences rather than anything faked at render time:
 *
 *  1. The professor dashboard ships an 'at-risk' widget whose body literally
 *     reads "Coming soon" behind a padlock. Hiding it uses the product's real
 *     widget-visibility feature — the same thing a user would do via
 *     Customise — instead of pretending it isn't there.
 *  2. Theme/accent/density are stored server-side per user, so whatever the
 *     last session left behind would otherwise leak into the footage and
 *     differ from role to role. Pin all five to the default look.
 *
 * Everything is restored by `after`, so the accounts end up as they started.
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BACKEND = path.resolve(HERE, '..', 'backend')
const PHP = process.env.PHP ?? 'C:/xampp/php/php.exe'
const STASH = path.join(BACKEND, 'storage', 'app', 'demo-prefs-backup.json');

const mode = process.argv[2]
if (!['before', 'after'].includes(mode)) {
  console.error('usage: node prepare.mjs <before|after>')
  process.exit(2)
}

/**
 * Recording drives the real app, so it writes real rows. Only one beat
 * actually commits anything — the student's RFID tap — because every other
 * modal in the storyboards is opened and then dismissed rather than saved.
 * `after` reverses that tap so a demo run leaves no trace.
 */
const undoRecordingWrites = `
use Illuminate\\Support\\Facades\\DB;
$today = now()->toDateString();
$rows = DB::table('attendance_records')
    ->whereNotNull('rfid_scan_log_id')->whereDate('date', $today)->get();
foreach ($rows as $r) {
    // The scan upserts onto whatever was there, so the pre-scan status can't be
    // recovered exactly; 'present' matches how the seeders weight this day.
    DB::table('attendance_records')->where('id', $r->id)
        ->update(['status' => 'present', 'rfid_scan_log_id' => null]);
}
$logs = DB::table('rfid_scan_logs')->whereDate('scanned_at', $today)->delete();
echo '  reverted ' . count($rows) . ' scanned attendance rows, removed ' . $logs . ' scan logs' . PHP_EOL;
`

const EMAILS = [
  'student@smartpass.edu', 'professor@smartpass.edu', 'counselor@smartpass.edu',
  'admin@smartpass.edu', 'sysadmin@smartpass.edu',
]

const before = `
use App\\Models\\User;
use Illuminate\\Support\\Facades\\File;
$emails = ${JSON.stringify(EMAILS).replace(/"/g, "'")};
$backup = [];
foreach ($emails as $e) {
    $u = User::where('email', $e)->first();
    if (!$u) continue;
    $backup[$e] = $u->preferences;
    $p = $u->preferences ?? [];
    $p['theme'] = 'light';
    $p['accent'] = 'teal';
    $p['density'] = 'comfortable';
    // Professor only: hide the "Coming soon" at-risk placeholder.
    if ($u->role === 'professor') {
        $p['dashboard'] = array_merge($p['dashboard'] ?? [], ['professor' => [
            ['id' => 'kpis',       'visible' => true],
            ['id' => 'my-classes', 'visible' => true, 'span' => 4],
            ['id' => 'at-risk',    'visible' => false],
        ]]);
    }
    $u->preferences = $p;
    $u->save();
}
File::put('${STASH.replace(/\\/g, '/')}', json_encode($backup));
echo 'stashed ' . count($backup) . ' users, demo prefs applied' . PHP_EOL;
`

const after = `
use App\\Models\\User;
use Illuminate\\Support\\Facades\\File;
$path = '${STASH.replace(/\\/g, '/')}';
if (!File::exists($path)) { echo 'no stash found — nothing to restore' . PHP_EOL; return; }
$backup = json_decode(File::get($path), true) ?: [];
foreach ($backup as $email => $prefs) {
    $u = User::where('email', $email)->first();
    if (!$u) continue;
    $u->preferences = $prefs;
    $u->save();
}
File::delete($path);
echo 'restored ' . count($backup) . ' users' . PHP_EOL;
`

const script = mode === 'before' ? before : (after + undoRecordingWrites)
const out = execFileSync(PHP, ['artisan', 'tinker', '--execute', script], {
  cwd: BACKEND, encoding: 'utf8',
})
process.stdout.write(out)
