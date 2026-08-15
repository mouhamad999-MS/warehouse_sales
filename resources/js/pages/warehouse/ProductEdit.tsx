import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category_id: z.string().min(1),
    unit_id: z.string().min(1),
    unit_price: z.coerce.number().min(0),
    min_stock_level: z.coerce.number().min(0),
    description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition";

export default function ProductEdit() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);

    const { data: product, isLoading: productLoading } = useQuery<any>({
        queryKey: ['warehouse-product', id],
        queryFn: () => api.get(`/warehouse/products/${id}`).then((r) => r.data.data),
    });

    const { data: categories = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ['categories'],
        queryFn: () => api.get('/warehouse/categories').then((r) => r.data.data),
    });

    const { data: units = [] } = useQuery<{ id: number; name: string; abbreviation: string }[]>({
        queryKey: ['measurement-units'],
        queryFn: () => api.get('/warehouse/units').then((r) => r.data.data),
    });

    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                sku: product.sku,
                category_id: String(product.category_id),
                unit_id: String(product.unit_id),
                unit_price: product.unit_price,
                min_stock_level: product.min_stock_level,
                description: product.description ?? '',
            });
            if (product.image_url) setImagePreview(product.image_url);
        }
    }, [product, reset]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImageFile(file);
        setRemoveImage(false);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(product?.image_url ?? null);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(true);
    };

    const mutation = useMutation({
        mutationFn: (data: FormData) => {
            const formData = new FormData();
            formData.append('_method', 'PUT');
            formData.append('name', data.name);
            formData.append('sku', data.sku);
            formData.append('category_id', String(Number(data.category_id)));
            formData.append('unit_id', String(Number(data.unit_id)));
            formData.append('unit_price', String(data.unit_price));
            formData.append('min_stock_level', String(data.min_stock_level));
            if (data.description) formData.append('description', data.description);
            if (imageFile) formData.append('image', imageFile);
            if (removeImage) formData.append('remove_image', '1');
            return api.post(`/warehouse/products/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => { toast.success(t('product_updated')); navigate(`/warehouse/products/${id}`); },
    });

    if (productLoading) {
        return (
            <div className="max-w-2xl space-y-4">
                <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl w-48 animate-pulse" />
                <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate(`/warehouse/products/${id}`)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back_to_product')}
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('edit_product')}</h1>
                {product && <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{product.sku}</p>}
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('product_information')}</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
                        {mutation.isError && (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {(mutation.error as any)?.response?.data?.message ?? t('failed_update_product')}
                            </div>
                        )}

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('product_image')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                            </label>
                            <div className="flex items-start gap-4">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                                ) : (
                                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                                        <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs">{t('no_image')}</span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        {imagePreview || product?.image_url ? t('change_image') : t('upload_image')}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('image_max_size')}</p>
                                    {(imagePreview || imageFile) && (
                                        <button type="button" onClick={handleRemoveImage} className="text-xs text-red-500 hover:text-red-700 text-left transition">
                                            {t('remove_image')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('product_name_label')}</label>
                                <input {...register('name')} className={inputClass} />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{t('name_required')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('sku')}</label>
                                <input {...register('sku')} className={inputClass} />
                                {errors.sku && <p className="text-xs text-red-500 mt-1">{t('field_required')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('unit_price')}</label>
                                <input type="number" step="0.01" {...register('unit_price')} className={inputClass} />
                                {errors.unit_price && <p className="text-xs text-red-500 mt-1">{t('field_required')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('category')}</label>
                                <Select defaultValue={product ? String(product.category_id) : undefined} onValueChange={(v) => setValue('category_id', v)}>
                                    <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <SelectValue placeholder={t('select_category')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-xs text-red-500 mt-1">{t('select_category')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('unit')}</label>
                                <Select defaultValue={product ? String(product.unit_id) : undefined} onValueChange={(v) => setValue('unit_id', v)}>
                                    <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <SelectValue placeholder={t('select_unit')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.unit_id && <p className="text-xs text-red-500 mt-1">{t('select_unit')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('min_stock_level')}</label>
                                <input type="number" {...register('min_stock_level')} className={inputClass} />
                                {errors.min_stock_level && <p className="text-xs text-red-500 mt-1">{t('field_required')}</p>}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('description')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                                </label>
                                <textarea
                                    {...register('description')}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition shadow-sm shadow-violet-500/20 disabled:opacity-50"
                            >
                                {mutation.isPending ? t('saving') : t('save_changes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/warehouse/products/${id}`)}
                                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
