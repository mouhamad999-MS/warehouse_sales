<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>R{{ $data['rack'] }} → S{{ $data['shelf'] }} → B{{ $data['bin'] }} — Location Info</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">

    <div class="max-w-md mx-auto px-4 py-6 space-y-5">

        {{-- Header --}}
        <div class="bg-white rounded-2xl shadow-sm px-5 py-5">
            <p class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Warehouse Location</p>
            <h1 class="text-2xl font-bold text-gray-900">
                R{{ $data['rack'] }} → S{{ $data['shelf'] }} → B{{ $data['bin'] }}
            </h1>

            {{-- Capacity bar --}}
            <div class="mt-4">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Load: {{ $data['current_load'] }} / {{ $data['capacity'] }}</span>
                    <span>{{ $data['load_percentage'] }}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2.5">
                    @php
                        $pct = $data['load_percentage'];
                        $color = $pct >= 90 ? 'bg-red-500' : ($pct >= 70 ? 'bg-yellow-400' : 'bg-green-500');
                    @endphp
                    <div class="h-2.5 rounded-full {{ $color }} transition-all" style="width: {{ $pct }}%"></div>
                </div>
                @if($pct >= 90)
                <p class="text-xs text-red-500 mt-1">⚠ Location is nearly full</p>
                @endif
            </div>
        </div>

        {{-- Product list --}}
        <div>
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Products stored here ({{ count($data['products']) }})
            </h2>

            @if(count($data['products']) === 0)
            <div class="bg-white rounded-2xl shadow-sm px-5 py-8 text-center">
                <p class="text-gray-400 text-sm">This location is empty</p>
            </div>
            @else
            <div class="grid grid-cols-2 gap-3">
                @foreach($data['products'] as $product)
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    {{-- Photo --}}
                    @if($product['photo_url'])
                    <img src="{{ $product['photo_url'] }}"
                         alt="{{ $product['name'] }}"
                         class="w-full object-cover"
                         style="height:100px;"
                         onerror="this.style.display='none'" />
                    @else
                    <div class="flex items-center justify-center bg-gray-100" style="height:100px;">
                        <span class="text-2xl font-bold text-gray-300">{{ strtoupper(substr($product['name'],0,2)) }}</span>
                    </div>
                    @endif

                    <div class="px-3 py-2">
                        <p class="text-sm font-semibold text-gray-800 leading-tight truncate">{{ $product['name'] }}</p>
                        <p class="text-xs text-gray-400 font-mono mt-0.5">{{ $product['sku'] }}</p>
                        @if($product['category_name'])
                        <p class="text-xs text-indigo-500 mt-0.5">{{ $product['category_name'] }}</p>
                        @endif
                        <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            Qty: {{ $product['quantity'] }}
                        </span>
                    </div>
                </div>
                @endforeach
            </div>
            @endif
        </div>

        {{-- Footer --}}
        <div class="text-center py-2 text-xs text-gray-300">
            Warehouse &amp; Sales Management System
        </div>

    </div>
</body>
</html>
