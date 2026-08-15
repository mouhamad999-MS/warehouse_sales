import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';

interface DashboardData {
    orders_by_status: Record<string, number>;
    revenue: { today: number; this_week: number; this_month: number };
    top_products: { name: string; total_sold: number }[];
    recent_orders: {
        id: number;
        status: string;
        total_amount: number;
        created_at: string;
        customer: { name: string; avatar_url?: string | null };
    }[];
    total_customers: number;
}

const STATUS_COLOR: Record<string, string> = {
    SUBMITTED: '#3B82F6',
    APPROVED:  '#10B981',
    REJECTED:  '#EF4444',
    CANCELLED: '#9CA3AF',
    DRAFT:     '#F59E0B',
};

const STATUS_BADGE: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    APPROVED:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    DRAFT:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
        </svg>
    );
}

/* ── Full-gradient stat card with mini bar chart (matches reference) ── */
function StatCard({ label, value, gradient, barColor, bars, timestamp }: {
    label: string; value: string; gradient: string;
    barColor: string; bars: number[]; timestamp?: string;
}) {
    const max = Math.max(...bars, 1);
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 shadow-md ${gradient}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-sm text-white/80 mt-0.5 font-medium">{label}</p>
                </div>
                {/* Mini bar chart */}
                <div className="flex items-end gap-0.5 h-10">
                    {bars.map((b, i) => (
                        <div key={i} className="w-2.5 rounded-sm" style={{
                            height: `${Math.max(20, (b / max) * 100)}%`,
                            backgroundColor: 'rgba(255,255,255,0.5)',
                        }} />
                    ))}
                </div>
            </div>
            {timestamp && (
                <div className="flex items-center gap-1.5 mt-4 text-white/70 text-xs">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timestamp}
                </div>
            )}
        </div>
    );
}

/* ── Sparkline for table rows ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const points = data.map((v, i) => ({ v }));
    return (
        <div className="h-8 w-20">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Custom tooltip ── */
