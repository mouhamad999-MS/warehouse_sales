import '../css/app.css';
import './lib/i18n';
import { initializeTheme } from './hooks/use-appearance';

// Apply saved theme before React renders to avoid flash
initializeTheme();

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Always-loaded (tiny, needed immediately)
import LoginPage from './pages/auth/Login';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import ResetPasswordPage from './pages/auth/ResetPassword';
import NotFound from './pages/NotFound';

// Layouts (small shell files, load per-role)
const AdminLayout    = lazy(() => import('./layouts/AdminLayout'));
const WarehouseLayout = lazy(() => import('./layouts/WarehouseLayout'));
const SalesLayout    = lazy(() => import('./layouts/SalesLayout'));

// Shared
const ProfilePage = lazy(() => import('./pages/Profile'));

// Admin pages
const AdminDashboard       = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers           = lazy(() => import('./pages/admin/Users'));
const AdminUserCreate      = lazy(() => import('./pages/admin/UserCreate'));
const AdminUserEdit        = lazy(() => import('./pages/admin/UserEdit'));
const AdminSettings        = lazy(() => import('./pages/admin/Settings'));
const AdminMeasurementUnits = lazy(() => import('./pages/admin/MeasurementUnits'));
const AdminWarehouseMap    = lazy(() => import('./pages/admin/WarehouseMap'));
const WarehouseMap         = AdminWarehouseMap; // same component, role-aware internally
const AdminActivityLogs    = lazy(() => import('./pages/admin/ActivityLogs'));

// Warehouse pages
const WarehouseDashboard    = lazy(() => import('./pages/warehouse/Dashboard'));
const WarehouseProducts     = lazy(() => import('./pages/warehouse/Products'));
const WarehouseProductCreate = lazy(() => import('./pages/warehouse/ProductCreate'));
const WarehouseProductDetail = lazy(() => import('./pages/warehouse/ProductDetail'));
const WarehouseProductEdit  = lazy(() => import('./pages/warehouse/ProductEdit'));
const WarehouseCategories   = lazy(() => import('./pages/warehouse/Categories'));
const StockInbound          = lazy(() => import('./pages/warehouse/StockInbound'));
const StockOutbound         = lazy(() => import('./pages/warehouse/StockOutbound'));
const StockHistory          = lazy(() => import('./pages/warehouse/StockHistory'));
const InventoryCount        = lazy(() => import('./pages/warehouse/InventoryCount'));
const PurchaseBill          = lazy(() => import('./pages/warehouse/PurchaseBill'));
const Approvals             = lazy(() => import('./pages/warehouse/Approvals'));
const PurchaseOrders        = lazy(() => import('./pages/warehouse/PurchaseOrders'));
const PurchaseOrderCreate   = lazy(() => import('./pages/warehouse/PurchaseOrderCreate'));
const BulkQrPrint           = lazy(() => import('./pages/warehouse/BulkQrPrint'));
const DemandForecastPage    = lazy(() => import('./pages/warehouse/DemandForecastPage'));

// Sales pages
const SalesDashboard      = lazy(() => import('./pages/sales/Dashboard'));
const SalesProducts       = lazy(() => import('./pages/sales/Products'));
const SalesProductDetail  = lazy(() => import('./pages/sales/ProductDetail'));
const SalesOrders         = lazy(() => import('./pages/sales/Orders'));
const SalesOrderCreate    = lazy(() => import('./pages/sales/OrderCreate'));
const SalesOrderDetail    = lazy(() => import('./pages/sales/OrderDetail'));
const SalesInvoice        = lazy(() => import('./pages/sales/SalesInvoice'));
const SalesCustomers      = lazy(() => import('./pages/sales/Customers'));
const SalesCustomerCreate = lazy(() => import('./pages/sales/CustomerCreate'));
const SalesCustomerEdit   = lazy(() => import('./pages/sales/CustomerEdit'));
const SalesReports        = lazy(() => import('./pages/sales/Reports'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 60_000,       // 1 min — don't refetch on every focus
            gcTime: 5 * 60_000,      // 5 min — keep unused data in cache longer
            refetchOnWindowFocus: false, // prevent spurious refetches when switching tabs
        },
    },
});

