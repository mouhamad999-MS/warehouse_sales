<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\WarehouseLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();

        return match ($role) {
            'admin' => $this->adminStats(),
            'warehouse_manager' => $this->warehouseStats(),
            'sales_officer' => $this->salesStats(),
            default => response()->json(['message' => 'Unknown role'], 403),
        };
    }

    private function adminStats()
    {
        $usersByRole = User::with('roles')
            ->get()
            ->groupBy(fn($u) => $u->getRoleNames()->first() ?? 'no_role')
            ->map->count();

        $isSqlite = DB::getDriverName() === 'sqlite';
        $concatExpr = $isSqlite ? "(rack || shelf)" : "CONCAT(rack, shelf)";

        $locations = WarehouseLocation::selectRaw("COUNT(*) as total, COUNT(DISTINCT rack) as racks, COUNT(DISTINCT {$concatExpr}) as shelves")->first();

        return response()->json([
            'users_by_role' => $usersByRole,
            'total_users' => User::count(),
            'warehouse_map' => [
                'total_locations' => $locations->total ?? 0,
                'racks' => WarehouseLocation::distinct('rack')->count('rack'),
                'shelves' => WarehouseLocation::selectRaw("COUNT(DISTINCT {$concatExpr}) as cnt")->value('cnt') ?? 0,
                'bins' => $locations->total ?? 0,
            ],
        ]);
    }

    private function warehouseStats()
    {
        // Cache counts for 2 minutes (invalidated by observers on write)
        $counts = Cache::remember('dashboard.warehouse.counts', 120, function () {
            return [
                'total_products'        => Product::count(),
                'low_stock_count'       => Product::whereColumn('quantity', '<=', 'min_stock_level')->count(),
                'pending_sales_orders'  => SalesOrder::where('status', 'SUBMITTED')->count(),
                'pending_purchase_orders' => PurchaseOrder::where('status', 'SUBMITTED')->count(),
                'total_capacity'        => WarehouseLocation::sum('capacity'),
                'total_load'            => WarehouseLocation::sum('current_load'),
            ];
        });

        $utilization = $counts['total_capacity'] > 0
            ? round(($counts['total_load'] / $counts['total_capacity']) * 100, 1)
            : 0;

        // Recent movements and low-stock products are time-sensitive, shorter cache
        $recentMovements = Cache::remember('dashboard.warehouse.movements', 60, function () {
            return StockMovement::with('product', 'user')->latest()->take(10)->get();
        });

        $lowStockProducts = Cache::remember('dashboard.warehouse.low_stock', 120, function () {
            return Product::with('category', 'unit')
                ->whereColumn('quantity', '<=', 'min_stock_level')
                ->take(5)->get();
        });

        return response()->json([
            'total_products'       => $counts['total_products'],
            'low_stock_count'      => $counts['low_stock_count'],
            'low_stock_products'   => $lowStockProducts,
            'recent_movements'     => $recentMovements,
            'pending_approvals'    => [
                'sales_orders'     => $counts['pending_sales_orders'],
                'purchase_orders'  => $counts['pending_purchase_orders'],
            ],
            'warehouse_utilization' => $utilization,
        ]);
    }

    private function salesStats()
    {
        $today = now()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        $revenue = fn($from) => SalesOrder::where('status', 'APPROVED')
            ->where('created_at', '>=', $from)
            ->sum('total_amount');

        $topProducts = DB::table('sales_order_items')
            ->join('products', 'products.id', '=', 'sales_order_items.product_id')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->where('sales_orders.status', 'APPROVED')
            ->selectRaw('products.name, SUM(sales_order_items.quantity) as total_sold')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_sold')
            ->take(5)->get();

        return response()->json([
            'orders_by_status' => SalesOrder::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')->pluck('count', 'status'),
            'revenue' => [
                'today' => $revenue($today),
                'this_week' => $revenue($weekStart),
                'this_month' => $revenue($monthStart),
            ],
            'top_products' => $topProducts,
            'recent_orders' => SalesOrder::with('customer')->latest()->take(5)->get()->map(fn($o) => [
                'id'           => $o->id,
                'status'       => $o->status,
                'total_amount' => $o->total_amount,
                'created_at'   => $o->created_at?->toDateTimeString(),
                'customer'     => $o->customer ? [
                    'name'       => $o->customer->name,
                    'avatar_url' => $o->customer->avatar_url ? asset('storage/' . $o->customer->avatar_url) : null,
                ] : null,
            ]),
            'total_customers' => Customer::count(),
        ]);
    }
}
