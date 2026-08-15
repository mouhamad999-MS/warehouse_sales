import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityLog {
    id: number;
    user: { id: number; name: string } | null;
    action: string;
    model_type: string;
    model_id: number;
    model_label: string | null;
    changes: Record<string, { before: any; after: any }> | null;
    ip_address: string | null;
    created_at: string;
}

const actionBadge: Record<string, string> = {
    created:        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    updated:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    deleted:        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    status_changed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

const actionDot: Record<string, string> = {
    created:        'bg-green-500',
    updated:        'bg-blue-500',
    deleted:        'bg-red-500',
    status_changed: 'bg-violet-500',
};

function modelShortName(type: string) {
    return type.replace(/^App\\Models\\/, '');
}

export default function ActivityLogs() {
    const { t } = useTranslation();
    const [actionFilter, setActionFilter] = useState('');
    const [modelFilter, setModelFilter]   = useState('');

    const { data, isLoading } = useQuery<ActivityLog[]>({
        queryKey: ['activity-logs', actionFilter, modelFilter],
        queryFn: () =>
            api.get('/admin/activity-logs', {
                params: {
                    action:     actionFilter || undefined,
                    model_type: modelFilter  || undefined,
                },
            }).then((r) => r.data.data),
    });

    const logs = data ?? [];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('activity_logs')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('activity_logs_sub')}</p>
                </div>
                {!isLoading && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {logs.length} entries
                    </span>
                )}
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Filters</p>
                <div className="flex flex-wrap gap-3">
                    <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="w-44 rounded-xl">
                            <SelectValue placeholder={t('all_actions')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('all_actions')}</SelectItem>
                            <SelectItem value="created">{t('action_created')}</SelectItem>
                            <SelectItem value="updated">{t('action_updated')}</SelectItem>
                            <SelectItem value="deleted">{t('action_deleted')}</SelectItem>
                            <SelectItem value="status_changed">{t('action_status_changed')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={modelFilter} onValueChange={(v) => setModelFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="w-52 rounded-xl">
                            <SelectValue placeholder={t('all_models')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('all_models')}</SelectItem>
                            <SelectItem value="User">{t('model_user')}</SelectItem>
                            <SelectItem value="Customer">{t('model_customer')}</SelectItem>
                            <SelectItem value="Product">{t('model_product')}</SelectItem>
                            <SelectItem value="SalesOrder">{t('model_sales_order')}</SelectItem>
                            <SelectItem value="StockMovement">{t('model_stock_movement')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Log Entries</p>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-20 text-center text-gray-500 dark:text-gray-400">{t('no_logs')}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('date')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('user_col')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('action_col')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('model_col')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('details_col')}</th>
                                <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                    <td className="px-6 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            {log.user ? (
                                                <>
                                                    <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                            {log.user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{log.user.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-300">S</span>
                                                    </div>
                                                    <span className="font-medium text-gray-400 dark:text-gray-500 italic">{t('system')}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadge[log.action] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${actionDot[log.action] ?? 'bg-gray-400'}`} />
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold">{modelShortName(log.model_type)}</span>
                                        <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">#{log.model_id}</span>
                                        {log.model_label && (
                                            <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">({log.model_label})</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                        {log.changes && Object.keys(log.changes).length > 0 ? (
                                            <details className="cursor-pointer">
                                                <summary className="text-indigo-600 dark:text-indigo-400 hover:underline list-none flex items-center gap-1">
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {Object.keys(log.changes).length} {t('fields_changed')}
                                                </summary>
                                                <div className="mt-2 space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                                    {Object.entries(log.changes).map(([field, val]) => (
                                                        <div key={field} className="flex items-center gap-1 flex-wrap">
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{field}:</span>
                                                            {val && typeof val === 'object' ? (
                                                                <>
                                                                    <span className="text-red-500 line-through">{String(val.before ?? '-')}</span>
                                                                    <span className="text-gray-400">→</span>
                                                                    <span className="text-green-600 dark:text-green-400">{String(val.after ?? '-')}</span>
                                                                </>
                                                            ) : (
                                                                <span>{String(val ?? '-')}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5 text-gray-400 dark:text-gray-500 font-mono text-xs">
                                        {log.ip_address ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