// Simple spinner shown while lazy chunks load
function PageLoader() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Toaster position="top-right" richColors />
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                            <Route path="/" element={<Navigate to="/login" replace />} />

                            {/* Admin */}
                            <Route path="/admin" element={
                                <ProtectedRoute roles={['admin']}><ErrorBoundary><AdminLayout /></ErrorBoundary></ProtectedRoute>
                            }>
                                <Route index element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard"         element={<AdminDashboard />} />
                                <Route path="users"             element={<AdminUsers />} />
                                <Route path="users/create"      element={<AdminUserCreate />} />
                                <Route path="users/:id/edit"    element={<AdminUserEdit />} />
                                <Route path="settings"          element={<AdminSettings />} />
                                <Route path="measurement-units" element={<AdminMeasurementUnits />} />
                                <Route path="warehouse-map"     element={<AdminWarehouseMap />} />
                                <Route path="activity-logs"     element={<AdminActivityLogs />} />
                                <Route path="profile"           element={<ProfilePage />} />
                            </Route>

                            {/* Warehouse */}
                            <Route path="/warehouse" element={
                                <ProtectedRoute roles={['warehouse_manager']}><ErrorBoundary><WarehouseLayout /></ErrorBoundary></ProtectedRoute>
                            }>
                                <Route index element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard"              element={<WarehouseDashboard />} />
                                <Route path="products"               element={<WarehouseProducts />} />
                                <Route path="products/create"        element={<WarehouseProductCreate />} />
                                <Route path="products/:id"           element={<WarehouseProductDetail />} />
                                <Route path="products/:id/edit"      element={<WarehouseProductEdit />} />
                                <Route path="categories"             element={<WarehouseCategories />} />
                                <Route path="stock/inbound"          element={<StockInbound />} />
                                <Route path="stock/outbound"         element={<StockOutbound />} />
                                <Route path="stock/history"          element={<StockHistory />} />
                                <Route path="inventory-count"        element={<InventoryCount />} />
                                <Route path="approvals"              element={<Approvals />} />
                                <Route path="purchase-orders"            element={<PurchaseOrders />} />
                                <Route path="purchase-orders/create"     element={<PurchaseOrderCreate />} />
                                <Route path="purchase-orders/:id/bill"   element={<PurchaseBill />} />
                                <Route path="bulk-qr"                element={<BulkQrPrint />} />
                                <Route path="demand-forecast"        element={<DemandForecastPage />} />
                                <Route path="warehouse-map"          element={<WarehouseMap />} />
                                <Route path="profile"                element={<ProfilePage />} />
                            </Route>

                            {/* Sales */}
                            <Route path="/sales" element={
                                <ProtectedRoute roles={['sales_officer']}><ErrorBoundary><SalesLayout /></ErrorBoundary></ProtectedRoute>
                            }>
                                <Route index element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard"          element={<SalesDashboard />} />
                                <Route path="products"           element={<SalesProducts />} />
                                <Route path="products/:id"       element={<SalesProductDetail />} />
                                <Route path="orders"             element={<SalesOrders />} />
                                <Route path="orders/create"      element={<SalesOrderCreate />} />
                                <Route path="orders/:id"             element={<SalesOrderDetail />} />
                                <Route path="orders/:id/invoice"     element={<SalesInvoice />} />
                                <Route path="customers"          element={<SalesCustomers />} />
                                <Route path="customers/create"   element={<SalesCustomerCreate />} />
                                <Route path="customers/:id/edit" element={<SalesCustomerEdit />} />
                                <Route path="reports"            element={<SalesReports />} />
                                <Route path="profile"            element={<ProfilePage />} />
                            </Route>

                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </AuthProvider>
            </LanguageProvider>
        </QueryClientProvider>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
