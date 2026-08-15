<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->getRoleNames()->first(),
            'role_id' => $this->role_id,
            'is_active'       => $this->is_active,
            'avatar_url'      => $this->avatar_url ? asset('storage/' . $this->avatar_url) : null,
            'two_fa_enabled'  => (bool) $this->totp_enabled_at,
            'created_at'      => $this->created_at?->toDateTimeString(),
        ];
    }
}
