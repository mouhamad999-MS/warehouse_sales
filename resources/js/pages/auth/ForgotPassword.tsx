import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

const schema = z.object({
    email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

function SafeIllustration() {
    const notchAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    return (
        <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
            <div className="absolute inset-0 rounded-full bg-blue-300/30 blur-3xl" />
            <svg viewBox="0 0 220 220" width="240" height="240" className="relative drop-shadow-2xl">
                {/* Safe body */}
                <rect x="18" y="28" width="168" height="162" rx="22" fill="#5B9EC9" />
                <rect x="22" y="32" width="164" height="158" rx="20" fill="#4A8DB8" />
                <rect x="34" y="44" width="140" height="134" rx="14" fill="#3D7EA6" />
                {/* Hinges */}
                <rect x="158" y="68" width="12" height="18" rx="4" fill="#2C6080" />
                <rect x="158" y="132" width="12" height="18" rx="4" fill="#2C6080" />
                {/* Dial ring */}
                <circle cx="104" cy="111" r="42" fill="#5EC8D8" />
                <circle cx="104" cy="111" r="36" fill="#48B8C8" />
                <circle cx="104" cy="111" r="30" fill="#3AAABA" stroke="#c0c0c0" strokeWidth="1.5" />
                {/* Dial notches */}
                {notchAngles.map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    const inner = 22;
                    const outer = deg % 90 === 0 ? 27 : 25;
                    const x1 = 104 + inner * Math.sin(rad);
                    const y1 = 111 - inner * Math.cos(rad);
                    const x2 = 104 + outer * Math.sin(rad);
                    const y2 = 111 - outer * Math.cos(rad);
                    return (
                        <line
                            key={deg}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#c0c0c0"
                            strokeWidth={deg % 90 === 0 ? 2 : 1}
                            strokeLinecap="round"
                        />
                    );
                })}
                {/* Center hub */}
                <circle cx="104" cy="111" r="6" fill="#d0d0d0" />
                {/* Spokes */}
                <line x1="104" y1="111" x2="104" y2="82"  stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                <line x1="104" y1="111" x2="128" y2="124" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                <line x1="104" y1="111" x2="80"  y2="124" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                {/* Spoke tips */}
                <circle cx="104" cy="82"  r="4" fill="#c8c8c8" />
                <circle cx="128" cy="124" r="4" fill="#c8c8c8" />
                <circle cx="80"  cy="124" r="4" fill="#c8c8c8" />
                {/* Shadow */}
                <ellipse cx="102" cy="200" rx="60" ry="8" fill="#2563EB" opacity="0.15" />
            </svg>
        </div>
    );
}

export default function ForgotPassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sent, setSent] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [emailTouched, setEmailTouched] = useState(false);

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const emailValue = watch('email', '');
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    const onSubmit = async (data: FormData) => {
        setServerError(null);
        try {
            await api.post('/forgot-password', data);
            setSent(true);
        } catch {
            setServerError(t('something_went_wrong'));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-3xl flex rounded-3xl overflow-hidden shadow-2xl">

                {/* ── Left: Form panel ── */}
                <div className="flex-1 bg-white flex flex-col px-10 py-10 min-h-[540px]">

                    {sent ? (
                        /* ── Success state ── */
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{t('check_your_email')}</h2>
                                <p className="text-sm text-gray-500 mt-2">{t('reset_link_sent')}</p>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                            >
                                {t('back_to_login')}
                            </button>
                        </div>
                    ) : (
                        /* ── Form state ── */
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('forgot_password_title')}</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                {t('forgot_password_desc')}
                            </p>

                            {serverError && (
                                <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                    {serverError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {/* Email input */}
                                <div className="border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition">
                                    <div className="flex items-center gap-3">
                                        {/* Mail icon */}
                                        <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-600 font-semibold leading-none mb-1">{t('email_label')}</p>
                                            <input
                                                type="email"
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                {...register('email', { onBlur: () => setEmailTouched(true) })}
                                                className="w-full text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                                            />
                                        </div>
                                        {/* Checkmark */}
                                        {emailValid && emailTouched && (
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-red-500 -mt-2 ml-1">{t('email_invalid')}</p>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {t('sending')}
                                        </span>
                                    ) : t('send_reset_link')}
                                </button>
                            </form>

                            {/* Back to login */}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {t('back_to_login')}
                            </button>

                            {/* Footer */}
                        </div>
                    )}
                </div>

                {/* ── Right: Light blue gradient panel ── */}
                <div
                    className="hidden md:flex flex-1 flex-col items-center justify-center px-10 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 40%, #93C5FD 100%)' }}
                >
                    {/* Subtle grid overlay */}
                    <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="fp-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#93C5FD" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#fp-grid)" />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <SafeIllustration />
                        <h3 className="mt-6 text-xl font-bold text-blue-900">{t('secure_password_reset')}</h3>
                        <p className="mt-2 text-sm text-blue-700/80 max-w-xs leading-relaxed">
                            {t('secure_reset_desc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
