<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QrController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\Admin\MeasurementUnitController;
use App\Http\Controllers\Api\Admin\WarehouseLocationController;
use App\Http\Controllers\Api\Warehouse\ProductController as WProductController;
use App\Http\Controllers\Api\Warehouse\CategoryController;
use App\Http\Controllers\Api\Warehouse\StockMovementController;
use App\Http\Controllers\Api\Warehouse\InventoryCountController;
use App\Http\Controllers\Api\Warehouse\ApprovalController;
use App\Http\Controllers\Api\Warehouse\PurchaseOrderController;
use App\Http\Controllers\Api\Sales\ProductController as SProductController;
use App\Http\Controllers\Api\Sales\OrderController;
use App\Http\Controllers\Api\Sales\CustomerController;
use App\Http\Controllers\Api\Sales\ReportController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/2fa/verify', [AuthController::class, 'verify2fa'])->middleware('throttle:5,1');
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:3,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [AuthController::class, 'uploadAvatar']);
    Route::delete('/profile/avatar', [AuthController::class, 'removeAvatar']);
    Route::get('/profile/2fa/setup', [AuthController::class, 'setup2fa']);
    Route::post('/profile/2fa/enable', [AuthController::class, 'enable2fa']);
    Route::post('/profile/2fa/disable', [AuthController::class, 'disable2fa']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Exports (any authenticated user)
    Route::get('export/products', [ExportController::class, 'products']);
    Route::get('export/stock-history', [ExportController::class, 'stockHistory']);
    Route::get('export/sales-orders', [ExportController::class, 'salesOrders']);

    // Admin
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::patch('users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        Route::patch('users/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::get('settings', [SettingsController::class, 'show']);
        Route::put('settings', [SettingsController::class, 'update']);
        Route::apiResource('measurement-units', MeasurementUnitController::class);
        Route::apiResource('warehouse-locations', WarehouseLocationController::class);
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
        Route::post('users/{user}/avatar', [UserController::class, 'uploadAvatar']);
        Route::delete('users/{user}/avatar', [UserController::class, 'removeAvatar']);
    });

    // QR Codes (any authenticated user can view; bulk/scan restricted to warehouse_manager)
    Route::prefix('qr')->group(function () {
        Route::get('product/{id}', [QrController::class, 'getProductQr']);
        Route::get('location/{id}', [QrController::class, 'getLocationQr']);
        Route::middleware('role:warehouse_manager')->group(function () {
            Route::post('products/bulk', [QrController::class, 'bulkProductQrs']);
            Route::post('locations/bulk', [QrController::class, 'bulkLocationQrs']);
            Route::post('scan', [QrController::class, 'scanQr']);
            Route::post('quick-add', [QrController::class, 'quickAdd']);
        });
    });

    // Warehouse Manager
    Route::middleware('role:warehouse_manager')->prefix('warehouse')->group(function () {
        Route::apiResource('products', WProductController::class);
        Route::put('products/{product}/assign-location', [WProductController::class, 'assignLocation']);
        Route::patch('products/{product}/location', [WProductController::class, 'assignLocation']);
        Route::get('suggest-location/{product}', [WProductController::class, 'suggestLocation']);
        Route::get('ai/suggest-location', [AiController::class, 'suggestLocation']);
        Route::get('ai/demand-forecast', [AiController::class, 'forecastDemand']);
        Route::get('locations', fn() => response()->json(['data' => \App\Models\WarehouseLocation::with('products')->get()]));
        Route::get('units', fn() => response()->json(['data' => \App\Models\MeasurementUnit::orderBy('name')->get()]));
        Route::apiResource('categories', CategoryController::class);
        Route::post('stock/inbound', [StockMovementController::class, 'inbound']);
        Route::post('stock/inbound/import', [StockMovementController::class, 'importInbound']);
        Route::post('stock/outbound', [StockMovementController::class, 'outbound']);
        Route::get('stock/history', [StockMovementController::class, 'history']);
        Route::post('inventory-count', [InventoryCountController::class, 'store']);
        Route::get('approvals/sales-orders', [ApprovalController::class, 'salesOrders']);
        Route::put('approvals/sales-orders/{salesOrder}', [ApprovalController::class, 'approveSalesOrder']);
        Route::get('approvals/purchase-orders', [ApprovalController::class, 'purchaseOrders']);
        Route::put('approvals/purchase-orders/{purchaseOrder}', [ApprovalController::class, 'approvePurchaseOrder']);
        Route::get('purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::post('purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::get('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
        Route::patch('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel']);
        Route::patch('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
    });

    // Sales Officer
    Route::middleware('role:sales_officer')->prefix('sales')->group(function () {
        Route::get('products', [SProductController::class, 'index']);
        Route::get('products/{product}', [SProductController::class, 'show']);
        Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'show']);
        Route::patch('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::apiResource('customers', CustomerController::class)->except(['destroy']);
        Route::get('reports', [ReportController::class, 'index']);
        Route::post('customers/{customer}/avatar', [CustomerController::class, 'uploadAvatar']);
        Route::delete('customers/{customer}/avatar', [CustomerController::class, 'removeAvatar']);
    });
});
