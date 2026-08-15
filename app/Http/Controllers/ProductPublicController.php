<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

/**
 * Public product info page — NO AUTH REQUIRED.
 * Accessible via GET /product/{sku}
 * Intended to be scanned via phone camera from a QR code sticker on a product box.
 *
 * Flow:
 *   1. Warehouse Manager prints QR labels (BulkQrPrint page)
 *   2. Sticks labels on product boxes / pallets
 *   3. Anyone with a phone scans → browser opens this page → sees stock info instantly
 */
class ProductPublicController extends Controller
{
    public function show(string $sku)
    {
        $product = Product::with('category', 'location')
            ->where('sku', $sku)
            ->first();

        if (!$product) {
            abort(404);
        }

        $data = [
            'id'           => $product->id,
            'name'         => $product->name,
            'sku'          => $product->sku,
            'price'        => $product->unit_price,
            'photo_url'    => $product->image_url,
            'quantity'     => $product->quantity,
            'min_quantity' => $product->min_stock_level,
            'is_low_stock' => $product->isLowStock(),
            'category'     => $product->category
                ? ['id' => $product->category->id, 'name' => $product->category->name]
                : null,
            'location'     => $product->location
                ? [
                    'rack'  => $product->location->rack,
                    'shelf' => $product->location->shelf,
                    'bin'   => $product->location->bin,
                  ]
                : null,
        ];

        return view('public.product', compact('data'));
    }
}
