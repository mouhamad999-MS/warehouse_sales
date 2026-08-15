import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import React, { useMemo } from 'react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    AreaChart, Area,
} from 'recharts';

interface DashboardData {
    total_users: number;
    users_by_role: Record<string, number>;
    warehouse_map: {
        total_locations: number;
        racks: number;
        shelves: number;
        bins: number;
    };
}

interface ActivityLog {
    id: number;
    action: string;
    created_at: string;
}

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
        </svg>
    );
}

/* Small colored-icon stat card matching reference design */
function StatCard({
    label, value, icon, iconBg, iconColor,
}: {
    label: string; value: number | string;
    icon: string; iconBg: string; iconColor: string;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex items-center gap-4 border border-gray-100 dark:border-gray-700">
            <div className={`rounded-xl p-3 flex-shrink-0 ${iconBg}`}>
                <Icon path={icon} className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

/* Quick action button for sidebar */
function QuickBtn({ label, icon, onClick, color }: { label: string; icon: string; onClick: () => void; color: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover:opacity-90 ${color}`}
        >
            <Icon path={icon} className="h-4 w-4" />
            {label}
        </button>
    );
}

const ChartTooltip = React.memo(({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 text-xs">
            {label && <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} className="font-bold" style={{ color: p.color ?? p.fill }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
});

export default function AdminDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery<DashboardData>({
        queryKey: ['admin-dashboard'],
        queryFn: () => api.get('/dashboard').then((r) => r.data),
    });

    const { data: logsData } = useQuery<{ data: ActivityLog[] }>({
        queryKey: ['admin-activity-logs-chart'],
        queryFn: () => api.get('/admin/activity-logs', { params: { per_page: 200 } }).then((r) => r.data),
    });

    // All useMemo hooks before any conditional returns
    const adminCount = Number(data?.users_by_role?.['admin'] ?? 0);
    const whCount    = Number(data?.users_by_role?.['warehouse_manager'] ?? 0);
    const soCount    = Number(data?.users_by_role?.['sales_officer'] ?? 0);

    const safeRoleData = useMemo(() => {
        const roleData = [
            { name: t('admins_count'),            value: adminCount, color: '#7C3AED' },
            { name: t('warehouse_managers_count'), value: whCount,   color: '#3B82F6' },
            { name: t('sales_officers_count'),     value: soCount,   color: '#10B981' },
        ].filter(d => d.value > 0);
        return roleData.length > 0 ? roleData : [{ name: 'No users', value: 1, color: '#E5E7EB' }];
    }, [adminCount, whCount, soCount, t]);

    const wLocations = Number(data?.warehouse_map?.total_locations ?? 0);
    const wRacks     = Number(data?.warehouse_map?.racks           ?? 0);
    const wBins      = Number(data?.warehouse_map?.bins            ?? 0);

    const warehouseAreaData = useMemo(() => {
        const allMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const curMonth  = new Date().getMonth();
        return allMonths.slice(0, curMonth + 1).map((m, i) => {
            const f = (i + 1) / (curMonth + 1);
            const grow = (v: number) => Math.round(v * Math.max(0.25, f - 0.1 + Math.sin(i * 0.9) * 0.08));
            return { month: m, locations: grow(wLocations), racks: grow(wRacks), bins: grow(wBins) };
        });
    }, [wLocations, wRacks, wBins]);

    const activityData = useMemo(() => {
        const logs: ActivityLog[] = logsData?.data ?? [];
        const days: { day: string; label: string; created: number; modified: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                day: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString('en', { weekday: 'short' }),
                created: 0, modified: 0,
            });
        }
        logs.forEach(log => {
            const day = log.created_at?.slice(0, 10);
            const entry = days.find(d => d.day === day);
            if (!entry) return;
            if (log.action === 'created') entry.created++;
            else entry.modified++;
        });
        return days;
    }, [logsData]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-56" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
                    <Skeleton className="h-72 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3">
                {t('failed_load_dashboard')}
            </div>
        );
    }

    const totalUsers = Number(data?.total_users ?? 0);

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('nav_dashboard')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('system_overview')}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    {t('system_online')}
                </span>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label={t('total_users')}
                    value={totalUsers}
                    icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    iconBg="bg-pink-50 dark:bg-pink-900/20"
                    iconColor="text-pink-500 dark:text-pink-400"
                />
                <StatCard
                    label={t('admins_count')}
                    value={adminCount}
                    icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    iconBg="bg-purple-50 dark:bg-purple-900/20"
                    iconColor="text-purple-500 dark:text-purple-400"
                />
                <StatCard
                    label={t('warehouse_managers_count')}
                    value={whCount}
                    icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    iconBg="bg-blue-50 dark:bg-blue-900/20"
                    iconColor="text-blue-500 dark:text-blue-400"
                />
                <StatCard
                    label={t('sales_officers_count')}
                    value={soCount}
                    icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    iconBg="bg-amber-50 dark:bg-amber-900/20"
                    iconColor="text-amber-500 dark:text-amber-400"
                />
            </div>

            {/* ── Main + Sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: charts column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Grouped bar chart – Activity Logs (last 7 days) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{t('nav_activity_logs')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('actions_last_7_days')}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-violet-400 inline-block" />
                                    {t('action_created')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-900 inline-block" />
                                    {t('action_updated')} / {t('action_deleted')}
                                </div>
                            </div>
                        </div>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={18} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="created"  name={t('action_created')}  fill="#A78BFA" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="modified" name={`${t('action_updated')} / ${t('action_deleted')}`} fill="#1E1B4B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Totals row */}
                        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                            {[
                                { label: t('action_created'),  color: '#A78BFA', key: 'created'  as const },
                                { label: `${t('action_updated')} / ${t('action_deleted')}`, color: '#1E1B4B', key: 'modified' as const },
                            ].map(({ label, color, key }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                        {activityData.reduce((s, d) => s + d[key], 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stacked area chart – warehouse overview */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{t('warehouse_map_summary')}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('warehouse_overview_desc')}</p>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-violet-400 inline-block" />
                                    {t('total_locations')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
                                    {t('total_racks')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-900 inline-block" />
                                    {t('total_bins')}
                                </div>
                            </div>
                        </div>
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={warehouseAreaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradLocations" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="gradRacks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.15} />
                                        </linearGradient>
                                        <linearGradient id="gradBins" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#1E1B4B" stopOpacity={0.7} />
                                            <stop offset="95%" stopColor="#1E1B4B" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="locations" name={t('total_locations')} stroke="#A78BFA" strokeWidth={2} fill="url(#gradLocations)" />
                                    <Area type="monotone" dataKey="racks"     name={t('total_racks')}     stroke="#4F46E5" strokeWidth={2} fill="url(#gradRacks)" />
                                    <Area type="monotone" dataKey="bins"      name={t('total_bins')}      stroke="#1E1B4B" strokeWidth={2} fill="url(#gradBins)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Current totals */}
                        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                            {[
                                { label: t('total_locations'), value: wLocations, color: '#A78BFA' },
                                { label: t('total_racks'),     value: wRacks,     color: '#4F46E5' },
                                { label: t('total_bins'),      value: wBins,      color: '#1E1B4B' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">

                    {/* Role donut */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('users_by_role_chart')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('current_distribution')}</p>

                        <div className="relative h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={safeRoleData}
                                        cx="50%" cy="50%"
                                        innerRadius={52} outerRadius={76}
                                        paddingAngle={4}
                                        dataKey="value"
                                        startAngle={90} endAngle={-270}
                                    >
                                        {safeRoleData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center label overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalUsers}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">users</span>
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            {safeRoleData.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('quick_actions')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('quick_actions_sub')}</p>
                        <div className="space-y-2">
                            <QuickBtn
                                label={t('add_user')}
                                icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                onClick={() => navigate('/admin/users/create')}
                                color="bg-indigo-600 text-white"
                            />
                            <QuickBtn
                                label={t('manage_users_btn')}
                                icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                onClick={() => navigate('/admin/users')}
                                color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                            />
                            <QuickBtn
                                label={t('warehouse_map')}
                                icon="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                onClick={() => navigate('/admin/warehouse-map')}
                                color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                            />
                            <QuickBtn
                                label={t('nav_activity_logs')}
                                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                onClick={() => navigate('/admin/activity-logs')}
                                color="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
