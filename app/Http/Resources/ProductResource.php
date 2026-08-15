<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'quantity' => $this->quantity,
            'min_stock_level' => $this->min_stock_level,
            'unit_price' => $this->unit_price,
            'description' => $this->description,
            'image' => $this->image,
            'image_url' => $this->image ? asset('storage/' . $this->image) : null,
            'is_low_stock' => $this->isLowStock(),
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name,
            'unit_id' => $this->unit_id,
            'unit_name' => $this->unit?->name,
            'unit_abbreviation' => $this->unit?->abbreviation,
            'location_id' => $this->location_id,
            'location_label' => $this->location
                ? "{$this->location->rack}-{$this->location->shelf}-{$this->location->bin}"
                : null,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'unit' => new MeasurementUnitResource($this->whenLoaded('unit')),
            'location' => new WarehouseLocationResource($this->whenLoaded('location')),
            'stock_movements' => StockMovementResource::collection($this->whenLoaded('stockMovements')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
