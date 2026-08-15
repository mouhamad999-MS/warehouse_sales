<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseLocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rack' => $this->rack,
            'shelf' => $this->shelf,
            'bin' => $this->bin,
            'label' => "{$this->rack}-{$this->shelf}-{$this->bin}",
            'capacity' => $this->capacity,
            'current_load' => $this->current_load,
            'remaining_capacity' => $this->remainingCapacity(),
            'is_available' => $this->isAvailable(),
            'utilization_percent' => $this->capacity > 0
                ? round(($this->current_load / $this->capacity) * 100, 1)
                : 0,
            'products' => ProductResource::collection($this->whenLoaded('products')),
        ];
    }
}
