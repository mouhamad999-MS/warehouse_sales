<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'type' => 'required|in:monthly,by_category,by_product',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $from = $request->date_from ?? now()->startOfMonth()->toDateString();
        $to = $request->date_to ?? now()->toDateString();

        return match ($request->type) {
            'monthly' => $this->monthlyReport($from, $to),
            'by_category' => $this->byCategoryReport($from, $to),
            'by_product' => $this->byProductReport($from, $to),
        };
    }

    private function monthlyReport($from, $to)
    {
        $data = DB::table('sales_orders')
            ->where('status', 'APPROVED')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as order_count, SUM(total_amount) as revenue")
            ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
            ->orderBy('month')
            ->get();

        return response()->json([
            'type' => 'monthly',
            'date_from' => $from,
            'date_to' => $to,
            'data' => $data,
            'total_revenue' => $data->sum('revenue'),
            'total_orders' => $data->sum('order_count'),
        ]);
    }

    private function byCategoryReport($from, $to)
    {
        $data = DB::table('sales_order_items')
            ->join('products', 'products.id', '=', 'sales_order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->where('sales_orders.status', 'APPROVED')
            ->whereBetween(DB::raw('DATE(sales_orders.created_at)'), [$from, $to])
            ->selectRaw('categories.name as category, SUM(sales_order_items.quantity * sales_order_items.unit_price) as revenue, SUM(sales_order_items.quantity) as units_sold')
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        return response()->json([
            'type' => 'by_category',
            'date_from' => $from,
            'date_to' => $to,
            'data' => $data,
            'total_revenue' => $data->sum('revenue'),
        ]);
    }

    private function byProductReport($from, $to)
    {
        $data = DB::table('sales_order_items')
            ->join('products', 'products.id', '=', 'sales_order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->join('sales_orders', 'sales_orders.id', '=', 'sales_order_items.sales_order_id')
            ->where('sales_orders.status', 'APPROVED')
            ->whereBetween(DB::raw('DATE(sales_orders.created_at)'), [$from, $to])
            ->selectRaw('products.name as product, products.sku, categories.name as category, SUM(sales_order_items.quantity) as units_sold, SUM(sales_order_items.quantity * sales_order_items.unit_price) as revenue')
            ->groupBy('products.id', 'products.name', 'products.sku', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        return response()->json([
            'type' => 'by_product',
            'date_from' => $from,
            'date_to' => $to,
            'data' => $data,
            'total_revenue' => $data->sum('revenue'),
        ]);
    }
}
