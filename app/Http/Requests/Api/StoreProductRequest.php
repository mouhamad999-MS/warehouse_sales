<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $productId = $this->route('product')?->id;
        return [
            'name' => 'required|string|max:255',
            'sku' => "required|string|max:100|unique:products,sku,{$productId}",
            'category_id' => 'required|exists:categories,id',
            'unit_id' => 'required|exists:measurement_units,id',
            'location_id' => 'nullable|exists:warehouse_locations,id',
            'quantity' => 'sometimes|integer|min:0',
            'min_stock_level' => 'sometimes|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|mimes:jpeg,jpg,png,webp|max:2048',
        ];
    }
}
