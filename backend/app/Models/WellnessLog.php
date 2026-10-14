<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WellnessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'mood',
        'contributing_factors',
        'notes',
        'risk_level',
        'reviewed_by',
        'reviewed_at',
        'counselor_notes',
        // multimodal fields (Phase 5)
        'is_multimodal',
        'facial_emotion',
        'facial_confidence',
        'voice_emotion',
        'voice_confidence',
        'user_validated_feeling',
        'ai_summary',
    ];

    protected function casts(): array
    {
        return [
            'contributing_factors' => 'array',
            'reviewed_at'          => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'student_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(CounselingAppointment::class, 'wellness_log_id');
    }
}
