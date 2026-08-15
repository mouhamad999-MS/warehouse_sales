<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MeasurementUnit;
use App\Models\Product;
use App\Models\WarehouseLocation;
use App\Services\QrCodeService;
use Illuminate\Http\Request;

class QrController extends Controller
{
    public function __construct(private QrCodeService $qr) {}

    /** GET /api/qr/product/{id} — single product QR */
    public function getProductQr(int $id)
    {
        return response()->json($this->qr->generateProductQr($id));
    }

    /** GET /api/qr/location/{id} — single location QR */
    public function getLocationQr(int $id)
    {
        return response()->json($this->qr->generateLocationQr($id));
    }

    /** POST /api/qr/products/bulk — bulk product QRs */
    public function bulkProductQrs(Request $request)
    {
        $request->validate(['product_ids' => 'required|array|min:1', 'product_ids.*' => 'integer|exists:products,id']);

        return response()->json($this->qr->generateBulkProductQrs($request->product_ids));
    }

    /** POST /api/qr/locations/bulk — bulk location QRs (all locations if no ids given) */
    public function bulkLocationQrs(Request $request)
    {
        $ids = $request->input('location_ids')
            ?? WarehouseLocation::pluck('id')->all();

        return response()->json($this->qr->generateBulkLocationQrs($ids));
    }

    /**
     * POST /api/qr/scan
     * Accepts { url: "https://domain.com/product/PRD-001" }
     * Parses the URL, resolves the product or location, returns full data with photo_url.
     * Used by the in-app QuickScanPanel.
     */
    public function scanQr(Request $request)
    {
        $request->validate(['url' => 'required|string|max:500']);

        $raw    = trim($request->url);
        $parsed = parse_url($raw);
        $path   = ltrim($parsed['path'] ?? '', '/');
        $parts  = explode('/', $path);

        // If not a recognised path structure, treat the whole value as a SKU
        if (count($parts) < 2 || !in_array($parts[0], ['product', 'location'])) {
            $product = Product::with('category', 'location')
                ->where('sku', $raw)
                ->first();

            if (!$product) {
                return response()->json(['type' => 'not_found', 'raw' => $raw]);
            }

            return response()->json([
                'type'         => 'product',
                'id'           => $product->id,
                'name'         => $product->name,
                'sku'          => $product->sku,
                'photo_url'    => $product->image_url,
                'quantity'     => $product->quantity,
                'min_quantity' => $product->min_stock_level,
                'is_low_stock' => $product->isLowStock(),
                'category'     => $product->category?->name,
                'location'     => $product->location ? [
                    'rack'  => $product->location->rack,
                    'shelf' => $product->location->shelf,
                    'bin'   => $product->location->bin,
                ] : null,
            ]);
        }

        [$type, $identifier] = [$parts[0], $parts[1]];

        if ($type === 'product') {
            $product = Product::with('category', 'location')
                ->where('sku', $identifier)
                ->first();

            if (!$product) {
                return response()->json(['type' => 'not_found', 'raw' => $identifier]);
            }

            return response()->json([
                'type'         => 'product',
                'id'           => $product->id,
                'name'         => $product->name,
                'sku'          => $product->sku,
                'unit_price'   => $product->unit_price,
                'photo_url'    => $product->image_url,
                'quantity'     => $product->quantity,
                'min_quantity' => $product->min_stock_level,
                'is_low_stock' => $product->isLowStock(),
                'category'     => $product->category?->name,
                'location'     => $product->location ? [
                    'rack'  => $product->location->rack,
                    'shelf' => $product->location->shelf,
                    'bin'   => $product->location->bin,
                ] : null,
            ]);
        }

        if ($type === 'location') {
            $location = WarehouseLocation::with('products.category')
                ->find((int) $identifier);

            if (!$location) {
                return response()->json(['error' => 'Location not found'], 404);
            }

            return response()->json([
                'type'         => 'location',
                'id'           => $location->id,
                'rack'         => $location->rack,
                'shelf'        => $location->shelf,
                'bin'          => $location->bin,
                'capacity'     => $location->capacity,
                'current_load' => $location->current_load,
                'products'     => $location->products->map(fn($p) => [
                    'id'        => $p->id,
                    'name'      => $p->name,
                    'sku'       => $p->sku,
                    'quantity'  => $p->quantity,
                    'photo_url' => $p->image_url,
                    'category'  => $p->category?->name,
                ]),
            ]);
        }

        return response()->json(['error' => 'Unknown QR type'], 422);
    }

