import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Order {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
    customer: { name: string };
    items_count?: number;
}

const statusBadge: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

export default function SalesOrders() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['sales-orders', page],
        queryFn: () => api.get('/sales/orders', { params: { page } }).then((r) => r.data),
    });

    const orders: Order[] = data?.data ?? [];
    const lastPage: number = data?.last_page ?? 1;
    const total: number = data?.total ?? 0;

    const cancelMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/sales/orders/${id}/cancel`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] }),
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('orders_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{total} {t('orders_count')}</p>
                </div>
                <Button onClick={() => navigate('/sales/orders/create')}>{t('new_order')}</Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="p-6 text-red-600">{t('failed_load_orders')}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('order_hash')}</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('customer')}</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('status')}</th>
                                <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('total')}</th>
                                <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('date')}</th>
                                <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium">#{o.id}</td>
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-200">{o.customer?.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        ${Number(o.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                                        {new Date(o.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" onClick={() => navigate(`/sales/orders/${o.id}`)}>
                                                {t('view')}
                                            </Button>
                                            {(o.status === 'SUBMITTED' || o.status === 'DRAFT') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                                    disabled={cancelMutation.isPending}
                                                    onClick={() => {
                                                        if (confirm(t('cancel_order_confirm'))) cancelMutation.mutate(o.id);
                                                    }}
                                                >
                                                    {t('cancel')}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('no_orders')} <button className="text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => navigate('/sales/orders/create')}>{t('create_first_order')}</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {lastPage > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('page')} {page} {t('of')} {lastPage}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            {t('previous')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}>
                            {t('next')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
