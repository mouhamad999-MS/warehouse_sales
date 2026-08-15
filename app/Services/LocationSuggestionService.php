<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\WarehouseLocation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class LocationSuggestionService
{
    /**
     * Full scoring system: returns top 3 locations with breakdown and reasoning.
     */
    public function suggestForProduct(Product $product): Collection
    {
        $quantity   = $product->quantity;
        $categoryId = $product->category_id;

        $locations = WarehouseLocation::with('products')->get()
            ->filter(fn($loc) => ($loc->capacity - $loc->current_load) > 0);

        // Movement counts per location over the last 30 days
        $movementCounts = StockMovement::where('stock_movements.created_at', '>=', Carbon::now()->subDays(30))
            ->join('products', 'stock_movements.product_id', '=', 'products.id')
            ->whereNotNull('products.location_id')
            ->selectRaw('products.location_id, COUNT(*) as cnt')
            ->groupBy('products.location_id')
            ->pluck('cnt', 'location_id');

        $scored = $locations->map(function (WarehouseLocation $loc) use ($quantity, $categoryId, $movementCounts) {
            $available = $loc->capacity - $loc->current_load;
            $loadPct   = $loc->capacity > 0 ? ($loc->current_load / $loc->capacity) * 100 : 0;
            $movements = (int) $movementCounts->get($loc->id, 0);

            $spaceFit          = $this->scoreSpaceFit($available, $quantity);
            $categoryProximity = $this->scoreCategoryProximity($loc, $categoryId);
            $accessFrequency   = $this->scoreAccessFrequency($movements);
            $loadBalance       = $this->scoreLoadBalance($loadPct);
            $total             = $spaceFit + $categoryProximity + $accessFrequency + $loadBalance;

            return [
                'location_id'             => $loc->id,
                'rack'                    => $loc->rack,
                'shelf'                   => $loc->shelf,
                'bin'                     => $loc->bin,
                'score'                   => $total,
                'available_space'         => $available,
                'can_fit'                 => $quantity <= 0 || $available >= $quantity,
                'current_load_percentage' => round($loadPct, 1),
                'score_breakdown'         => [
                    'space_fit'          => $spaceFit,
                    'category_proximity' => $categoryProximity,
                    'access_frequency'   => $accessFrequency,
                    'load_balance'       => $loadBalance,
                ],
                'recommendation_reason'   => $this->buildReason(
                    $available, $quantity, $spaceFit,
                    $categoryProximity, $loc->rack,
                    $movements, $accessFrequency,
                    $loadPct, $loadBalance
                ),
            ];
        });

        return $scored->sortByDesc('score')->take(3)->values();
    }

    // ─── Rule 1: Space Fit (40 pts) ─────────────────────────────────────────

    private function scoreSpaceFit(int $available, int $quantity): int
    {
        if ($quantity <= 0) return 20;
        $ratio = $available / $quantity;
        if ($ratio >= 0.9 && $ratio <= 1.1) return 40; // within 10%
        if ($ratio >= 0.75 && $ratio <= 1.25) return 30; // within 25%
        if ($available >= $quantity) return 20;          // fits
        if ($available >= $quantity * 0.5) return 10;    // tight
        return 0;
    }

    // ─── Rule 2: Category Proximity (30 pts) ────────────────────────────────

    private function scoreCategoryProximity(WarehouseLocation $location, ?int $categoryId): int
    {
        if (!$categoryId) return 0;

        $sameRackProducts = WarehouseLocation::where('rack', $location->rack)
            ->with('products')->get()
            ->flatMap(fn($l) => $l->products);

        if ($sameRackProducts->where('category_id', $categoryId)->isNotEmpty()) return 30;

        // Extract the numeric part and the prefix separately so adjacent
        // racks are built with the correct prefix (e.g. "R1" → prefix "R", num 1 → adjacent "R0","R2")
        preg_match('/^([^0-9]*)([0-9]+)$/', $location->rack, $m);
        if (count($m) === 3) {
            $prefix   = $m[1];
            $rackNum  = (int) $m[2];
            $adjacent = [$prefix . ($rackNum - 1), $prefix . ($rackNum + 1)];

            $adjacentProducts = WarehouseLocation::whereIn('rack', $adjacent)
                ->with('products')->get()
                ->flatMap(fn($l) => $l->products);

            if ($adjacentProducts->where('category_id', $categoryId)->isNotEmpty()) return 15;
        }

        return 0;
    }

    // ─── Rule 3: Access Frequency (20 pts) ──────────────────────────────────
    // High-traffic bins are preferred — products near active areas are easier to pick.

    private function scoreAccessFrequency(int $movements): int
    {
        if ($movements > 20)  return 20;
        if ($movements >= 10) return 15;
        return 5;
    }

    // ─── Rule 4: Load Balancing (10 pts) ────────────────────────────────────

    private function scoreLoadBalance(float $loadPct): int
    {
        if ($loadPct < 30) return 10;
        if ($loadPct < 60) return 7;
        if ($loadPct < 80) return 3;
        return 0;
    }

    // ─── Natural-language reason ─────────────────────────────────────────────

    private function buildReason(
        int $available, int $quantity, int $spaceFit,
        int $categoryProximity, string $rack,
        int $movements, int $accessFrequency,
        float $loadPct, int $loadBalance
    ): string {
        $parts = [];

        if ($spaceFit === 40) {
            $eff     = $quantity > 0 ? round(($quantity / max($available, 1)) * 100) : 0;
            $parts[] = "Best fit: matches product quantity with {$eff}% space efficiency.";
        } elseif ($spaceFit === 30) {
            $parts[] = "Good fit: space closely matches product quantity.";
        } elseif ($spaceFit === 20) {
            $parts[] = "Acceptable fit: sufficient space available for this product.";
        } elseif ($spaceFit === 10) {
            $parts[] = "Tight fit: limited space, may require reorganization.";
        } else {
            $parts[] = "Warning: insufficient space for the full quantity.";
        }

        if ($categoryProximity === 30) {
            $parts[] = "Same category products nearby in {$rack}.";
        } elseif ($categoryProximity === 15) {
            $parts[] = "Related category products in an adjacent rack.";
        } else {
            $parts[] = "No nearby same-category products — good for isolated storage.";
        }

        if ($accessFrequency === 20) {
            $parts[] = "High activity area ({$movements} movements/month) — easy access for frequent picks.";
        } elseif ($accessFrequency === 15) {
            $parts[] = "Moderate activity area with {$movements} movements this month.";
        } else {
            $parts[] = "Low activity area with only {$movements} movements this month.";
        }

        $rounded = round($loadPct);
        if ($loadBalance === 10) {
            $parts[] = "Well-balanced load at {$rounded}% capacity.";
        } elseif ($loadBalance === 7) {
            $parts[] = "Moderately loaded at {$rounded}% capacity.";
        } elseif ($loadBalance === 3) {
            $parts[] = "Nearly full at {$rounded}% — use with caution.";
        } else {
            $parts[] = "Heavily loaded at {$rounded}% — not recommended.";
        }

        return implode(' ', $parts);
    }

    /**
     * Legacy method kept for backward compatibility.
     */
    public function suggest(int $quantity): ?WarehouseLocation
    {
        return WarehouseLocation::all()
            ->filter(fn($loc) => $loc->remainingCapacity() >= $quantity)
            ->sortBy(fn($loc) => $loc->remainingCapacity())
            ->first();
    }
}