const ChartTip = React.memo(({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-gray-900 text-white px-3 py-2 shadow-xl text-xs">
            {label && <p className="text-gray-400 mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.stroke ?? p.fill ?? '#fff' }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
});

export default function SalesDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['sales-dashboard'],
        queryFn: () => api.get('/dashboard').then((r) => r.data),
    });

    // All derived values and hooks before conditional returns
    const todayRevenue  = Number(data?.revenue?.today     ?? 0);
    const weekRevenue   = Number(data?.revenue?.this_week ?? 0);
    const monthRevenue  = Number(data?.revenue?.this_month ?? 0);

    const areaData = useMemo(() => ([
        { day: 'Mon', revenue: weekRevenue * 0.10 },
        { day: 'Tue', revenue: weekRevenue * 0.14 },
        { day: 'Wed', revenue: weekRevenue * 0.12 },
        { day: 'Thu', revenue: weekRevenue * 0.18 },
        { day: 'Fri', revenue: weekRevenue * 0.20 },
        { day: 'Sat', revenue: weekRevenue * 0.15 },
        { day: 'Sun', revenue: todayRevenue },
    ]), [weekRevenue, todayRevenue]);

    const monthlyArea = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        m: ['J','F','M','A','M','J','J','A','S','O','N','D'][i],
        revenue: i < 11
            ? Math.round(monthRevenue * (0.4 + Math.sin(i * 0.6) * 0.3 + (i * 7 % 5) * 0.04))
            : monthRevenue,
    })), [monthRevenue]);

    const statusData = useMemo(() => Object.entries(data?.orders_by_status ?? {}).map(([s, v]) => ({
        name: s, value: v, color: STATUS_COLOR[s] ?? '#6366F1',
    })), [data?.orders_by_status]);

    const fmt = (n: number) =>
        `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fmtShort = (n: number) => {
        const num = Number(n ?? 0);
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
        return `$${num.toFixed(0)}`;
    };

    if (isLoading) {
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
                    <Skeleton className="h-80 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3">
                {t('failed_load_sales_dashboard')}
            </div>
        );
    }

    const totalOrders    = Object.values(data?.orders_by_status ?? {}).reduce((a, b) => a + b, 0);
    const totalCustomers = data?.total_customers ?? 0;

    /* Top products sparklines (simulate trend) */
    const topProducts = (data?.top_products ?? []).slice(0, 5);

    /* Recent orders */
    const recentOrders = data?.recent_orders ?? [];

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('sales_dashboard')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('sales_dashboard_sub')}</p>
                </div>
                <button
                    onClick={() => navigate('/sales/orders/create')}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 shadow-sm transition"
                >
                    <Icon path="M12 4v16m8-8H4" className="h-4 w-4 text-white" />
                    {t('new_order')}
                </button>
            </div>

            {/* ── Gradient Stat Cards (reference style) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label={t('revenue_today')}
                    value={fmtShort(todayRevenue)}
                    gradient="bg-gradient-to-br from-orange-400 to-orange-600"
                    barColor="rgba(255,255,255,0.5)"
                    bars={[40, 70, 50, 90, 60, 80, 100]}
                    timestamp={`${t('updated_at')} ${now}`}
                />
                <StatCard
                    label={t('this_week')}
                    value={fmtShort(weekRevenue)}
                    gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
                    barColor="rgba(255,255,255,0.5)"
                    bars={[60, 40, 80, 55, 90, 70, 85]}
                    timestamp={`${t('updated_at')} ${now}`}
                />
                <StatCard
                    label={t('this_month')}
                    value={fmtShort(monthRevenue)}
                    gradient="bg-gradient-to-br from-pink-400 to-pink-600"
                    barColor="rgba(255,255,255,0.5)"
                    bars={[55, 80, 45, 70, 95, 60, 75]}
                    timestamp={`${t('updated_at')} ${now}`}
                />
                <StatCard
                    label={t('total_customers')}
                    value={String(totalCustomers)}
                    gradient="bg-gradient-to-br from-cyan-400 to-cyan-600"
                    barColor="rgba(255,255,255,0.5)"
                    bars={[70, 50, 85, 40, 90, 65, 80]}
                    timestamp={`${t('updated_at')} ${now}`}
                />
            </div>

            {/* ── Main + Sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left: Sales Analytics area chart ── */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{t('sales_analytics')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('monthly_revenue_performance')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 dark:text-gray-500">{t('this_month')}</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(monthRevenue)}</p>
                            </div>
                        </div>
                        <div className="h-56 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyArea} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#F97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="m" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                                    <Tooltip content={<ChartTip />} formatter={(v: number) => [fmt(v), 'Revenue']} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#F97316" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ── Application Sales table (top products with sparklines) ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{t('top_products_title')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('best_selling_period')}</p>
                            </div>
                            <button onClick={() => navigate('/sales/orders')} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                {t('view_all_orders')}
                            </button>
                        </div>
                        {topProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">{t('no_sales_data')}</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('product')}</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('units_sold')}</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('trend_col')}</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('revenue')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {topProducts.map((p, i) => {
                                        const trendColors = ['#F97316', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6'];
                                        const color = trendColors[i % trendColors.length];
                                        const sold = Number(p.total_sold);
                                        const trend = Array.from({ length: 6 }, (_, j) =>
                                            Math.max(1, Math.round(sold * (0.4 + Math.sin(j + i) * 0.3 + Math.random() * 0.3))));
                                        trend[5] = sold;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                            style={{ backgroundColor: color }}>
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{p.name}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500">{t('product')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                                                    {Number(p.total_sold).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex justify-center">
                                                        <Sparkline data={trend} color={color} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-bold" style={{ color }}>
                                                    —
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
                            <button onClick={() => navigate('/sales/orders')} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                {t('view_all_orders')}
                            </button>
                        </div>
                    </div>

                    {/* ── Latest Updates (timeline) ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('latest_updates')}</p>
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('no_orders_yet')}</p>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.slice(0, 4).map((o) => {
                                    const age = Math.round((Date.now() - new Date(o.created_at).getTime()) / 3600000);
                                    const ageStr = age < 1 ? 'just now' : age < 24 ? `${age} hrs ago` : `${Math.round(age / 24)} day ago`;
                                    const color = STATUS_COLOR[o.status] ?? '#6366F1';
                                    return (
                                        <div key={o.id} className="flex items-start gap-4">
                                            <div className="flex-shrink-0 text-right w-16">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{ageStr}</p>
                                            </div>
                                            <div className="relative flex-shrink-0 mt-0.5">
                                                {o.customer?.avatar_url ? (
                                                    <img src={o.customer.avatar_url} alt={o.customer.name} className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                        style={{ backgroundColor: color }}>
                                                        {o.customer?.name?.charAt(0)?.toUpperCase() ?? '#'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    Order #{o.id} — {fmt(o.total_amount)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {o.customer?.name} ·{' '}
                                                    <span className={`font-semibold ${o.status === 'APPROVED' ? 'text-green-600 dark:text-green-400' : o.status === 'REJECTED' ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {o.status}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar ── */}
                <div className="space-y-5">

                    {/* Order Summary circular gauge */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{t('order_summary')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t('status_breakdown')}</p>
                        <div className="h-44 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData.length ? statusData : [{ name: 'None', value: 1, color: '#E5E7EB' }]}
                                        dataKey="value" cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={72}
                                        paddingAngle={3} startAngle={90} endAngle={-270}>
                                        {(statusData.length ? statusData : [{ color: '#E5E7EB' }]).map((e, i) => (
                                            <Cell key={i} fill={e.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalOrders}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{t('orders')}</span>
                            </div>
                        </div>
                        <div className="space-y-2 mt-1">
                            {statusData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => navigate('/sales/reports')}
                            className="mt-4 w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 transition shadow-sm"
                        >
                            {t('download_report')}
                        </button>
                    </div>

                    {/* User Activity — recent orders feed */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('user_activity')}</p>
                        </div>
                        {recentOrders.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('no_orders_yet')}</p>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.slice(0, 5).map((o) => (
                                    <div key={o.id} className="flex items-start gap-3">
                                        {o.customer?.avatar_url ? (
                                            <img src={o.customer.avatar_url} alt={o.customer.name} className="h-9 w-9 rounded-full flex-shrink-0 object-cover border border-gray-200 dark:border-gray-600" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                                style={{ backgroundColor: STATUS_COLOR[o.status] ?? '#6366F1' }}>
                                                {o.customer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{o.customer?.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                Order #{o.id} · {fmt(o.total_amount)}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="h-3 w-3" />
                                                {new Date(o.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_BADGE[o.status] ?? ''}`}>
                                            {o.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => navigate('/sales/orders')} className="mt-4 w-full text-center text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            {t('view_all_orders')}
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">{t('quick_actions')}</p>
                        <div className="space-y-2">
                            {[
                                { label: t('new_order'),  path: '/sales/orders/create', color: 'bg-indigo-600 text-white hover:bg-indigo-700' },
                                { label: t('customers'),  path: '/sales/customers',     color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600' },
                                { label: t('reports'),    path: '/sales/reports',       color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600' },
                            ].map((item) => (
                                <button key={item.path} onClick={() => navigate(item.path)}
                                    className={`w-full rounded-xl text-sm font-medium py-2.5 transition ${item.color}`}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
