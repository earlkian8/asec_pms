# ASEC Project Management System

A full-stack project management platform for construction and engineering operations, built by UniSync Labs. The system covers project lifecycle management, inventory, billing, employee management, and client collaboration across web and mobile.

---

## Repository Structure

```
asec_pms/
├── backend/          # Laravel API + Admin Panel (Inertia.js + React)
├── client/           # Client mobile app (Expo React Native)
├── task-management/  # Internal task management mobile app (Expo React Native)
└── landing/          # Public landing page (Vite + React)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Laravel (PHP), Sanctum, Spatie Permissions |
| Admin Panel | Inertia.js, React, Tailwind CSS, shadcn/ui |
| Mobile (Client) | Expo, React Native |
| Mobile (Tasks) | Expo, React Native |
| Landing Page | Vite, React, Tailwind CSS |
| Real-time | Pusher, Laravel Echo |
| Payments | PayMongo |
| Storage | AWS S3 |
| Email | Resend, Brevo |
| Exports | Maatwebsite Excel, DomPDF |

---

## Core Features

### Project Management
- Projects with milestones, tasks, and team assignments
- Bill of Quantities (BOQ) tracking per project
- Progress updates and issue tracking
- Project file management (AWS S3)

### Inventory & Materials
- Inventory item tracking and transactions
- Material allocations per project milestone
- Material receiving reports
- Direct supply management

### Billing & Finance
- Client billing and payment tracking
- PayMongo payment integration
- Labor cost and miscellaneous expense tracking
- PDF and Excel report exports

### HR & Payroll
- Employee records and compensation profiles
- Payroll entry management with approval/rejection workflow
- Role-based access control (Admin, Project Manager, Employee, Client)

### Client Portal
- Dedicated client mobile app with project visibility
- Client notifications and update requests
- Billing history and payment status

### Communication
- Real-time in-app chat (Pusher/Laravel Echo)
- Notification system for all user roles
- Activity logs for audit trails

---

## Getting Started

### Backend (`/backend`)

**Requirements:** PHP 8.2+, Composer, Node.js, MySQL

```bash
cd backend
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run dev
php artisan serve
```

Configure `.env` with your database, AWS S3, Pusher, PayMongo, and mail credentials.

### Landing Page (`/landing`)

```bash
cd landing
npm install
npm run dev
```

### Client Mobile App (`/client`)

```bash
cd client
npm install
npx expo start
```

### Task Management App (`/task-management`)

```bash
cd task-management
npm install
npx expo start
```

---

## Environment Variables (Backend)

Key variables to set in `backend/.env`:

```
DB_CONNECTION=mysql
DB_DATABASE=asec_pms

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=

PAYMONGO_SECRET_KEY=

RESEND_API_KEY=
```

---

## Roles & Permissions

| Role | Access |
|---|---|
| Admin | Full system access |
| Project Manager | Project, team, inventory, billing management |
| Employee | Assigned tasks and progress updates |
| Client | Client portal — project visibility and billing |

---

## Developer

Built and maintained by **UniSync Labs**.
