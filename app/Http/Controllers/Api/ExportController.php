<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function products(): StreamedResponse
    {
        $products = Product::with('category', 'unit', 'location')->get();

        return $this->toCsv(
            ['ID', 'SKU', 'Name', 'Category', 'Unit', 'Quantity', 'Min Stock', 'Unit Price', 'Location', 'Status'],
            $products->map(fn($p) => [
                $p->id, $p->sku, $p->name,
                $p->category?->name ?? '-', $p->unit?->name ?? '-',
                $p->quantity, $p->min_stock_level, $p->unit_price,
                $p->location?->label ?? '-',
                $p->quantity <= $p->min_stock_level ? 'Low Stock' : 'OK',
            ])->toArray(),
            'products.csv'
        );
    }

    public function stockHistory(Request $request): StreamedResponse
    {
        // Sales officers cannot access stock history — warehouse/admin only
        if ($request->user()->hasRole('sales_officer')) {
            abort(403, 'Unauthorized');
        }

        $movements = StockMovement::with('product', 'user')->latest()->limit(500)->get();

        return $this->toCsv(
            ['ID', 'Date', 'Product', 'Type', 'Quantity', 'User', 'Notes'],
            $movements->map(fn($m) => [
                $m->id, $m->created_at->format('Y-m-d H:i'),
                $m->product?->name ?? '-', $m->type, $m->quantity,
                $m->user?->name ?? '-', $m->notes ?? '',
            ])->toArray(),
            'stock_history.csv'
        );
    }

    public function salesOrders(Request $request): StreamedResponse
    {
        $query = SalesOrder::with('customer', 'salesOfficer')->latest()->limit(500);

        // Sales officers can only export their own orders
        if ($request->user()->hasRole('sales_officer')) {
            $query->where('sales_officer_id', $request->user()->id);
        }

        $orders = $query->get();

        return $this->toCsv(
            ['ID', 'Date', 'Customer', 'Sales Officer', 'Total Amount', 'Status'],
            $orders->map(fn($o) => [
                $o->id, $o->created_at->format('Y-m-d H:i'),
                $o->customer?->name ?? '-', $o->salesOfficer?->name ?? '-',
                $o->total_amount, $o->status,
            ])->toArray(),
            'sales_orders.csv'
        );
    }

    private function toCsv(array $headers, array $rows, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
