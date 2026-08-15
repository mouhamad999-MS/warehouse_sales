import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

type ReportType = 'monthly' | 'by_category' | 'by_product';

interface ReportParams {
    type: ReportType;
    date_from: string;
    date_to: string;
}

const today          = new Date().toISOString().slice(0, 10);
const firstOfMonth   = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
        </svg>
    );
}

const ChartTooltip = ({ active, payload, label, isCurrency = true }: any) => {
    if (!active || !payload?.length) return null;
    const fmt = (n: number) => isCurrency
        ? `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : String(n);
    return (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            {label && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: p.color ?? p.fill ?? '#6366F1' }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
};

function StatCard({ title, value, icon, gradient }: { title: string; value: string; icon: string; gradient: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} shadow-sm`}>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -right-1 top-8 h-12 w-12 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
                </div>
                <div className="rounded-xl p-2.5 bg-white/20">
                    <Icon path={icon} className="h-6 w-6 text-white" />
                </div>
            </div>
        </div>
    );
}

/* ─── Monthly Chart ──────────────────────────────────────────────────── */
function MonthlyChart({ rows }: { rows: { month: string; order_count: number; revenue: number }[] }) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Area Chart */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('revenue')} Trend</p>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                            <Tooltip content={<ChartTooltip isCurrency />} />
                            <Area type="monotone" dataKey="revenue" name={t('revenue')} stroke="#6366F1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Orders Bar Chart */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('orders_count')} per Month</p>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip isCurrency={false} />} />
                            <Bar dataKey="order_count" name={t('orders_count')} fill="#10B981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

