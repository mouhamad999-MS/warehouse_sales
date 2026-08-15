<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return CategoryResource::collection(Category::withCount('products')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        $category = Category::create($request->only('name', 'description'));
        return new CategoryResource($category);
    }

    public function show(Category $category)
    {
        return new CategoryResource($category->load('products'));
    }

    public function update(Request $request, Category $category)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        $category->update($request->only('name', 'description'));
        return new CategoryResource($category);
    }

    public function destroy(Category $category)
    {
        try {
            $category->delete();
        } catch (QueryException $e) {
            return response()->json(['message' => 'Cannot delete category: it is assigned to one or more products.'], 422);
        }
        return response()->json(['message' => 'Deleted']);
    }
}
