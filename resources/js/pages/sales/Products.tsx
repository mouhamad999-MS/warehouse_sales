import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface Product {
    id: number;
    name: string;
    sku: string;
    category_name: string;
    quantity: number;
    unit_price: number;
    unit_name: string;
    image_url?: string | null;
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

export default function SalesProducts() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [view, setView] = useState<'grid' | 'list'>('grid');

    const { data, isLoading, error } = useQuery({
        queryKey: ['sales-products', search, page],
        queryFn: () =>
            api.get('/sales/products', {
                params: { search, page, per_page: PAGE_SIZE },
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
                            className={`p-2 transition ${view === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 transition ${view === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={() => navigate('/sales/orders/create')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm shadow-indigo-500/20"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('new_order')}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="relative max-w-sm">
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
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
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
                            {products.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => navigate(`/sales/products/${p.id}`)}
                                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer overflow-hidden"
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
                                        {p.quantity === 0 && (
                                            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">OUT</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 text-center space-y-1">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">{p.name}</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">${Number(p.unit_price).toFixed(2)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {p.quantity} {p.unit_name}</p>
                                        <div className="flex justify-center pt-0.5">
                                            <StarRating id={p.id} />
                                        </div>
                                    </div>

                                    {/* Action buttons on hover */}
                                    <div className="px-3 pb-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/sales/products/${p.id}`); }}
                                            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                                        >
                                            {t('details')}
                                        </button>
                                        {p.quantity > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate('/sales/orders/create', { state: { productId: p.id } }); }}
                                                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
                                            >
                                                {t('new_order')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
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
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('in_stock')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('unit_price')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
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
                                            {p.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">{p.sku}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{p.category_name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={p.quantity === 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}>
                                            {p.quantity} {p.unit_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-200 font-medium">
                                        ${Number(p.unit_price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => navigate(`/sales/products/${p.id}`)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                                {t('details')}
                                            </button>
                                            {p.quantity > 0 && (
                                                <button
                                                    onClick={() => navigate('/sales/orders/create', { state: { productId: p.id } })}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                                                >
                                                    {t('new_order')}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('no_products')}</td>
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
        </div>
    );
}