/* ─── By Category Chart ──────────────────────────────────────────────── */
function CategoryChart({ rows }: { rows: { category: string; units_sold: number; revenue: number }[] }) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('revenue')} by {t('category')}</p>
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={rows} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} startAngle={90} endAngle={-270}>
                                    {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, t('revenue')]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 min-w-[110px]">
                        {rows.map((row, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[90px]">{row.category}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Horizontal bar — units sold */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{t('units_sold')} by {t('category')}</p>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip isCurrency={false} />} />
                            <Bar dataKey="units_sold" name={t('units_sold')} radius={[0, 6, 6, 0]}>
                                {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

/* ─── By Product Chart ───────────────────────────────────────────────── */
function ProductChart({ rows }: { rows: { product: string; sku: string; category: string; units_sold: number; revenue: number }[] }) {
    const { t } = useTranslation();
    const top10 = rows.slice(0, 10).map(r => ({
        ...r,
        name: r.product.length > 16 ? r.product.slice(0, 16) + '…' : r.product,
    }));
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue bar */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Top Products — {t('revenue')}</p>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip isCurrency />} />
                            <Bar dataKey="revenue" name={t('revenue')} fill="#6366F1" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Units sold bar */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Top Products — {t('units_sold')}</p>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip isCurrency={false} />} />
                            <Bar dataKey="units_sold" name={t('units_sold')} fill="#10B981" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function SalesReports() {
    const { t } = useTranslation();

    const [params, setParams]     = useState<ReportParams>({ type: 'monthly', date_from: firstOfMonth, date_to: today });
    const [submitted, setSubmitted] = useState<ReportParams | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['sales-report', submitted],
        queryFn: () => api.get('/sales/reports', { params: submitted! }).then((r) => r.data),
        enabled: !!submitted,
    });

    const fmt = (n: number) =>
        `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleExport = () => {
        fetch('/api/export/sales-orders', { credentials: 'include' })
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a   = document.createElement('a');
                a.href = url; a.download = 'sales_orders.csv'; a.click();
                URL.revokeObjectURL(url);
            });
    };

    const reportTypeLabel: Record<ReportType, string> = {
        monthly:     t('monthly_breakdown'),
        by_category: t('revenue_by_category'),
        by_product:  t('revenue_by_product'),
    };

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('reports_sub')}</p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium px-4 py-2.5 transition"
                >
                    <Icon path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="h-4 w-4" />
                    {t('export_csv')}
                </button>
            </div>

            {/* Filter Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-2">
                        <Icon path="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{t('report_params')}</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('report_type')}</Label>
                            <Select value={params.type} onValueChange={(v) => setParams(p => ({ ...p, type: v as ReportType }))}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">{t('monthly_revenue')}</SelectItem>
                                    <SelectItem value="by_category">{t('by_category')}</SelectItem>
                                    <SelectItem value="by_product">{t('by_product')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('date_from')}</Label>
                            <Input type="date" value={params.date_from} onChange={(e) => setParams(p => ({ ...p, date_from: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('date_to')}</Label>
                            <Input type="date" value={params.date_to} onChange={(e) => setParams(p => ({ ...p, date_to: e.target.value }))} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="mt-5">
                        <button
                            onClick={() => setSubmitted({ ...params })}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {t('generating')}
                                </>
                            ) : (
                                <>
                                    <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" className="h-4 w-4" />
                                    {t('generate_report')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
                    {t('failed_generate_report')}
                </div>
            )}

            {/* Results */}
            {data && (
                <div className="space-y-6">

                    {/* Summary stat cards */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                            {reportTypeLabel[data.type as ReportType]}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title={t('total_revenue')}
                                value={fmt(data.total_revenue ?? 0)}
                                icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
                            />
                            {data.total_orders !== undefined && (
                                <StatCard
                                    title={t('total_orders')}
                                    value={String(data.total_orders)}
                                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                                />
                            )}
                            {data.type === 'by_product' && data.data?.length > 0 && (
                                <StatCard
                                    title="Top Product"
                                    value={data.data[0]?.product ?? '—'}
                                    icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                    gradient="bg-gradient-to-br from-purple-500 to-purple-700"
                                />
                            )}
                        </div>
                    </div>

                    {/* Charts */}
                    {(data.data ?? []).length > 0 && (
                        <>
                            {data.type === 'monthly'     && <MonthlyChart  rows={data.data} />}
                            {data.type === 'by_category' && <CategoryChart rows={data.data} />}
                            {data.type === 'by_product'  && <ProductChart  rows={data.data} />}
                        </>
                    )}

                    {/* Data Table */}
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                Detailed Breakdown
                            </p>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                                {data.type === 'monthly' && (
                                    <tr>
                                        <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('month')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('orders_count')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('revenue')}</th>
                                    </tr>
                                )}
                                {data.type === 'by_category' && (
                                    <tr>
                                        <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('category')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('units_sold')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('revenue')}</th>
                                    </tr>
                                )}
                                {data.type === 'by_product' && (
                                    <tr>
                                        <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('product')}</th>
                                        <th className="text-left px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('category')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('units_sold')}</th>
                                        <th className="text-right px-6 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('revenue')}</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {(data.data ?? []).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                        {data.type === 'monthly' && (
                                            <>
                                                <td className="px-6 py-3.5 font-medium text-gray-900 dark:text-gray-100">{row.month}</td>
                                                <td className="px-6 py-3.5 text-right text-gray-600 dark:text-gray-300">{row.order_count}</td>
                                                <td className="px-6 py-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{fmt(row.revenue)}</td>
                                            </>
                                        )}
                                        {data.type === 'by_category' && (
                                            <>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{row.category}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-gray-600 dark:text-gray-300">{row.units_sold}</td>
                                                <td className="px-6 py-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{fmt(row.revenue)}</td>
                                            </>
                                        )}
                                        {data.type === 'by_product' && (
                                            <>
                                                <td className="px-6 py-3.5">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{row.product}</div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{row.sku}</div>
                                                </td>
                                                <td className="px-6 py-3.5 text-gray-500 dark:text-gray-400">{row.category}</td>
                                                <td className="px-6 py-3.5 text-right text-gray-600 dark:text-gray-300">{row.units_sold}</td>
                                                <td className="px-6 py-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{fmt(row.revenue)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {(data.data ?? []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">{t('no_data')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
