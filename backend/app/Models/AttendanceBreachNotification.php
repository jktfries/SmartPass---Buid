<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceBreachNotification extends Model
{
    protected $table = 'attendance_breach_notifications';

    protected $fillable = [
        'student_id',
        'class_section_id',
        'breach_type',
        'breach_count',
        'severity',
        'notified_student',
        'notified_counselor',
        'notified_professor',
    ];

    protected function casts(): array
    {
        return [
            'notified_student'   => 'boolean',
            'notified_counselor' => 'boolean',
            'notified_professor' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'student_id');
    }

    public function classSection(): BelongsTo
    {
        return $this->belongsTo(ClassSection::class, 'class_section_id');
    }
}
