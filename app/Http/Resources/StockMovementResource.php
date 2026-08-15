<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'quantity' => $this->quantity,
            'notes' => $this->notes,
            'product' => $this->resource->product ? new ProductResource($this->resource->product) : null,
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
