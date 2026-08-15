import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-gray-900 text-white px-3 py-2 shadow-xl text-xs min-w-[120px]">
            <p className="text-gray-400 mb-1 font-medium">{label}</p>
            {payload.map((p: any, i: number) =>
                p.value != null && (
                    <p key={i} style={{ color: p.color }}>
                        {p.name}: <strong>{Math.round(p.value)}</strong> units
                    </p>
                )
            )}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function DemandForecast() {
    const [collapsed,        setCollapsed]        = useState(false);
    const [selectedId,       setSelectedId]       = useState<number | null>(null);

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
    const forecasts: ProductForecast[] = forecastResp?.data ?? [];

    const selectedForecast = selectedId
        ? forecasts.find(f => f.product_id === selectedId) ?? null
        : null;

    // Chart data: historical (blue) + bridge point + forecast (orange dashed)
    const chartData = useMemo(() => {
        if (!selectedForecast) return [];
        const hist     = selectedForecast.weekly_history;
        const fcast    = selectedForecast.forecast_next_4_weeks;
        const lastQty  = hist[hist.length - 1]?.qty_sold ?? 0;
        const lastWeek = hist[hist.length - 1]?.week ?? '';

        return [
            ...hist.map(h => ({
                label:      `${h.week}\n${h.date}`,
                week:       h.week,
                historical: h.qty_sold,
                forecast:   undefined as number | undefined,
            })),
            ...fcast.map((f, i) => ({
                label:      `${f.week}\n${f.date}`,
                week:       f.week,
                historical: i === 0 ? lastQty : undefined,
                forecast:   f.predicted_qty,
            })),
        ];
    }, [selectedForecast]);

    // The week label where the forecast begins (for the reference line)
    const bridgeWeek = selectedForecast
        ? selectedForecast.forecast_next_4_weeks[0]
            ? `${selectedForecast.forecast_next_4_weeks[0].week}\n${selectedForecast.forecast_next_4_weeks[0].date}`
            : null
        : null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

            {/* ── Header (click to collapse) ── */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setCollapsed(c => !c)}
            >
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-2 flex-shrink-0">
                        <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            Smart Demand Forecasting
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            12-week weighted moving average · next 30-day prediction
                        </p>
                    </div>
                    <span className="text-[10px] font-bold tracking-wide bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
                        WMA
                    </span>
                </div>
                <svg
                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* ── Body ── */}
            {!collapsed && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-5">

                    {/* Product selector */}
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            Product:
                        </label>
                        <select
                            value={selectedId ?? ''}
                            onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
                            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[200px]"
                        >
                            <option value="">All Products (table view)</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {selectedId && (
                            <button
                                onClick={() => setSelectedId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* ── Chart — shown only when a product is selected ── */}
                    {selectedForecast && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            {/* Chart header */}
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {selectedForecast.product_name}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        WMA: <span className="font-medium text-gray-600 dark:text-gray-300">{selectedForecast.wma_12week}/wk</span>
                                        &nbsp;·&nbsp;
                                        SMA(4): <span className="font-medium text-gray-600 dark:text-gray-300">{selectedForecast.sma_4week}/wk</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="h-0.5 w-5 bg-blue-500 rounded inline-block" />
                                        Historical
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <svg width="20" height="4" viewBox="0 0 20 4">
                                            <line x1="0" y1="2" x2="20" y2="2" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3" />
                                        </svg>
                                        Forecast
                                    </div>
                                </div>
                            </div>

                            {/* Recharts LineChart */}
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 9, fill: '#9CA3AF' }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={1}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<ChartTooltip />} />

                                        {/* Vertical divider between history and forecast */}
                                        {bridgeWeek && (
                                            <ReferenceLine
                                                x={bridgeWeek}
                                                stroke="#D1D5DB"
                                                strokeDasharray="4 3"
                                                label={{ value: 'Forecast →', fontSize: 9, fill: '#9CA3AF', position: 'insideTopRight' }}
                                            />
                                        )}

                                        {/* Historical line — blue, solid */}
                                        <Line
                                            type="monotone"
                                            dataKey="historical"
                                            name="Historical"
                                            stroke="#3B82F6"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                                            activeDot={{ r: 5, fill: '#3B82F6' }}
                                            connectNulls={false}
                                        />

                                        {/* Forecast line — orange, dashed */}
                                        <Line
                                            type="monotone"
                                            dataKey="forecast"
                                            name="Forecast"
                                            stroke="#F97316"
                                            strokeWidth={2.5}
                                            strokeDasharray="7 4"
                                            dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
                                            activeDot={{ r: 5, fill: '#F97316' }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Quick stats below chart */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {[
                                    { label: 'Predicted 30-day', value: `${selectedForecast.total_predicted_30_days} units`, color: 'text-violet-600 dark:text-violet-400' },
                                    { label: 'Current Stock',    value: `${selectedForecast.current_stock} units`,           color: 'text-blue-600 dark:text-blue-400' },
                                    {
                                        label: 'Stock Gap',
                                        value: (() => {
                                            const gap = selectedForecast.current_stock - selectedForecast.total_predicted_30_days;
                                            return `${gap >= 0 ? '+' : ''}${gap} units`;
                                        })(),
                                        color: selectedForecast.current_stock >= selectedForecast.total_predicted_30_days
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400',
                                    },
                                ].map(s => (
                                    <div key={s.label} className="text-center bg-white dark:bg-gray-800 rounded-lg py-2 px-3">
                                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Summary table ── */}
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">30-day Demand</th>
                                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stock</th>
                                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gap</th>
                                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Confidence</th>
                                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {forecasts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                                                No sales data available for forecasting.
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
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                                {f.product_name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                                                            {f.product_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                                                    {f.total_predicted_30_days.toLocaleString()}
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
                                                            Stock is sufficient
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" />
                                                            </svg>
                                                            Restock needed
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

                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                        Click any row to view its demand chart &middot; Based on 12-week weighted moving average of approved sales
                    </p>
                </div>
            )}
        </div>
    );
}
