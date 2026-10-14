<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CounselingAppointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'counselor_id',
        'wellness_log_id',
        'scheduled_at',
        'duration_minutes',
        'status',
        'reason',
        'notes',
        'rescheduled_to',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at'   => 'datetime',
            'rescheduled_to' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'student_id');
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function wellnessLog(): BelongsTo
    {
        return $this->belongsTo(WellnessLog::class, 'wellness_log_id');
    }
}
