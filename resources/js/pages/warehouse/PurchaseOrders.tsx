import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface Product {
    id: number;
    name: string;
    sku: string;
}

interface User {
    id: number;
    name: string;
}

interface PurchaseOrder {
    id: number;
    quantity: number;
    status: string;
    product: Product | null;
    requested_by: User | null;
    approved_by: User | null;
    created_at: string;
}

interface PaginatedResponse {
    data: PurchaseOrder[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
    };
}

const statusStyles: Record<string, { badge: string; dot: string }> = {
    SUBMITTED: { badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400', dot: 'bg-yellow-500' },
    APPROVED:  { badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400', dot: 'bg-blue-500' },
    RECEIVED:  { badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400', dot: 'bg-green-500' },
    REJECTED:  { badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400', dot: 'bg-red-500' },
    CANCELLED: { badge: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
};

export default function PurchaseOrders() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = React.useState(1);
    const [receivingId, setReceivingId] = React.useState<number | null>(null);
    const [cancellingId, setCancellingId] = React.useState<number | null>(null);

    const { data, isLoading } = useQuery<PaginatedResponse>({
        queryKey: ['purchase-orders', page],
        queryFn: () => api.get('/warehouse/purchase-orders', { params: { page } }).then((r) => r.data),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/warehouse/purchase-orders/${id}/cancel`),
        onSuccess: () => {
            setCancellingId(null);
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast.success(t('order_cancelled'));
        },
        onError: (e: any) => {
            setCancellingId(null);
            toast.error(e?.response?.data?.message ?? t('action_failed'));
        },
    });

    const receiveMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/warehouse/purchase-orders/${id}/receive`),
        onSuccess: () => {
            setReceivingId(null);
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast.success(t('order_received'));
        },
        onError: (e: any) => {
            setReceivingId(null);
            toast.error(e?.response?.data?.message ?? t('action_failed'));
        },
    });

    const orders = data?.data ?? [];
    const meta = data?.meta;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('purchase_orders')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meta?.total ?? orders.length} {t('total_orders') || 'total orders'}</p>
                </div>
                <button
                    onClick={() => navigate('/warehouse/purchase-orders/create')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('new_purchase_order')}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_pending_purchase')}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">ID</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('product')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('quantity')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('status')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('requested_by')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('date')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {orders.map((order) => {
                                const style = statusStyles[order.status] ?? statusStyles.CANCELLED;
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">#{order.id}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                            {order.product?.name ?? <span className="text-gray-400">—</span>}
                                            {order.product?.sku && (
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{order.product.sku}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">{order.quantity}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{order.requested_by?.name ?? '—'}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-1.5 justify-end">
                                                <button
                                                    onClick={() => navigate(`/warehouse/purchase-orders/${order.id}/bill`)}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                                >
                                                    {t('print_bill')}
                                                </button>
                                                {(order.status === 'SUBMITTED' || order.status === 'APPROVED') && (
                                                    <button
                                                        disabled={receivingId === order.id}
                                                        onClick={() => {
                                                            setReceivingId(order.id);
                                                            receiveMutation.mutate(order.id);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition disabled:opacity-50"
                                                    >
                                                        {receivingId === order.id ? t('loading') : t('receive_order')}
                                                    </button>
                                                )}
                                                {order.status === 'SUBMITTED' && (
                                                    <button
                                                        disabled={cancellingId === order.id}
                                                        onClick={() => {
                                                            setCancellingId(order.id);
                                                            cancelMutation.mutate(order.id);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                                                    >
                                                        {t('cancel_order')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('page')} {meta.current_page} {t('of')} {meta.last_page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={meta.current_page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('previous')}
                        </button>
                        <button
                            disabled={meta.current_page >= meta.last_page}
                            onClick={() => setPage((p) => p + 1)}
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
