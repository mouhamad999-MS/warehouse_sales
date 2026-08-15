import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const emailParam = searchParams.get('email') ?? '';

    const [success, setSuccess] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { email: emailParam },
    });

    const onSubmit = async (data: FormData) => {
        setServerError(null);
        try {
            await api.post('/reset-password', { ...data, token });
            setSuccess(true);
        } catch {
            setServerError(t('something_went_wrong'));
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
                        <span className="text-white font-bold text-xl">SS</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('warehouse_management_title')}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('reset_password_title')}</CardTitle>
                        <CardDescription>{t('reset_password_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
                                    {t('password_reset_success')}
                                </div>
                                <Link to="/login">
                                    <Button className="w-full">{t('go_to_login')}</Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {serverError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                                        {serverError}
                                    </div>
                                )}

                                {!token && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-md text-sm">
                                        {t('invalid_reset_link')}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('email_label')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-600">{t('email_invalid')}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('new_password_label')}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        {...register('password')}
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-red-600">{t('password_min_length')}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">{t('confirm_password_label')}</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        {...register('password_confirmation')}
                                    />
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-red-600">{t('passwords_no_match')}</p>
                                    )}
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
                                    {isSubmitting ? t('resetting') : t('reset_password_btn')}
                                </Button>

                                <div className="text-center">
                                    <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                                        {t('back_to_login')}
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
