<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseOrderResource;
use App\Http\Resources\SalesOrderResource;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApprovalController extends Controller
{
    public function salesOrders()
    {
        $orders = SalesOrder::with('customer', 'salesOfficer', 'items.product')
            ->where('status', 'SUBMITTED')
            ->latest()
            ->paginate(20);
        return SalesOrderResource::collection($orders);
    }

    public function approveSalesOrder(Request $request, SalesOrder $salesOrder)
    {
        $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string',
        ]);

        if ($request->action === 'reject') {
            $salesOrder->transitionTo('REJECTED', ['approved_by' => $request->user()->id]);
            return new SalesOrderResource($salesOrder->load('customer', 'items.product'));
        }

        DB::transaction(function () use ($request, $salesOrder) {
            // Verify stock for all items
            foreach ($salesOrder->items as $item) {
                $product = $item->product()->lockForUpdate()->first();
                if ($product->quantity < $item->quantity) {
                    throw ValidationException::withMessages([
                        'stock' => ["Insufficient stock for {$product->name}. Available: {$product->quantity}"],
                    ]);
                }
            }

            $salesOrder->transitionTo('APPROVED', ['approved_by' => $request->user()->id]);

            foreach ($salesOrder->items as $item) {
                $product = $item->product()->lockForUpdate()->first();
                $product->decrement('quantity', $item->quantity);

                if ($product->location_id) {
                    $product->location()->decrement('current_load', $item->quantity);
                }

                StockMovement::create([
                    'product_id' => $item->product_id,
                    'user_id' => $request->user()->id,
                    'type' => 'OUTBOUND',
                    'quantity' => $item->quantity,
                    'notes' => "Sales order #{$salesOrder->id} approved",
                ]);
            }
        });

        return new SalesOrderResource($salesOrder->load('customer', 'items.product', 'approvedBy'));
    }

    public function purchaseOrders()
    {
        $orders = PurchaseOrder::with('product', 'requestedBy')
            ->where('status', 'SUBMITTED')
            ->latest()
            ->paginate(20);
        return PurchaseOrderResource::collection($orders);
    }

    public function approvePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder)
    {
        $request->validate(['action' => 'required|in:approve,reject']);

        $status = $request->action === 'approve' ? 'APPROVED' : 'REJECTED';
        $purchaseOrder->transitionTo($status, ['approved_by' => $request->user()->id]);

        return new PurchaseOrderResource($purchaseOrder->load('product', 'requestedBy', 'approvedBy'));
    }
}
