<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSalesOrderRequest;
use App\Http\Resources\SalesOrderResource;
use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = SalesOrder::with('customer', 'items.product')
            ->where('sales_officer_id', $request->user()->id)
            ->latest()
            ->paginate(20);
        return SalesOrderResource::collection($orders);
    }

    public function store(StoreSalesOrderRequest $request)
    {
        $order = DB::transaction(function () use ($request) {
            $order = SalesOrder::create([
                'customer_id' => $request->customer_id,
                'sales_officer_id' => $request->user()->id,
                'status' => 'SUBMITTED',
                'total_amount' => 0,
            ]);

            $total = 0;
            foreach ($request->items as $idx => $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($product->quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        "items.{$idx}.quantity" => "Insufficient stock for {$product->name}. Available: {$product->quantity}",
                    ]);
                }

                $unitPrice = (float) $product->unit_price;

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity'   => $item['quantity'],
                    'unit_price' => $unitPrice,
                ]);
                $total += $item['quantity'] * $unitPrice;
            }

            $order->update(['total_amount' => $total]);
            return $order;
        });

        return new SalesOrderResource($order->load('customer', 'items.product', 'salesOfficer'));
    }

    public function show(Request $request, SalesOrder $order)
    {
        if ($order->sales_officer_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return new SalesOrderResource($order->load('customer', 'items.product', 'salesOfficer', 'approvedBy'));
    }

    public function cancel(Request $request, SalesOrder $order)
    {
        if ($order->sales_officer_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $order->transitionTo('CANCELLED');
        return new SalesOrderResource($order->load('customer', 'items.product'));
    }
}
