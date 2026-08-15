import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
    id: number;
    name: string;
    sku: string;
    unit_price: number;
    quantity: number;
    unit_name: string;
    image_url?: string | null;
}

interface Customer {
    id: number;
    name: string;
    email: string;
}

interface OrderItem {
    product_id: number;
    product_name: string;
    image_url?: string | null;
    unit_price: number;
    quantity: number;
    max_quantity: number;
}

export default function OrderCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const preSelectedProductId = String(location.state?.productId ?? '');
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<OrderItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [addQty, setAddQty] = useState(1);
    const [error, setError] = useState('');
    const [autoAdded, setAutoAdded] = useState(false);

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['sales-products-all'],
        queryFn: () => api.get('/sales/products', { params: { per_page: 500 } }).then((r) => r.data?.data ?? r.data),
    });

    const { data: customers = [] } = useQuery<Customer[]>({
        queryKey: ['sales-customers-all'],
        queryFn: () => api.get('/sales/customers').then((r) => r.data?.data ?? r.data),
    });

    // Auto-add the product when navigating from a product page
    useEffect(() => {
        if (!preSelectedProductId || autoAdded || products.length === 0) return;
        const product = products.find((p) => String(p.id) === preSelectedProductId);
        if (product && product.quantity > 0) {
            setItems([{
                product_id: product.id,
                product_name: product.name,
                image_url: product.image_url,
                unit_price: product.unit_price,
                quantity: 1,
                max_quantity: product.quantity,
            }]);
        }
        setAutoAdded(true);
    }, [products, preSelectedProductId, autoAdded]);

    const mutation = useMutation({
        mutationFn: () =>
            api.post('/sales/orders', {
                customer_id: Number(customerId),
                items: items.map((i) => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                })),
            }),
        onSuccess: (res) => {
            toast.success(t('order_created'));
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
            const id = res.data.data?.id ?? res.data.id;
            navigate(id ? `/sales/orders/${id}` : '/sales/orders');
        },
        onError: (e: any) => setError(e?.response?.data?.message ?? t('failed_create_order')),
    });

    const addItem = () => {
        if (!selectedProductId) return;
        const product = products.find((p) => String(p.id) === selectedProductId);
        if (!product) return;
        if (product.quantity === 0) { setError(t('product_out_of_stock_msg')); return; }
        const existing = items.find((i) => i.product_id === product.id);
        if (existing) { setError(t('product_already_added')); return; }
        if (addQty < 1 || addQty > product.quantity) { setError(`${t('quantity')} 1 - ${product.quantity}.`); return; }
        setError('');
        setItems([...items, {
            product_id: product.id,
            product_name: product.name,
            image_url: product.image_url,
            unit_price: product.unit_price,
            quantity: addQty,
            max_quantity: product.quantity,
        }]);
        setSelectedProductId('');
        setAddQty(1);
    };

    const removeItem = (productId: number) => setItems(items.filter((i) => i.product_id !== productId));

    const updateQty = (productId: number, qty: number) => {
        setItems(items.map((i) => {
            if (i.product_id !== productId) return i;
            const clamped = Math.max(1, Math.min(isNaN(qty) ? 1 : qty, i.max_quantity));
            return { ...i, quantity: clamped };
        }));
    };

    const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

    const handleSubmit = () => {
        if (!customerId) { setError(t('please_select_customer')); return; }
        if (items.length === 0) { setError(t('add_at_least_one_product')); return; }
        setError('');
        mutation.mutate();
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <button
                    onClick={() => navigate('/sales/orders')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back_to_orders')}
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('new_sales_order')}</h2>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">{error}</div>
            )}

            {/* Customer */}
            <Card>
                <CardHeader><CardTitle className="text-base">{t('customer')}</CardTitle></CardHeader>
                <CardContent>
                    <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder={t('select_customer')} />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} — {c.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {customers.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {t('no_customers_msg')}{' '}
                            <button className="text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => navigate('/sales/customers/create')}>
                                {t('create_one')}
                            </button>
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Order Items — shown first so pre-added product is immediately visible */}
            <Card>
                <CardHeader><CardTitle className="text-base">{t('order_items')}</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {items.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">{t('add_at_least_one_product')}</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{t('product')}</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{t('unit_price_col')}</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{t('qty')}</th>
                                    <th className="text-right px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{t('subtotal')}</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.product_id} className="border-b dark:border-gray-700 last:border-b-0">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.product_name} className="w-8 h-8 rounded object-cover border dark:border-gray-600 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {item.product_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">${Number(item.unit_price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Input
                                                type="number"
                                                min={1}
                                                max={item.max_quantity}
                                                value={item.quantity}
                                                onChange={(e) => updateQty(item.product_id, Number(e.target.value))}
                                                className="w-20 text-right inline-block"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            ${(item.quantity * item.unit_price).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs"
                                                onClick={() => removeItem(item.product_id)}
                                            >
                                                {t('remove')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-gray-900">
                                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">{t('total')}</td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">${total.toFixed(2)}</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Add another product (optional) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base text-gray-500 dark:text-gray-400 font-normal">
                        {items.length > 0 ? t('add_another_product') : t('add_products')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-1">
                            <Label>{t('product')}</Label>
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_product')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.filter((p) => p.quantity > 0 && !items.find((i) => i.product_id === p.id)).map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} — ${Number(p.unit_price).toFixed(2)} ({p.quantity} {t('in_stock')})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-28 space-y-1">
                            <Label>{t('qty')}</Label>
                            <Input
                                type="number"
                                min={1}
                                value={addQty}
                                onChange={(e) => setAddQty(Number(e.target.value))}
                            />
                        </div>
                        <Button type="button" onClick={addItem}>{t('add')}</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-3">
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending ? t('submitting') : t('submit_order')}
                </Button>
                <Button variant="outline" onClick={() => navigate('/sales/orders')}>{t('cancel')}</Button>
            </div>
        </div>
    );
}
