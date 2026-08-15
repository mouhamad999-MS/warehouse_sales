import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface SalesOrderItem {
    id: number;
    product: { name: string; sku: string };
    quantity: number;
    unit_price: number;
}

interface SalesOrder {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
    customer: { name: string };
    sales_officer: { name: string; avatar_url?: string | null };
    items: SalesOrderItem[];
}


export default function Approvals() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string>('');

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['approvals-sales'],
        queryFn: () => api.get('/warehouse/approvals/sales-orders').then((r) => r.data),
    });

    const salesOrders: SalesOrder[] = salesData?.data ?? [];

    const salesMutation = useMutation({
        mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
            api.put(`/warehouse/approvals/sales-orders/${id}`, { action }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals-sales'] });
            setActionError('');
        },
        onError: (e: any) => setActionError(e?.response?.data?.message ?? t('action_failed')),
    });


    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('approvals_title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('approvals_sub')}</p>
            </div>

            {/* Badge */}
            {salesOrders.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold px-3 py-1 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {salesOrders.length} {t('pending')}
                    </span>
                </div>
            )}

            {actionError && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {actionError}
                </div>
            )}

            {/* Sales Orders */}
            <div className="space-y-3">
                    {salesLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
                        ))
                    ) : salesOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_pending_sales')}</p>
                        </div>
                    ) : (
                        salesOrders.map((order) => (
                            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="px-6 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">#{order.id}</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{order.customer?.name}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1.5">
                                                    {order.sales_officer?.avatar_url ? (
                                                        <img
                                                            src={order.sales_officer.avatar_url}
                                                            alt={order.sales_officer.name}
                                                            className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                            {order.sales_officer?.name?.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                    <strong className="text-gray-700 dark:text-gray-300">{order.sales_officer?.name}</strong>
                                                </span>
                                                <span>{t('total')}: <strong className="text-gray-900 dark:text-gray-100">${Number(order.total_amount).toFixed(2)}</strong></span>
                                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                            >
                                                {expandedId === order.id ? t('hide_items') : t('view_items')}
                                            </button>
                                            <button
                                                disabled={salesMutation.isPending}
                                                onClick={() => salesMutation.mutate({ id: order.id, action: 'approve' })}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                                            >
                                                {t('approve')}
                                            </button>
                                            <button
                                                disabled={salesMutation.isPending}
                                                onClick={() => salesMutation.mutate({ id: order.id, action: 'reject' })}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 transition disabled:opacity-50"
                                            >
                                                {t('reject')}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedId === order.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                        <th className="text-left pb-2">{t('product')}</th>
                                                        <th className="text-right pb-2">{t('qty')}</th>
                                                        <th className="text-right pb-2">{t('unit_price_col')}</th>
                                                        <th className="text-right pb-2">{t('subtotal')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                                    {(order.items ?? []).map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="py-2 text-gray-900 dark:text-gray-100">
                                                                {item.product?.name}
                                                                <span className="text-gray-400 ml-1 font-mono">({item.product?.sku})</span>
                                                            </td>
                                                            <td className="py-2 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                                            <td className="py-2 text-right text-gray-600 dark:text-gray-300">${Number(item.unit_price).toFixed(2)}</td>
                                                            <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">${(item.quantity * item.unit_price).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
        </div>
    );
}
