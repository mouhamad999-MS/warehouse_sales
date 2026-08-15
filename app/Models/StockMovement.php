<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'user_id', 'type', 'quantity', 'notes'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getActivityLabel(): string
    {
        $productName = $this->product?->name ?? "Product #{$this->product_id}";
        return "{$this->type} x{$this->quantity} — {$productName}";
    }
}
