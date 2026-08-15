<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSettings;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show()
    {
        $settings = SystemSettings::firstOrCreate(
            ['id' => 1],
            ['company_name' => 'My Company', 'currency' => 'SAR', 'language' => 'en']
        );
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'currency' => 'required|string|max:10',
            'language' => 'required|string|max:10',
        ]);

        $settings = SystemSettings::firstOrCreate(['id' => 1]);
        $settings->update($request->only('company_name', 'currency', 'language'));

        return response()->json($settings);
    }
}
