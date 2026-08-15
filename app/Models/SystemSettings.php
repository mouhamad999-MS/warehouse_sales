<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSettings extends Model
{
    protected $fillable = ['company_name', 'currency', 'language'];

    public $timestamps = false;

    const UPDATED_AT = 'updated_at';
}
