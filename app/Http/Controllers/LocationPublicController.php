<?php

namespace App\Http\Controllers;

use App\Models\WarehouseLocation;
use Illuminate\Http\Request;

/**
 * Public location info page — NO AUTH REQUIRED.
 * Accessible via GET /location/{id}
 * Intended to be scanned via phone camera from a QR code sticker on a shelf/bin.
 *
 * Flow:
 *   1. Warehouse Manager prints location QR labels (BulkQrPrint page)
 *   2. Sticks labels on bin shelves
 *   3. Anyone scans → browser opens this page → sees all products stored there
 */
class LocationPublicController extends Controller
{
    public function show(int $id)
    {
        $location = WarehouseLocation::with(['products.category'])->find($id);

        if (!$location) {
            abort(404);
        }

        $loadPct = $location->capacity > 0
            ? round(($location->current_load / $location->capacity) * 100)
            : 0;

        $data = [
            'rack'            => $location->rack,
            'shelf'           => $location->shelf,
            'bin'             => $location->bin,
            'capacity'        => $location->capacity,
            'current_load'    => $location->current_load,
            'load_percentage' => $loadPct,
            'products'        => $location->products->map(fn($p) => [
                'id'            => $p->id,
                'name'          => $p->name,
                'sku'           => $p->sku,
                'quantity'      => $p->quantity,
                'photo_url'     => $p->image_url,
                'category_name' => $p->category?->name,
            ])->values(),
        ];

        return view('public.location', compact('data'));
    }
}
