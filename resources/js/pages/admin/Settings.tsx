import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
    company_name: z.string().min(1),
    currency: z.string().min(1),
    language: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
        </svg>
    );
}

export default function AdminSettings() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { setLanguage } = useLanguage();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: () => api.get('/admin/settings').then((r) => r.data),
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (settings) {
            reset({
                company_name: settings.company_name ?? '',
                currency:     settings.currency     ?? 'SYP',
                language:     settings.language     ?? 'en',
            });
        }
    }, [settings, reset]);

    const mutation = useMutation({
        mutationFn: (data: FormData) => api.put('/admin/settings', data),
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
            setLanguage(data.language);
        },
    });

    if (isLoading) {
        return (
            <div className="max-w-2xl space-y-6">
                <Skeleton className="h-8 w-40" />
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-8">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings_title')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('settings_subtitle')}</p>
            </div>

            {/* General Settings Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-2">
                        <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{t('general_settings')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('general_settings_desc')}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
                    {mutation.isSuccess && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('settings_saved')}
                        </div>
                    )}
                    {mutation.isError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            {t('settings_error')}
                        </div>
                    )}

                    {/* Company Name */}
                    <div className="space-y-2">
                        <Label htmlFor="company_name" className="text-sm font-medium">
                            {t('company_name')}
                        </Label>
                        <Input id="company_name" {...register('company_name')} className="rounded-xl" />
                        {errors.company_name && <p className="text-xs text-red-500">{t('field_required')}</p>}
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('currency')}</Label>
                        <Select value={watch('currency')} onValueChange={(val) => setValue('currency', val)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SYP">SYP – الليرة السورية</SelectItem>
                                <SelectItem value="USD">USD – US Dollar</SelectItem>
                                <SelectItem value="EUR">EUR – Euro</SelectItem>
                                <SelectItem value="GBP">GBP – British Pound</SelectItem>
                                <SelectItem value="SAR">SAR – Saudi Riyal</SelectItem>
                                <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                                <SelectItem value="IDR">IDR – Indonesian Rupiah</SelectItem>
                                <SelectItem value="SGD">SGD – Singapore Dollar</SelectItem>
                                <SelectItem value="MYR">MYR – Malaysian Ringgit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('language')}</Label>
                        <Select value={watch('language')} onValueChange={(val) => setValue('language', val)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ar">العربية (Arabic)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 transition shadow-sm"
                        >
                            {mutation.isPending ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Icon path="M5 13l4 4L19 7" className="h-4 w-4" />
                                    {t('save')} {t('settings_title')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
