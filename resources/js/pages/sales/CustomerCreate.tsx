import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CustomerCreate() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const mutation = useMutation({
        mutationFn: (data: FormData) => api.post('/sales/customers', data),
        onSuccess: () => { toast.success(t('customer_created')); navigate('/sales/customers'); },
    });

    return (
        <div className="max-w-lg">
            <div className="mb-6">
                <button
                    onClick={() => navigate('/sales/customers')}
                    className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200 flex items-center gap-1 mb-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back_to_customers')}
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('add_customer')}</h2>
            </div>

            <Card>
                <CardHeader><CardTitle>{t('customer_info')}</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                        {mutation.isError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                                {(mutation.error as any)?.response?.data?.message ?? t('failed_create_customer')}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{t('full_name')}</Label>
                            <Input {...register('name')} />
                            {errors.name && <p className="text-sm text-red-600">{t('name_required')}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('email')}</Label>
                            <Input type="email" {...register('email')} />
                            {errors.email && <p className="text-sm text-red-600">{t('email_invalid')}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('phone')} <span className="text-gray-400 dark:text-gray-500">({t('optional')})</span></Label>
                            <Input {...register('phone')} />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('address')} <span className="text-gray-400 dark:text-gray-500">({t('optional')})</span></Label>
                            <textarea
                                {...register('address')}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? t('creating') : t('create_customer')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/sales/customers')}>
                                {t('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
