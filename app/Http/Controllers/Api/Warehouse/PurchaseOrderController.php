<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        $orders = PurchaseOrder::with('product', 'requestedBy', 'approvedBy')
            ->latest()
            ->paginate(20);

        return PurchaseOrderResource::collection($orders);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $order = PurchaseOrder::create([
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'requested_by' => $request->user()->id,
            'status' => 'SUBMITTED',
        ]);

        return new PurchaseOrderResource($order->load('product', 'requestedBy'));
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return new PurchaseOrderResource(
            $purchaseOrder->load('product', 'requestedBy', 'approvedBy')
        );
    }

    public function cancel(Request $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->requested_by !== $request->user()->id) {
            return response()->json(['message' => 'You can only cancel your own orders.'], 403);
        }

        $purchaseOrder->transitionTo('CANCELLED');

        return new PurchaseOrderResource($purchaseOrder->load('product', 'requestedBy', 'approvedBy'));
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        return DB::transaction(function () use ($request, $purchaseOrder) {
            // Re-fetch with a row lock to prevent concurrent double-receive
            $locked = PurchaseOrder::lockForUpdate()->findOrFail($purchaseOrder->id);

            $locked->transitionTo('RECEIVED');

            $product = Product::lockForUpdate()->findOrFail($locked->product_id);
            $product->increment('quantity', $locked->quantity);

            StockMovement::create([
                'product_id' => $locked->product_id,
                'user_id' => $request->user()->id,
                'type' => 'INBOUND',
                'quantity' => $locked->quantity,
                'notes' => "Purchase Order #{$locked->id} received",
            ]);

            if ($product->location_id) {
                $location = $product->location()->lockForUpdate()->first();
                $available = $location->capacity - $location->current_load;
                if ($available < $locked->quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Exceeds bin capacity. Available space: {$available}"],
                    ]);
                }
                $location->increment('current_load', $locked->quantity);
            }

            return new PurchaseOrderResource($locked->load('product', 'requestedBy', 'approvedBy'));
        });
    }
}
