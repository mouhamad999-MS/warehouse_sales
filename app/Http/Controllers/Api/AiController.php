<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\DemandForecastingService;
use App\Services\LocationSuggestionService;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function suggestLocation(Request $request, LocationSuggestionService $service)
    {
        $request->validate(['product_id' => 'required|exists:products,id']);

        $product     = Product::findOrFail($request->product_id);
        $suggestions = $service->suggestForProduct($product);

        if ($suggestions->isEmpty()) {
            return response()->json(['message' => 'No suitable location found'], 404);
        }

        return response()->json(['suggestions' => $suggestions]);
    }

    public function forecastDemand(Request $request, DemandForecastingService $service)
    {
        $request->validate([
            'product_id' => 'nullable|integer|exists:products,id',
            'per_page'   => 'nullable|integer|min:1|max:100',
        ]);

        $productId = $request->integer('product_id') ?: null;
        $perPage   = $request->integer('per_page', 20);
        $page      = $request->integer('page', 1);

        $paginator = $service->paginate($productId, $perPage, $page);

        return response()->json([
            'data'         => $paginator->items(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
        ]);
    }
}
