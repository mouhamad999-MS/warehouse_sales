# Warehouse Management System

A full-stack warehouse management system built with **Laravel 12** and **React 19**, featuring role-based access control, inventory tracking, sales order management, and real-time dashboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | React 19, TypeScript, Vite |
| Auth | Laravel Sanctum (token-based) |
| Roles & Permissions | Spatie Laravel Permission |
| Styling | Tailwind CSS 4 (dark mode) |
| Charts | Recharts |
| State Management | TanStack React Query |
| Internationalization | i18next (English + Arabic, RTL) |
| Database | MySQL |
| Email | Resend SMTP |

## Features

### Authentication & Security
- Token-based authentication (Sanctum) with configurable expiry
- Role-based access control: **Admin**, **Warehouse Manager**, **Sales Officer**
- Password recovery via email (forgot password flow)
- Admin-side password reset for users without email access
- Strong password policy (min 8 chars, uppercase, number)
- Authenticated users are redirected away from login page

### Admin Panel
- User management (create, deactivate, reset passwords)
- Activity log viewer (audit trail for all model changes)
- Dashboard with user statistics and warehouse summary charts

### Warehouse Management
- Product CRUD with categories, measurement units, and image upload
- Warehouse map: Locations, Racks, Bins hierarchy
- Stock inbound/outbound with quantity tracking
- Stock movement history with CSV export
- Purchase Order management (create, cancel)
- Low-stock alerts (products below minimum level)
- Dashboard with movement charts and utilization gauge

### Sales
- Customer management
- Sales order creation with multi-product line items
- Order approval/rejection workflow
- Revenue reporting (today, this week, this month)
- Sales reports with CSV export
- Dashboard with order status and top-selling product charts

### Non-Functional
- **Performance**: Database indexes on key columns, cached dashboard stats (60-120s TTL)
- **Auditability**: Activity logs for product, stock movement, and order changes via Observers
- **Accessibility**: ARIA roles and labels on navigation, main content, and interactive elements
- **Internationalization**: Full English and Arabic translations with RTL support
- **Dark Mode**: Class-based Tailwind dark mode across all pages
- **Error Handling**: React ErrorBoundary wrapping all layout routes
- **CSV Export**: UTF-8 BOM for Excel compatibility

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL 8.0+

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd Warehouse

# Install PHP dependencies
composer install

# Install JS dependencies
npm install

# Environment setup
cp .env.example .env
php artisan key:generate
```

### Configure `.env`

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=warehouse
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_TOKEN_EXPIRY=480
```

### Database Setup

```bash
php artisan migrate
php artisan db:seed          # Seeds roles + default admin user
php artisan storage:link     # Required for product images
```

### Build & Run

```bash
# Development
npm run dev                  # Vite dev server
php artisan serve            # Laravel dev server

# Or run both together
composer dev

# Production build
npm run build
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password |

> After first login, create additional Warehouse Manager and Sales Officer users from the Admin panel.

## API Structure

All API routes are prefixed with `/api` and grouped by role:

```
POST   /api/login
POST   /api/logout
POST   /api/forgot-password
POST   /api/reset-password

# Admin routes (role: admin)
GET    /api/admin/dashboard
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/{id}/toggle-active
PATCH  /api/admin/users/{id}/reset-password
GET    /api/admin/activity-logs

# Warehouse routes (role: warehouse_manager)
GET    /api/warehouse/dashboard
CRUD   /api/warehouse/products
CRUD   /api/warehouse/categories
CRUD   /api/warehouse/measurement-units
CRUD   /api/warehouse/locations
CRUD   /api/warehouse/racks
CRUD   /api/warehouse/bins
POST   /api/warehouse/stock-movements
GET    /api/warehouse/stock-history
CRUD   /api/warehouse/purchase-orders

# Sales routes (role: sales_officer)
GET    /api/sales/dashboard
CRUD   /api/sales/customers
CRUD   /api/sales/orders
GET    /api/sales/reports

# Export (authenticated)
GET    /api/export/products
GET    /api/export/stock-history
GET    /api/export/sales-orders
```

## Running Tests

```bash
php artisan test
```

Test coverage includes:
- Stock movement operations (inbound, outbound, insufficient stock)
- Sales order lifecycle (create, cancel, approval/rejection)
- Admin user management (CRUD, role enforcement)
- Activity log recording and retrieval

## Project Structure

```
app/
  Http/
    Controllers/Api/       # API controllers grouped by role
    Middleware/             # Auth & role middleware
    Requests/              # Form request validation
    Resources/             # API resource transformers
  Models/                  # Eloquent models
  Observers/               # Audit logging observers
  Notifications/           # Custom email notifications
resources/
  js/
    components/            # Shared UI components (shadcn/ui)
    layouts/               # AppShell layout with sidebar
    lib/                   # Axios, i18n, auth context
    pages/                 # Page components by role
      admin/               # Admin dashboard, users
      warehouse/           # Products, stock, locations
      sales/               # Orders, customers, reports
      auth/                # Login, forgot/reset password
database/
  migrations/              # All database migrations
  factories/               # Model factories for testing
  seeders/                 # Role + admin user seeder
tests/
  Feature/                 # Feature tests
```

## License

MIT
