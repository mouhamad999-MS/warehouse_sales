<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'email', 'phone', 'address', 'created_by', 'avatar_url'];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class);
    }
}
