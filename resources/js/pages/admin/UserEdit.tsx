import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
    name:      z.string().min(1),
    email:     z.string().email(),
    password:  z.string().superRefine((val, ctx) => {
        if (!val) return;
        if (val.length < 8)       ctx.addIssue({ code: 'custom', message: '' });
        if (!/[A-Z]/.test(val))   ctx.addIssue({ code: 'custom', message: '' });
        if (!/[0-9]/.test(val))   ctx.addIssue({ code: 'custom', message: '' });
    }).optional(),
    role:      z.enum(['admin', 'warehouse_manager', 'sales_officer']),
    is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
    admin:             'Admin',
    warehouse_manager: 'Warehouse Manager',
    sales_officer:     'Sales Officer',
};

const ROLE_COLORS: Record<string, string> = {
    admin:             'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    warehouse_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    sales_officer:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function UserEdit() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing]       = useState(false);
    const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: user, isLoading } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data.data),
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (user) {
            reset({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active });
            setAvatarUrl(user.avatar_url ?? null);
        }
    }, [user, reset]);

    const mutation = useMutation({
        mutationFn: (data: FormData) => {
            const payload: any = { ...data };
            if (!payload.password) delete payload.password;
            return api.put(`/admin/users/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            toast.success(t('user_updated'));
            setIsEditing(false);
        },
        onError: () => toast.error(t('failed_update_user')),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const form = new FormData();
            form.append('avatar', file);
            return api.post(`/admin/users/${id}/avatar`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (res) => {
            const url = res.data.data?.avatar_url ?? null;
            setAvatarUrl(url);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success(t('photo_updated'));
            setAvatarUploading(false);
        },
        onError: () => {
            toast.error(t('photo_upload_failed'));
            setAvatarUploading(false);
        },
    });

    const removeMutation = useMutation({
        mutationFn: () => api.delete(`/admin/users/${id}/avatar`),
        onSuccess: () => {
            setAvatarUrl(null);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success(t('photo_removed'));
        },
        onError: () => toast.error(t('photo_upload_failed')),
    });

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        uploadMutation.mutate(file);
        e.target.value = '';
    }

    const initials    = (user?.name ?? '?').charAt(0).toUpperCase();
    const role        = user?.role ?? 'admin';
    const isActive    = user?.is_active ?? false;

    if (isLoading) {
        return (
            <div className="max-w-xl mx-auto space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-56 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-5">
            {/* Back */}
            <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('back_to_users')}
            </button>

            {/* Hero card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-700 dark:to-violet-800 p-6 text-white shadow-lg">
                {/* Edit / Cancel button */}
                <div className="absolute top-4 right-4">
                    {isEditing ? (
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                reset({ name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active });
                            }}
                            className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur rounded-full px-3 py-1.5 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 backdrop-blur rounded-full px-3 py-1.5 transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.172-8.172z" />
                            </svg>
                            {t('edit_profile')}
                        </button>
                    )}
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="relative group">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={user?.name}
                                className="h-24 w-24 rounded-full object-cover border-4 border-white/40 shadow-md"
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center shadow-md">
                                <span className="text-3xl font-bold text-white">{initials}</span>
                            </div>
                        )}

                        {avatarUploading ? (
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                <svg className="h-5 w-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                title={t('change_photo')}
                            >
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>

                    {avatarUrl && (
                        <button
                            onClick={() => removeMutation.mutate()}
                            className="text-xs text-white/70 hover:text-white underline transition-colors"
                        >
                            {t('remove_photo')}
                        </button>
                    )}

                    <div>
                        <h2 className="text-xl font-bold">{user?.name}</h2>
                        <p className="text-sm text-white/80">{user?.email}</p>
                        {user?.created_at && (
                            <p className="text-xs text-white/60 mt-1">{t('joined')} {formatDate(user.created_at)}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Role + Status badges */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${ROLE_COLORS[role] ?? ROLE_COLORS.admin}`}>
                        {ROLE_LABELS[role] ?? role}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('role')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isActive ? t('active') : t('inactive')}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('account_status')}</p>
                </div>
            </div>

            {/* Account info / edit form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('account_info')}</h3>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
                        {mutation.isError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {(mutation.error as any)?.response?.data?.message ?? t('failed_update_user')}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('full_name')}</Label>
                            <Input {...register('name')} />
                            {errors.name && <p className="text-xs text-red-500">{t('name_required')}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('email')}</Label>
                            <Input type="email" {...register('email')} />
                            {errors.email && <p className="text-xs text-red-500">{t('email_invalid')}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {t('new_password')} <span className="normal-case font-normal text-gray-400">({t('optional')})</span>
                            </Label>
                            <Input type="password" placeholder="••••••••" {...register('password')} />
                            {errors.password && <p className="text-xs text-red-500">{t('password_requirements')}</p>}
                            {(() => {
                                const pw = watch('password') ?? '';
                                if (!pw) return null;
                                return (
                                    <div className="space-y-1 pt-0.5">
                                        {[
                                            { label: 'At least 8 characters',     met: pw.length >= 8 },
                                            { label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(pw) },
                                            { label: 'One number (0–9)',           met: /[0-9]/.test(pw) },
                                        ].map(req => (
                                            <div key={req.label} className={`flex items-center gap-1.5 text-xs transition-colors ${req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {req.met
                                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                                                    }
                                                </svg>
                                                {req.label}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('role')}</Label>
                            <Select value={watch('role')} onValueChange={(val) => setValue('role', val as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_a_role')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">{t('admin')}</SelectItem>
                                    <SelectItem value="warehouse_manager">{t('warehouse_manager')}</SelectItem>
                                    <SelectItem value="sales_officer">{t('sales_officer')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2.5 py-1">
                            <input
                                type="checkbox"
                                id="is_active"
                                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                                checked={watch('is_active') ?? false}
                                onChange={(e) => setValue('is_active', e.target.checked)}
                            />
                            <Label htmlFor="is_active" className="text-sm cursor-pointer">{t('active_account')}</Label>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('saving')}
                                    </>
                                ) : t('save_changes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-4 py-2.5 transition"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                ),
                                label: t('full_name'),
                                value: user?.name,
                            },
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ),
                                label: t('email'),
                                value: user?.email,
                            },
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ),
                                label: t('role'),
                                value: ROLE_LABELS[user?.role] ?? user?.role,
                            },
                        ].map((row) => (
                            <div key={row.label} className="flex items-start gap-3 px-5 py-3.5">
                                <span className="mt-0.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0">{row.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{row.label}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{row.value}</p>
                                </div>
                                <svg className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
