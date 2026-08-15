import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'warehouse_manager' | 'sales_officer';
    is_active: boolean;
    avatar_url?: string | null;
    two_fa_enabled?: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (user: AuthUser) => void;
    logout: () => void;
    setUser: (user: AuthUser) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<AuthUser | null>(() => {
        const stored = localStorage.getItem('auth_user');
        return stored ? JSON.parse(stored) : null;
    });

    const login = useCallback((newUser: AuthUser) => {
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setUserState(newUser);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_user');
        setUserState(null);
    }, []);

    const updateUser = useCallback((newUser: AuthUser) => {
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setUserState(newUser);
    }, []);

    const value = useMemo(() => ({
        user, login, logout, setUser: updateUser,
        isAuthenticated: !!user,
    }), [user, login, logout, updateUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
