<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MeasurementUnitResource;
use App\Models\MeasurementUnit;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class MeasurementUnitController extends Controller
{
    public function index()
    {
        return MeasurementUnitResource::collection(MeasurementUnit::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'abbreviation' => 'required|string|max:10',
        ]);
        $unit = MeasurementUnit::create($request->only('name', 'abbreviation'));
        return new MeasurementUnitResource($unit);
    }

    public function show(MeasurementUnit $measurementUnit)
    {
        return new MeasurementUnitResource($measurementUnit);
    }

    public function update(Request $request, MeasurementUnit $measurementUnit)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'abbreviation' => 'required|string|max:10',
        ]);
        $measurementUnit->update($request->only('name', 'abbreviation'));
        return new MeasurementUnitResource($measurementUnit);
    }

    public function destroy(MeasurementUnit $measurementUnit)
    {
        try {
            $measurementUnit->delete();
        } catch (QueryException $e) {
            return response()->json(['message' => 'Cannot delete unit: it is assigned to one or more products.'], 422);
        }
        return response()->json(['message' => 'Deleted']);
    }
}
