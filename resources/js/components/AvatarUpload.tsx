import React, { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface AvatarUploadProps {
    /** Current avatar URL (or null/undefined if none) */
    avatarUrl?: string | null;
    /** Display name — used for initials fallback and alt text */
    name: string;
    /** POST endpoint to upload, e.g. "/admin/users/3/avatar" */
    uploadEndpoint: string;
    /** DELETE endpoint to remove, e.g. "/admin/users/3/avatar" */
    removeEndpoint: string;
    /** Called after a successful upload or removal with the new avatar_url (null on remove) */
    onSuccess: (avatarUrl: string | null) => void;
    /** Accent color class for the initials ring, e.g. "indigo" | "emerald" | "violet" */
    color?: 'indigo' | 'emerald' | 'violet' | 'blue';
}

const colorMap = {
    indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-900/30',  border: 'border-indigo-200 dark:border-indigo-800',  text: 'text-indigo-600 dark:text-indigo-400'  },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
    violet:  { bg: 'bg-violet-100 dark:bg-violet-900/30',   border: 'border-violet-200 dark:border-violet-800',   text: 'text-violet-600 dark:text-violet-400'   },
    blue:    { bg: 'bg-blue-100 dark:bg-blue-900/30',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-600 dark:text-blue-400'       },
};

export default function AvatarUpload({
    avatarUrl, name, uploadEndpoint, removeEndpoint, onSuccess, color = 'indigo',
}: AvatarUploadProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const c = colorMap[color];

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            const fd = new FormData();
            fd.append('avatar', file);
            return api.post(uploadEndpoint, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then((r) => r.data);
        },
        onSuccess: (data) => {
            const url = data.data?.avatar_url ?? data.avatar_url ?? null;
            onSuccess(url);
            toast.success(t('photo_updated'));
        },
        onError: () => toast.error(t('photo_upload_failed')),
    });

    const removeMutation = useMutation({
        mutationFn: () => api.delete(removeEndpoint).then((r) => r.data),
        onSuccess: () => { onSuccess(null); toast.success(t('photo_removed')); },
        onError: () => toast.error(t('photo_remove_failed')),
    });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadMutation.mutate(file);
        e.target.value = '';
    };

    const isLoading = uploadMutation.isPending || removeMutation.isPending;

    return (
        <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={name}
                        className={`w-20 h-20 rounded-full object-cover border-2 ${c.border} shadow-sm`}
                    />
                ) : (
                    <div className={`w-20 h-20 rounded-full ${c.bg} border-2 ${c.border} flex items-center justify-center shadow-sm`}>
                        <span className={`text-2xl font-bold ${c.text}`}>
                            {name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                {isLoading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {avatarUrl ? t('change_photo') : t('upload_photo')}
                </button>
                {avatarUrl && (
                    <button
                        type="button"
                        onClick={() => removeMutation.mutate()}
                        disabled={isLoading}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition disabled:opacity-50 text-left"
                    >
                        {t('remove_photo')}
                    </button>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('photo_hint')}</p>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFile}
            />
        </div>
    );
}
