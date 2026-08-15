import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LocationData {
    id: number;
    rack: string;
    shelf: string;
    bin: string;
    capacity: number;
    current_load: number;
    products: { id: number; name: string; sku: string }[];
}

interface Props {
    suggestedLocationIds?: number[];
    selectedLocationId?: number;
    onSelectLocation?: (locationId: number) => void;
}

function loadColor(loadPct: number, isSuggested: boolean, isSelected: boolean): string {
    if (isSelected) return 'bg-indigo-600 border-indigo-700 text-white';
    if (isSuggested) return 'bg-blue-400 border-blue-500 text-white ring-2 ring-blue-300';
    if (loadPct > 80)  return 'bg-red-400 border-red-500 text-white';
    if (loadPct > 50)  return 'bg-yellow-300 border-yellow-400 text-gray-800';
    return 'bg-green-300 border-green-400 text-gray-800';
}

function Tooltip({ loc, loadPct }: { loc: LocationData; loadPct: number }) {
    return (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none">
            <div className="font-semibold mb-1">{loc.rack} / {loc.shelf} / {loc.bin}</div>
            <div className="flex justify-between mb-1">
                <span className="text-gray-300">Load</span>
                <span className={loadPct > 80 ? 'text-red-300' : loadPct > 50 ? 'text-yellow-300' : 'text-green-300'}>
                    {loc.current_load} / {loc.capacity} ({Math.round(loadPct)}%)
                </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 mb-2">
                <div
                    className={`h-1 rounded-full ${loadPct > 80 ? 'bg-red-400' : loadPct > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}
                    style={{ width: `${Math.min(loadPct, 100)}%` }}
                />
            </div>
            {loc.products.length > 0 ? (
                <div>
                    <div className="text-gray-400 mb-1">Products:</div>
                    {loc.products.slice(0, 3).map(p => (
                        <div key={p.id} className="text-gray-200 truncate">· {p.name}</div>
                    ))}
                    {loc.products.length > 3 && (
                        <div className="text-gray-400">+{loc.products.length - 3} more</div>
                    )}
                </div>
            ) : (
                <div className="text-gray-400 italic">Empty</div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
    );
}

export default function WarehouseMapGrid({ suggestedLocationIds = [], selectedLocationId, onSelectLocation }: Props) {
    const { t } = useTranslation();
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const { data, isLoading } = useQuery<{ data: LocationData[] }>({
        queryKey: ['warehouse-locations-map'],
        queryFn: () => api.get('/warehouse/locations').then(r => r.data),
        staleTime: 30_000,
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-base">{t('warehouse_map_title')}</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                        {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const locations = data?.data ?? [];

    // Group by rack, then by shelf
    const byRack = locations.reduce<Record<string, Record<string, LocationData[]>>>((acc, loc) => {
        if (!acc[loc.rack]) acc[loc.rack] = {};
        if (!acc[loc.rack][loc.shelf]) acc[loc.rack][loc.shelf] = [];
        acc[loc.rack][loc.shelf].push(loc);
        return acc;
    }, {});

    const racks = Object.keys(byRack).sort();

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('warehouse_map_title')}</CardTitle>
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 border border-green-400 inline-block" />&lt;50%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 border border-yellow-400 inline-block" />50–80%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 border border-red-500 inline-block" />&gt;80%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 border border-blue-500 inline-block" />{t('suggested')}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 overflow-x-auto">
                    {racks.map(rack => (
                        <div key={rack}>
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                {t('rack')} {rack}
                            </div>
                            <div className="space-y-1">
                                {Object.keys(byRack[rack]).sort().map(shelf => (
                                    <div key={shelf} className="flex items-center gap-1">
                                        <span className="text-xs text-gray-400 dark:text-gray-500 w-8 flex-shrink-0">{shelf}</span>
                                        <div className="flex gap-1 flex-wrap">
                                            {byRack[rack][shelf].map(loc => {
                                                const loadPct = loc.capacity > 0
                                                    ? (loc.current_load / loc.capacity) * 100
                                                    : 0;
                                                const isSuggested = suggestedLocationIds.includes(loc.id);
                                                const isSelected  = loc.id === selectedLocationId;

                                                return (
                                                    <div
                                                        key={loc.id}
                                                        className="relative"
                                                        onMouseEnter={() => setHoveredId(loc.id)}
                                                        onMouseLeave={() => setHoveredId(null)}
                                                    >
                                                        <button
                                                            onClick={() => onSelectLocation?.(loc.id)}
                                                            className={`w-12 h-10 rounded border text-xs font-medium transition-all hover:opacity-80 hover:scale-105 ${loadColor(loadPct, isSuggested, isSelected)}`}
                                                            title={`${rack}/${shelf}/${loc.bin}`}
                                                        >
                                                            {loc.bin}
                                                        </button>
                                                        {hoveredId === loc.id && (
                                                            <Tooltip loc={loc} loadPct={loadPct} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {racks.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">{t('no_locations_found')}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
