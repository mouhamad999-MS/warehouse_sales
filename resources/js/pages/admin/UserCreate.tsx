import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
    name:     z.string().min(1),
    email:    z.string().email(),
    password: z.string()
        .min(8)
        .regex(/[A-Z]/)
        .regex(/[0-9]/),
    role:     z.enum(['admin', 'warehouse_manager', 'sales_officer'] as const),
});

type FormData = z.infer<typeof schema>;

export default function UserCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const passwordValue = watch('password') ?? '';

    const mutation = useMutation({
        mutationFn: (data: FormData) => api.post('/admin/users', data),
        onSuccess: () => { toast.success(t('user_created')); navigate('/admin/users'); },
    });

    return (
        <div className="max-w-2xl space-y-6">

            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate('/admin/users')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back_to_users')}
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create_new_user')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Fill in the details to create a new system user.</p>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-2">
                        <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{t('user_information')}</p>
                </div>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-5">
                    {mutation.isError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                            {(mutation.error as any)?.response?.data?.message ?? t('failed_create_user')}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">{t('full_name')}</Label>
                        <Input id="name" placeholder="John Doe" {...register('name')} className="rounded-xl" />
                        {errors.name && <p className="text-xs text-red-500">{t('name_required')}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
                        <Input id="email" type="email" placeholder="john@example.com" {...register('email')} className="rounded-xl" />
                        {errors.email && <p className="text-xs text-red-500">{t('email_invalid')}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                        <Input id="password" type="password" placeholder="Min. 8 characters" {...register('password')} className="rounded-xl" />
                        <div className="space-y-1 pt-0.5">
                            {[
                                { label: 'At least 8 characters',        met: passwordValue.length >= 8 },
                                { label: 'One uppercase letter (A–Z)',    met: /[A-Z]/.test(passwordValue) },
                                { label: 'One number (0–9)',              met: /[0-9]/.test(passwordValue) },
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
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('role')}</Label>
                        <Select onValueChange={(val) => setValue('role', val as any)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={t('select_a_role')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">{t('admin')}</SelectItem>
                                <SelectItem value="warehouse_manager">{t('warehouse_manager')}</SelectItem>
                                <SelectItem value="sales_officer">{t('sales_officer')}</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && <p className="text-xs text-red-500">{t('select_a_role')}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
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
                                    {t('creating')}
                                </>
                            ) : t('create_user_btn')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin/users')}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-5 py-2.5 transition"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
