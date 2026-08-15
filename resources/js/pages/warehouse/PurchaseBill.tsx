import React, { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface PurchaseOrder {
    id: number;
    quantity: number;
    status: string;
    unit_price: number;
    total_cost: number;
    created_at: string;
    updated_at: string;
    product: { name: string; sku: string; unit_name?: string };
    requested_by: { name: string };
    approved_by?: { name: string };
}

export default function PurchaseBill() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const { data: order, isLoading } = useQuery<PurchaseOrder>({
        queryKey: ['purchase-order-bill', id],
        queryFn: () => api.get(`/warehouse/purchase-orders/${id}`).then((r) => r.data.data),
    });

    const handlePrint = () => window.print();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    if (!order) return <div className="text-gray-500 p-8">{t('order_not_found')}</div>;

    return (
        <>
            {/* Controls — hidden when printing */}
            <div className="print:hidden flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/warehouse/purchase-orders')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back')}
                </button>
                <button
                    onClick={handlePrint}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    {t('print_bill')}
                </button>
            </div>

            {/* Bill */}
            <div ref={printRef} className="bg-white max-w-3xl mx-auto p-10 shadow-sm border border-gray-100 rounded-2xl print:shadow-none print:border-none print:rounded-none print:max-w-none print:p-8">

                {/* Header */}
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('purchase_bill')}</h1>
                        <p className="text-gray-400 text-sm mt-0.5">PO# {String(order.id).padStart(6, '0')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-emerald-700">{t('warehouse_and_sales')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('management_system')}</p>
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{t('bill_requested_by')}</p>
                        <p className="font-semibold text-gray-900">{order.requested_by?.name}</p>
                        {order.approved_by && (
                            <p className="text-sm text-gray-500 mt-0.5">{t('approved_by_label')} {order.approved_by.name}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-8">
                                <span className="text-gray-400">{t('date')}</span>
                                <span className="font-medium text-gray-700">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            {order.status === 'RECEIVED' && (
                                <div className="flex justify-between gap-8">
                                    <span className="text-gray-400">{t('received_on')}</span>
                                    <span className="font-medium text-gray-700">{new Date(order.updated_at).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-8">
                                <span className="text-gray-400">{t('status')}</span>
                                <span className="font-semibold text-gray-900">{order.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items table */}
                <table className="w-full text-sm mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('product')}</th>
                            <th className="text-left py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('sku')}</th>
                            <th className="text-right py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('quantity')}</th>
                            <th className="text-right py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('unit_price_col')}</th>
                            <th className="text-right py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gray-100">
                            <td className="py-4 font-medium text-gray-900">{order.product?.name}</td>
                            <td className="py-4 text-gray-400 font-mono text-xs">{order.product?.sku}</td>
                            <td className="py-4 text-right text-gray-700">{order.quantity}</td>
                            <td className="py-4 text-right text-gray-700">${Number(order.unit_price).toFixed(2)}</td>
                            <td className="py-4 text-right font-semibold text-gray-900">${Number(order.total_cost).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Total */}
                <div className="flex justify-end mb-10">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2">
                            <span>{t('total')}</span>
                            <span className="text-emerald-700">${Number(order.total_cost).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
                    <p>{t('bill_footer_text')}</p>
                </div>
            </div>
        </>
    );
}
