<?php

namespace App\Console\Commands;

use App\Models\WarehouseLocation;
use Illuminate\Console\Command;

class RecalculateLocationLoad extends Command
{
    protected $signature   = 'warehouse:recalculate-load';
    protected $description = 'Recalculate current_load for all warehouse locations from actual product quantities';

    public function handle(): int
    {
        $locations = WarehouseLocation::with('products')->get();

        $fixed = 0;

        foreach ($locations as $location) {
            $actual = (int) $location->products->sum('quantity');

            if ($location->current_load !== $actual) {
                $this->line("  {$location->name}: {$location->current_load} → {$actual} (capacity: {$location->capacity})");
                $location->update(['current_load' => $actual]);
                $fixed++;
            }
        }

        $this->info("Done. {$fixed} location(s) corrected out of {$locations->count()} total.");

        return self::SUCCESS;
    }
}
