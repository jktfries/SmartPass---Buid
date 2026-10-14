<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbsenceThreshold extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_section_id',
        'warning_absences',
        'critical_absences',
        'warning_lates',
        'critical_lates',
    ];

    public function classSection(): BelongsTo
    {
        return $this->belongsTo(ClassSection::class, 'class_section_id');
    }
}
