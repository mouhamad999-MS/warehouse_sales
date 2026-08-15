import { useAuth } from '@/context/AuthContext';
import React from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
    children: React.ReactNode;
    roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (roles && user && !roles.includes(user.role)) {
        // Redirect to their own dashboard
        const dashboardMap: Record<string, string> = {
            admin: '/admin/dashboard',
            warehouse_manager: '/warehouse/dashboard',
            sales_officer: '/sales/dashboard',
        };
        return <Navigate to={dashboardMap[user.role] ?? '/login'} replace />;
    }

    return <>{children}</>;
}
