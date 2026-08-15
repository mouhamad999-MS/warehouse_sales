import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface Location {
    id: number;
    rack: string;
    shelf: string;
    bin: string;
    capacity: number;
    current_load: number;
}

type LocationForm = { rack: string; shelf: string; bin: string; capacity: string };

const emptyForm: LocationForm = { rack: '', shelf: '', bin: '', capacity: '' };

function getBinStyle(location: Location): { bar: string; badge: string } {
    if (location.capacity === 0) return {
        bar:   'bg-gray-300 dark:bg-gray-600',
        badge: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400',
    };
    const pct = (location.current_load / location.capacity) * 100;
    if (pct > 80) return {
        bar:   'bg-red-500',
        badge: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400',
    };
    if (pct > 50) return {
        bar:   'bg-amber-500',
        badge: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400',
    };
    return {
        bar:   'bg-emerald-500',
        badge: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400',
    };
}

function groupByRack(locations: Location[]): Record<string, Record<string, Location[]>> {
    return locations.reduce((acc, loc) => {
        if (!acc[loc.rack]) acc[loc.rack] = {};
        if (!acc[loc.rack][loc.shelf]) acc[loc.rack][loc.shelf] = [];
        acc[loc.rack][loc.shelf].push(loc);
        return acc;
    }, {} as Record<string, Record<string, Location[]>>);
}

