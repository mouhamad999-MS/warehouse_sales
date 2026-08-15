import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
    id: number;
    product: { name: string; sku: string };
    quantity: number;
    unit_price: number;
}

interface Order {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
    customer: { name: string; email: string; phone?: string };
    sales_officer: { name: string };
    approved_by?: { name: string };
    items: OrderItem[];
}

const statusBadge: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
    DRAFT: 'bg-yellow-100 text-yellow-800',
};

export default function OrderDetail() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: order, isLoading } = useQuery<Order>({
        queryKey: ['sales-order', id],
        queryFn: () => api.get(`/sales/orders/${id}`).then((r) => r.data.data),
    });

    const cancelMutation = useMutation({
        mutationFn: () => api.patch(`/sales/orders/${id}/cancel`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-order', id] }),
    });

    if (isLoading) {
        return (
            <div className="max-w-2xl space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!order) return <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('order_not_found')}</div>;

    const canCancel = order.status === 'SUBMITTED' || order.status === 'DRAFT';

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => navigate('/sales/orders')}
                        className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('back_to_orders')}
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('order_hash')}{order.id}</h2>
                    <div className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[order.status] ?? 'bg-gray-100'}`}>
                            {order.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/sales/orders/${id}/invoice`)}
                        className="flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {t('print_invoice')}
                    </Button>
                    {canCancel && (
                        <Button
                            variant="outline"
                            className="text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:bg-red-900/20"
                            disabled={cancelMutation.isPending}
                            onClick={() => {
                                if (confirm(t('cancel_order_confirm'))) cancelMutation.mutate();
                            }}
                        >
                            {cancelMutation.isPending ? t('cancelling') : t('cancel_order')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle className="text-base">{t('customer')}</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                        <p className="font-medium">{order.customer?.name}</p>
                        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{order.customer?.email}</p>
                        {order.customer?.phone && <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{order.customer.phone}</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base">{t('details')}</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('date')}</span>
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('officer')}</span>
                            <span>{order.sales_officer?.name}</span>
                        </div>
                        {order.approved_by && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('approved_by')}</span>
                                <span>{order.approved_by.name}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">{t('items')}</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('product')}</th>
                                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('qty')}</th>
                                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('unit_price_col')}</th>
                                <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('subtotal')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items ?? []).map((item) => (
                                <tr key={item.id} className="border-b dark:border-gray-700 last:border-b-0">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{item.product?.name}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.product?.sku}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right">${Number(item.unit_price).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        ${(item.quantity * item.unit_price).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 dark:bg-gray-900 border-t">
                                <td colSpan={3} className="px-4 py-3 text-right font-semibold">{t('total')}</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">
                                    ${Number(order.total_amount).toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
