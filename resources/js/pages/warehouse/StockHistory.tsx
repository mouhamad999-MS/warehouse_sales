import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Movement {
    id: number;
    type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
    quantity: number;
    notes: string | null;
    created_at: string;
    product: { id: number; name: string; sku: string };
    user: { id: number; name: string };
}

const typeStyles: Record<string, { badge: string; icon: string; symbol: string }> = {
    INBOUND:    { badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', icon: 'text-green-600', symbol: '+' },
    OUTBOUND:   { badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', icon: 'text-red-600', symbol: '−' },
    ADJUSTMENT: { badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', icon: 'text-yellow-600', symbol: '~' },
};

export default function StockHistory() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [typeFilter, setTypeFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    const handleExport = () => {
        fetch('/api/export/stock-history', { credentials: 'include' })
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'stock_history.csv'; a.click();
                URL.revokeObjectURL(url);
            });
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['stock-history', typeFilter, dateFrom, dateTo, page],
        queryFn: () =>
            api.get('/warehouse/stock/history', {
                params: { type: typeFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, page },
            }).then((r) => r.data),
    });

    const movements: Movement[] = data?.data ?? [];
    const total: number = data?.total ?? 0;
    const lastPage: number = data?.last_page ?? 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock_history_title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} {t('movements')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/warehouse/stock/inbound')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition shadow-sm shadow-green-500/20"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('plus_inbound')}
                    </button>
                    <button
                        onClick={() => navigate('/warehouse/stock/outbound')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition shadow-sm shadow-red-500/20"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        {t('minus_outbound')}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('export_csv')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="w-44">
                        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <SelectValue placeholder={t('all_types')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('all_types')}</SelectItem>
                                <SelectItem value="INBOUND">{t('inbound')}</SelectItem>
                                <SelectItem value="OUTBOUND">{t('outbound')}</SelectItem>
                                <SelectItem value="ADJUSTMENT">{t('adjustment')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('from_date') || 'From'}</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('to_date') || 'To'}</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        />
                    </div>
                    {(typeFilter || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setTypeFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t('clear')}
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-6 text-red-600 dark:text-red-400">{t('failed_load_stock_history')}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('product')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('type')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('quantity')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('by')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('notes')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('date')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {movements.map((m) => {
                                const style = typeStyles[m.type] ?? typeStyles.ADJUSTMENT;
                                return (
                                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {m.product?.name ?? <span className="italic text-gray-400 dark:text-gray-500">Deleted Product</span>}
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{m.product?.sku ?? '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                                                <span className="font-bold">{style.symbol}</span>
                                                {t(m.type.toLowerCase())}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold text-base ${m.type === 'INBOUND' ? 'text-green-600 dark:text-green-400' : m.type === 'OUTBOUND' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                                {m.type === 'INBOUND' ? '+' : m.type === 'OUTBOUND' ? '−' : '~'}{m.quantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{m.user?.name}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{m.notes ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                                            {new Date(m.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                            {movements.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_movements')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('page')} {page} {t('of')} {lastPage}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('previous')}
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                            disabled={page === lastPage}
                            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('next')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
