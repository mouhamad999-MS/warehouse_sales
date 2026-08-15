import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScoreBreakdown {
    space_fit: number;
    category_proximity: number;
    access_frequency: number;
    load_balance: number;
}

interface Suggestion {
    location_id: number;
    rack: string;
    shelf: string;
    bin: string;
    score: number;
    available_space: number;
    can_fit: boolean;
    current_load_percentage: number;
    score_breakdown: ScoreBreakdown;
    recommendation_reason: string;
}

interface Props {
    productId: number;
    productName: string;
    currentLocationId?: number;
    onLocationAssigned?: () => void;
}

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 70 ? 'bg-green-100 text-green-800 border-green-200' :
        score >= 40 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-red-100 text-red-800 border-red-200';
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border ${color}`}>
            {score}/100
        </span>
    );
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.round((value / max) * 100);
    return (
        <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function SubScorePill({ label, value, max }: { label: string; value: number; max: number }) {
    const pct = Math.round((value / max) * 100);
    const color =
        pct >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
        pct >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-red-50 text-red-700 border-red-200';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
            {label} <strong>{value}/{max}</strong>
        </span>
    );
}

function buildReason(s: Suggestion, t: (key: string, opts?: Record<string, unknown>) => string): string {
    const { space_fit, category_proximity, access_frequency, load_balance } = s.score_breakdown;
    const parts: string[] = [];

    if (space_fit === 40)      parts.push(t('reason_best_fit'));
    else if (space_fit === 30) parts.push(t('reason_good_fit'));
    else if (space_fit === 20) parts.push(t('reason_acceptable_fit'));
    else if (space_fit === 10) parts.push(t('reason_tight_fit'));
    else                       parts.push(t('reason_no_space'));

    if (category_proximity === 30)      parts.push(t('reason_same_category', { rack: s.rack }));
    else if (category_proximity === 15) parts.push(t('reason_adjacent_category'));
    else                                parts.push(t('reason_no_category'));

    if (access_frequency === 20)      parts.push(t('reason_high_activity'));
    else if (access_frequency === 15) parts.push(t('reason_moderate_activity'));
    else                              parts.push(t('reason_low_activity'));

    const pct = Math.round(s.current_load_percentage);
    if (load_balance === 10)     parts.push(t('reason_balanced_load', { pct }));
    else if (load_balance === 7) parts.push(t('reason_moderate_load', { pct }));
    else if (load_balance === 3) parts.push(t('reason_nearly_full', { pct }));
    else                         parts.push(t('reason_heavily_loaded', { pct }));

    return parts.join(' ');
}

export default function LocationSuggestion({ productId, productName, currentLocationId, onLocationAssigned }: Props) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [enabled, setEnabled] = useState(false);
    const [assignedId, setAssignedId] = useState<number | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = useQuery<{ suggestions: Suggestion[] }>({
        queryKey: ['ai-suggest', productId],
        queryFn: () => api.get('/warehouse/ai/suggest-location', { params: { product_id: productId } }).then(r => r.data),
        enabled,
        staleTime: 0,
    });

    const assignMutation = useMutation({
        mutationFn: (locationId: number) =>
            api.patch(`/warehouse/products/${productId}/location`, { location_id: locationId }),
        onSuccess: (_, locationId) => {
            setAssignedId(locationId);
            setSuccessMsg(t('location_assigned_success'));
            queryClient.invalidateQueries({ queryKey: ['warehouse-product', String(productId)] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
            onLocationAssigned?.();
            setTimeout(() => setSuccessMsg(null), 3000);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.errors?.location_id?.[0]
                ?? err?.response?.data?.message
                ?? t('failed_assign_location');
            toast.error(msg);
        },
    });

    const handleGetSuggestions = () => {
        if (enabled) {
            refetch();
        } else {
            setEnabled(true);
        }
    };

    const suggestions = data?.suggestions ?? [];

    return (
        <Card className="border-indigo-100">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <CardTitle className="text-base">{t('ai_suggestion_title')}</CardTitle>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleGetSuggestions}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {t('ai_analyzing')}
                            </span>
                        ) : (
                            t('ai_get_suggestions')
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Success banner */}
                {successMsg && (
                    <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {successMsg}
                    </div>
                )}

                {/* Error */}
                {isError && (
                    <p className="text-sm text-red-600 text-center py-3">{t('ai_no_suggestions')}</p>
                )}

                {/* Not yet triggered */}
                {!enabled && !isLoading && (
                    <p className="text-sm text-gray-400 text-center py-3 italic">{t('ai_click_to_analyze')}</p>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="space-y-3">
                        {suggestions.map((s, idx) => {
                            const isCurrentLocation = s.location_id === currentLocationId;
                            const isAssigned = s.location_id === assignedId;
                            const barColor =
                                s.score >= 70 ? 'bg-green-500' :
                                s.score >= 40 ? 'bg-yellow-400' : 'bg-red-400';

                            return (
                                <div
                                    key={s.location_id}
                                    className={`rounded-lg border p-3 transition-all ${
                                        isAssigned ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700' :
                                        idx === 0   ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/20' :
                                                      'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                    }`}
                                >
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {idx === 0 && (
                                                <span className="text-xs font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded">
                                                    #{idx + 1} {t('best_suggestion')}
                                                </span>
                                            )}
                                            {idx > 0 && (
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                    #{idx + 1}
                                                </span>
                                            )}
                                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                {s.rack} → {s.shelf} → {s.bin}
                                            </span>
                                        </div>
                                        <ScoreBadge score={s.score} />
                                    </div>

                                    {/* Score bar */}
                                    <div className="mb-2">
                                        <ScoreBar value={s.score} max={100} color={barColor} />
                                    </div>

                                    {/* Sub-score pills */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <SubScorePill label={t('space_fit_label')}    value={s.score_breakdown.space_fit}          max={40} />
                                        <SubScorePill label={t('proximity_label')}    value={s.score_breakdown.category_proximity}  max={30} />
                                        <SubScorePill label={t('frequency_label')}    value={s.score_breakdown.access_frequency}    max={20} />
                                        <SubScorePill label={t('load_balance_label')} value={s.score_breakdown.load_balance}        max={10} />
                                    </div>

                                    {/* Reason */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3 leading-relaxed">
                                        {buildReason(s, t)}
                                    </p>

                                    {/* Footer row */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {t('available_space_label')}: <strong className="text-gray-600">{s.available_space}</strong> &nbsp;|&nbsp;
                                            {t('load_balance_label')}: <strong className="text-gray-600">{s.current_load_percentage}%</strong>
                                        </span>

                                        {isCurrentLocation ? (
                                            <span className="text-xs text-gray-400 italic">{t('current_location')}</span>
                                        ) : isAssigned ? (
                                            <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {t('assigned')}
                                            </span>
                                        ) : !s.can_fit ? (
                                            <span className="text-xs text-red-500 italic">{t('insufficient_space')}</span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs"
                                                disabled={assignMutation.isPending}
                                                onClick={() => assignMutation.mutate(s.location_id)}
                                            >
                                                {assignMutation.isPending && assignMutation.variables === s.location_id
                                                    ? t('assigning')
                                                    : t('select_this_location')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
