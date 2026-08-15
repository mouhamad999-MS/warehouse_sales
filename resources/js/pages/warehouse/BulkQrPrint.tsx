import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface Product {
    id: number;
    name: string;
    sku: string;
    image_url?: string | null;
}

interface Location {
    id: number;
    rack: string;
    shelf: string;
    bin: string;
}

interface QrItem {
    product_id?: number;
    location_id?: number;
    product_name?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    sku?: string;
    qr_base64: string;
    mime: string;
    public_url: string;
}

const qrSrc = (item: QrItem) => `data:${item.mime ?? 'image/svg+xml'};base64,${item.qr_base64}`;

/**
 * BulkQrPrint — warehouse manager selects products/locations and prints all QR labels at once.
 *
 * SETUP FLOW:
 *   1. Select products → Generate → Print → Stick on boxes
 *   2. Select locations → Generate → Print → Stick on bin shelves
 */
export default function BulkQrPrint() {
    const { t } = useTranslation();
    const [tab, setTab]                     = useState<'products' | 'locations'>('products');
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set());
    const [productQrs, setProductQrs]       = useState<QrItem[]>([]);
    const [locationQrs, setLocationQrs]     = useState<QrItem[]>([]);

    // Fetch all products
    const { data: productsData } = useQuery({
        queryKey: ['bulk-qr-products'],
        queryFn: () => api.get('/warehouse/products', { params: { per_page: 100 } }).then(r => r.data),
    });

    // Fetch all locations
    const { data: locationsData } = useQuery({
        queryKey: ['bulk-qr-locations'],
        queryFn: () => api.get('/warehouse/locations').then(r => r.data),
    });

    const products: Product[] = productsData?.data ?? [];
    const locations: Location[] = locationsData?.data ?? [];

    const bulkProductMutation = useMutation({
        mutationFn: (ids: number[]) => api.post('/qr/products/bulk', { product_ids: ids }).then(r => r.data),
        onSuccess: (data) => setProductQrs(data),
    });

    const bulkLocationMutation = useMutation({
        mutationFn: (ids: number[]) => api.post('/qr/locations/bulk', { location_ids: ids }).then(r => r.data),
        onSuccess: (data) => setLocationQrs(data),
    });

    const toggleProduct = (id: number) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleLocation = (id: number) => {
        setSelectedLocations(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAllProducts = () => setSelectedProducts(new Set(products.map(p => p.id)));
    const selectAllLocations = () => setSelectedLocations(new Set(locations.map(l => l.id)));

    const printAll = () => window.print();

    // Group locations by rack
    const locationsByRack = locations.reduce<Record<string, Location[]>>((acc, loc) => {
        (acc[loc.rack] = acc[loc.rack] ?? []).push(loc);
        return acc;
    }, {});

    return (
        <>
            {/* Print CSS — only label grid visible when printing */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-grid { display: grid !important; }
                    body { background: white; }
                }
                @media screen {
                    .print-only { display: none; }
                }
            `}</style>

            <div className="max-w-5xl mx-auto px-4 py-8 no-print">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('nav_bulk_qr')}</h1>
                <p className="text-sm text-gray-500 mb-6">{t('bulk_qr_sub')}</p>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
                    {(['products', 'locations'] as const).map(t2 => (
                        <button
                            key={t2}
                            onClick={() => setTab(t2)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                                tab === t2
                                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            {t2 === 'products' ? t('product_labels') : t('location_labels')}
                        </button>
                    ))}
                </div>

                {/* ── Products tab ── */}
                {tab === 'products' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <button onClick={selectAllProducts} className="text-sm text-indigo-600 hover:underline">{t('select_all')}</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setSelectedProducts(new Set())} className="text-sm text-gray-400 hover:underline">{t('deselect_all')}</button>
                            <span className="ml-auto text-sm text-gray-500">{t('selected_count', { count: selectedProducts.size })}</span>
                        </div>

                        {/* Product checklist */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
                            {products.map(p => (
                                <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.has(p.id)}
                                        onChange={() => toggleProduct(p.id)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    {p.image_url && (
                                        <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                                    </div>
                                </label>
                            ))}
                            {products.length === 0 && (
                                <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('no_products')}</p>
                            )}
                        </div>

                        <button
                            onClick={() => bulkProductMutation.mutate(Array.from(selectedProducts))}
                            disabled={selectedProducts.size === 0 || bulkProductMutation.isPending}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                        >
                            {bulkProductMutation.isPending ? t('generating_qr') : t('generate_qr_product', { count: selectedProducts.size })}
                        </button>

                        {/* Generated product QR grid */}
                        {productQrs.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="font-semibold text-gray-800 dark:text-white">{t('labels_ready', { count: productQrs.length })}</h2>
                                    <button onClick={printAll} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        {t('print_all_labels')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {productQrs.map(qr => (
                                        <div key={qr.product_id} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5">
                                            <img src={qrSrc(qr)} alt={qr.sku} className="w-28 h-28" />
                                            <p className="text-xs font-semibold text-gray-800 text-center leading-tight">{qr.product_name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{qr.sku}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Locations tab ── */}
                {tab === 'locations' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <button onClick={selectAllLocations} className="text-sm text-indigo-600 hover:underline">{t('select_all')}</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setSelectedLocations(new Set())} className="text-sm text-gray-400 hover:underline">{t('deselect_all')}</button>
                            <span className="ml-auto text-sm text-gray-500">{t('selected_count', { count: selectedLocations.size })}</span>
                        </div>

                        {/* Locations grouped by rack */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
                            {Object.entries(locationsByRack).map(([rack, locs]) => (
                                <div key={rack}>
                                    <p className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50 dark:bg-gray-700/50">{t('rack_label', { rack })}</p>
                                    {locs.map(loc => (
                                        <label key={loc.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <input
                                                type="checkbox"
                                                checked={selectedLocations.has(loc.id)}
                                                onChange={() => toggleLocation(loc.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-800 dark:text-white font-mono">
                                                R{loc.rack} → S{loc.shelf} → B{loc.bin}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                            {locations.length === 0 && (
                                <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('no_locations_short')}</p>
                            )}
                        </div>

                        <button
                            onClick={() => bulkLocationMutation.mutate(Array.from(selectedLocations))}
                            disabled={selectedLocations.size === 0 || bulkLocationMutation.isPending}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                        >
                            {bulkLocationMutation.isPending ? t('generating_qr') : t('generate_qr_location', { count: selectedLocations.size })}
                        </button>

                        {/* Generated location QR grid */}
                        {locationQrs.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="font-semibold text-gray-800 dark:text-white">{t('labels_ready', { count: locationQrs.length })}</h2>
                                    <button onClick={printAll} className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        {t('print_all_labels')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {locationQrs.map(qr => (
                                        <div key={qr.location_id} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5">
                                            <img src={qrSrc(qr)} alt="" className="w-24 h-24" />
                                            <p className="text-[11px] font-bold text-gray-800 text-center">R{qr.rack} → S{qr.shelf} → B{qr.bin}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Print-only label grid (hidden on screen) ── */}
            <div className="print-only">
                {productQrs.length > 0 && tab === 'products' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 6cm)', gap: '4mm', padding: '8mm' }}>
                        {productQrs.map(qr => (
                            <div key={qr.product_id} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '6cm', pageBreakInside: 'avoid' }}>
                                <img src={qrSrc(qr)} alt="" style={{ width: '4cm', height: '4cm' }} />
                                <p style={{ fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', margin: '4px 0 2px' }}>{qr.product_name}</p>
                                <p style={{ fontSize: '7pt', color: '#666', fontFamily: 'monospace' }}>{qr.sku}</p>
                            </div>
                        ))}
                    </div>
                )}
                {locationQrs.length > 0 && tab === 'locations' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 5cm)', gap: '4mm', padding: '8mm' }}>
                        {locationQrs.map(qr => (
                            <div key={qr.location_id} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '5cm', pageBreakInside: 'avoid' }}>
                                <img src={qrSrc(qr)} alt="" style={{ width: '3.5cm', height: '3.5cm' }} />
                                <p style={{ fontSize: '10pt', fontWeight: 'bold', textAlign: 'center', margin: '4px 0 2px' }}>R{qr.rack} → S{qr.shelf} → B{qr.bin}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
