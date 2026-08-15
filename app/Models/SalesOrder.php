<?php

namespace App\Models;

use App\Models\Concerns\HasStatusTransitions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesOrder extends Model
{
    use HasFactory, HasStatusTransitions;

    const TRANSITIONS = [
        'DRAFT'     => ['SUBMITTED', 'CANCELLED'],
        'SUBMITTED' => ['APPROVED', 'REJECTED', 'CANCELLED'],
    ];

    protected $fillable = [
        'customer_id', 'sales_officer_id', 'status', 'total_amount', 'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function salesOfficer()
    {
        return $this->belongsTo(User::class, 'sales_officer_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items()
    {
        return $this->hasMany(SalesOrderItem::class);
    }
}
