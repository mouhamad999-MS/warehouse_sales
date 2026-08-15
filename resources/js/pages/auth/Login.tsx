import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

const loginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1),
});

type LoginFormData = z.infer<typeof loginSchema>;

const roleRoutes: Record<string, string> = {
    admin: '/admin/dashboard',
    warehouse_manager: '/warehouse/dashboard',
    sales_officer: '/sales/dashboard',
};

function SafeIllustration() {
    return (
        <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
            <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-3xl" />
            <svg viewBox="0 0 220 220" width="260" height="260" className="relative drop-shadow-2xl">
                <rect x="18" y="28" width="168" height="162" rx="22" fill="#5B9EC9" />
                <rect x="22" y="32" width="164" height="158" rx="20" fill="#4A8DB8" />
                <rect x="34" y="44" width="140" height="134" rx="14" fill="#3D7EA6" />
                <rect x="158" y="68" width="12" height="18" rx="4" fill="#2C6080" />
                <rect x="158" y="132" width="12" height="18" rx="4" fill="#2C6080" />
                <circle cx="104" cy="111" r="42" fill="#5EC8D8" />
                <circle cx="104" cy="111" r="36" fill="#48B8C8" />
                <circle cx="104" cy="111" r="30" fill="#3AAABA" stroke="#c0c0c0" strokeWidth="1.5" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                    <line
                        key={i}
                        x1={104 + 26 * Math.cos((deg - 90) * Math.PI / 180)}
                        y1={111 + 26 * Math.sin((deg - 90) * Math.PI / 180)}
                        x2={104 + 30 * Math.cos((deg - 90) * Math.PI / 180)}
                        y2={111 + 30 * Math.sin((deg - 90) * Math.PI / 180)}
                        stroke="#c8c8c8" strokeWidth="1.5" strokeLinecap="round"
                    />
                ))}
                <circle cx="104" cy="111" r="6" fill="#d0d0d0" />
                <line x1="104" y1="111" x2="104" y2="82" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                <line x1="104" y1="111" x2="128" y2="124" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                <line x1="104" y1="111" x2="80" y2="124" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" />
                <circle cx="104" cy="80" r="5" fill="#c0c0c0" />
                <circle cx="130" cy="125" r="5" fill="#c0c0c0" />
                <circle cx="78" cy="125" r="5" fill="#c0c0c0" />
                <ellipse cx="102" cy="200" rx="60" ry="8" fill="#2563EB" opacity="0.15" />
            </svg>
        </div>
    );
}

export default function Login() {
    const { t } = useTranslation();
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpLoading, setTotpLoading] = useState(false);

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const emailValue = watch('email') ?? '';
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    if (isAuthenticated && user) {
        return <Navigate to={roleRoutes[user.role] ?? '/login'} replace />;
    }

    const onSubmit = async (data: LoginFormData) => {
        setServerError(null);
        try {
            const res = await api.post('/login', data);
            if (res.data.requires_2fa) {
                setPendingToken(res.data.pending_token);
                return;
            }
            login(res.data.user);
            navigate(roleRoutes[res.data.user.role] ?? '/login');
        } catch {
            setServerError(t('invalid_credentials'));
        }
    };

    const onSubmit2fa = async () => {
        if (totpCode.length !== 6) return;
        setServerError(null);
        setTotpLoading(true);
        try {
            const res = await api.post('/2fa/verify', { pending_token: pendingToken, code: totpCode });
            login(res.data.user);
            navigate(roleRoutes[res.data.user.role] ?? '/login');
        } catch {
            setServerError(t('invalid_2fa_code'));
            setTotpLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #dbeafe 50%, #e0f2fe 100%)' }}>
            <div className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-2xl" style={{ minHeight: 580 }}>

                {/* ── Left: Form panel ── */}
                <div className="flex-1 bg-white flex flex-col px-12 py-12">

                    {/* Brand mark */}
                    <div className="flex items-center gap-2.5 mb-10">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span className="font-bold text-gray-800 text-base tracking-tight">Smart Stock</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('welcome_back')}</h1>
                        <p className="text-sm text-gray-400 mt-1.5">{t('enter_credentials')}</p>
                    </div>

                    {/* Error */}
                    {serverError && (
                        <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm">
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            {serverError}
                        </div>
                    )}

                    {/* ── 2FA Challenge ── */}
                    {pendingToken && (
                        <div className="flex-1 flex flex-col space-y-5">
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                <svg className="h-8 w-8 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-semibold text-blue-900">{t('two_factor_auth')}</p>
                                    <p className="text-xs text-blue-600 mt-0.5">{t('two_factor_hint')}</p>
                                </div>
                            </div>
                            {serverError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{serverError}</p>
                            )}
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={totpCode}
                                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full text-center text-3xl font-mono tracking-[0.5em] border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={onSubmit2fa}
                                disabled={totpLoading || totpCode.length !== 6}
                                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm transition shadow-lg shadow-blue-200"
                            >
                                {totpLoading ? t('verifying') : t('verify')}
                            </button>
                            <button type="button" onClick={() => { setPendingToken(null); setTotpCode(''); setServerError(null); }} className="text-xs text-gray-400 hover:text-gray-600 text-center transition">
                                ← {t('back_to_login')}
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 flex-1 flex flex-col${pendingToken ? ' hidden' : ''}`}>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{t('email_label')}</label>
                            <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-gray-50 transition-all ${errors.email ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white'}`}>
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    {...register('email', { onBlur: () => setEmailTouched(true) })}
                                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-300"
                                    placeholder="you@example.com"
                                />
                                {emailTouched && emailValid && (
                                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{t('email_invalid')}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('password_label')}</label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition">
                                    {t('forgot_password_link')}
                                </button>
                            </div>
                            <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-gray-50 transition-all ${errors.password ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white'}`}>
                                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    {...register('password')}
                                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-300"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition">
                                    {showPassword ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{t('password_required')}</p>}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-200 mt-2"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {t('signing_in')}
                                </span>
                            ) : t('sign_in')}
                        </button>

                        {/* Footer */}
                    </form>
                </div>

                {/* ── Right: Illustrated panel ── */}
                <div
                    className="hidden md:flex w-80 flex-shrink-0 relative overflow-hidden flex-col items-center justify-center gap-6"
                    style={{ background: 'linear-gradient(160deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)' }}
                >
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-25"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(96,165,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.5) 1px, transparent 1px)',
                            backgroundSize: '36px 36px',
                        }}
                    />
                    <div className="relative z-10 flex flex-col items-center text-center px-8">
                        <SafeIllustration />
                        <h2 className="mt-4 text-xl font-bold text-blue-900 leading-snug">{t('login_tagline')}</h2>
                        <p className="mt-2 text-sm text-blue-700/70 leading-relaxed">
                            {t('login_tagline_sub')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
