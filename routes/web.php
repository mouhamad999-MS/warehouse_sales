<?php

use App\Http\Controllers\ProductPublicController;
use App\Http\Controllers\LocationPublicController;
use Illuminate\Support\Facades\Route;

// ── Public QR landing pages (no auth, scannable by any phone) ────────────────
// These MUST be declared before the SPA catch-all below.
Route::get('/product/{sku}', [ProductPublicController::class, 'show']);
Route::get('/location/{id}', [LocationPublicController::class, 'show']);

// ── React SPA catch-all ───────────────────────────────────────────────────────
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!product|location).*$');
