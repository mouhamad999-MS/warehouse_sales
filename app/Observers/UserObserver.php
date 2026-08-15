<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\User;

class UserObserver
{
    public function created(User $user): void
    {
        ActivityLog::record('created', $user);
    }

    public function updated(User $user): void
    {
        $changed = $user->getChanges();
        $changes = [];

        foreach ($changed as $field => $newValue) {
            if (in_array($field, ['updated_at', 'password', 'remember_token'])) continue;
            $changes[$field] = [
                'before' => $user->getOriginal($field),
                'after'  => $newValue,
            ];
        }

        if ($changes) {
            ActivityLog::record('updated', $user, $changes);
        }
    }

    public function deleted(User $user): void
    {
        ActivityLog::record('deleted', $user);
    }
}
