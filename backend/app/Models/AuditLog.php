<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // audit_logs has no updated_at column
    const UPDATED_AT = null;

    protected $fillable = [
        'actor_id', 'category', 'severity',
        'action', 'detail', 'ip_address', 'user_agent',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
