import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import QrScanner from './QrScanner';

interface ProductResult {
    type: 'product';
    id: number;
    name: string;
    sku: string;
    photo_url?: string;
    quantity: number;
    min_quantity: number;
    is_low_stock: boolean;
    category?: string;
    location?: { rack: string; shelf: string; bin: string } | null;
}

interface LocationResult {
    type: 'location';
    id: number;
    rack: string;
    shelf: string;
    bin: string;
    capacity: number;
    current_load: number;
    products: Array<{ id: number; name: string; sku: string; quantity: number; photo_url?: string; category?: string }>;
}

interface NotFoundResult {
    type: 'not_found';
    raw: string;
}

type ScanResult = ProductResult | LocationResult | NotFoundResult;

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function QuickScanPanel({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [result, setResult]           = useState<ScanResult | null>(null);
    const [showScanner, setShowScanner] = useState(true);
    const [movement, setMovement]       = useState<{ type: 'INBOUND' | 'OUTBOUND'; qty: string } | null>(null);
    const [moveError, setMoveError]     = useState<string | null>(null);
    const [addError, setAddError]       = useState<string | null>(null);
    const [justCreated, setJustCreated] = useState(false);

    const moveMutation = useMutation({
        mutationFn: ({ type, qty }: { type: string; qty: number }) =>
            api.post(`/warehouse/stock/${type.toLowerCase()}`, {
                product_id: (result as ProductResult).id,
                quantity: qty,
                notes: `Quick scan — ${type}`,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
            setMovement(null);
            setMoveError(null);
            setResult(null);
            setShowScanner(true);
        },
        onError: (e: unknown) => {
            setMoveError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to record movement');
        },
    });

    const quickAddMutation = useMutation({
        mutationFn: (raw: string) => api.post('/qr/quick-add', { raw }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
            setJustCreated(!res.data.already_existed);
            setAddError(null);
            setResult(res.data as ProductResult);
            setShowScanner(false);
        },
        onError: (e: unknown) => {
            const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
            const msg = data?.error ?? data?.message ?? 'Failed to add product';
            setAddError(msg);
            setShowScanner(true);
        },
    });

    const handleScan = (data: ScanResult) => {
        setMovement(null);
        setMoveError(null);
        setAddError(null);
        setJustCreated(false);

        if (data.type === 'not_found') {
            setShowScanner(false);
            quickAddMutation.mutate((data as NotFoundResult).raw);
        } else {
            setResult(data);
            setShowScanner(false);
        }
    };

    const submitMovement = () => {
        if (!movement || !result || result.type !== 'product') return;
        const qty = parseInt(movement.qty, 10);
        if (!qty || qty < 1) return;
        moveMutation.mutate({ type: movement.type, qty });
    };

    const resetScan = () => {
        setResult(null);
        setShowScanner(true);
        setMovement(null);
        setMoveError(null);
        setAddError(null);
        setJustCreated(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

            {/* Slide-in panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Quick Scan</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* Scanner */}
                    {showScanner && !result && (
                        <QrScanner onScanSuccess={handleScan as (data: unknown) => void} onScanError={() => {}} />
                    )}

                    {/* Quick-add loading */}
                    {quickAddMutation.isPending && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Adding product to warehouse…</p>
                        </div>
                    )}

                    {/* Quick-add error */}
                    {addError && !quickAddMutation.isPending && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm space-y-2">
                            <p className="font-medium">Could not add product</p>
                            <p>{addError}</p>
                            <button onClick={resetScan} className="text-xs underline">Try again</button>
                        </div>
                    )}

                    {/* ── Product result card ── */}
                    {result?.type === 'product' && (
                        <div className="space-y-3">
                            {justCreated && (
                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Product added to warehouse
                                </div>
                            )}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
                                {result.photo_url && (
                                    <img src={result.photo_url} alt={result.name} className="w-full h-40 object-cover" />
                                )}
                                <div className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">{result.name}</h3>
                                            <p className="text-xs text-gray-400 font-mono">{result.sku}</p>
                                            {result.category && <p className="text-xs text-indigo-500 mt-0.5">{result.category}</p>}
                                        </div>
                                        <span className={`text-xl font-bold ${result.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.quantity}
                                        </span>
                                    </div>
                                    {result.is_low_stock && (
                                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg px-3 py-1.5">
                                            ⚠ Low stock — min {result.min_quantity}
                                        </div>
                                    )}
                                    {result.location ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            📍 R{result.location.rack} → S{result.location.shelf} → B{result.location.bin}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No location assigned</p>
                                    )}
                                </div>
                            </div>

                            {/* Movement buttons */}
                            {!movement ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMovement({ type: 'INBOUND', qty: '' })}
                                        className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg py-2.5 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Record Inbound
                                    </button>
                                    <button
                                        onClick={() => setMovement({ type: 'OUTBOUND', qty: '' })}
                                        className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg py-2.5 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                        Record Outbound
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {movement.type === 'INBOUND' ? '+ Adding stock' : '− Removing stock'}
                                    </p>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Quantity"
                                        value={movement.qty}
                                        onChange={e => setMovement(m => m ? { ...m, qty: e.target.value } : m)}
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {moveError && <p className="text-xs text-red-500">{moveError}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={() => setMovement(null)} className="flex-1 text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={submitMovement}
                                            disabled={!movement.qty || moveMutation.isPending}
                                            className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 transition"
                                        >
                                            {moveMutation.isPending ? 'Saving…' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button onClick={resetScan} className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-1">
                                Scan another
                            </button>
                        </div>
                    )}

                    {/* ── Location result card ── */}
                    {result?.type === 'location' && (
                        <div className="space-y-3">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">
                                        R{result.rack} → S{result.shelf} → B{result.bin}
                                    </h3>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            <span>Load: {result.current_load} / {result.capacity}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${result.capacity > 0 && result.current_load / result.capacity >= 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: result.capacity > 0 ? `${Math.round((result.current_load / result.capacity) * 100)}%` : '0%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Products ({result.products.length})</p>
                                    {result.products.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2">
                                            {p.photo_url && (
                                                <img src={p.photo_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                                                <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                                            </div>
                                            <span className="text-sm font-bold text-blue-600 flex-shrink-0">×{p.quantity}</span>
                                        </div>
                                    ))}
                                    {result.products.length === 0 && (
                                        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-2">Empty location</p>
                                    )}
                                </div>
                            </div>

                            <button onClick={resetScan} className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-1">
                                Scan another
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
