import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface SalesOrder {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    avatar_url: string | null;
    sales_orders: SalesOrder[];
    sales_orders_count?: number;
    total_spent?: number;
    created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    APPROVED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    REJECTED:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    DELIVERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    DRAFT:     'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CustomerProfile() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: customer, isLoading } = useQuery<Customer>({
        queryKey: ['sales-customer', id],
        queryFn: () => api.get(`/sales/customers/${id}`).then((r) => r.data.data),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (customer) {
            reset({
                name: customer.name,
                email: customer.email,
                phone: customer.phone ?? '',
                address: customer.address ?? '',
            });
            setAvatarUrl(customer.avatar_url ?? null);
        }
    }, [customer, reset]);

    const mutation = useMutation({
        mutationFn: (data: FormData) => api.put(`/sales/customers/${id}`, data),
        onSuccess: () => {
            toast.success(t('customer_updated'));
            queryClient.invalidateQueries({ queryKey: ['sales-customer', id] });
            queryClient.invalidateQueries({ queryKey: ['sales-customers'] });
            setIsEditing(false);
        },
        onError: () => toast.error(t('failed_update_customer')),
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const form = new FormData();
            form.append('avatar', file);
            return api.post(`/sales/customers/${id}/avatar`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (res) => {
            const url = res.data.data?.avatar_url ?? null;
            setAvatarUrl(url);
            queryClient.invalidateQueries({ queryKey: ['sales-customers'] });
            toast.success(t('photo_updated'));
            setAvatarUploading(false);
        },
        onError: () => {
            toast.error(t('photo_upload_failed'));
            setAvatarUploading(false);
        },
    });

    const removeMutation = useMutation({
        mutationFn: () => api.delete(`/sales/customers/${id}/avatar`),
        onSuccess: () => {
            setAvatarUrl(null);
            queryClient.invalidateQueries({ queryKey: ['sales-customers'] });
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

    const initials = (customer?.name ?? '?').charAt(0).toUpperCase();
    const orders: SalesOrder[] = customer?.sales_orders ?? [];
    const orderCount = orders.length;
    const totalSpent = customer?.total_spent ?? 0;

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
                onClick={() => navigate('/sales/customers')}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('back_to_customers')}
            </button>

            {/* Hero card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-700 dark:to-teal-800 p-6 text-white shadow-lg">
                {/* Edit / Save controls */}
                <div className="absolute top-4 right-4">
                    {isEditing ? (
                        <button
                            onClick={() => { setIsEditing(false); reset({ name: customer!.name, email: customer!.email, phone: customer!.phone ?? '', address: customer!.address ?? '' }); }}
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
                                alt={customer?.name}
                                className="h-24 w-24 rounded-full object-cover border-4 border-white/40 shadow-md"
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center shadow-md">
                                <span className="text-3xl font-bold text-white">{initials}</span>
                            </div>
                        )}

                        {/* Upload overlay */}
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

                    {/* Remove photo link */}
                    {avatarUrl && (
                        <button
                            onClick={() => removeMutation.mutate()}
                            className="text-xs text-white/70 hover:text-white underline transition-colors"
                        >
                            {t('remove_photo')}
                        </button>
                    )}

                    <div>
                        <h2 className="text-xl font-bold">{customer?.name}</h2>
                        <p className="text-sm text-white/80">{customer?.email}</p>
                        {customer?.created_at && (
                            <p className="text-xs text-white/60 mt-1">
                                {t('joined')} {formatDate(customer.created_at)}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{orderCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('total_orders')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSpent)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('total_spent')}</p>
                </div>
            </div>

            {/* Contact info / edit form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('contact_info')}</h3>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
                        {mutation.isError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {(mutation.error as any)?.response?.data?.message ?? t('failed_update_customer')}
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
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('phone')}</Label>
                            <Input {...register('phone')} placeholder={t('optional')} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('address')}</Label>
                            <textarea
                                {...register('address')}
                                placeholder={t('optional')}
                                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={mutation.isPending} className="flex-1">
                                {mutation.isPending ? t('saving') : t('save_changes')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                {t('cancel')}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ),
                                label: t('email'),
                                value: customer?.email,
                            },
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                ),
                                label: t('phone'),
                                value: customer?.phone || '-',
                            },
                            {
                                icon: (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                ),
                                label: t('address'),
                                value: customer?.address || '-',
                            },
                        ].map((row) => (
                            <div key={row.label} className="flex items-start gap-3 px-5 py-3.5">
                                <span className="mt-0.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0">{row.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{row.label}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{row.value}</p>
                                </div>
                                <svg className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('order_history')}</h3>
                </div>

                {orders.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                        {t('no_orders_yet')}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {orders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center px-5 py-3.5 gap-3">
                                <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {t('order')} #{order.id}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] ?? STATUS_COLORS['CANCELLED']}`}>
                                        {order.status.toLowerCase()}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {formatCurrency(order.total_amount)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {orders.length > 5 && (
                            <div className="px-5 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                                +{orders.length - 5} {t('more_orders')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
