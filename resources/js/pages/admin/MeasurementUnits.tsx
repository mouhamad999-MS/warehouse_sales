import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Unit {
    id: number;
    name: string;
    abbreviation: string;
}

export default function MeasurementUnits() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName]   = useState('');
    const [editAbbr, setEditAbbr]   = useState('');
    const [newName, setNewName]     = useState('');
    const [newAbbr, setNewAbbr]     = useState('');
    const [addError, setAddError]   = useState('');
    const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);

    const { data: units = [], isLoading } = useQuery<Unit[]>({
        queryKey: ['measurement-units'],
        queryFn: () => api.get('/admin/measurement-units').then((r) => r.data.data),
    });

    const createMutation = useMutation({
        mutationFn: () => api.post('/admin/measurement-units', { name: newName, abbreviation: newAbbr }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['measurement-units'] });
            setNewName(''); setNewAbbr(''); setAddError('');
            toast.success(t('unit_created'));
        },
        onError: (err: any) => setAddError(err.response?.data?.message ?? t('failed_create')),
    });

    const updateMutation = useMutation({
        mutationFn: (unit: { id: number; name: string; abbreviation: string }) =>
            api.put(`/admin/measurement-units/${unit.id}`, { name: unit.name, abbreviation: unit.abbreviation }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['measurement-units'] });
            setEditingId(null);
            toast.success(t('unit_updated'));
        },
        onError: () => toast.error(t('failed_update_unit')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/admin/measurement-units/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['measurement-units'] });
            toast.success(t('unit_deleted'));
            setDeleteUnitId(null);
        },
        onError: () => { toast.error(t('failed_delete_unit')); setDeleteUnitId(null); },
    });

    const startEdit = (unit: Unit) => {
        setEditingId(unit.id); setEditName(unit.name); setEditAbbr(unit.abbreviation);
    };

    const handleAdd = () => {
        if (!newName.trim() || !newAbbr.trim()) { setAddError(t('name_abbr_required')); return; }
        createMutation.mutate();
    };

    return (
        <div className="max-w-3xl space-y-8">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('nav_measurement_units')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('manage_units')}</p>
            </div>

            {/* Add New Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2">
                        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{t('add_new_unit')}</p>
                </div>
                <div className="p-6">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-2">
                            <Label className="text-sm font-medium">{t('unit_name')}</Label>
                            <Input
                                placeholder="e.g. Kilogram"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <Label className="text-sm font-medium">{t('abbreviation')}</Label>
                            <Input
                                placeholder="e.g. kg"
                                value={newAbbr}
                                onChange={(e) => setNewAbbr(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={createMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm whitespace-nowrap"
                        >
                            {createMutation.isPending ? t('adding') : t('add_unit')}
                        </button>
                    </div>
                    {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
                </div>
            </div>

            {/* Units List */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('all_units')}</p>
                    {!isLoading && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{units.length} units</span>
                    )}
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('name')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('abbreviation')}</th>
                                <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {units.map((unit) => (
                                <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                    {editingId === unit.id ? (
                                        <>
                                            <td className="px-6 py-3">
                                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 rounded-lg" />
                                            </td>
                                            <td className="px-6 py-3">
                                                <Input value={editAbbr} onChange={(e) => setEditAbbr(e.target.value)} className="h-8 w-24 rounded-lg" />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" onClick={() => updateMutation.mutate({ id: unit.id, name: editName, abbreviation: editAbbr })}
                                                        disabled={updateMutation.isPending}>
                                                        {t('save')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                                        {t('cancel')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{unit.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
                                                    {unit.abbreviation}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(unit)}>{t('edit')}</Button>
                                                    <Button size="sm" variant="outline"
                                                        className="text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400"
                                                        onClick={() => setDeleteUnitId(unit.id)}>
                                                        {t('delete')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">{t('no_units')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            <ConfirmDialog
                open={deleteUnitId !== null}
                title={t('delete_unit_title')}
                message={t('delete_unit_confirm')}
                confirmLabel={t('delete')}
                loading={deleteMutation.isPending}
                onConfirm={() => deleteUnitId !== null && deleteMutation.mutate(deleteUnitId)}
                onCancel={() => setDeleteUnitId(null)}
            />
        </div>
    );
}
