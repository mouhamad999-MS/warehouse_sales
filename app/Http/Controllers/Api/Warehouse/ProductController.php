<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\WarehouseLocation;
use App\Services\LocationSuggestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category', 'unit', 'location');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('low_stock')) {
            $query->whereColumn('quantity', '<=', 'min_stock_level');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return ProductResource::collection($query->paginate($perPage));
    }

    public function store(StoreProductRequest $request)
    {
        $product = Product::create($request->validated());

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $product->update(['image' => $path]);
        }

        return new ProductResource($product->load('category', 'unit', 'location'));
    }

    public function show(Product $product)
    {
        return new ProductResource($product->load('category', 'unit', 'location', 'stockMovements.user'));
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        // Exclude quantity and location_id — those are managed via stock movements and assignLocation
        $data = collect($request->validated())
            ->except(['quantity', 'location_id'])
            ->all();

        $product->update($data);

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $path = $request->file('image')->store('products', 'public');
            $product->update(['image' => $path]);
        }

        return new ProductResource($product->load('category', 'unit', 'location'));
    }

    public function destroy(Product $product)
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        if ($product->location_id && $product->quantity > 0) {
            $product->location()->decrement('current_load', $product->quantity);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    public function assignLocation(Request $request, Product $product)
    {
        $request->validate(['location_id' => 'required|exists:warehouse_locations,id']);

        return DB::transaction(function () use ($request, $product) {
            $oldLocation = $product->location;
            $newLocation = WarehouseLocation::findOrFail($request->location_id);

            if ($oldLocation && $oldLocation->id !== $newLocation->id) {
                $oldLocation->update([
                    'current_load' => max(0, $oldLocation->current_load - $product->quantity),
                ]);
            }

            $product->update(['location_id' => $request->location_id]);

            if (!$oldLocation || $oldLocation->id !== $newLocation->id) {
                $newLocation->refresh();
                $available = $newLocation->capacity - $newLocation->current_load;
                if ($available < $product->quantity) {
                    throw ValidationException::withMessages([
                        'location_id' => ["Exceeds bin capacity. Available space: {$available}"],
                    ]);
                }
                $newLocation->increment('current_load', $product->quantity);
            }

            return new ProductResource($product->load('category', 'unit', 'location'));
        });
    }

    public function suggestLocation(Product $product, LocationSuggestionService $service)
    {
        $suggestions = $service->suggestForProduct($product);

        if ($suggestions->isEmpty()) {
            return response()->json(['message' => 'No suitable location found'], 404);
        }

        return response()->json(['suggestions' => $suggestions]);
    }
}
