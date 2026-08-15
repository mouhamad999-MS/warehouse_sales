<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'avatar_url' => $this->avatar_url ? asset('storage/' . $this->avatar_url) : null,
            'created_by' => new UserResource($this->whenLoaded('createdBy')),
            'sales_orders_count' => $this->when(isset($this->sales_orders_count), $this->sales_orders_count),
            'sales_orders' => $this->whenLoaded('salesOrders', function () {
                return $this->salesOrders->map(fn($o) => [
                    'id'           => $o->id,
                    'status'       => $o->status,
                    'total_amount' => $o->total_amount,
                    'created_at'   => $o->created_at?->toDateTimeString(),
                ]);
            }),
            'total_spent' => $this->whenLoaded('salesOrders', function () {
                return $this->salesOrders
                    ->whereIn('status', ['APPROVED', 'DELIVERED'])
                    ->sum('total_amount');
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
