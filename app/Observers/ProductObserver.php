<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Product;
use Illuminate\Support\Facades\Cache;

class ProductObserver
{
    public function created(Product $product): void
    {
        ActivityLog::record('created', $product);
        $this->clearDashboardCache();
    }

    public function updated(Product $product): void
    {
        $changed = $product->getChanges(); // getChanges() returns what was saved; getDirty() is empty after save
        $changes = [];

        foreach ($changed as $field => $newValue) {
            if ($field === 'updated_at') continue;
            $changes[$field] = [
                'before' => $product->getOriginal($field),
                'after'  => $newValue,
            ];
        }

        ActivityLog::record('updated', $product, $changes ?: null);
        $this->clearDashboardCache();
    }

    public function deleted(Product $product): void
    {
        ActivityLog::record('deleted', $product);
        $this->clearDashboardCache();
    }

    private function clearDashboardCache(): void
    {
        Cache::forget('dashboard.warehouse.counts');
        Cache::forget('dashboard.warehouse.low_stock');
        Cache::forget('dashboard.warehouse.movements');
    }
}
