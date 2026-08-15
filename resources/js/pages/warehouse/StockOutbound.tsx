import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
    product_id: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Product {
    id: number;
    name: string;
    sku: string;
    quantity: number;
}

export default function StockOutbound() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['warehouse-products-all'],
        queryFn: () => api.get('/warehouse/products', { params: { per_page: 500 } }).then((r) => r.data?.data ?? r.data),
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const selectedProductId = watch('product_id');
    const selectedProduct = products.find((p) => String(p.id) === selectedProductId);

    const mutation = useMutation({
        mutationFn: (data: FormData) =>
            api.post('/warehouse/stock/outbound', {
                product_id: Number(data.product_id),
                quantity: data.quantity,
                notes: data.notes,
            }),
        onSuccess: () => { reset(); navigate('/warehouse/stock/history'); },
    });

    return (
        <div className="max-w-xl space-y-6">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back')}
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock_outbound_title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('stock_outbound_sub')}</p>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('outbound_details')}</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
                        {mutation.isError && (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {(mutation.error as any)?.response?.data?.message ??
                                    (mutation.error as any)?.response?.data?.errors?.quantity?.[0] ??
                                    t('failed_record_outbound')}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('product')}</label>
                            <Select onValueChange={(v) => setValue('product_id', v)}>
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
                            {errors.product_id && <p className="text-xs text-red-500 mt-1">{t('select_a_product')}</p>}
                        </div>

                        {selectedProduct && (
                            <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${
                                selectedProduct.quantity === 0
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                            }`}>
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    selectedProduct.quantity === 0
                                        ? 'bg-red-100 dark:bg-red-900/30'
                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                }`}>
                                    <svg className={`h-4 w-4 ${selectedProduct.quantity === 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div className={`text-sm ${selectedProduct.quantity === 0 ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                    {t('available_stock')}: <strong>{selectedProduct.quantity}</strong> {t('units')}
                                    {selectedProduct.quantity === 0 && <span className="ml-1 font-semibold"> — {t('out_of_stock_excl')}</span>}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('quantity_to_remove')}</label>
                            <input
                                type="number"
                                min={1}
                                placeholder="e.g. 10"
                                {...register('quantity')}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                            />
                            {errors.quantity && <p className="text-xs text-red-500 mt-1">{t('field_required')}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('notes')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                            </label>
                            <textarea
                                {...register('notes')}
                                rows={3}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition shadow-sm shadow-red-500/20 disabled:opacity-50"
                            >
                                {mutation.isPending ? t('recording') : t('record_outbound')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
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
