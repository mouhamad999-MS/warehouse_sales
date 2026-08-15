import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationSuggestion from '@/components/warehouse/LocationSuggestion';
import WarehouseMapGrid from '@/components/warehouse/WarehouseMapGrid';
import ProductQrLabel from '@/components/warehouse/ProductQrLabel';

interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string;
    category_name: string;
    unit_name: string;
    unit_price: number;
    quantity: number;
    min_stock_level: number;
    location_id?: number;
    location_label?: string;
    image_url?: string | null;
    stock_movements?: StockMovement[];
}

interface StockMovement {
    id: number;
    type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
    quantity: number;
    notes?: string;
    created_at: string;
}

interface Location {
    id: number;
    rack: string;
    shelf: string;
    bin: string;
}

const movementStyles: Record<string, { badge: string; symbol: string }> = {
    INBOUND:    { badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', symbol: '+' },
    OUTBOUND:   { badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', symbol: '−' },
    ADJUSTMENT: { badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', symbol: '~' },
};

export default function WarehouseProductDetail() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [locationDialogOpen, setLocationDialogOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [mapDialogOpen, setMapDialogOpen] = useState(false);

    const { data: product, isLoading } = useQuery<Product>({
        queryKey: ['warehouse-product', id],
        queryFn: () => api.get(`/warehouse/products/${id}`).then((r) => r.data.data),
    });

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ['warehouse-locations-list'],
        queryFn: () => api.get('/warehouse/locations').then((r) => r.data.data),
        enabled: locationDialogOpen,
    });

    const assignLocationMutation = useMutation({
        mutationFn: () => api.put(`/warehouse/products/${id}/assign-location`, { location_id: Number(selectedLocation) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-product', id] });
            setLocationDialogOpen(false);
            toast.success(t('location_assigned_success'));
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.errors?.location_id?.[0]
                ?? err?.response?.data?.message
                ?? t('failed_assign_location');
            toast.error(msg);
        },
    });

    if (isLoading) {
        return (
            <div className="max-w-3xl space-y-4">
                <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl w-64 animate-pulse" />
                <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!product) return <div className="text-gray-500 dark:text-gray-400">{t('product_not_found')}</div>;

    const isLowStock = product.quantity <= product.min_stock_level;
    const stockPct = product.min_stock_level > 0 ? Math.min(100, (product.quantity / (product.min_stock_level * 2)) * 100) : 100;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <button
                        onClick={() => navigate('/warehouse/products')}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('back_to_products')}
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{product.sku}</p>
                </div>
                <button
                    onClick={() => navigate(`/warehouse/products/${id}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t('edit')}
                </button>
            </div>

            {/* Product Image */}
            {product.image_url && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex justify-center">
                    <img src={product.image_url} alt={product.name} className="max-h-64 rounded-xl object-contain" />
                </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('details')}</h3>
                    </div>
                    <div className="p-6 space-y-3 text-sm">
                        {[
                            { label: t('category'), value: product.category_name },
                            { label: t('unit'), value: product.unit_name },
                            { label: t('unit_price'), value: `$${Number(product.unit_price).toFixed(2)}` },
                            { label: t('min_stock'), value: product.min_stock_level },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                            </div>
                        ))}
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 dark:text-gray-400">{t('stock')}</span>
                                <span className={`font-bold text-lg ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {product.quantity}
                                    {isLowStock && (
                                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{t('stock_low')}</span>
                                    )}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${stockPct}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('location')}</h3>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setMapDialogOpen(true)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t('view_map')}
                            </button>
                            <button
                                onClick={() => setLocationDialogOpen(true)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                            >
                                {t('assign_location_btn')}
                            </button>
                        </div>
                    </div>
                    <div className="p-6 text-sm space-y-4">
                        {product.location_label ? (
                            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3">
                                <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span className="font-medium text-indigo-700 dark:text-indigo-300 font-mono">{product.location_label}</span>
                            </div>
                        ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">{t('no_location_assigned')}</p>
                        )}
                        {product.description && (
                            <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold mb-1.5">{t('description')}</p>
                                <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QR Code */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-8 w-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5v3.5M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('qr_code')}</h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <ProductQrLabel
                            productId={product.id}
                            productName={product.name}
                            sku={product.sku}
                            photoUrl={product.image_url}
                        />
                        <div className="text-sm space-y-2">
                            <p className="font-medium text-gray-700 dark:text-gray-300">{t('qr_code_hint')}</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <li>{t('qr_scan_tip_1')}</li>
                                <li>{t('qr_scan_tip_2')}</li>
                                <li>{t('qr_scan_tip_3')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Location Suggestion */}
            <LocationSuggestion
                productId={product.id}
                productName={product.name}
                currentLocationId={product.location_id}
                onLocationAssigned={() => queryClient.invalidateQueries({ queryKey: ['warehouse-product', id] })}
            />

            {/* Stock Movements */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-8 w-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('stock_movement_history')}</h3>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('type')}</th>
                            <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('quantity')}</th>
                            <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('notes')}</th>
                            <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('date')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {(product?.stock_movements ?? []).map((m) => {
                            const style = movementStyles[m.type] ?? movementStyles.ADJUSTMENT;
                            return (
                                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                                            <span className="font-bold">{style.symbol}</span>
                                            {t(m.type.toLowerCase())}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{m.quantity}</td>
                                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{m.notes ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                                    <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</td>
                                </tr>
                            );
                        })}
                        {(product?.stock_movements ?? []).length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">{t('no_movements_recorded')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assign Location Dialog */}
            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t('assign_storage_location')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={t('select_location_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map((loc) => (
                                    <SelectItem key={loc.id} value={String(loc.id)}>
                                        {t('rack')} {loc.rack} / {t('shelf')} {loc.shelf} / {t('bin')} {loc.bin}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setLocationDialogOpen(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => assignLocationMutation.mutate()}
                                disabled={!selectedLocation || assignLocationMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50"
                            >
                                {assignLocationMutation.isPending ? t('assigning') : t('assign_location_btn')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Warehouse Map Dialog */}
            <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>{t('warehouse_map_title')}</DialogTitle></DialogHeader>
                    <div className="mt-2">
                        <WarehouseMapGrid
                            selectedLocationId={product.location_id}
                            onSelectLocation={(locId) => {
                                setSelectedLocation(String(locId));
                                setMapDialogOpen(false);
                                setLocationDialogOpen(true);
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
