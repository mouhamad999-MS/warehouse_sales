import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string;
    category_name: string;
    unit_name: string;
    unit_price: number;
    quantity: number;
    min_stock_level: number;
    location_label?: string;
    image_url?: string | null;
}

export default function SalesProductDetail() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: product, isLoading } = useQuery<Product>({
        queryKey: ['sales-product', id],
        queryFn: () => api.get(`/sales/products/${id}`).then((r) => r.data.data),
    });

    if (isLoading) {
        return (
            <div className="max-w-xl space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!product) return <div className="text-gray-500 dark:text-gray-400">{t('product_not_found')}</div>;

    const inStock = product.quantity > 0;

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <button
                    onClick={() => navigate('/sales/products')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back_to_products')}
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
                <p className="font-mono text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-0.5">{product.sku}</p>
            </div>

            {product.image_url && (
                <Card>
                    <CardContent className="p-4 flex justify-center">
                        <img src={product.image_url} alt={product.name} className="max-h-64 rounded-lg object-contain" />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="text-base">{t('product_details')}</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('category')}</span>
                        <span className="font-medium">{product.category_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('unit')}</span>
                        <span className="font-medium">{product.unit_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('unit_price')}</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">${Number(product.unit_price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">{t('availability')}</span>
                        <span className={`font-semibold ${inStock ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}>
                            {inStock ? `${product.quantity} ${product.unit_name} ${t('in_stock')}` : t('out_of_stock')}
                        </span>
                    </div>
                    {product.location_label && (
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">{t('location')}</span>
                            <span>{product.location_label}</span>
                        </div>
                    )}
                    {product.description && (
                        <div className="pt-2 border-t dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">{t('description')}</p>
                            <p className="text-gray-700 dark:text-gray-200">{product.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button
                onClick={() => navigate('/sales/orders/create', { state: { productId: product.id } })}
                disabled={!inStock}
                className="w-full"
            >
                {t('create_order_product')}
            </Button>
        </div>
    );
}
