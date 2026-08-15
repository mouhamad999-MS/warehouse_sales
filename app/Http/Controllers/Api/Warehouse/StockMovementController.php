<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\StockMovementResource;
use App\Models\Category;
use App\Models\MeasurementUnit;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockMovementController extends Controller
{
    public function inbound(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $movement = DB::transaction(function () use ($request) {
            $movement = StockMovement::create([
                'product_id' => $request->product_id,
                'user_id' => $request->user()->id,
                'type' => 'INBOUND',
                'quantity' => $request->quantity,
                'notes' => $request->notes,
            ]);

            $product = Product::lockForUpdate()->findOrFail($request->product_id);
            $product->increment('quantity', $request->quantity);

            if ($product->location_id) {
                $location = $product->location()->lockForUpdate()->first();
                $available = $location->capacity - $location->current_load;
                if ($available < $request->quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Exceeds bin capacity. Available space: {$available}"],
                    ]);
                }
                $location->increment('current_load', $request->quantity);
            }

            return $movement;
        });

        return new StockMovementResource($movement->load('product', 'user'));
    }

    public function outbound(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $movement = DB::transaction(function () use ($request) {
            $product = Product::lockForUpdate()->findOrFail($request->product_id);

            if ($product->quantity < $request->quantity) {
                throw ValidationException::withMessages([
                    'quantity' => ["Insufficient stock. Available: {$product->quantity}"],
                ]);
            }

            $movement = StockMovement::create([
                'product_id' => $request->product_id,
                'user_id' => $request->user()->id,
                'type' => 'OUTBOUND',
                'quantity' => $request->quantity,
                'notes' => $request->notes,
            ]);

            $product->decrement('quantity', $request->quantity);

            if ($product->location_id) {
                $product->location()->decrement('current_load', $request->quantity);
            }

            return $movement;
        });

        return new StockMovementResource($movement->load('product', 'user'));
    }

    public function importInbound(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5120',
        ]);

        $file      = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($extension, ['csv', 'txt', 'xlsx', 'xls'])) {
            return response()->json(['message' => 'File must be a CSV or Excel file (.csv, .xlsx, .xls).'], 422);
        }

        $rows = $extension === 'xlsx' || $extension === 'xls'
            ? $this->parseXlsx($file->getRealPath())
            : $this->parseCsv($file->getRealPath());

        if (empty($rows)) {
            return response()->json(['message' => 'Empty or invalid file.'], 422);
        }

        if (count($rows) > 1001) {
            return response()->json(['message' => 'File exceeds the 1000-row limit. Please split it into smaller files.'], 422);
        }

        $headers          = array_map('strtolower', array_map('trim', $rows[0]));
        $skuIndex         = array_search('sku',             $headers);
        $nameIndex        = array_search('name',            $headers);
        $quantityIndex    = array_search('quantity',        $headers);
        $unitPriceIndex   = array_search('unit_price',      $headers);
        $minStockIndex    = array_search('min_stock_level', $headers);

        if ($skuIndex === false) {
            return response()->json(['message' => 'File must have a "sku" column.'], 422);
        }

        $defaultCategoryId = Category::value('id');
        $defaultUnitId     = MeasurementUnit::value('id');

        if (!$defaultCategoryId || !$defaultUnitId) {
            return response()->json(['message' => 'Please create at least one category and measurement unit before importing.'], 422);
        }

        $created = 0;
        $skipped = [];
        $errors  = [];

        foreach (array_slice($rows, 1) as $index => $data) {
            $rowNum = $index + 2;
            $sku    = trim($data[$skuIndex] ?? '');

            if ($sku === '') continue;

            // Product already exists → skip with notification
            if (Product::where('sku', $sku)->exists()) {
                $skipped[] = "Row {$rowNum}: SKU '{$sku}' already exists — skipped.";
                continue;
            }

            $name       = $nameIndex !== false ? trim($data[$nameIndex] ?? '') : '';
            $quantity   = $quantityIndex !== false ? trim($data[$quantityIndex] ?? '0') : '0';
            $unitPrice  = $unitPriceIndex !== false ? trim($data[$unitPriceIndex] ?? '0') : '0';
            $minStock   = $minStockIndex !== false ? trim($data[$minStockIndex] ?? '0') : '0';

            if ($name === '') {
                $name = 'Product ' . strtoupper($sku);
            }

            if (!is_numeric($quantity) || (int) $quantity < 0) {
                $errors[] = "Row {$rowNum}: Quantity must be a non-negative integer.";
                continue;
            }

            Product::create([
                'name'            => $name,
                'sku'             => $sku,
                'category_id'     => $defaultCategoryId,
                'unit_id'         => $defaultUnitId,
                'quantity'        => (int) $quantity,
                'unit_price'      => is_numeric($unitPrice) ? (float) $unitPrice : 0,
                'min_stock_level' => is_numeric($minStock)  ? (int) $minStock    : 0,
            ]);

            $created++;
        }

        return response()->json(['created' => $created, 'skipped' => $skipped, 'errors' => $errors]);
    }

    private function parseCsv(string $path): array
    {
        $rows   = [];
        $handle = fopen($path, 'r');
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);
        return $rows;
    }

    private function parseXlsx(string $path): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return [];
        }

        // Load shared strings
        $sharedStrings = [];
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml) {
            $ss = simplexml_load_string($ssXml);
            foreach ($ss->si as $si) {
                // Concatenate all <t> fragments (rich text)
                $text = '';
                foreach ($si->xpath('.//t') as $t) {
                    $text .= (string) $t;
                }
                $sharedStrings[] = $text;
            }
        }

        // Find the first sheet
        $sheetXml = null;
        for ($i = 1; $i <= 10; $i++) {
            $content = $zip->getFromName("xl/worksheets/sheet{$i}.xml");
            if ($content !== false) { $sheetXml = $content; break; }
        }
        $zip->close();

        if (!$sheetXml) return [];

        $sheet = simplexml_load_string($sheetXml);
        $rows  = [];

        foreach ($sheet->sheetData->row as $row) {
            $rowData = [];
            $prevCol = -1;

            foreach ($row->c as $cell) {
                // Parse column letter from ref like "A1", "B2"
                preg_match('/^([A-Z]+)/', (string) $cell['r'], $m);
                $colIndex = $this->colLetterToIndex($m[1] ?? 'A');

                // Fill gaps with empty strings for missing cells
                while (++$prevCol < $colIndex) {
                    $rowData[] = '';
                }

                $type  = (string) ($cell['t'] ?? '');
                $value = (string) ($cell->v ?? '');

                if ($type === 's') {
                    $value = $sharedStrings[(int) $value] ?? '';
                } elseif ($type === 'inlineStr') {
                    $value = (string) ($cell->is->t ?? '');
                }

                $rowData[] = $value;
                $prevCol   = $colIndex;
            }

            $rows[] = $rowData;
        }

        return $rows;
    }

    private function colLetterToIndex(string $letters): int
    {
        $index  = 0;
        $length = strlen($letters);
        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - ord('A') + 1);
        }
        return $index - 1;
    }

    public function history(Request $request)
    {
        $query = StockMovement::with(['product' => fn($q) => $q->withTrashed(), 'user'])->latest();

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return StockMovementResource::collection($query->paginate(30));
    }
}
