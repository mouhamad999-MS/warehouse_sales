<?php

namespace App\Services;

use App\Models\Product;
use App\Models\WarehouseLocation;
use BaconQrCode\Renderer\Image\Svg;
use BaconQrCode\Writer;

class QrCodeService
{
    /**
     * Generate a QR code as an SVG base64 string.
     * SVG requires no GD/Imagick extension — works on any PHP setup.
     * Displayable as: <img src="data:image/svg+xml;base64,{value}" />
     */
    private function generateSvgBase64(string $content, int $size = 250): string
    {
        $renderer = new Svg();
        $renderer->setHeight($size);
        $renderer->setWidth($size);
        $renderer->setMargin(1);

        $writer = new Writer($renderer);

        // Suppress float→int deprecation warnings from the old BaconQrCode library
        $svg = @$writer->writeString($content);

        return base64_encode($svg);
    }

    /**
     * Generate a QR code for a product.
     * Encodes /product/{sku} — scannable by any phone camera without logging in.
     *
     * SETUP: Print this label → stick on product box.
     * DAILY: Anyone scans → browser opens public page → sees stock + location.
     */
    public function generateProductQr(int $productId): array
    {
        $product = Product::with('category', 'location')->findOrFail($productId);
        $url     = url('/product/' . $product->sku);

        return [
            'product_id'   => $product->id,
            'product_name' => $product->name,
            'sku'          => $product->sku,
            'qr_base64'    => $this->generateSvgBase64($url),
            'mime'         => 'image/svg+xml',
            'public_url'   => $url,
        ];
    }

    /**
     * Generate a QR code for a warehouse location.
     * Encodes /location/{id} — shows all products stored there when scanned.
     *
     * SETUP: Print this label → stick on bin shelf.
     * DAILY: Anyone scans → browser opens public page → sees location inventory.
     */
    public function generateLocationQr(int $locationId): array
    {
        $location = WarehouseLocation::findOrFail($locationId);
        $url      = url('/location/' . $location->id);

        return [
            'location_id' => $location->id,
            'rack'        => $location->rack,
            'shelf'       => $location->shelf,
            'bin'         => $location->bin,
            'qr_base64'   => $this->generateSvgBase64($url),
            'mime'        => 'image/svg+xml',
            'public_url'  => $url,
        ];
    }

    /** Bulk QR codes for multiple products. */
    public function generateBulkProductQrs(array $productIds): array
    {
        return collect($productIds)
            ->map(fn($id) => $this->generateProductQr($id))
            ->values()
            ->all();
    }

    /** Bulk QR codes for multiple locations. */
    public function generateBulkLocationQrs(array $locationIds): array
    {
        return collect($locationIds)
            ->map(fn($id) => $this->generateLocationQr($id))
            ->values()
            ->all();
    }
}
