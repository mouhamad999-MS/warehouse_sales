import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    avatar_url?: string | null;
}

export default function SalesCustomers() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['sales-customers', page, search],
        queryFn: () =>
            api.get('/sales/customers', { params: { page, search: search || undefined } }).then((r) => r.data),
    });

    const customers: Customer[] = data?.data ?? [];
    const lastPage: number = data?.last_page ?? 1;
    const total: number = data?.total ?? 0;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('customers_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{total} {t('customers_count')}</p>
                </div>
                <Button onClick={() => navigate('/sales/customers/create')}>{t('add_customer')}</Button>
            </div>

            <Input
                placeholder={t('search_customers')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="max-w-xs"
            />

            <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="p-6 text-red-600">{t('failed_load_customers')}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('name')}</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('email')}</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('phone')}</th>
                                <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('address')}</th>
                                <th className="text-right px-6 py-3 font-medium text-gray-500 dark:text-gray-400">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {c.avatar_url ? (
                                                <img src={c.avatar_url} alt={c.name} className="h-8 w-8 rounded-full object-cover border border-emerald-200 dark:border-emerald-800 flex-shrink-0" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        {c.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.email}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{c.phone ?? '-'}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{c.address ?? '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/sales/customers/${c.id}/edit`)}
                                        >
                                            {t('edit')}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('no_customers')}
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
