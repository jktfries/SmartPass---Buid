<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ChatAttachment extends Model
{
    public $timestamps = false;

    protected $fillable = ['message_id', 'original_name', 'stored_path', 'mime_type', 'file_size'];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->stored_path);
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class);
    }
}
