import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

interface Props {
    locationId: number;
    rack: string;
    shelf: string;
    bin: string;
}

interface QrData {
    location_id: number;
    rack: string;
    shelf: string;
    bin: string;
    qr_base64: string;
    mime: string;
    public_url: string;
}

const qrSrc = (data: QrData) => `data:${data.mime ?? 'image/svg+xml'};base64,${data.qr_base64}`;

/**
 * LocationQrLabel — displays a single warehouse location's QR code.
 * When scanned, opens the public /location/{id} page showing all products stored there.
 */
export default function LocationQrLabel({ locationId, rack, shelf, bin }: Props) {
    const { data, isLoading, isError } = useQuery<QrData>({
        queryKey: ['qr-location', locationId],
        queryFn: () => api.get(`/qr/location/${locationId}`).then(r => r.data),
        staleTime: Infinity,
    });

    const label = `R${rack} → S${shelf} → B${bin}`;

    const downloadQr = () => {
        if (!data) return;
        const link = document.createElement('a');
        link.href = qrSrc(data);
        link.download = `QR-Location-R${rack}-S${shelf}-B${bin}.svg`;
        link.click();
    };

    const printLabel = () => {
        if (!data) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html><head><title>Label - ${label}</title>
            <style>
                body { margin: 0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 8px; width: 5cm; }
                img.qr { width: 140px; height: 140px; }
                .loc { font-size: 12px; font-weight: bold; text-align: center; margin-top: 6px; }
                .caption { font-size: 8px; color: #999; margin-top: 4px; }
                @media print { @page { size: 5cm 5cm; margin: 0; } }
            </style></head><body>
            <img class="qr" src="${qrSrc(data)}" alt="QR" />
            <p class="loc">${label}</p>
            <p class="caption">Scan to view location contents</p>
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
                Failed to load QR
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col items-center gap-2">
            {/* QR Code */}
            <img
                src={qrSrc(data)}
                alt={`QR for ${label}`}
                className="w-36 h-36"
            />

            {/* Location label */}
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 text-center">{label}</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600">Scan to view location contents</p>

            {/* Actions */}
            <div className="flex gap-1.5 w-full mt-1">
                <button
                    onClick={downloadQr}
                    className="flex-1 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600 dark:text-gray-300 rounded-lg py-1.5 transition"
                >
                    Download
                </button>
                <button
                    onClick={printLabel}
                    className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 rounded-lg py-1.5 transition"
                >
                    Print Label
                </button>
            </div>
        </div>
    );
}
