<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\WarehouseLocationResource;
use App\Models\WarehouseLocation;
use Illuminate\Http\Request;

class WarehouseLocationController extends Controller
{
    public function index()
    {
        return WarehouseLocationResource::collection(WarehouseLocation::with('products')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'rack' => 'required|string|max:50',
            'shelf' => 'required|string|max:50',
            'bin' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
        ]);
        $location = WarehouseLocation::create($request->only('rack', 'shelf', 'bin', 'capacity'));
        return new WarehouseLocationResource($location);
    }

    public function show(WarehouseLocation $warehouseLocation)
    {
        return new WarehouseLocationResource($warehouseLocation->load('products'));
    }

    public function update(Request $request, WarehouseLocation $warehouseLocation)
    {
        $request->validate([
            'rack' => 'required|string|max:50',
            'shelf' => 'required|string|max:50',
            'bin' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
        ]);
        $warehouseLocation->update($request->only('rack', 'shelf', 'bin', 'capacity'));
        return new WarehouseLocationResource($warehouseLocation);
    }

    public function destroy(WarehouseLocation $warehouseLocation)
    {
        $warehouseLocation->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
