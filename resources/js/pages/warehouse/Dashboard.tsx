import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import QuickScanPanel from '@/components/warehouse/QuickScanPanel';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface Movement {
    id: number;
    product_name?: string;
    product?: { name: string };
    type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
    quantity: number;
    created_at: string;
}

interface LowStockProduct {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    min_stock_level: number;
}

interface DashboardData {
    total_products: number;
    low_stock_count: number;
    pending_approvals: number | { sales_orders: number; purchase_orders: number };
    warehouse_utilization: number;
    recent_movements: Movement[];
    low_stock_products: LowStockProduct[];
}

const TYPE_COLOR: Record<string, string> = {
    INBOUND:    '#10B981',
    OUTBOUND:   '#EF4444',
    ADJUSTMENT: '#F59E0B',
};

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
        </svg>
    );
}

/* ── Stat card (matches reference: label + big number + trend badge) ── */
function StatCard({ label, value, icon, iconBg, iconColor, trend, trendUp }: {
    label: string; value: number | string;
    icon: string; iconBg: string; iconColor: string;
    trend?: string; trendUp?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
                    {trend && (
                        <span className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            trendUp ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                    d={trendUp ? 'M5 10l7-7 7 7' : 'M19 14l-7 7-7-7'} />
                            </svg>
                            {trend}
                        </span>
                    )}
                </div>
                <div className={`rounded-xl p-2.5 ${iconBg}`}>
                    <Icon path={icon} className={`h-5 w-5 ${iconColor}`} />
                </div>
            </div>
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
                <p key={i} style={{ color: p.color ?? p.stroke }}>{p.name}: <strong>{p.value}</strong></p>
            ))}
        </div>
    );
});

