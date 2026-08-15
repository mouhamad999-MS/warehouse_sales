import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklyPoint   { week: string; date: string; qty_sold: number; }
interface ForecastPoint { week: string; date: string; predicted_qty: number; }

interface ProductForecast {
    product_id:              number;
    product_name:            string;
    current_stock:           number;
    weekly_history:          WeeklyPoint[];
    forecast_next_4_weeks:   ForecastPoint[];
    total_predicted_30_days: number;
    confidence:              'HIGH' | 'MEDIUM' | 'LOW';
    sma_4week:               number;
    wma_12week:              number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONFIDENCE_STYLE: Record<string, string> = {
    HIGH:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    MEDIUM: 'bg-yellow-100  text-yellow-700  dark:bg-yellow-900/30  dark:text-yellow-400',
    LOW:    'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-400',
};

const ChartTooltip = ({ active, payload, label }: any) => {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-gray-900 text-white px-3 py-2 shadow-xl text-xs min-w-[130px]">
            <p className="text-gray-400 mb-1 font-medium">{label}</p>
            {payload.map((p: any, i: number) =>
                p.value != null && (
                    <p key={i} style={{ color: p.color }}>
                        {p.name}: <strong>{Math.round(p.value)}</strong> {t('units')}
                    </p>
                )
            )}
        </div>
    );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DemandForecastPage() {
    const { t } = useTranslation();
    const navigate    = useNavigate();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search,     setSearch]     = useState('');

    // Product list for dropdown
    const { data: productsResp } = useQuery({
        queryKey: ['wh-products-simple'],
        queryFn:  () => api.get('/warehouse/products', { params: { per_page: 100 } }).then(r => r.data),
        staleTime: 5 * 60_000,
    });
    const products: { id: number; name: string }[] = productsResp?.data ?? [];

    // Forecast data
    const { data: forecastResp, isLoading } = useQuery({
        queryKey: ['demand-forecast', selectedId],
        queryFn:  () => api.get('/warehouse/ai/demand-forecast', {
            params: { per_page: 100, ...(selectedId ? { product_id: selectedId } : {}) },
        }).then(r => r.data),
        staleTime: 2 * 60_000,
    });
    const allForecasts: ProductForecast[] = forecastResp?.data ?? [];

    // Filter table by search
    const forecasts = useMemo(() =>
        search.trim()
            ? allForecasts.filter(f => f.product_name.toLowerCase().includes(search.toLowerCase()))
            : allForecasts,
        [allForecasts, search]
    );

    const selectedForecast = selectedId
        ? allForecasts.find(f => f.product_id === selectedId) ?? null
        : null;

    // Chart data
    const chartData = useMemo(() => {
        if (!selectedForecast) return [];
        const hist    = selectedForecast.weekly_history;
        const fcast   = selectedForecast.forecast_next_4_weeks;
        const lastQty = hist[hist.length - 1]?.qty_sold ?? 0;
        return [
            ...hist.map(h => ({
                label: `${h.week} ${h.date}`,
                historical: h.qty_sold,
                forecast: undefined as number | undefined,
            })),
            ...fcast.map((f, i) => ({
                label: `${f.week} ${f.date}`,
                historical: i === 0 ? lastQty : undefined,
                forecast: f.predicted_qty,
            })),
        ];
    }, [selectedForecast]);

    const bridgeLabel = selectedForecast?.forecast_next_4_weeks[0]
        ? `${selectedForecast.forecast_next_4_weeks[0].week} ${selectedForecast.forecast_next_4_weeks[0].date}`
        : null;