export default function WarehouseMap() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const queryClient = useQueryClient();

    // Add dialog
    const [addOpen, setAddOpen]       = useState(false);
    const [addForm, setAddForm]       = useState<LocationForm>(emptyForm);
    const [addError, setAddError]     = useState('');

    // Edit dialog
    const [editTarget, setEditTarget] = useState<Location | null>(null);
    const [editForm, setEditForm]     = useState<LocationForm>(emptyForm);
    const [editError, setEditError]   = useState('');

    // Delete confirm dialog
    const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

    const locationsEndpoint = isAdmin ? '/admin/warehouse-locations' : '/warehouse/locations';

    const { data: locations = [], isLoading } = useQuery<Location[]>({
        queryKey: ['warehouse-locations'],
        queryFn: () => api.get(locationsEndpoint).then((r) => r.data.data),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouse-locations'] });

    const createMutation = useMutation({
        mutationFn: () => api.post('/admin/warehouse-locations', {
            rack: addForm.rack, shelf: addForm.shelf, bin: addForm.bin, capacity: Number(addForm.capacity),
        }),
        onSuccess: () => { invalidate(); setAddOpen(false); setAddForm(emptyForm); },
        onError: (err: any) => setAddError(err.response?.data?.message ?? t('failed_add_location')),
    });

    const updateMutation = useMutation({
        mutationFn: () => api.put(`/admin/warehouse-locations/${editTarget!.id}`, {
            rack: editForm.rack, shelf: editForm.shelf, bin: editForm.bin, capacity: Number(editForm.capacity),
        }),
        onSuccess: () => { invalidate(); setEditTarget(null); },
        onError: (err: any) => setEditError(err.response?.data?.message ?? t('failed_update_location')),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/admin/warehouse-locations/${deleteTarget!.id}`),
        onSuccess: () => { invalidate(); setDeleteTarget(null); },
    });

    const handleAdd = () => {
        if (!addForm.rack || !addForm.shelf || !addForm.bin || !addForm.capacity) {
            setAddError(t('all_fields_required')); return;
        }
        setAddError('');
        createMutation.mutate();
    };

    const openEdit = (loc: Location) => {
        setEditTarget(loc);
        setEditForm({ rack: loc.rack, shelf: loc.shelf, bin: loc.bin, capacity: String(loc.capacity) });
        setEditError('');
    };

    const handleUpdate = () => {
        if (!editForm.rack || !editForm.shelf || !editForm.bin || !editForm.capacity) {
            setEditError(t('all_fields_required')); return;
        }
        setEditError('');
        updateMutation.mutate();
    };

    const grouped        = groupByRack(locations);
    const totalLocations = locations.length;
    const rackCount      = Object.keys(grouped).length;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('warehouse_map_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        {totalLocations} {t('locations')} · {rackCount} {t('racks')}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setAddOpen(true); setAddForm(emptyForm); setAddError(''); }}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_location')}
                    </button>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-gray-600 dark:text-gray-400">{t('less_50')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-gray-600 dark:text-gray-400">{t('between_50_80')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-gray-600 dark:text-gray-400">{t('more_80')}</span>
                </div>
            </div>

            {/* Map */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 py-20 text-center text-gray-500 dark:text-gray-400">
                    <svg className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    {t('no_locations')}
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(grouped).sort().map(([rack, shelves]) => (
                        <div key={rack} className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                            {/* Rack header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                        {t('rack')} {rack}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {Object.values(shelves).flat().length} bins
                                </span>
                            </div>
                            <div className="p-5 space-y-4">
                                {Object.entries(shelves).sort().map(([shelf, bins]) => (
                                    <div key={shelf}>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                                            {t('shelf')} {shelf}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {bins.map((bin) => {
                                                const pct   = bin.capacity > 0 ? Math.round((bin.current_load / bin.capacity) * 100) : 0;
                                                const style = getBinStyle(bin);
                                                return (
                                                    <div
                                                        key={bin.id}
                                                        className={`border rounded-xl px-3 py-2.5 min-w-[80px] ${style.badge}`}
                                                    >
                                                        <div className="text-xs font-bold mb-1">{t('bin')} {bin.bin}</div>
                                                        <div className="text-xs opacity-80 mb-1.5" title={`${bin.current_load}/${bin.capacity} (${pct}%)`}>
                                                            {bin.current_load}/{bin.capacity}
                                                        </div>
                                                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full ${style.bar}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>

                                                        {isAdmin && (
                                                            <div className="flex gap-1 mt-2 pt-1.5 border-t border-black/10 dark:border-white/10">
                                                                <button
                                                                    onClick={() => openEdit(bin)}
                                                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-600 transition"
                                                                    title={t('edit')}
                                                                >
                                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.172-8.172z" />
                                                                    </svg>
                                                                    {t('edit')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteTarget(bin)}
                                                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium bg-white/60 dark:bg-gray-700/60 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition"
                                                                    title={t('delete')}
                                                                >
                                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    {t('delete')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Location Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('add_location_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        {addError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-xl text-sm">
                                {addError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('rack')}</Label>
                                <Input placeholder="e.g. A" value={addForm.rack} onChange={(e) => setAddForm({ ...addForm, rack: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('shelf')}</Label>
                                <Input placeholder="e.g. 1" value={addForm.shelf} onChange={(e) => setAddForm({ ...addForm, shelf: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('bin')}</Label>
                                <Input placeholder="e.g. 01" value={addForm.bin} onChange={(e) => setAddForm({ ...addForm, bin: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('capacity')}</Label>
                                <Input type="number" placeholder="100" value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-1">
                            <button
                                onClick={() => setAddOpen(false)}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-4 py-2.5 transition"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={createMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm"
                            >
                                {createMutation.isPending ? t('adding') : t('add_location')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Location Dialog */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('edit_location')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        {editError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-xl text-sm">
                                {editError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('rack')}</Label>
                                <Input placeholder="e.g. A" value={editForm.rack} onChange={(e) => setEditForm({ ...editForm, rack: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('shelf')}</Label>
                                <Input placeholder="e.g. 1" value={editForm.shelf} onChange={(e) => setEditForm({ ...editForm, shelf: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('bin')}</Label>
                                <Input placeholder="e.g. 01" value={editForm.bin} onChange={(e) => setEditForm({ ...editForm, bin: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('capacity')}</Label>
                                <Input type="number" placeholder="100" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-1">
                            <button
                                onClick={() => setEditTarget(null)}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-4 py-2.5 transition"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={updateMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm"
                            >
                                {updateMutation.isPending ? t('saving') : t('save_changes')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('delete_location')}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('delete_location_confirm')} <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {deleteTarget && `${t('rack')} ${deleteTarget.rack} / ${t('shelf')} ${deleteTarget.shelf} / ${t('bin')} ${deleteTarget.bin}`}
                            </span>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-4 py-2.5 transition"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm"
                            >
                                {deleteMutation.isPending ? t('deleting') : t('delete')}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
