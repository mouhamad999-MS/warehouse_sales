import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
    product_id: z.string().min(1),
    quantity: z.coerce.number().int().min(1),
    notes: z.string().optional(),
});

type InboundForm = z.infer<typeof schema>;

interface Product { id: number; name: string; sku: string; quantity: number; }

interface ImportResult {
    created: number;
    skipped: string[];
    errors: string[];
}

function downloadCsvTemplate() {
    const content = 'sku,name,quantity,unit_price,min_stock_level\nELEC-010,USB Cable,100,5.99,10\nELEC-011,HDMI Adapter,50,12.50,5\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inbound_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export default function StockInbound() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showImport, setShowImport] = useState(false);

    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ['warehouse-products-all'],
        queryFn: () => api.get('/warehouse/products', { params: { per_page: 500 } }).then((r) => r.data?.data ?? r.data),
    });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InboundForm>({ resolver: zodResolver(schema) });

    const selectedProduct = products.find((p) => String(p.id) === watch('product_id'));

    const mutation = useMutation({
        mutationFn: (data: InboundForm) => api.post('/warehouse/stock/inbound', {
            product_id: Number(data.product_id),
            quantity: data.quantity,
            notes: data.notes,
        }),
        onSuccess: () => { reset(); navigate('/warehouse/stock/history'); },
    });

    // --- Import state ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const importMutation = useMutation({
        mutationFn: (file: File) => {
            const fd = new FormData();
            fd.append('file', file);
            return api.post<ImportResult>('/warehouse/stock/inbound/import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then((r) => r.data);
        },
        onSuccess: (data) => {
            setImportResult(data);
            setImportError(null);
            setImportFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (err: any) => {
            setImportError(err?.response?.data?.message ?? t('import_failed'));
            setImportResult(null);
        },
    });

    return (
        <div className="max-w-xl space-y-6">

            {/* ── Header ── */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('back')}
                </button>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock_inbound_title')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('stock_inbound_sub')}</p>
                    </div>

                    {/* Import Excel button */}
                    <button
                        type="button"
                        onClick={() => { setShowImport((v) => !v); setImportResult(null); setImportError(null); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition flex-shrink-0 ${
                            showImport
                                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('import_excel')}
                    </button>
                </div>
            </div>

            {/* ── Import Panel (toggled) ── */}
            {showImport && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t('import_excel')}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Columns: sku, name, quantity, unit_price, min_stock_level</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={downloadCsvTemplate}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('download_template')}
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* File picker + import button */}
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={(e) => {
                                    setImportFile(e.target.files?.[0] ?? null);
                                    setImportResult(null);
                                    setImportError(null);
                                }}
                                className="flex-1 text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                            />
                            <button
                                type="button"
                                disabled={!importFile || importMutation.isPending}
                                onClick={() => importFile && importMutation.mutate(importFile)}
                                className="flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
                            >
                                {importMutation.isPending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('importing')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        {t('import_inbound_btn')}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Error */}
                        {importError && (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {importError}
                            </div>
                        )}

                        {/* Result */}
                        {importResult && (
                            <div className="space-y-2">
                                {/* Created */}
                                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm">
                                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span><strong>{importResult.created}</strong> product(s) added successfully.</span>
                                </div>

                                {/* Skipped */}
                                {importResult.skipped.length > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-xl text-sm space-y-1">
                                        <p className="font-medium">{importResult.skipped.length} product(s) already exist — not added:</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                                            {importResult.skipped.map((msg, i) => <li key={i}>{msg}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {/* Errors */}
                                {importResult.errors.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm space-y-1">
                                        <p className="font-medium">{importResult.errors.length} row(s) had errors:</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                                            {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Manual Inbound Form Card ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="h-9 w-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                        <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('inbound_details')}</h3>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit((d: InboundForm) => mutation.mutate(d))} className="space-y-5">
                        {mutation.isError && (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                {(mutation.error as any)?.response?.data?.message ?? t('failed_record_inbound')}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('product')}</label>
                            <Select onValueChange={(v) => setValue('product_id', v)}>
                                <SelectTrigger className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <SelectValue placeholder={t('select_product')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.sku})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.product_id && <p className="text-xs text-red-500 mt-1">{t('select_a_product')}</p>}
                        </div>

                        {selectedProduct && (
                            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                    {t('current_stock')}: <strong>{selectedProduct.quantity}</strong> {t('units')}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('quantity_to_add')}</label>
                            <input
                                type="number"
                                min={1}
                                placeholder="e.g. 50"
                                {...register('quantity')}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                            />
                            {errors.quantity && <p className="text-xs text-red-500 mt-1">{t('field_required')}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('notes')} <span className="text-gray-400 font-normal">({t('optional')})</span>
                            </label>
                            <textarea
                                {...register('notes')}
                                rows={3}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition shadow-sm shadow-green-500/20 disabled:opacity-50"
                            >
                                {mutation.isPending ? t('recording') : t('record_inbound')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
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
