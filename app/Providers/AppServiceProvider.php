<?php

namespace App\Providers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\StockMovement;
use App\Models\User;
use App\Observers\CustomerObserver;
use App\Observers\ProductObserver;
use App\Observers\SalesOrderObserver;
use App\Observers\StockMovementObserver;
use App\Observers\UserObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        Product::observe(ProductObserver::class);
        StockMovement::observe(StockMovementObserver::class);
        SalesOrder::observe(SalesOrderObserver::class);
        User::observe(UserObserver::class);
        Customer::observe(CustomerObserver::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
