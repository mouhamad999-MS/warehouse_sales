<?php

namespace App\Models;

use App\Models\Concerns\HasStatusTransitions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory, HasStatusTransitions;

    const TRANSITIONS = [
        'SUBMITTED' => ['APPROVED', 'REJECTED', 'CANCELLED', 'RECEIVED'],
        'APPROVED'  => ['RECEIVED'],
    ];

    protected $fillable = ['product_id', 'requested_by', 'approved_by', 'quantity', 'status'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
