<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $data['name'] }} — Product Info</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">

    {{-- Low stock banner --}}
    @if($data['is_low_stock'])
    <div class="bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold">
        ⚠ Low Stock Alert — Replenishment needed
    </div>
    @endif

    <div class="max-w-md mx-auto">

        {{-- Product photo --}}
        @if($data['photo_url'])
        <div class="w-full bg-gray-200" style="max-height:300px;overflow:hidden;">
            <img src="{{ $data['photo_url'] }}"
                 alt="{{ $data['name'] }}"
                 id="product-photo"
                 class="w-full object-cover"
                 style="max-height:300px;" />
        </div>
        @else
        <div class="flex items-center justify-center h-48 bg-gray-200">
            <span class="text-5xl font-bold text-gray-400">{{ strtoupper(substr($data['name'], 0, 2)) }}</span>
        </div>
        @endif
        <script>
            var img = document.getElementById('product-photo');
            if (img) {
                img.onerror = function() {
                    this.parentElement.innerHTML = '<div class="flex items-center justify-center h-48 bg-gray-200"><span class="text-5xl font-bold text-gray-400">{{ e(strtoupper(substr($data['name'],0,2))) }}</span></div>';
                };
            }
        </script>

        {{-- Product info card --}}
        <div class="bg-white shadow-sm px-5 py-6 space-y-4">

            {{-- Name + SKU --}}
            <div>
                <h1 class="text-2xl font-bold text-gray-900">{{ $data['name'] }}</h1>
                <span class="inline-block mt-1 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-mono font-semibold">
                    SKU: {{ $data['sku'] }}
                </span>
            </div>

            {{-- Category --}}
            @if($data['category'])
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span class="text-sm text-indigo-600 font-medium">{{ $data['category']['name'] }}</span>
            </div>
            @endif

            <hr class="border-gray-100" />

            {{-- Stock level --}}
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold">Current Stock</p>
                    <p class="text-3xl font-bold {{ $data['is_low_stock'] ? 'text-red-600' : 'text-green-600' }} mt-0.5">
                        {{ $data['quantity'] }}
                    </p>
                    @if($data['is_low_stock'])
                    <p class="text-xs text-red-500 mt-0.5">Min: {{ $data['min_quantity'] }} — below threshold</p>
                    @else
                    <p class="text-xs text-gray-400 mt-0.5">Min level: {{ $data['min_quantity'] }}</p>
                    @endif
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold">Unit Price</p>
                    <p class="text-2xl font-bold text-gray-800 mt-0.5">${{ number_format($data['price'], 2) }}</p>
                </div>
            </div>

            <hr class="border-gray-100" />

            {{-- Location --}}
            <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Warehouse Location</p>
                @if($data['location'])
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="text-base font-semibold text-gray-800">
                        Rack {{ $data['location']['rack'] }}
                        → Shelf {{ $data['location']['shelf'] }}
                        → Bin {{ $data['location']['bin'] }}
                    </span>
                </div>
                @else
                <p class="text-gray-400 text-sm italic">Not yet assigned to a location</p>
                @endif
            </div>

        </div>

        {{-- Footer --}}
        <div class="text-center py-6 text-xs text-gray-300">
            Warehouse &amp; Sales Management System
        </div>

    </div>
</body>
</html>
