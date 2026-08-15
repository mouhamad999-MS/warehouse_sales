import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface Props {
    productId: number;
    productName: string;
    sku: string;
    photoUrl?: string | null;
}

interface QrData {
    product_id: number;
    product_name: string;
    sku: string;
    qr_base64: string;
    mime: string;
    public_url: string;
}

const qrSrc = (data: QrData) => `data:${data.mime ?? 'image/svg+xml'};base64,${data.qr_base64}`;

/**
 * ProductQrLabel — displays a single product's QR code with print + download actions.
 * The QR encodes a public URL — anyone can scan with their phone camera.
 */
export default function ProductQrLabel({ productId, productName, sku, photoUrl }: Props) {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useQuery<QrData>({
        queryKey: ['qr-product', productId],
        queryFn: () => api.get(`/qr/product/${productId}`).then(r => r.data),
        staleTime: Infinity,
    });

    const downloadQr = () => {
        if (!data) return;
        const link = document.createElement('a');
        link.href = qrSrc(data);
        link.download = `QR-${sku}.svg`;
        link.click();
    };

    const printLabel = () => {
        if (!data) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html><head><title>Label - ${productName}</title>
            <style>
                body { margin: 0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 12px; width: 6cm; }
                img.photo { width: 100%; height: 80px; object-fit: cover; border-radius: 4px; }
                img.qr { width: 150px; height: 150px; margin: 8px 0; }
                .name { font-size: 11px; font-weight: bold; text-align: center; }
                .sku { font-size: 9px; color: #666; font-family: monospace; }
                .caption { font-size: 8px; color: #999; margin-top: 4px; }
                @media print { @page { size: 6cm 8cm; margin: 0; } }
            </style></head><body>
            ${photoUrl ? `<img class="photo" src="${photoUrl}" alt="" />` : ''}
            <img class="qr" src="${qrSrc(data)}" alt="QR" />
            <p class="name">${productName}</p>
            <p class="sku">${sku}</p>
            <p class="caption">Scan to view product info</p>
            <script>window.onload=()=>{ window.print(); window.close(); }<\/script>
            </body></html>
        `);
        win.document.close();
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center gap-2 animate-pulse">
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-800 p-4 text-center text-sm text-red-500 dark:text-red-400">
                {t('qr_failed_load')}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col items-center gap-2">
            {/* Thumbnail */}
            {photoUrl && (
                <img
                    src={photoUrl}
                    alt={productName}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-100 dark:border-gray-700"
                />
            )}

            {/* QR Code */}
            <img
                src={qrSrc(data)}
                alt={`QR for ${sku}`}
                className="w-36 h-36"
            />

            {/* Labels */}
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 text-center leading-tight">{productName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{sku}</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600">{t('scan_to_view')}</p>

            {/* Actions */}
            <div className="flex gap-1.5 w-full mt-1">
                <button
                    onClick={downloadQr}
                    className="flex-1 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 dark:text-gray-300 rounded-lg py-1.5 transition"
                >
                    {t('download')}
                </button>
                <button
                    onClick={printLabel}
                    className="flex-1 text-xs bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 rounded-lg py-1.5 transition"
                >
                    {t('print_label')}
                </button>
            </div>

            {/* Public URL */}
            <a
                href={data.public_url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-400 dark:text-indigo-500 hover:underline break-all text-center"
            >
                {data.public_url}
            </a>
        </div>
    );
}