    /**
     * POST /api/qr/quick-add
     * Auto-creates a product from a raw scanned value (barcode / URL).
     * Extracts a clean SKU from URLs; generates a human-readable default name.
     */
    public function quickAdd(Request $request)
    {
        $request->validate(['raw' => 'required|string|max:500']);

        $raw = trim($request->raw);

        // Extract the meaningful identifier from URLs
        // e.g. "https://example.com/product/ABC-123" → "ABC-123"
        $sku = $raw;
        if (filter_var($raw, FILTER_VALIDATE_URL)) {
            $path  = ltrim(parse_url($raw, PHP_URL_PATH) ?? '', '/');
            $parts = array_filter(explode('/', $path));
            $sku   = end($parts) ?: $raw;
        }
        // Truncate to 100 chars in case barcode is unusually long
        $sku = substr($sku, 0, 100);

        // Check active product first
        $existing = Product::withTrashed()->with('category', 'location')->where('sku', $sku)->first();

        if ($existing && ! $existing->trashed()) {
            return response()->json([
                'type'            => 'product',
                'id'              => $existing->id,
                'name'            => $existing->name,
                'sku'             => $existing->sku,
                'photo_url'       => $existing->image_url,
                'quantity'        => $existing->quantity,
                'min_quantity'    => $existing->min_stock_level,
                'is_low_stock'    => $existing->isLowStock(),
                'category'        => $existing->category?->name,
                'location'        => $existing->location ? [
                    'rack'  => $existing->location->rack,
                    'shelf' => $existing->location->shelf,
                    'bin'   => $existing->location->bin,
                ] : null,
                'already_existed' => true,
            ]);
        }

        // Soft-deleted product with the same SKU — restore it rather than failing
        // with a unique-constraint error on create
        if ($existing && $existing->trashed()) {
            $existing->restore();
            $existing->load('category', 'location');

            return response()->json([
                'type'            => 'product',
                'id'              => $existing->id,
                'name'            => $existing->name,
                'sku'             => $existing->sku,
                'photo_url'       => $existing->image_url,
                'quantity'        => $existing->quantity,
                'min_quantity'    => $existing->min_stock_level,
                'is_low_stock'    => $existing->isLowStock(),
                'category'        => $existing->category?->name,
                'location'        => $existing->location ? [
                    'rack'  => $existing->location->rack,
                    'shelf' => $existing->location->shelf,
                    'bin'   => $existing->location->bin,
                ] : null,
                'already_existed' => false,
            ]);
        }

        $categoryId = Category::orderBy('id')->value('id');
        $unitId     = MeasurementUnit::orderBy('id')->value('id');

        if (! $categoryId || ! $unitId) {
            return response()->json([
                'error' => 'Please create at least one category and measurement unit before scanning new products.',
            ], 422);
        }

        // Build a readable default name from the SKU
        // "ABC-123" → "Product ABC-123"
        $name = 'Product ' . strtoupper($sku);

        $product = Product::create([
            'name'            => $name,
            'sku'             => $sku,
            'category_id'     => $categoryId,
            'unit_id'         => $unitId,
            'quantity'        => 0,
            'min_stock_level' => 0,
            'unit_price'      => 0,
        ]);

        $product->load('category', 'location');

        return response()->json([
            'type'            => 'product',
            'id'              => $product->id,
            'name'            => $product->name,
            'sku'             => $product->sku,
            'photo_url'       => null,
            'quantity'        => 0,
            'min_quantity'    => 0,
            'is_low_stock'    => false,
            'category'        => $product->category?->name,
            'location'        => null,
            'already_existed' => false,
        ], 201);
    }
}
