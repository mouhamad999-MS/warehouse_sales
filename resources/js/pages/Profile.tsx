import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const profileSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    current_password: z.string().optional(),
    new_password: z.string().optional(),
}).refine((data) => {
    if (data.new_password && !data.current_password) return false;
    return true;
}, { path: ['current_password'] })
.refine((data) => {
    if (data.new_password && data.new_password.length < 8) return false;
    return true;
}, { path: ['new_password'] });

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user, setUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // 2FA state
    const [tfaStep, setTfaStep]       = useState<'idle' | 'setup' | 'disable'>('idle');
    const [tfaSecret, setTfaSecret]   = useState('');
    const [tfaQrUri, setTfaQrUri]     = useState('');
    const [tfaCode, setTfaCode]       = useState('');
    const [tfaPassword, setTfaPassword] = useState('');
    const [tfaError, setTfaError]     = useState('');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
    });

    useEffect(() => {
        if (user) {
            reset({ name: user.name, email: user.email, current_password: '', new_password: '' });
            setAvatarPreview(user.avatar_url ?? null);
        }
    }, [user, reset]);

    // ── Photo upload ──────────────────────────────────────────────────────────
    const photoMutation = useMutation({
        mutationFn: (file: File) => {
            const fd = new FormData();
            fd.append('avatar', file);
            return api.post('/profile/avatar', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then((r) => r.data);
        },
        onSuccess: (data) => {
            const updated = data.data ?? data;
            if (setUser && user) setUser({ ...user, avatar_url: updated.avatar_url });
            setAvatarPreview(updated.avatar_url ?? null);
            toast.success(t('photo_updated'));
        },
        onError: () => toast.error(t('photo_upload_failed')),
    });

    const removePhotoMutation = useMutation({
        mutationFn: () => api.delete('/profile/avatar').then((r) => r.data),
        onSuccess: () => {
            if (setUser && user) setUser({ ...user, avatar_url: null });
            setAvatarPreview(null);
            toast.success(t('photo_removed'));
        },
        onError: () => toast.error(t('photo_remove_failed')),
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
        photoMutation.mutate(file);
        e.target.value = '';
    };

    // ── 2FA mutations ─────────────────────────────────────────────────────────
    const startSetup = async () => {
        setTfaError('');
        try {
            const res = await api.get('/profile/2fa/setup');
            setTfaSecret(res.data.secret);
            setTfaQrUri(res.data.qr_uri);
            setTfaCode('');
            setTfaStep('setup');
        } catch { setTfaError(t('something_went_wrong')); }
    };

    const enableMutation = useMutation({
        mutationFn: () => api.post('/profile/2fa/enable', { code: tfaCode }),
        onSuccess: () => {
            if (user) setUser({ ...user, two_fa_enabled: true });
            setTfaStep('idle'); setTfaCode(''); setTfaSecret(''); setTfaQrUri('');
            toast.success(t('tfa_enabled'));
        },
        onError: (e: any) => setTfaError(e.response?.data?.errors?.code?.[0] ?? t('invalid_2fa_code')),
    });

    const disableMutation = useMutation({
        mutationFn: () => api.post('/profile/2fa/disable', { password: tfaPassword, code: tfaCode }),
        onSuccess: () => {
            if (user) setUser({ ...user, two_fa_enabled: false });
            setTfaStep('idle'); setTfaCode(''); setTfaPassword('');
            toast.success(t('tfa_disabled'));
        },
        onError: (e: any) => {
            const errs = e.response?.data?.errors ?? {};
            setTfaError(errs.code?.[0] ?? errs.password?.[0] ?? t('invalid_2fa_code'));
        },
    });

    // ── Profile info ──────────────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: (data: ProfileForm) => {
            const payload: Record<string, string> = { name: data.name, email: data.email };
            if (data.current_password && data.new_password) {
                payload.current_password = data.current_password;
                payload.new_password = data.new_password;
            }
            return api.put('/profile', payload).then((r) => r.data);
        },
        onSuccess: (data) => {
            if (setUser) setUser(data.data ?? data);
            toast.success(t('profile_updated'));
            reset({ name: data.data?.name ?? data.name, email: data.data?.email ?? data.email, current_password: '', new_password: '' });
        },
    });

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('profile')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('profile_sub')}</p>
            </div>

            {/* ── Avatar Card ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('profile_photo')}</CardTitle>
                    <CardDescription>{t('profile_photo_sub')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt={user?.name}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-sm"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-sm">
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            {(photoMutation.isPending) && (
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={photoMutation.isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {avatarPreview ? t('change_photo') : t('upload_photo')}
                            </button>
                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={() => removePhotoMutation.mutate()}
                                    disabled={removePhotoMutation.isPending}
                                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition disabled:opacity-50 text-left"
                                >
                                    {t('remove_photo')}
                                </button>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500">{t('photo_hint')}</p>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                </CardContent>
            </Card>

            {mutation.isError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                    {t('profile_update_failed')}
                </div>
            )}

            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('personal_info')}</CardTitle>
                        <CardDescription>{t('personal_info_sub')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('name')}</Label>
                            <Input {...register('name')} />
                            {errors.name && <p className="text-sm text-red-600">{t('name_required')}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('email')}</Label>
                            <Input type="email" {...register('email')} />
                            {errors.email && <p className="text-sm text-red-600">{t('email_invalid')}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('change_password')}</CardTitle>
                        <CardDescription>{t('change_password_sub')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('current_password')}</Label>
                            <Input type="password" {...register('current_password')} placeholder={t('current_password')} />
                            {errors.current_password && <p className="text-sm text-red-600">{t('current_password_required')}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('new_password')}</Label>
                            <Input type="password" {...register('new_password')} placeholder={t('new_password_hint')} />
                            {errors.new_password && <p className="text-sm text-red-600">{t('password_min_length')}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? t('saving') : t('save_changes')}
                </Button>
            </form>

            {/* ── 2FA Card ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('two_factor_auth')}
                    </CardTitle>
                    <CardDescription>
                        {user?.two_fa_enabled ? t('tfa_protected') : t('tfa_setup_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Status badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${user?.two_fa_enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user?.two_fa_enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {user?.two_fa_enabled ? t('tfa_status_enabled') : t('tfa_status_disabled')}
                    </div>

                    {tfaError && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">{tfaError}</p>
                    )}

                    {/* Idle state */}
                    {tfaStep === 'idle' && (
                        <button
                            type="button"
                            onClick={() => { setTfaError(''); user?.two_fa_enabled ? setTfaStep('disable') : startSetup(); }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${user?.two_fa_enabled ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                        >
                            {user?.two_fa_enabled ? t('tfa_disable_btn') : t('tfa_enable_btn')}
                        </button>
                    )}

                    {/* Setup flow */}
                    {tfaStep === 'setup' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('tfa_scan_desc')}</p>
                            <div className="flex justify-center p-4 bg-white rounded-2xl border border-gray-200 dark:border-gray-700 w-fit">
                                <QRCode value={tfaQrUri} size={180} />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{t('tfa_manual_key')}</p>
                                <p className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all tracking-wider">{tfaSecret}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('tfa_verification_code')}</Label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={tfaCode}
                                    onChange={e => setTfaCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full text-center text-xl font-mono tracking-[0.4em] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => enableMutation.mutate()} disabled={enableMutation.isPending || tfaCode.length !== 6}>
                                    {enableMutation.isPending ? t('verifying') : t('tfa_confirm_enable')}
                                </Button>
                                <Button variant="outline" type="button" onClick={() => { setTfaStep('idle'); setTfaCode(''); setTfaError(''); }}>
                                    {t('cancel')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Disable flow */}
                    {tfaStep === 'disable' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('tfa_disable_confirm_desc')}</p>
                            <div className="space-y-2">
                                <Label>{t('password')}</Label>
                                <Input type="password" value={tfaPassword} onChange={e => setTfaPassword(e.target.value)} placeholder={t('current_password')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('tfa_auth_code')}</Label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={tfaCode}
                                    onChange={e => setTfaCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="000000"
                                    className="w-full text-center text-xl font-mono tracking-[0.4em] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="destructive" onClick={() => disableMutation.mutate()} disabled={disableMutation.isPending || tfaCode.length !== 6 || !tfaPassword}>
                                    {disableMutation.isPending ? t('tfa_disabling') : t('tfa_disable_btn')}
                                </Button>
                                <Button variant="outline" type="button" onClick={() => { setTfaStep('idle'); setTfaCode(''); setTfaPassword(''); setTfaError(''); }}>
                                    {t('cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
