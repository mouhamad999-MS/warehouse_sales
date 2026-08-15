<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = ['name', 'email', 'password', 'role_id', 'is_active', 'avatar_url', 'totp_secret', 'totp_enabled_at'];

    protected $hidden = ['password', 'remember_token', 'totp_secret'];

    protected function casts(): array
    {
        return [
            'email_verified_at'  => 'datetime',
            'totp_enabled_at'    => 'datetime',
            'password'           => 'hashed',
            'is_active'          => 'boolean',
        ];
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function role()
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class, 'role_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrder::class, 'sales_officer_id');
    }

    public function approvedOrders()
    {
        return $this->hasMany(SalesOrder::class, 'approved_by');
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'created_by');
    }
}
