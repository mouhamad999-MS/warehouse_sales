<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarehouseLocation extends Model
{
    use HasFactory;

    protected $fillable = ['rack', 'shelf', 'bin', 'capacity', 'current_load'];

    public function products()
    {
        return $this->hasMany(Product::class, 'location_id');
    }

    public function isAvailable(): bool
    {
        return $this->current_load < $this->capacity;
    }

    public function remainingCapacity(): int
    {
        return $this->capacity - $this->current_load;
    }
}
