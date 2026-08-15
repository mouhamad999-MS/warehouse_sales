import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Product {
    id: number;
    name: string;
    sku: string;
    category_name: string;
    quantity: number;
    unit_price: number;
    location_label?: string;
    location?: string | { label?: string };
    min_stock_level: number;
    image_url?: string | null;
}

interface Category {
    id: number;
    name: string;
}

const PAGE_SIZE = 12;

function StarRating({ id }: { id: number }) {
    const rating = 3 + ((id * 7) % 20) / 10;
    const full = Math.floor(rating);
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className={`h-3.5 w-3.5 ${i <= full ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">{rating.toFixed(1)}</span>
        </div>
    );
}

export default function WarehouseProducts() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/warehouse/products/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
            toast.success(t('product_deleted'));
            setDeleteId(null);
        },
        onError: () => {
            toast.error(t('failed_delete_product'));
            setDeleteId(null);
        },
    });

    const handleExport = () => {
        setExporting(true);
        fetch('/api/export/products', { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(`Export failed: ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'products.csv'; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error(t('export_failed')))
            .finally(() => setExporting(false));
    };

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => api.get('/warehouse/categories').then((r) => r.data.data),
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['warehouse-products', search, categoryFilter, lowStockOnly, page],
        queryFn: () =>
            api.get('/warehouse/products', {
                params: { search, category_id: categoryFilter || undefined, low_stock: lowStockOnly || undefined, page, per_page: PAGE_SIZE },
            }).then((r) => r.data),
    });

    const products: Product[] = data?.data ?? data ?? [];
    const total: number = data?.total ?? products.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('products_title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} {t('available_products')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-2 transition ${view === 'grid' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 transition ${view === 'list' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {exporting ? t('exporting') : t('export_csv')}
                    </button>
                    <button
                        onClick={() => navigate('/warehouse/products/create')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_product')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder={t('search_by_name_sku')}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        />
                    </div>
                    <div className="w-48">
                        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <SelectValue placeholder={t('all_categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_categories')}</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <button
                        onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                            lowStockOnly
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        {t('low_stock_items')}
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
                            <div className="w-full aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 mb-3" />
                            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2" />
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mx-auto" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">{t('failed_load_products')}</div>
            ) : view === 'grid' ? (
                <>
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-20 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_products')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p) => {
                                const isLow = p.quantity <= p.min_stock_level;
                                const locLabel = p.location_label ?? (typeof p.location === 'string' ? p.location : (p.location as any)?.label) ?? '';
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => navigate(`/warehouse/products/${p.id}`)}
                                        className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all cursor-pointer overflow-hidden"
                                    >
                                        {/* Image area */}
                                        <div className="relative bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center p-4 aspect-square">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                                                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            {isLow && (
                                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">LOW</span>
                                            )}
                                            {locLabel && (
                                                <span className="absolute top-2 left-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                                                    {locLabel}
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-3 text-center space-y-1">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">{p.name}</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">${Number(p.unit_price).toFixed(2)}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {p.quantity}</p>
                                            <div className="flex justify-center pt-0.5">
                                                <StarRating id={p.id} />
                                            </div>
                                        </div>

                                        {/* Actions — visible on hover */}
                                        <div className="px-3 pb-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/warehouse/products/${p.id}/edit`); }}
                                                className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                            >
                                                {t('edit')}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                                                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                                            >
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* List view */
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('name')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('sku')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('category')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('quantity')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('unit_price')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('location')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100 dark:border-gray-700 flex-shrink-0" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">{p.sku}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.category_name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-semibold ${p.quantity <= p.min_stock_level ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {p.quantity}
                                            {p.quantity <= p.min_stock_level && (
                                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">low</span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">${Number(p.unit_price).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                        {(p.location_label ?? (typeof p.location === 'string' ? p.location : (p.location as any)?.label) ?? '') ? (
                                            <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md font-mono text-[11px]">
                                                {p.location_label ?? (typeof p.location === 'string' ? p.location : (p.location as any)?.label)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                            <button onClick={() => navigate(`/warehouse/products/${p.id}`)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t('view')}</button>
                                            <button onClick={() => navigate(`/warehouse/products/${p.id}/edit`)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">{t('edit')}</button>
                                            <button
                                                disabled={deleteMutation.isPending}
                                                onClick={() => setDeleteId(p.id)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                                            >{t('delete')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_products')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('page')} {page} {t('of')} {totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed">{t('previous')}</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed">{t('next')}</button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={deleteId !== null}
                title={t('delete_product_title')}
                message={t('delete_product_confirm')}
                confirmLabel={t('delete')}
                loading={deleteMutation.isPending}
                onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
