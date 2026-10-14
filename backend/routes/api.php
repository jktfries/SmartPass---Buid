<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Attendance\AttendanceController;
use App\Http\Controllers\Attendance\RfidScanController;
use App\Http\Controllers\Academic\AcademicStructureController;
use App\Http\Controllers\Academic\ClassSectionController;
use App\Http\Controllers\Enrollment\EnrollmentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\SystemSettingController;
use App\Http\Controllers\Admin\ApprovalController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\SupportTicketController;
use App\Http\Controllers\Wellness\WellnessController;
use App\Http\Controllers\Wellness\CounselingAppointmentController;
use App\Http\Controllers\Communication\NotificationController;
use App\Http\Controllers\Communication\MessageController;
use App\Http\Controllers\Communication\ChatController;
use App\Http\Controllers\Profile\ProfileController;

// ============================================================
// Public auth
// ============================================================
Route::post('/auth/login', [AuthController::class, 'login']);

// ============================================================
// RFID Scanner (personal access token with rfid-scan ability)
// ============================================================
Route::middleware('auth:sanctum')->post('/rfid/scan', [RfidScanController::class, 'scan']);

// ============================================================
// All session-authenticated routes
// ============================================================
Route::middleware(['auth:sanctum', 'maintenance'])->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',     [AuthController::class, 'me']);

    // ----------------------------------------------------------
    // Profile (universal — all authenticated roles)
    // ----------------------------------------------------------
    // ----------------------------------------------------------
    // Chat / Conversations (universal — all authenticated roles)
    // ----------------------------------------------------------
    Route::get('/chat/contacts',                              [ChatController::class, 'contacts']);
    Route::get('/chat/conversations',                         [ChatController::class, 'conversations']);
    Route::post('/chat/conversations',                        [ChatController::class, 'startConversation']);
    Route::get('/chat/conversations/{id}/messages',           [ChatController::class, 'messages']);
    Route::post('/chat/conversations/{id}/messages',          [ChatController::class, 'send']);
    Route::post('/chat/conversations/{id}/read',              [ChatController::class, 'markRead']);
    Route::delete('/chat/conversations/{id}',                 [ChatController::class, 'hideConversation']);
    Route::delete('/chat/messages/{msgId}',                   [ChatController::class, 'deleteMessage']);

    Route::get('/profile',           [ProfileController::class, 'show']);
    Route::patch('/profile',         [ProfileController::class, 'update']);
    Route::patch('/profile/preferences', [ProfileController::class, 'updatePreferences']);
    Route::post('/profile/avatar',   [ProfileController::class, 'uploadAvatar']);
    Route::delete('/profile/avatar', [ProfileController::class, 'removeAvatar']);

    // ----------------------------------------------------------
    // Notifications (universal — all authenticated roles)
    // ----------------------------------------------------------
    Route::get('/notifications/unread-count',  [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all',    [NotificationController::class, 'markAllRead']);
    Route::get('/notifications',               [NotificationController::class, 'index']);
    Route::delete('/notifications',            [NotificationController::class, 'destroyAll']);
    Route::patch('/notifications/{id}/read',   [NotificationController::class, 'markRead']);
    Route::patch('/notifications/{id}/unread', [NotificationController::class, 'markUnread']);
    Route::delete('/notifications/{id}',       [NotificationController::class, 'destroy']);

    // ----------------------------------------------------------
    // Support Tickets (universal — all authenticated roles)
    // ----------------------------------------------------------
    Route::get('/tickets',          [SupportTicketController::class, 'index']);
    Route::post('/tickets',         [SupportTicketController::class, 'store']);
    Route::get('/tickets/{id}',     [SupportTicketController::class, 'show']);

    // ----------------------------------------------------------
    // Messages (universal — all authenticated roles)
    // ----------------------------------------------------------
    Route::get('/messages/inbox',  [MessageController::class, 'inbox']);
    Route::get('/messages/sent',   [MessageController::class, 'sent']);
    Route::post('/messages',       [MessageController::class, 'compose']);
    Route::get('/messages/{id}',   [MessageController::class, 'show']);

    // ----------------------------------------------------------
    // Student
    // ----------------------------------------------------------
    Route::prefix('student')->middleware('role:student')->group(function () {
        Route::get('/dashboard',         [AttendanceController::class, 'studentDashboard']);
        Route::get('/dashboard/trends',  [AttendanceController::class, 'studentDashboardTrends']);
        Route::get('/attendance',        [AttendanceController::class, 'studentAttendance']);
        Route::post('/attendance/simulate-scan', [AttendanceController::class, 'studentSimulateScan']);
        Route::get('/wellness',            [WellnessController::class, 'studentIndex']);
        Route::post('/wellness',           [WellnessController::class, 'store']);
        Route::patch('/wellness/{id}',     [WellnessController::class, 'update']);
        Route::delete('/wellness/{id}',    [WellnessController::class, 'destroy']);
        Route::post('/wellness/multimodal',[WellnessController::class, 'storeMultimodal']);
        Route::get('/appointments',      [CounselingAppointmentController::class, 'studentIndex']);
        Route::post('/appointments',     [CounselingAppointmentController::class, 'store']);
        Route::patch('/appointments/{id}/cancel', [CounselingAppointmentController::class, 'cancelOwn']);
    });

    // ----------------------------------------------------------
    // Professor
    // ----------------------------------------------------------
    Route::prefix('professor')->middleware('role:professor')->group(function () {
        Route::get('/dashboard',                      fn() => response()->json(['message' => 'Professor dashboard']));
        Route::get('/class-sections',                 [AttendanceController::class, 'professorClassSections']);
        Route::get('/class-sections/{id}/attendance', [AttendanceController::class, 'classAttendance']);
        Route::post('/class-sections/{id}/attendance/simulate-scan', [AttendanceController::class, 'simulateScan']);
        Route::post('/class-sections/{id}/attendance/log',           [AttendanceController::class, 'logAttendance']);
    });

    // ----------------------------------------------------------
    // Guidance Counselor
    // ----------------------------------------------------------
    Route::prefix('counselor')->middleware('role:guidance_counselor')->group(function () {
        Route::get('/dashboard',           fn() => response()->json(['message' => 'Counselor dashboard']));
        Route::get('/wellness-stats',      [WellnessController::class, 'counselorWellnessStats']);
        Route::get('/wellness-logs',       [WellnessController::class, 'counselorIndex']);
        Route::patch('/wellness-logs/{id}/review', [WellnessController::class, 'review']);
        Route::get('/appointments',        [CounselingAppointmentController::class, 'counselorIndex']);
        Route::patch('/appointments/{id}', [CounselingAppointmentController::class, 'updateStatus']);
    });

    // ----------------------------------------------------------
    // Admin Executive — reports
    // ----------------------------------------------------------
    Route::prefix('admin')->middleware('role:admin_exec,system_admin,super_admin')->group(function () {
        Route::get('/dashboard', fn() => response()->json(['message' => 'Admin dashboard']));
        Route::get('/reports/trends',         [ReportController::class, 'trends']);
        Route::get('/reports/attendance',     [ReportController::class, 'attendance']);
        Route::get('/reports/attendance/csv', [ReportController::class, 'attendanceCsv']);
        Route::get('/reports/wellness',       [ReportController::class, 'wellness']);
        Route::get('/reports/wellness/csv',   [ReportController::class, 'wellnessCsv']);
    });

    // ----------------------------------------------------------
    // Academic Structure  (admin_exec and above)
    // ----------------------------------------------------------
    Route::prefix('academic')->middleware('role:admin_exec,system_admin,super_admin')->group(function () {
        // Academic years
        Route::get('/academic-years',           [AcademicStructureController::class, 'indexAcademicYears']);
        Route::post('/academic-years',          [AcademicStructureController::class, 'storeAcademicYear']);
        Route::put('/academic-years/{id}',      [AcademicStructureController::class, 'updateAcademicYear']);
        Route::delete('/academic-years/{id}',   [AcademicStructureController::class, 'destroyAcademicYear']);

        // Terms
        Route::get('/terms',           [AcademicStructureController::class, 'indexTerms']);
        Route::post('/terms',          [AcademicStructureController::class, 'storeTerm']);
        Route::put('/terms/{id}',      [AcademicStructureController::class, 'updateTerm']);
        Route::delete('/terms/{id}',   [AcademicStructureController::class, 'destroyTerm']);

        // Departments
        Route::get('/departments',          [AcademicStructureController::class, 'indexDepartments']);
        Route::post('/departments',         [AcademicStructureController::class, 'storeDepartment']);
        Route::put('/departments/{id}',     [AcademicStructureController::class, 'updateDepartment']);
        Route::delete('/departments/{id}',  [AcademicStructureController::class, 'destroyDepartment']);

        // Programs
        Route::get('/programs',         [AcademicStructureController::class, 'indexPrograms']);
        Route::post('/programs',        [AcademicStructureController::class, 'storeProgram']);
        Route::delete('/programs/{id}', [AcademicStructureController::class, 'destroyProgram']);

        // Sections
        Route::get('/sections',         [AcademicStructureController::class, 'indexSections']);
        Route::post('/sections',        [AcademicStructureController::class, 'storeSection']);
        Route::delete('/sections/{id}', [AcademicStructureController::class, 'destroySection']);

        // Courses
        Route::get('/courses',          [AcademicStructureController::class, 'indexCourses']);
        Route::post('/courses',         [AcademicStructureController::class, 'storeCourse']);
        Route::delete('/courses/{id}',  [AcademicStructureController::class, 'destroyCourse']);

        // Class sections
        Route::get('/class-sections',                        [ClassSectionController::class, 'index']);
        Route::post('/class-sections',                       [ClassSectionController::class, 'store']);
        Route::put('/class-sections/{id}',                   [ClassSectionController::class, 'update']);
        Route::delete('/class-sections/{id}',                [ClassSectionController::class, 'destroy']);
        Route::get('/class-sections/{id}/threshold',         [ClassSectionController::class, 'getThreshold']);
        Route::put('/class-sections/{id}/threshold',         [ClassSectionController::class, 'updateThreshold']);
    });

    // ----------------------------------------------------------
    // Enrollment  (admin_exec and above)
    // ----------------------------------------------------------
    Route::prefix('enrollment')->middleware('role:admin_exec,system_admin,super_admin')->group(function () {
        Route::get('/students',               [EnrollmentController::class, 'indexStudents']);
        Route::get('/student/{studentId}',    [EnrollmentController::class, 'forStudent']);
        Route::post('/',                      [EnrollmentController::class, 'store']);
        Route::delete('/{id}',               [EnrollmentController::class, 'destroy']);
    });

    // ----------------------------------------------------------
    // System Admin / Super Admin — unified admin panel
    // (both roles share all capabilities; super_admin adds no exclusive routes)
    // ----------------------------------------------------------
    Route::prefix('sysadmin')->middleware('role:system_admin,super_admin')->group(function () {
        // Dashboard stats
        Route::get('/stats', [AdminDashboardController::class, 'stats']);

        // Support ticket queue management
        Route::patch('/tickets/{id}',    [SupportTicketController::class, 'update']);

        // Approvals (previously super_admin-only; now unified)
        Route::get('/approvals',         [ApprovalController::class, 'index']);
        Route::post('/approvals',        [ApprovalController::class, 'store']);
        Route::patch('/approvals/{id}',  [ApprovalController::class, 'review']);

        // Audit logs
        Route::get('/audit-logs',        [AuditLogController::class, 'index']);
        Route::get('/audit-logs/csv',    [AuditLogController::class, 'csv']);

        // System settings
        Route::get('/settings',          [SystemSettingController::class, 'index']);
        Route::patch('/settings/{key}',  [SystemSettingController::class, 'update']);

        // Users
        Route::get('/users',                     [UserController::class, 'index']);
        Route::post('/users',                    [UserController::class, 'store']);
        Route::put('/users/{id}',                [UserController::class, 'update']);
        Route::delete('/users/{id}',             [UserController::class, 'destroy']);
        Route::post('/users/{id}/restore',       [UserController::class, 'restore']);
        Route::post('/users/{id}/reset-password',[UserController::class, 'resetPassword']);

        // Students
        Route::get('/students',                  [UserController::class, 'indexStudents']);
        Route::post('/students',                 [UserController::class, 'storeStudent']);
        Route::put('/students/{studentId}',      [UserController::class, 'updateStudent']);
    });
});
