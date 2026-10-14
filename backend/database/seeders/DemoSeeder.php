<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Tops up the seeded data so every screen has something worth showing —
 * written for the demo recording, where an empty table or a chart that
 * flatlines reads as a bug rather than as "no data yet".
 *
 * Deliberately SEPARATE from DatabaseSeeder and never called by it: this is
 * presentation data, not the baseline fixture. Run it explicitly:
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Idempotent throughout — every insert is guarded, so running it twice is a
 * no-op and it can be re-run after a partial failure.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->supportTickets();
        $this->staffNotifications();
        $this->attendanceTrendGaps();
        $this->secondProgram();
        $this->demoStudentAppointments();
        $this->appointmentStatusVariety();
    }

    /** support_tickets is empty in the base seed, so /tickets is blank for all 5 roles. */
    private function supportTickets(): void
    {
        if (DB::table('support_tickets')->count() > 0) {
            $this->command->info('  tickets: already present, skipping');
            return;
        }

        $students = DB::table('users')->where('role', 'student')->pluck('id')->all();
        $prof     = DB::table('users')->where('role', 'professor')->value('id');
        $sysadmin = DB::table('users')->where('email', 'sysadmin@smartpass.edu')->value('id');

        $rows = [
            ['RFID card not registering at the CS lab reader', 'My card worked last week but the reader in CS-LAB-1 no longer beeps. I have been marked absent twice because of it.', 'technical', 'high', 'open', null],
            ['Attendance marked absent while I was present', 'I attended CS401 on the 17th but it shows as absent. The professor confirmed I was there.', 'attendance', 'medium', 'open', null],
            ['Cannot update my profile photo', 'Uploading a photo returns an error every time.', 'account', 'low', 'resolved', 'Resolved — upload size limit raised to 5 MB and the request encoding was corrected.'],
            ['Request to add a wellness check reminder', 'Would it be possible to get a weekly reminder to complete the wellness check-in?', 'wellness', 'low', 'open', null],
            ['Enrollment missing for CS201', 'I am enrolled in CS201 on my registration form but it does not appear in my attendance list.', 'account', 'high', 'in_progress', null],
            ['Grades portal link returns an error', 'Clicking the external grades link from the dashboard opens a blank page.', 'technical', 'medium', 'in_progress', null],
        ];

        // /tickets shows a submitter only THEIR OWN tickets (staff get the full
        // queue via Support Queue instead). Tickets owned solely by students
        // therefore leave the professor's and counselor's page empty, so give
        // them one each.
        $staff = array_values(array_filter([
            DB::table('users')->where('role', 'professor')->value('id'),
            DB::table('users')->where('role', 'guidance_counselor')->value('id'),
        ]));
        $rows[] = ['Projector in CS-LAB-1 keeps disconnecting', 'The projector drops signal mid-lecture two or three times a session. Raised with facilities last week.', 'technical', 'medium', 'open', null];
        $rows[] = ['Request read-only access to program-level reports', 'It would help to see aggregate attendance for the whole program when preparing referrals.', 'account', 'low', 'in_progress', null];

        $n = 1;
        foreach ($rows as $i => [$subject, $description, $category, $priority, $status, $resolution]) {
            $created = Carbon::now()->subDays(rand(1, 18))->setTime(rand(8, 17), rand(0, 59));
            // The last two rows belong to staff; the rest to students.
            $staffIdx = $i - (count($rows) - count($staff));
            $submitter = $staffIdx >= 0 && isset($staff[$staffIdx])
                ? $staff[$staffIdx]
                : $students[array_rand($students)];
            DB::table('support_tickets')->insert([
                'ticket_number'    => 'TKT-' . str_pad((string) $n++, 5, '0', STR_PAD_LEFT),
                'submitter_id'     => $submitter,
                'assigned_to'      => $status === 'open' ? null : ($sysadmin ?? $prof),
                'subject'          => $subject,
                'description'      => $description,
                'category'         => $category,
                'priority'         => $priority,
                'status'           => $status,
                'resolution_notes' => $resolution,
                'resolved_at'      => $status === 'resolved' ? $created->copy()->addDays(2) : null,
                'created_at'       => $created,
                'updated_at'       => $created,
            ]);
        }
        $this->command->info('  tickets: created ' . count($rows));
    }

    /** professor / admin_exec / system_admin / super_admin get zero notifications in the base seed. */
    private function staffNotifications(): void
    {
        $byRole = [
            'professor' => [
                ['attendance_breach', 'Absence threshold reached', 'Diana Flores has reached 6 absences in CS301, crossing the critical threshold.'],
                ['new_message', 'New message from Guidance', 'Dr. Marites Cruz sent you a note about a student in CS401.'],
            ],
            'admin_exec' => [
                ['attendance_breach', 'Program attendance below target', 'BSCS attendance averaged 81% this week, below the 85% target.'],
                ['wellness_flag', 'Wellness escalation logged', 'One student was flagged at critical risk and referred to Guidance.'],
            ],
            'system_admin' => [
                ['ticket_update', 'New support ticket assigned', 'TKT-00005 "Enrollment missing for CS201" was assigned to you.'],
                ['approval_request', 'Approval awaiting review', 'An enrollment override request is pending review.'],
            ],
            'super_admin' => [
                ['approval_request', 'Approval awaiting review', 'An excuse absence request is pending review.'],
            ],
        ];

        $made = 0;
        foreach ($byRole as $role => $items) {
            foreach (User::where('role', $role)->get() as $user) {
                // The RFID scanner is a service account, not a person to notify.
                if (str_contains((string) $user->email, 'rfid.scanner')) {
                    continue;
                }
                foreach ($items as $i => [$type, $title, $body]) {
                    $exists = DB::table('notifications')
                        ->where('user_id', $user->id)->where('title', $title)->exists();
                    if ($exists) {
                        continue;
                    }
                    DB::table('notifications')->insert([
                        'user_id'    => $user->id,
                        'type'       => $type,
                        'title'      => $title,
                        'body'       => $body,
                        'data'       => json_encode([]),
                        'is_read'    => false,
                        'read_at'    => null,
                        'created_at' => Carbon::now()->subHours(($i + 1) * 7),
                        'updated_at' => Carbon::now()->subHours(($i + 1) * 7),
                    ]);
                    $made++;
                }
            }
        }
        $this->command->info("  staff notifications: created {$made}");
    }

    /**
     * The 8-week attendance trend on the student and admin dashboards plots 0%
     * for any week with no records. The base seed only covers 4 middle weeks,
     * so the line starts flat at zero and tails off — which looks like a broken
     * chart. Fill every week in the window that is light on data.
     */
    private function attendanceTrendGaps(): void
    {
        $sections = DB::table('class_sections')->get()->keyBy('id');
        if ($sections->isEmpty()) {
            $this->command->warn('  attendance: no class sections, skipping');
            return;
        }

        $enrollments = DB::table('student_enrollments')->where('status', 'enrolled')->get();
        $dayMap = ['Mon' => Carbon::MONDAY, 'Tue' => Carbon::TUESDAY, 'Wed' => Carbon::WEDNESDAY, 'Thu' => Carbon::THURSDAY, 'Fri' => Carbon::FRIDAY];

        $made = 0;
        for ($w = 7; $w >= 0; $w--) {
            $monday = Carbon::now()->startOfWeek()->subWeeks($w);
            $sunday = $monday->copy()->endOfWeek();

            $existing = DB::table('attendance_records')
                ->whereBetween('date', [$monday->toDateString(), $sunday->toDateString()])->count();

            // A well-populated week is ~80 rows (10 students x 8 sessions).
            // Anything far below that would skew the plotted rate.
            if ($existing >= 60) {
                continue;
            }

            foreach ($enrollments as $e) {
                $cs = $sections[$e->class_section_id] ?? null;
                if (!$cs) {
                    continue;
                }
                foreach (explode(',', (string) $cs->schedule_days) as $d) {
                    $d = trim($d);
                    if (!isset($dayMap[$d])) {
                        continue;
                    }
                    $date = $monday->copy()->next($dayMap[$d]);
                    if ($date->gt($sunday)) {
                        $date = $monday->copy()->previous($dayMap[$d])->addWeek();
                    }
                    // Never fabricate attendance for a session that hasn't happened.
                    if ($date->gt(Carbon::now())) {
                        continue;
                    }
                    $already = DB::table('attendance_records')
                        ->where('student_id', $e->student_id)
                        ->where('class_section_id', $cs->id)
                        ->where('date', $date->toDateString())->exists();
                    if ($already) {
                        continue;
                    }

                    $r = rand(1, 100);
                    $status = $r <= 84 ? 'present' : ($r <= 93 ? 'late' : 'absent');
                    DB::table('attendance_records')->insert([
                        'student_id'       => $e->student_id,
                        'class_section_id' => $cs->id,
                        'date'             => $date->toDateString(),
                        'status'           => $status,
                        'created_at'       => $date->copy()->setTime(8, 0),
                        'updated_at'       => $date->copy()->setTime(8, 0),
                    ]);
                    $made++;
                }
            }
        }
        $this->command->info("  attendance backfill: created {$made}");
    }

    /** The admin per-program bar chart renders a single bar with only one program. */
    private function secondProgram(): void
    {
        if (DB::table('programs')->count() > 1) {
            $this->command->info('  programs: already >1, skipping');
            return;
        }
        $dept = DB::table('departments')->value('id');
        if (!$dept) {
            return;
        }
        DB::table('programs')->insert([
            'code' => 'BSIT', 'name' => 'BS Information Technology',
            'department_id' => $dept, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->command->info('  programs: added BSIT');
    }

    /**
     * The demo student has a seeded notification saying an appointment was
     * approved, but no appointment rows — so following that notification leads
     * to an empty page that contradicts it.
     */
    private function demoStudentAppointments(): void
    {
        $counselor = DB::table('users')->where('role', 'guidance_counselor')->value('id');
        if (!$counselor) {
            return;
        }
        $sid = '2024-CS-001';
        // Check for an UPCOMING, still-active appointment specifically. Testing
        // for "any row" wasn't enough: the student had a single cancelled one in
        // the past, so the seeder skipped and their Appointments page still read
        // "No upcoming appointments".
        $hasUpcoming = DB::table('counseling_appointments')
            ->where('student_id', $sid)
            ->whereIn('status', ['Pending', 'Approved', 'Rescheduled'])
            ->where('scheduled_at', '>', now())
            ->exists();
        if ($hasUpcoming) {
            $this->command->info('  demo student appointments: upcoming already present, skipping');
            return;
        }

        foreach ([
            [Carbon::now()->addDays(3)->setTime(10, 0), 'Approved', 'Follow-up on attendance and workload.'],
            [Carbon::now()->addDays(9)->setTime(14, 30), 'Pending', 'Requested a check-in about exam stress.'],
        ] as [$at, $status, $reason]) {
            DB::table('counseling_appointments')->insert([
                'student_id' => $sid, 'counselor_id' => $counselor,
                'scheduled_at' => $at, 'duration_minutes' => 45,
                'status' => $status, 'reason' => $reason,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->command->info('  demo student appointments: created 2');
    }

    /** The counselor's status filter offers 6 values; the base seed only produces 2. */
    private function appointmentStatusVariety(): void
    {
        $counselor = DB::table('users')->where('role', 'guidance_counselor')->value('id');
        $students = DB::table('students')->pluck('student_id')->all();
        if (!$counselor || !$students) {
            return;
        }

        foreach ([
            ['Completed', Carbon::now()->subDays(6)->setTime(11, 0), 'Completed session — student reported improved sleep.'],
            ['Rescheduled', Carbon::now()->addDays(5)->setTime(9, 30), 'Moved at the student\'s request.'],
            ['Declined', Carbon::now()->subDays(2)->setTime(15, 0), 'Outside counselling hours; student advised to rebook.'],
        ] as [$status, $at, $notes]) {
            if (DB::table('counseling_appointments')->where('status', $status)->exists()) {
                continue;
            }
            DB::table('counseling_appointments')->insert([
                'student_id'      => $students[array_rand($students)],
                'counselor_id'    => $counselor,
                'scheduled_at'    => $at,
                'duration_minutes' => 45,
                'status'          => $status,
                'reason'          => 'Wellness check-in',
                'notes'           => $notes,
                'rescheduled_to'  => $status === 'Rescheduled' ? $at->copy()->addDays(2) : null,
                'created_at'      => now()->subDays(8),
                'updated_at'      => now()->subDays(1),
            ]);
        }
        $this->command->info('  appointment statuses: topped up');
    }
}
