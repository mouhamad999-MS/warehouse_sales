<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'action', 'model_type', 'model_id',
        'model_label', 'changes', 'ip_address',
    ];

    protected $casts = [
        'changes' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log an action from anywhere in the app.
     */
    public static function record(string $action, Model $model, ?array $changes = null): void
    {
        $userId = auth()->id();
        $label  = method_exists($model, 'getActivityLabel')
            ? $model->getActivityLabel()
            : ($model->name ?? $model->getKey());

        static::create([
            'user_id'     => $userId,
            'action'      => $action,
            'model_type'  => get_class($model),
            'model_id'    => $model->getKey(),
            'model_label' => $label,
            'changes'     => $changes,
            'ip_address'  => request()->ip(),
        ]);
    }
}
