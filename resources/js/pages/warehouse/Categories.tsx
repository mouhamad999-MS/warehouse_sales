import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Category {
    id: number;
    name: string;
    description: string | null;
    products_count: number;
}

export default function Categories() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

    const { data: categories = [], isLoading } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: () => api.get('/warehouse/categories').then((r) => r.data.data),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

    const createMutation = useMutation({
        mutationFn: () => api.post('/warehouse/categories', { name, description }),
        onSuccess: () => { invalidate(); resetForm(); toast.success(t('category_created')); },
        onError: (e: any) => setError(e?.response?.data?.message ?? t('failed_create')),
    });

    const updateMutation = useMutation({
        mutationFn: () => api.put(`/warehouse/categories/${editing!.id}`, { name, description }),
        onSuccess: () => { invalidate(); resetForm(); toast.success(t('category_updated')); },
        onError: (e: any) => setError(e?.response?.data?.message ?? t('failed_update_cat')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/warehouse/categories/${id}`),
        onSuccess: () => { invalidate(); toast.success(t('category_deleted')); setDeleteCatId(null); },
        onError: () => { toast.error(t('failed_delete_cat')); setDeleteCatId(null); },
    });

    const resetForm = () => {
        setShowForm(false);
        setEditing(null);
        setName('');
        setDescription('');
        setError('');
    };

    const openEdit = (cat: Category) => {
        setEditing(cat);
        setName(cat.name);
        setDescription(cat.description ?? '');
        setError('');
        setShowForm(true);
    };

    const openCreate = () => {
        setEditing(null);
        setName('');
        setDescription('');
        setError('');
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError(t('name_required')); return; }
        setError('');
        editing ? updateMutation.mutate() : createMutation.mutate();
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('categories_title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} {t('categories_count')}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm shadow-emerald-500/20"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_category')}
                </button>
            </div>

            {/* Form Card */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden max-w-lg">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {editing ? t('edit_category') : t('new_category')}
                        </h3>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('name')}</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('description')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                                </label>
                                <input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
                                >
                                    {isPending ? t('saving') : (editing ? t('update') : t('create'))}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('name')}</th>
                                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('description')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('nav_products')}</th>
                                <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {categories.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{c.description ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            {c.products_count}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                            <button
                                                onClick={() => openEdit(c)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                            >
                                                {t('edit')}
                                            </button>
                                            <button
                                                disabled={c.products_count > 0 || deleteMutation.isPending}
                                                onClick={() => setDeleteCatId(c.id)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('no_categories')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            <ConfirmDialog
                open={deleteCatId !== null}
                title={t('delete_category_title')}
                message={t('delete_category_confirm')}
                confirmLabel={t('delete')}
                loading={deleteMutation.isPending}
                onConfirm={() => deleteCatId !== null && deleteMutation.mutate(deleteCatId)}
                onCancel={() => setDeleteCatId(null)}
            />
        </div>
    );
}
