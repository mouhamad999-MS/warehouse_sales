<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $unitPrice = $this->product?->unit_price ?? 0;
        return [
            'id' => $this->id,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'unit_price' => $unitPrice,
            'total_cost' => $unitPrice * $this->quantity,
            'product' => new ProductResource($this->whenLoaded('product')),
            'requested_by' => new UserResource($this->whenLoaded('requestedBy')),
            'approved_by' => new UserResource($this->whenLoaded('approvedBy')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
