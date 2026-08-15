<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DemandForecastingService
{
    /**
     * Return a paginated list of demand forecasts.
     * If $productId is given, returns only that product (page size 1).
     */
    public function paginate(?int $productId = null, int $perPage = 20, int $page = 1): LengthAwarePaginator
    {
        $query = Product::select('id', 'name', 'quantity');

        if ($productId) {
            $query->where('id', $productId);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        $items = $this->computeForProducts($paginator->getCollection());

        return new LengthAwarePaginator(
            $items,
            $paginator->total(),
            $paginator->perPage(),
            $paginator->currentPage(),
            ['path' => LengthAwarePaginator::resolveCurrentPath()]
        );
    }

    // ──────────────────────────────────────────────────────────────────────────

    private function computeForProducts(Collection $products): array
    {
        $isSqlite = DB::getDriverName() === 'sqlite';
        $results  = [];

        foreach ($products as $product) {
            $rawWeekly = $this->getWeeklySales($product->id, $isSqlite);
            $history   = $this->buildHistory($rawWeekly, 12);

            $sma4  = $this->sma($history, 4);
            $wma12 = $this->wma($history);

            // WMA is the primary predictor; fall back to SMA if no weighted data
            $weeklyPrediction = $wma12 > 0 ? $wma12 : $sma4;

            $forecast        = $this->buildForecast($weeklyPrediction, 4);
            $total30         = (int) round($weeklyPrediction * 4.286); // 30 days ÷ 7
            $confidence      = $this->confidence($history);

            $results[] = [
                'product_id'              => $product->id,
                'product_name'            => $product->name,
                'current_stock'           => $product->quantity,
                'weekly_history'          => $history,
                'forecast_next_4_weeks'   => $forecast,
                'total_predicted_30_days' => $total30,
                'confidence'              => $confidence,
                'sma_4week'               => round($sma4, 2),
                'wma_12week'              => round($wma12, 2),
            ];
        }

        return $results;
    }

    /**
     * Query approved sales_order_items grouped into relative week buckets.
     * weeks_ago = 0 → current week, 11 → 12 weeks ago.
     */
    private function getWeeklySales(int $productId, bool $isSqlite): array
    {
        $weekExpr = $isSqlite
            ? "CAST((julianday('now') - julianday(sales_orders.created_at)) / 7 AS INTEGER)"
            : "FLOOR(DATEDIFF(NOW(), DATE(sales_orders.created_at)) / 7)";

        return DB::table('sales_order_items')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->where('sales_order_items.product_id', $productId)
            ->where('sales_orders.status', 'APPROVED')
            ->whereRaw('sales_orders.created_at >= ?', [now()->subWeeks(12)->toDateTimeString()])
            ->selectRaw("{$weekExpr} as weeks_ago, SUM(sales_order_items.quantity) as qty_sold")
            ->groupByRaw($weekExpr)
            ->orderBy('weeks_ago', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Build a chronological 12-week array (oldest first) filling missing weeks with 0.
     */
    private function buildHistory(array $rawWeekly, int $numWeeks): array
    {
        // Map weeks_ago => qty
        $weekMap = [];
        foreach ($rawWeekly as $row) {
            $weekMap[(int) $row->weeks_ago] = (int) $row->qty_sold;
        }

        $history = [];
        for ($weeksAgo = $numWeeks - 1; $weeksAgo >= 0; $weeksAgo--) {
            $start     = now()->subWeeks($weeksAgo)->startOfWeek();
            $history[] = [
                'week'     => 'W' . $start->format('W'),
                'date'     => $start->format('M d'),
                'qty_sold' => $weekMap[$weeksAgo] ?? 0,
            ];
        }

        return $history;
    }

    /** Build forecast array of N future weeks with constant weekly prediction. */
    private function buildForecast(float $weeklyQty, int $weeks): array
    {
        $forecast = [];
        for ($i = 1; $i <= $weeks; $i++) {
            $start      = now()->addWeeks($i)->startOfWeek();
            $forecast[] = [
                'week'          => 'W' . $start->format('W'),
                'date'          => $start->format('M d'),
                'predicted_qty' => max(0, (int) round($weeklyQty)),
            ];
        }
        return $forecast;
    }

    /** 4-week simple moving average. */
    private function sma(array $history, int $period): float
    {
        $values = array_column($history, 'qty_sold');
        $slice  = array_slice($values, -$period);
        return count($slice) ? array_sum($slice) / count($slice) : 0.0;
    }

    /**
     * 12-week weighted moving average.
     * Weeks 1-4 (most recent)  → weight 3
     * Weeks 5-8                → weight 2
     * Weeks 9-12               → weight 1
     */
    private function wma(array $history): float
    {
        $values      = array_column($history, 'qty_sold');
        $n           = count($values);
        $weightedSum = 0.0;
        $totalWeight = 0;

        for ($i = 0; $i < $n; $i++) {
            $posFromEnd = $n - $i; // 1 = most recent week
            $weight     = match (true) {
                $posFromEnd <= 4  => 3,
                $posFromEnd <= 8  => 2,
                default           => 1,
            };
            $weightedSum += $values[$i] * $weight;
            $totalWeight += $weight;
        }

        return $totalWeight > 0 ? $weightedSum / $totalWeight : 0.0;
    }

    /**
     * Confidence based on coefficient of variation (stddev / mean).
     * LOW variance  → HIGH confidence
     * HIGH variance → LOW confidence
     */
    private function confidence(array $history): string
    {
        $values = array_column($history, 'qty_sold');
        $n      = count($values);
        $mean   = $n ? array_sum($values) / $n : 0;

        if ($mean == 0) {
            return 'LOW';
        }

        $variance = array_sum(array_map(fn($v) => ($v - $mean) ** 2, $values)) / $n;
        $cv       = sqrt($variance) / $mean;

        return match (true) {
            $cv < 0.30 => 'HIGH',
            $cv < 0.60 => 'MEDIUM',
            default    => 'LOW',
        };
    }
}
