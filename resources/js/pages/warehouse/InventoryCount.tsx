import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { toast } from 'sonner';

interface Product {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    category_name: string;
}

interface CountEntry {
    product_id: number;
    actual_quantity: number;
    notes: string;
}

export default function InventoryCount() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [counts, setCounts] = useState<Record<number, { actual_quantity: string; notes: string }>>({});
    const [submitted, setSubmitted] = useState(false);
    const [adjustments, setAdjustments] = useState<any[]>([]);

    const { data: products = [], isLoading } = useQuery<Product[]>({
        queryKey: ['warehouse-products-all'],
        queryFn: () => api.get('/warehouse/products', { params: { per_page: 500 } }).then((r) => r.data?.data ?? r.data),
    });

    const mutation = useMutation({
        mutationFn: (payload: CountEntry[]) =>
            api.post('/warehouse/inventory-count', { counts: payload }),
        onSuccess: (res) => {
            setAdjustments(res.data.adjustments ?? []);
            setSubmitted(true);
        },
    });

    const handleSubmit = () => {
        const payload: CountEntry[] = Object.entries(counts)
            .filter(([, v]) => v.actual_quantity !== '')
            .map(([id, v]) => ({
                product_id: Number(id),
                actual_quantity: Number(v.actual_quantity),
                notes: v.notes,
            }));

        if (payload.length === 0) { toast.error(t('enter_at_least_one')); return; }
        mutation.mutate(payload);
    };

    if (submitted) {
        return (
            <div className="space-y-6 max-w-2xl">
                {/* Success banner */}
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-5 py-4 rounded-2xl">
                    <div className="h-9 w-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="font-medium">{t('count_completed')}</span>
                </div>

                {/* Adjustments card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('adjustments_made')}</h3>
                    </div>
                    <div className="p-6">
                        {adjustments.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_adjustments')}</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 -mx-6">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{t('product')}</th>
                                        <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{t('old_qty')}</th>
                                        <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{t('new_qty')}</th>
                                        <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{t('diff')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {adjustments.map((a: any) => (
                                        <tr key={a.product_id}>
                                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{a.product_name}</td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{a.old_quantity}</td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{a.new_quantity}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${a.adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {a.adjustment > 0 ? '+' : ''}{a.adjustment}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => { setSubmitted(false); setCounts({}); setAdjustments([]); }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20"
                    >
                        {t('new_count')}
                    </button>
                    <button
                        onClick={() => navigate('/warehouse/dashboard')}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        {t('back_to_dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inventory_count_title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('inventory_count_sub')}</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                >
                    {mutation.isPending ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {t('submitting')}
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('submit_count')}
                        </>
                    )}
                </button>
            </div>

            {mutation.isError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {(mutation.error as any)?.response?.data?.message ?? t('failed_submit_count')}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('product')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('category')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('system_qty')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('actual_qty')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('notes')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {products.map((p) => {
                                const entry = counts[p.id] ?? { actual_quantity: '', notes: '' };
                                const diff = entry.actual_quantity !== ''
                                    ? Number(entry.actual_quantity) - p.quantity
                                    : null;
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{p.sku}</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{p.category_name}</td>
                                        <td className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{p.quantity}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    placeholder="—"
                                                    value={entry.actual_quantity}
                                                    onChange={(e) => setCounts(prev => ({
                                                        ...prev,
                                                        [p.id]: { ...prev[p.id] ?? { notes: '' }, actual_quantity: e.target.value },
                                                    }))}
                                                    className="w-24 text-right px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                />
                                                {diff !== null && diff !== 0 && (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${diff > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                        {diff > 0 ? '+' : ''}{diff}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <input
                                                placeholder={t('optional_note')}
                                                value={entry.notes}
                                                onChange={(e) => setCounts(prev => ({
                                                    ...prev,
                                                    [p.id]: { ...prev[p.id] ?? { actual_quantity: '' }, notes: e.target.value },
                                                }))}
                                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                >
                    {mutation.isPending ? t('submitting') : t('submit_count')}
                </button>
            </div>
        </div>
    );
}
