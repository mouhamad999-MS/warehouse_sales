<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Customer;

class CustomerObserver
{
    public function created(Customer $customer): void
    {
        ActivityLog::record('created', $customer);
    }

    public function updated(Customer $customer): void
    {
        $changed = $customer->getChanges();
        $changes = [];

        foreach ($changed as $field => $newValue) {
            if (in_array($field, ['updated_at', 'avatar_url'])) continue;
            $changes[$field] = [
                'before' => $customer->getOriginal($field),
                'after'  => $newValue,
            ];
        }

        if ($changes) {
            ActivityLog::record('updated', $customer, $changes);
        }
    }
}
