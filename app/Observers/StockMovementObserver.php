<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Cache;

class StockMovementObserver
{
    public function created(StockMovement $movement): void
    {
        ActivityLog::record(
            'created',
            $movement,
            [
                'type' => ['before' => null, 'after' => $movement->type],
                'quantity' => ['before' => null, 'after' => $movement->quantity],
                'notes' => ['before' => null, 'after' => $movement->notes],
            ]
        );

        Cache::forget('dashboard.warehouse.counts');
        Cache::forget('dashboard.warehouse.movements');
        Cache::forget('dashboard.warehouse.low_stock');
    }
}
