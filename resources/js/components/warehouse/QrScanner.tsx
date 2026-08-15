import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '@/lib/axios';

interface ScanResult {
    type: 'product' | 'location' | 'not_found';
    [key: string]: unknown;
}

interface Props {
    onScanSuccess: (data: ScanResult) => void;
    onScanError?: (error: string) => void;
}

const ELEMENT_ID = 'qr-scanner-element';

export default function QrScanner({ onScanSuccess, onScanError }: Props) {
    const scannerRef  = useRef<Html5Qrcode | null>(null);
    const resolvedRef = useRef(false);
    const [status, setStatus] = useState<'starting' | 'scanning' | 'resolving' | 'error'>('starting');
    const [error,  setError]  = useState<string | null>(null);

    const stop = async () => {
        try {
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current?.clear();
        } catch (_) {}
        scannerRef.current = null;
    };

    const start = async () => {
        await stop();
        resolvedRef.current = false;
        setError(null);
        setStatus('starting');

        try {
            const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
            scannerRef.current = scanner;

            const cameras = await Html5Qrcode.getCameras();
            const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) ?? cameras[cameras.length - 1];
            const cameraId = cam?.id ?? { facingMode: 'environment' };

            await scanner.start(
                cameraId,
                {
                    fps: 30,
                    aspectRatio: 1.333,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
                async (decodedText) => {
                    if (resolvedRef.current) return;
                    resolvedRef.current = true;
                    await stop();
                    setStatus('resolving');

                    try {
                        const { data } = await api.post('/qr/scan', { url: decodedText });
                        onScanSuccess(data);
                    } catch (e: unknown) {
                        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Unknown QR code';
                        setError(msg);
                        setStatus('error');
                        onScanError?.(msg);
                    }
                },
                () => {}
            );

            setStatus('scanning');
        } catch (e: unknown) {
            const msg = (e as Error).message ?? 'Camera access denied';
            setError(msg);
            setStatus('error');
            onScanError?.(msg);
        }
    };

    useEffect(() => {
        start();
        return () => { stop(); };
    }, []);

    return (
        <div className="space-y-3">
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-950" style={{ minHeight: 300 }}>

                {/* html5-qrcode mounts the video inside this div */}
                <div id={ELEMENT_ID} className="w-full" />

                {status === 'starting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                        <p className="text-sm text-gray-300">Starting camera…</p>
                    </div>
                )}

                {status === 'resolving' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/80">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-400 border-t-transparent" />
                        <p className="text-sm text-gray-300">Reading QR code…</p>
                    </div>
                )}
            </div>

            {status === 'scanning' && (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                    Point the camera at a QR code — hold steady
                </p>
            )}

            {status === 'error' && (
                <div className="space-y-2">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-3 py-2 text-sm">
                        {error}
                    </div>
                    <button
                        onClick={start}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
