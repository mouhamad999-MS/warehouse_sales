import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useAppearance } from '@/hooks/use-appearance';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

interface AppShellProps {
    navItems: NavItem[];
    title: string;
}

const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    warehouse_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    sales_officer: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

function SunIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    );
}

export default function AppShell({ navItems, title }: AppShellProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const basePath = '/' + location.pathname.split('/')[1];
    const { appearance, updateAppearance } = useAppearance();

    const isDark = appearance === 'dark';
    const toggleTheme = () => updateAppearance(isDark ? 'light' : 'dark');

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
        try { return localStorage.getItem('sidebar_open') !== 'false'; } catch { return true; }
    });

    const toggleSidebar = () => {
        setSidebarOpen((prev) => {
            const next = !prev;
            try { localStorage.setItem('sidebar_open', String(next)); } catch {}
            return next;
        });
    };

    const roleLabels: Record<string, string> = {
        admin: t('role_admin'),
        warehouse_manager: t('role_warehouse'),
        sales_officer: t('role_sales'),
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
            {/* Sidebar */}
            <aside className={`bg-zinc-900 flex flex-col flex-shrink-0 shadow-xl overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'}`}>
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-white/10 flex-shrink-0 gap-3">
                    <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                        <span className="text-white font-bold text-xs tracking-wide">SS</span>
                    </div>
                    <span className="font-bold text-white text-sm tracking-wide">Smart Stock</span>
                </div>

                {/* Nav */}
                <nav
                    role="navigation"
                    aria-label={title}
                    className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden space-y-0.5"
                >
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            aria-label={item.label}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-white/10 flex-shrink-0" />

                {/* User + Logout */}
                <div className="p-2 space-y-1.5 flex-shrink-0">
                    {/* Profile button */}
                    <button
                        onClick={() => navigate(`${basePath}/profile`)}
                        className="flex items-center gap-2 w-full rounded-xl hover:bg-white/5 px-2 py-2 transition-all"
                        title={t('profile')}
                    >
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-indigo-500/30 flex-shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-300 font-semibold text-xs">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 text-left overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-white/50 truncate">{user?.email}</p>
                        </div>
                    </button>

                    {/* Logout button */}
                    <button
                        aria-label={t('logout')}
                        title={t('logout')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium"
                        onClick={handleLogout}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('logout')}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header
                    role="banner"
                    className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0"
                >
                        <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            title={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            aria-label={isDark ? t('switch_to_light') : t('switch_to_dark')}
                            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            title={isDark ? t('switch_to_light') : t('switch_to_dark')}
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>

                        <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
                        {user?.role && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColors[user.role] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                {roleLabels[user.role] ?? user.role}
                            </span>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main role="main" id="main-content" className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
