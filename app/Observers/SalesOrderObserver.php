<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\Cache;

class SalesOrderObserver
{
    public function created(SalesOrder $order): void
    {
        ActivityLog::record('created', $order);
        Cache::forget('dashboard.warehouse.counts');
    }

    public function updated(SalesOrder $order): void
    {
        $changed = $order->getChanges(); // getChanges() has saved values; getDirty() is empty after save

        // Only log status changes to keep audit log focused
        if (isset($changed['status'])) {
            ActivityLog::record('status_changed', $order, [
                'status' => [
                    'from' => $order->getOriginal('status'),
                    'to'   => $changed['status'],
                ],
            ]);
            Cache::forget('dashboard.warehouse.counts');
        }
    }
}
