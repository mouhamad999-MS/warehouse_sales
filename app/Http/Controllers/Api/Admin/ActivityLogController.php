<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user')
            ->whereNotNull('user_id')
            ->latest()
            ->limit(200);

        if ($request->filled('model_type')) {
            $query->where('model_type', 'like', "%{$request->model_type}%");
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->user_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        return response()->json(['data' => $query->get()]);
    }
}