    // Summary counts
    const restockCount   = allForecasts.filter(f => f.current_stock < f.total_predicted_30_days).length;
    const sufficientCount = allForecasts.filter(f => f.current_stock >= f.total_predicted_30_days).length;
    const highConfCount  = allForecasts.filter(f => f.confidence === 'HIGH').length;

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/warehouse/dashboard')}
                        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('demand_forecasting')}</h2>
                            <span className="text-[10px] font-bold tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">WMA</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {t('demand_forecast_sub')}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t('products_tracked'),  value: allForecasts.length, color: 'bg-violet-50 dark:bg-violet-900/20', icon_color: 'text-violet-500', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                    { label: t('restock_needed'),     value: restockCount,        color: 'bg-red-50 dark:bg-red-900/20',       icon_color: 'text-red-500',    icon: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
                    { label: t('stock_sufficient'),   value: sufficientCount,     color: 'bg-emerald-50 dark:bg-emerald-900/20', icon_color: 'text-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { label: t('high_confidence'),    value: highConfCount,       color: 'bg-blue-50 dark:bg-blue-900/20',     icon_color: 'text-blue-500',   icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border border-gray-100 dark:border-gray-700 ${s.color} p-5 shadow-sm`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{s.value}</p>
                            </div>
                            <svg className={`h-6 w-6 ${s.icon_color} opacity-60`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={s.icon} />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main layout: chart + table ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Chart panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                                    {selectedForecast ? selectedForecast.product_name : t('select_a_product')}
                                </p>
                                {selectedForecast ? (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        WMA: <span className="font-medium text-gray-600 dark:text-gray-300">{selectedForecast.wma_12week}/wk</span>
                                        &nbsp;·&nbsp;SMA(4): <span className="font-medium text-gray-600 dark:text-gray-300">{selectedForecast.sma_4week}/wk</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('chart_click_hint')}</p>
                                )}
                            </div>
                            {selectedForecast && (
                                <button
                                    onClick={() => setSelectedId(null)}
                                    className="flex-shrink-0 flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-700 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    {t('change_product')}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <span className="h-0.5 w-5 bg-blue-500 rounded inline-block" />
                                {t('legend_historical')}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <svg width="20" height="4" viewBox="0 0 20 4">
                                    <line x1="0" y1="2" x2="20" y2="2" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3" />
                                </svg>
                                {t('legend_forecast')}
                            </div>
                        </div>
                    </div>

                    {selectedForecast ? (
                        <>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={1} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        {bridgeLabel && (
                                            <ReferenceLine
                                                x={bridgeLabel}
                                                stroke="#D1D5DB"
                                                strokeDasharray="4 3"
                                                label={{ value: `${t('legend_forecast')} →`, fontSize: 9, fill: '#9CA3AF', position: 'insideTopRight' }}
                                            />
                                        )}
                                        <Line type="monotone" dataKey="historical" name={t('legend_historical')} stroke="#3B82F6" strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                                        <Line type="monotone" dataKey="forecast" name={t('legend_forecast')} stroke="#F97316" strokeWidth={2.5}
                                            strokeDasharray="7 4" dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Forecast weeks breakdown */}
                            <div className="grid grid-cols-4 gap-2 mt-4">
                                {selectedForecast.forecast_next_4_weeks.map((fw, i) => (
                                    <div key={i} className="text-center bg-orange-50 dark:bg-orange-900/10 rounded-xl py-2.5 px-1">
                                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{fw.predicted_qty}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{fw.week}</p>
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500">{fw.date}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Gap summary */}
                            <div className="grid grid-cols-3 gap-3 mt-3">
                                {(() => {
                                    const gap = selectedForecast.current_stock - selectedForecast.total_predicted_30_days;
                                    return [
                                        { label: t('predicted_30_day'), value: `${selectedForecast.total_predicted_30_days} ${t('units')}`, color: 'text-violet-600 dark:text-violet-400' },
                                        { label: t('current_stock'),    value: `${selectedForecast.current_stock} ${t('units')}`,           color: 'text-blue-600 dark:text-blue-400' },
                                        { label: t('stock_gap'),        value: `${gap >= 0 ? '+' : ''}${gap} ${t('units')}`,                color: gap >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
                                    ];
                                })().map(s => (
                                    <div key={s.label} className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-xl py-2.5 px-3">
                                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                            <svg className="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-sm">{t('select_product_from_table')}</p>
                        </div>
                    )}
                </div>

                {/* Right: product selector + top at-risk */}
                <div className="space-y-4">

                    {/* Search */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('filter_products')}</p>
                        <input
                            type="text"
                            placeholder={t('search_product_placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>

                    {/* Top at-risk */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('top_at_risk')}</p>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {allForecasts
                                    .filter(f => f.current_stock < f.total_predicted_30_days)
                                    .sort((a, b) =>
                                        (a.current_stock - a.total_predicted_30_days) -
                                        (b.current_stock - b.total_predicted_30_days)
                                    )
                                    .slice(0, 5)
                                    .map(f => {
                                        const gap = f.current_stock - f.total_predicted_30_days;
                                        return (
                                            <button
                                                key={f.product_id}
                                                onClick={() => setSelectedId(f.product_id === selectedId ? null : f.product_id)}
                                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                                                    selectedId === f.product_id
                                                        ? 'bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-300 dark:ring-violet-700'
                                                        : 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                                                }`}
                                            >
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[65%]">{f.product_name}</p>
                                                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex-shrink-0">{gap} {t('units')}</span>
                                            </button>
                                        );
                                    })}
                                {allForecasts.filter(f => f.current_stock < f.total_predicted_30_days).length === 0 && (
                                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-4">{t('all_well_stocked')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Full summary table ── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('all_products_forecast')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('click_row_for_chart')}</p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{forecasts.length} {t('products_count')}</span>
                </div>
                {isLoading ? (
                    <div className="p-5 space-y-2">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('product')}</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('forecast_30day_demand')}</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('wma_per_week')}</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('stock')}</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('gap')}</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('confidence')}</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {forecasts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                                            {t('no_forecast_data')}
                                        </td>
                                    </tr>
                                ) : forecasts.map(f => {
                                    const gap        = f.current_stock - f.total_predicted_30_days;
                                    const sufficient = gap >= 0;
                                    const isSelected = selectedId === f.product_id;
                                    return (
                                        <tr
                                            key={f.product_id}
                                            onClick={() => setSelectedId(isSelected ? null : f.product_id)}
                                            className={[
                                                'cursor-pointer transition-colors',
                                                isSelected
                                                    ? 'bg-violet-50 dark:bg-violet-900/20 ring-1 ring-inset ring-violet-300 dark:ring-violet-700'
                                                    : !sufficient
                                                        ? 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40',
                                            ].join(' ')}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                            {f.product_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{f.product_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                                                {f.total_predicted_30_days.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                                                {f.wma_12week}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                                {f.current_stock.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-bold ${sufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {sufficient ? '+' : ''}{gap.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONFIDENCE_STYLE[f.confidence]}`}>
                                                    {f.confidence}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {sufficient ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        {t('sufficient')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" />
                                                        </svg>
                                                        {t('restock')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
