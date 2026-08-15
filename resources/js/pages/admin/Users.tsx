import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'warehouse_manager' | 'sales_officer';
    is_active: boolean;
    avatar_url?: string | null;
}

const roleBadge: Record<string, string> = {
    admin:             'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    warehouse_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    sales_officer:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const roleIcon: Record<string, string> = {
    admin:             'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    warehouse_manager: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    sales_officer:     'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
};

export default function AdminUsers() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [resetUser, setResetUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

    const roleLabel: Record<string, string> = {
        admin:             t('admin'),
        warehouse_manager: t('warehouse_manager'),
        sales_officer:     t('sales_officer'),
    };

    const { data: users = [], isLoading, error } = useQuery<User[]>({
        queryKey: ['admin-users'],
        queryFn: () => api.get('/admin/users').then((r) => r.data.data),
    });

    const toggleMutation = useMutation({
        mutationFn: (user: User) =>
            api.put(`/admin/users/${user.id}`, { ...user, is_active: !user.is_active }),
        onSuccess: (_, user) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success(user.is_active ? t('user_deactivated') : t('user_activated'));
        },
        onError: () => toast.error(t('failed_update_user')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success(t('user_deleted'));
            setDeleteUserId(null);
        },
        onError: () => { toast.error(t('failed_delete_user')); setDeleteUserId(null); },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: ({ userId, password }: { userId: number; password: string }) =>
            api.patch(`/admin/users/${userId}/reset-password`, { password }),
        onSuccess: () => { setResetSuccess(true); setResetError(null); toast.success(t('reset_pw_success')); },
        onError: (err: any) => setResetError(err.response?.data?.message ?? t('something_went_wrong')),
    });

    const openResetDialog = (user: User) => {
        setResetUser(user); setNewPassword(''); setResetSuccess(false); setResetError(null);
    };
    const closeResetDialog = () => {
        setResetUser(null); setNewPassword(''); setResetSuccess(false); setResetError(null);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-6 py-4 border-b dark:border-gray-700 last:border-b-0">
                            <Skeleton className="h-5 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3">
                {t('failed_load_users')}
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('users_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{users.length} {t('total_users')}</p>
                </div>
                <button
                    onClick={() => navigate('/admin/users/create')}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 transition shadow-sm"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('new_user')}
                </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('users_title')}</p>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('name')}</th>
                            <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('email')}</th>
                            <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('role')}</th>
                            <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('status')}</th>
                            <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full object-cover border border-indigo-200 dark:border-indigo-800 flex-shrink-0" />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[user.role]}`}>
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleIcon[user.role]} />
                                        </svg>
                                        {roleLabel[user.role] ?? user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        user.is_active
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {user.is_active ? t('active') : t('inactive')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/users/${user.id}/edit`)}>
                                            {t('edit')}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openResetDialog(user)}
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20">
                                            {t('reset_pw_btn')}
                                        </Button>
                                        <Button variant="outline" size="sm"
                                            onClick={() => toggleMutation.mutate(user)}
                                            disabled={toggleMutation.isPending}
                                            className={user.is_active
                                                ? 'text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20'
                                                : 'text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20'
                                            }>
                                            {user.is_active ? t('deactivate') : t('activate')}
                                        </Button>
                                        <Button variant="outline" size="sm"
                                            onClick={() => setDeleteUserId(user.id)}
                                            disabled={deleteMutation.isPending}
                                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
                                            {t('delete')}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">{t('no_users_found')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={deleteUserId !== null}
                title={t('delete_user_title')}
                message={t('delete_user_confirm')}
                confirmLabel={t('delete')}
                loading={deleteMutation.isPending}
                onConfirm={() => deleteUserId !== null && deleteMutation.mutate(deleteUserId)}
                onCancel={() => setDeleteUserId(null)}
            />

            {/* Reset Password Dialog */}
            <Dialog open={!!resetUser} onOpenChange={(open) => !open && closeResetDialog()}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('reset_pw_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('reset_pw_for')}{' '}
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{resetUser?.name}</span>{' '}
                            ({resetUser?.email})
                        </p>
                        {resetSuccess ? (
                            <div className="space-y-3">
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
                                    {t('reset_pw_success')}
                                </div>
                                <Button onClick={closeResetDialog} className="w-full">{t('close')}</Button>
                            </div>
                        ) : (
                            <>
                                {resetError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                        {resetError}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">{t('new_password_label')}</Label>
                                    <Input id="new-password" type="password" placeholder={t('new_password_placeholder')}
                                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('password_requirements')}</p>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <Button variant="outline" onClick={closeResetDialog}>{t('cancel')}</Button>
                                    <Button
                                        onClick={() => resetUser && resetPasswordMutation.mutate({ userId: resetUser.id, password: newPassword })}
                                        disabled={!newPassword || newPassword.length < 8 || resetPasswordMutation.isPending}>
                                        {resetPasswordMutation.isPending ? t('resetting') : t('reset_password_btn')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
