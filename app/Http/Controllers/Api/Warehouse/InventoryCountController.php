<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryCountController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'counts' => 'required|array|min:1',
            'counts.*.product_id' => 'required|exists:products,id',
            'counts.*.actual_quantity' => 'required|integer|min:0',
            'counts.*.notes' => 'nullable|string',
        ]);

        $results = DB::transaction(function () use ($request) {
            $adjustments = [];

            foreach ($request->counts as $count) {
                $product = Product::lockForUpdate()->findOrFail($count['product_id']);
                $oldQuantity = $product->quantity;
                $diff = $count['actual_quantity'] - $oldQuantity;

                if ($diff !== 0) {
                    StockMovement::create([
                        'product_id' => $product->id,
                        'user_id' => $request->user()->id,
                        'type' => 'ADJUSTMENT',
                        'quantity' => abs($diff),
                        'notes' => $count['notes'] ?? "Inventory count adjustment: {$diff}",
                    ]);

                    $product->update(['quantity' => $count['actual_quantity']]);

                    if ($product->location_id) {
                        if ($diff > 0) {
                            $location = $product->location()->lockForUpdate()->first();
                            $available = $location->capacity - $location->current_load;
                            if ($available < $diff) {
                                throw ValidationException::withMessages([
                                    'counts' => ["Product '{$product->name}': exceeds bin capacity. Available space: {$available}"],
                                ]);
                            }
                            $location->increment('current_load', $diff);
                        } else {
                            $product->location()->decrement('current_load', abs($diff));
                        }
                    }

                    $adjustments[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'old_quantity' => $oldQuantity,
                        'new_quantity' => $count['actual_quantity'],
                        'adjustment' => $diff,
                    ];
                }
            }

            return $adjustments;
        });

        return response()->json(['adjustments' => $results, 'message' => 'Inventory count completed']);
    }
}