export default function WarehouseDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [scanPanelOpen, setScanPanelOpen] = useState(false);

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['warehouse-dashboard'],
        queryFn: () => api.get('/dashboard').then((r) => r.data),
    });

    // All hooks must be called before any conditional returns
    const movements = data?.recent_movements ?? [];

    const { donutData, totalMoved } = useMemo(() => {
        const typeCounts = movements.reduce((acc, m) => {
            acc[m.type] = (acc[m.type] ?? 0) + m.quantity;
            return acc;
        }, {} as Record<string, number>);
        const donutData = [
            { name: 'Inbound',    value: typeCounts['INBOUND']    ?? 0, color: '#10B981' },
            { name: 'Outbound',   value: typeCounts['OUTBOUND']   ?? 0, color: '#EF4444' },
            { name: 'Adjustment', value: typeCounts['ADJUSTMENT'] ?? 0, color: '#F59E0B' },
        ];
        return { donutData, totalMoved: donutData.reduce((s, d) => s + d.value, 0) };
    }, [movements]);

    const areaData = useMemo(() => {
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayMap: Record<string, { inbound: number; outbound: number }> = {};
        movements.forEach(m => {
            const d = dayLabels[new Date(m.created_at).getDay()];
            if (!dayMap[d]) dayMap[d] = { inbound: 0, outbound: 0 };
            if (m.type === 'INBOUND')  dayMap[d].inbound  += m.quantity;
            if (m.type === 'OUTBOUND') dayMap[d].outbound += m.quantity;
        });
        return dayLabels.map(d => ({
            day: d, inbound: dayMap[d]?.inbound ?? 0, outbound: dayMap[d]?.outbound ?? 0,
        }));
    }, [movements]);

    const utilization = data?.warehouse_utilization ?? 0;
    const utilColor = utilization > 80 ? '#EF4444' : utilization > 50 ? '#F59E0B' : '#10B981';
    const utilData = useMemo(() => [
        { name: 'Used',      value: utilization,                    color: utilColor },
        { name: 'Available', value: Math.max(0, 100 - utilization), color: '#E5E7EB' },
    ], [utilization, utilColor]);

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
                {t('failed_load_warehouse_dashboard')}
            </div>
        );
    }

    const totalProducts = data?.total_products ?? 0;
    const lowStock = data?.low_stock_count ?? 0;

    const pendingCount = (() => {
        const pa = data?.pending_approvals;
        if (!pa) return 0;
        if (typeof pa === 'number') return pa;
        return (pa.sales_orders ?? 0) + (pa.purchase_orders ?? 0);
    })();

    const availableStock = Math.max(0, totalProducts - lowStock);

    /* Low stock progress bars */
    const lowStockProducts = data?.low_stock_products ?? [];

    return (
        <div className="space-y-5">
            <QuickScanPanel isOpen={scanPanelOpen} onClose={() => setScanPanelOpen(false)} />

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('warehouse_dashboard')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('warehouse_dashboard_sub')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        {t('system_online')}
                    </span>
                    <button
                        onClick={() => setScanPanelOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 shadow-sm transition"
                    >
                        <Icon path="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5v3.5M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" className="h-4 w-4 text-white" />
                        {t('quick_scan')}
                    </button>
                </div>
            </div>

            {/* ── Low Stock Alert ── */}
            {lowStock > 0 && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2 flex-shrink-0">
                        <Icon path="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">{t('low_stock_alert')}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{lowStock} {t('products_below_minimum')}</p>
                    </div>
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label={t('total_products')}
                    value={totalProducts}
                    icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    iconBg="bg-indigo-50 dark:bg-indigo-900/20"
                    iconColor="text-indigo-500 dark:text-indigo-400"
                    trend={`${totalProducts} total`}
                    trendUp={true}
                />
                <StatCard
                    label={t('available_stock')}
                    value={availableStock}
                    icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    iconBg="bg-green-50 dark:bg-green-900/20"
                    iconColor="text-green-500 dark:text-green-400"
                    trend={t('on_target')}
                    trendUp={true}
                />
                <StatCard
                    label={t('low_stock_items')}
                    value={lowStock}
                    icon="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    iconBg="bg-amber-50 dark:bg-amber-900/20"
                    iconColor="text-amber-500 dark:text-amber-400"
                    trend={lowStock > 0 ? t('needs_restock') : t('all_good')}
                    trendUp={lowStock === 0}
                />
                <StatCard
                    label={t('pending_approvals')}
                    value={pendingCount}
                    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    iconBg="bg-purple-50 dark:bg-purple-900/20"
                    iconColor="text-purple-500 dark:text-purple-400"
                    trend={pendingCount > 0 ? t('awaiting_action') : t('all_clear')}
                    trendUp={pendingCount === 0}
                />
            </div>

            {/* ── AI Demand Forecasting teaser ── */}
            <button
                onClick={() => navigate('/warehouse/demand-forecast')}
                className="w-full flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-2xl px-5 py-4 shadow-md transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/20 p-2">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-white">{t('smart_demand_forecasting')}</p>
                        <p className="text-xs text-white/70 mt-0.5">{t('wma_analysis')}</p>
                    </div>
                    <span className="text-[10px] font-bold tracking-wide bg-white/20 text-white px-2 py-0.5 rounded-full">WMA</span>
                </div>
                <svg className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* ── Main content + Right sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left: charts + lists ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Movement Donut + Area chart row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                        {/* Movements by Type donut */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('movements_by_type')}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('total_moved_units')}</p>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalMoved}</span>
                            </div>
                            <div className="h-40 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={donutData} dataKey="value" cx="50%" cy="50%"
                                            innerRadius={42} outerRadius={64}
                                            paddingAngle={3} startAngle={90} endAngle={-270}>
                                            {donutData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalMoved}</span>
                                    <span className="text-[10px] text-gray-400">{t('units')}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 mt-2">
                                {donutData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily movement area chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('movement_trend')}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('inbound_vs_outbound')}</p>
                                </div>
                            </div>
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="wGradIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="wGradOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip content={<ChartTip />} />
                                        <Area type="monotone" dataKey="inbound"  name={t('inbound')}  stroke="#10B981" strokeWidth={2} fill="url(#wGradIn)"  dot={false} />
                                        <Area type="monotone" dataKey="outbound" name={t('outbound')} stroke="#EF4444" strokeWidth={2} fill="url(#wGradOut)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-1">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="h-2 w-2 rounded-full bg-green-500" /> {t('inbound')}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="h-2 w-2 rounded-full bg-red-500" /> {t('outbound')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stock Level — progress bars (matches reference exactly) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('low_stock_products')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('products_below_min_level')}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('stock_status')}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        lowStock === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                       : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {lowStock === 0 ? t('sufficient') : t('stock_low')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => navigate('/warehouse/products')}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                    {t('view_all')}
                                </button>
                            </div>
                        </div>

                        {lowStockProducts.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t('all_well_stocked')}</div>
                        ) : (
                            <div className="space-y-4">
                                {lowStockProducts.map((p) => {
                                    const pct = p.min_stock_level > 0
                                        ? Math.min(100, Math.round((p.quantity / p.min_stock_level) * 100))
                                        : 0;
                                    const barColor = pct > 60 ? 'bg-green-400' : pct > 30 ? 'bg-amber-400' : 'bg-red-500';
                                    return (
                                        <div key={p.id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[60%]">{p.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('qty_remaining_format', { qty: p.quantity, min: p.min_stock_level })}</p>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Recent Movements list */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('recent_movements')}</p>
                            <button
                                onClick={() => navigate('/warehouse/stock/history')}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                                {t('view_all')}
                            </button>
                        </div>
                        {movements.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{t('no_recent_movements')}</p>
                        ) : (
                            <div className="space-y-3">
                                {movements.slice(0, 6).map((m) => (
                                    <div key={m.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: TYPE_COLOR[m.type] + '22' }}>
                                                <Icon
                                                    path={m.type === 'INBOUND'
                                                        ? 'M7 16V4m0 0L3 8m4-4l4 4'
                                                        : m.type === 'OUTBOUND'
                                                        ? 'M17 8v12m0 0l4-4m-4 4l-4-4'
                                                        : 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'}
                                                    className="h-4 w-4"
                                                    style={{ color: TYPE_COLOR[m.type] } as any}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                                                    {m.product_name ?? m.product?.name}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(m.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {m.type === 'OUTBOUND' ? '-' : '+'}{m.quantity}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{ backgroundColor: TYPE_COLOR[m.type] + '22', color: TYPE_COLOR[m.type] }}>
                                                {t(m.type.toLowerCase())}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar ── */}
                <div className="space-y-5">

                    {/* Utilization gauge */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{t('warehouse_utilization')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('capacity_usage')}</p>
                        <div className="h-44 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={utilData} dataKey="value" cx="50%" cy="50%"
                                        innerRadius={52} outerRadius={72}
                                        startAngle={90} endAngle={-270} paddingAngle={2}>
                                        {utilData.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-extrabold" style={{ color: utilColor }}>{utilization}%</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">{t('used')}</span>
                            </div>
                        </div>
                        <div className="space-y-2 mt-1">
                            {[
                                { label: t('used'),      value: `${utilization}%`,                    color: utilColor },
                                { label: t('available'), value: `${Math.max(0, 100 - utilization)}%`, color: '#9CA3AF' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity feed */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{t('recent_activity')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('latest_stock_movements')}</p>
                        {movements.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('no_recent_movements')}</p>
                        ) : (
                            <div className="space-y-4">
                                {movements.slice(0, 5).map((m) => (
                                    <div key={m.id} className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                                            style={{ backgroundColor: TYPE_COLOR[m.type] }}>
                                            {(m.product_name ?? m.product?.name ?? '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                                                <span className="font-semibold">{t(m.type.toLowerCase())}</span>
                                                {' · '}
                                                <span className="truncate">{m.product_name ?? m.product?.name}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                                                {m.quantity} {t('units')} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick navigate */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">{t('quick_navigate')}</p>
                        <div className="space-y-2">
                            {[
                                { label: t('products'),       path: '/warehouse/products',      color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                                { label: t('stock_inbound'),  path: '/warehouse/stock/inbound', color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',     icon: 'M7 16V4m0 0L3 8m4-4l4 4' },
                                { label: t('purchase_orders'),path: '/warehouse/purchase-orders',color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                                { label: t('approvals'),      path: '/warehouse/approvals',     color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                            ].map((item) => (
                                <button key={item.path} onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:opacity-80 ${item.color}`}>
                                    <Icon path={item.icon} className="h-4 w-4" />
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
