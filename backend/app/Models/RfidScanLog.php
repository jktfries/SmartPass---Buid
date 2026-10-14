<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RfidScanLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'rfid_tag',
        'student_id',
        'room',
        'scanned_at',
        'raw_payload',
        'processed',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at'  => 'datetime',
            'raw_payload' => 'array',
            'processed'   => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'student_id');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'rfid_scan_log_id');
    }
}
