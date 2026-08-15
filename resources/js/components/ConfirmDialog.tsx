import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open, title = 'Are you sure?', message,
    confirmLabel = 'Delete', cancelLabel = 'Cancel',
    variant = 'danger', loading = false,
    onConfirm, onCancel,
}: ConfirmDialogProps) {
    const confirmStyle = variant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-yellow-500 hover:bg-yellow-600 text-white';

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                            <svg className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <DialogTitle className="text-base">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 ml-13">
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-2 gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmStyle}`}
                    >
                        {loading && (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {confirmLabel}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
