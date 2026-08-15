import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
    id: number;
    name: string;
    sku: string;
}

export default function PurchaseOrderCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState('');

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['warehouse-products-all'],
        queryFn: () => api.get('/warehouse/products', { params: { per_page: 500 } }).then((r) => r.data?.data ?? r.data),
    });

    const mutation = useMutation({
        mutationFn: () =>
            api.post('/warehouse/purchase-orders', {
                product_id: Number(productId),
                quantity,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['approvals-purchase'] });
            toast.success(t('purchase_order_created'));
            navigate('/warehouse/purchase-orders');
        },
        onError: (e: any) => setError(e?.response?.data?.message ?? t('action_failed')),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) { setError(t('select_product')); return; }
        if (quantity < 1) { setError(`${t('quantity')} >= 1`); return; }
        setError('');
        mutation.mutate();
    };

    return (
        <div className="max-w-xl space-y-6">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate('/warehouse/purchase-orders')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('purchase_orders')}
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create_purchase_order')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('submit_order_sub') || 'Submit a new purchase order for approval'}</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('create_purchase_order')}</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('product')}</label>
                            <Select value={productId} onValueChange={setProductId}>
                                <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <SelectValue placeholder={t('select_product')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.sku})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('quantity')}</label>
                            <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full max-w-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {mutation.isPending ? t('loading') : t('submit_order')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/warehouse/purchase-orders')}
                                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
