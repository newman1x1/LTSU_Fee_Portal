<div align="center">

# LTSU Fee Management System

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**A complete, role-based fee submission and management portal**

Built for **Lamrin Tech Skills University Punjab**

---

</div>

## Overview

The LTSU Fee Management System is a full-stack web application that streamlines the entire fee collection workflow -- from student submission to admin verification. It features role-based dashboards, automated email notifications, PDF receipt generation, and a comprehensive admin panel for managing university data.

## Key Features

| Feature | Description |
|---------|-------------|
| **Fee Submission** | Students submit fee details with UTR numbers; form validates against known records |
| **Receipt Generation** | Auto-generated PDF receipts via jsPDF with university branding |
| **Fee Tracking** | Students can track submission status in real time using their enrollment number |
| **Role-Based Dashboards** | Separate views for Class Representatives (CRs) and Teachers |
| **Approval Workflow** | CRs and Teachers can approve or reject submissions with remarks |
| **Email Notifications** | Automated approval/rejection emails via EmailJS with branded HTML templates |
| **Admin Panel** | Full CRUD management for branches, semesters, sections, specialisations, batches, and staff |
| **Bulk Operations** | CSV upload for student records; batch data management |
| **Activity Logging** | Every action is tracked with timestamps and user attribution |
| **Data Export** | Export fee records to Excel (XLSX) and CSV formats |

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, React Router 7 | SPA with code-split lazy loading |
| **Styling** | Tailwind CSS 4 | Utility-first responsive design |
| **Backend** | Supabase | PostgreSQL database, Auth, Row Level Security |
| **Build** | Vite 7 | Lightning-fast HMR and optimised production builds |
| **Email** | EmailJS | Client-side transactional email delivery |
| **PDF** | jsPDF + jsPDF-AutoTable | In-browser receipt generation |
| **Export** | SheetJS (xlsx), PapaParse | Excel and CSV export |
| **Icons** | Lucide React | Consistent icon library |
| **Hosting** | Vercel | Edge deployment with automatic CI/CD |

## Architecture

```
Student ──> Fee Form ──> Supabase DB
                              |
              CR / Teacher Dashboard
                  |               |
              Approve          Reject
                  |               |
            EmailJS Notification
                  |
          PDF Receipt (if approved)
```

### Database Schema

The system uses **10 interconnected Supabase tables** with triggers, indexes, and Row Level Security:

`profiles` - `branches` - `semesters` - `sections` - `specialisations` - `batches` - `students` - `fee_submissions` - `fee_tracking` - `activity_log`

## Project Structure

```
ltsu-fee-portal/
  public/                  # Static assets
  email-templates/         # HTML email templates (approval / rejection)
  src/
    assets/                # Images and static resources
    components/
      admin/               # Admin panel components (10 managers)
      dashboard/           # Dashboard views and data tables
      forms/               # Fee submission and tracking forms
      layout/              # Protected routes, navigation
      ui/                  # Reusable UI primitives (Spinner, Toast, etc.)
    context/               # React context providers (Auth, Toast, Data)
    hooks/                 # Custom hooks
    lib/                   # Supabase client configuration
    pages/                 # Route-level page components
    utils/                 # Helper functions and utilities
    App.jsx                # Root component with routing
    main.jsx               # Application entry point
    index.css              # Tailwind directives and global styles
  index.html               # HTML shell
  vite.config.js           # Vite configuration
  vercel.json              # Vercel deployment settings
  package.json
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** (recommended) or npm
- A **Supabase** project with the required tables
- An **EmailJS** account with configured templates

### Installation

```bash
# Clone the repository
git clone https://github.com/newman1x1/LTSU_Fee_Portal.git
cd LTSU_Fee_Portal

# Install dependencies
pnpm install

# Configure environment variables
cp .env.local.example .env.local
```

### Environment Variables

Create a `.env.local` file at the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_APPROVE=your_approval_template_id
VITE_EMAILJS_TEMPLATE_REJECT=your_rejection_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

### Development

```bash
# Start the dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## User Roles

| Role | Access Level |
|------|-------------|
| **Student** | Submit fee forms, track submissions, download receipts |
| **Class Representative** | View section submissions, approve/reject, dashboard analytics |
| **Teacher** | View all submissions across sections, approve/reject with remarks |
| **Admin** | Full system management -- users, branches, batches, specialisations, activity logs |

## Documentation

Full technical documentation covering architecture, database schema, security, deployment, and every component is available as a dedicated documentation site:

[![Documentation](https://img.shields.io/badge/Documentation_Site-C9A84C?style=for-the-badge&logo=readthedocs&logoColor=black)](https://newman1x1.github.io/LTSU_Fee_Portal_Docs/)

The documentation includes 12 detailed pages with interactive navigation, dark mode support, and downloadable Markdown exports.

## Security

- **Row Level Security (RLS)** on all Supabase tables
- **Role-based route protection** with React context guards
- **Input sanitisation** and form validation on all user inputs
- **Secure session handling** via Supabase Auth with JWT tokens
- **Environment variable isolation** for all secrets

## Deployment

The application is configured for one-click deployment on **Vercel**:

1. Connect the GitHub repository to Vercel
2. Set all environment variables in the Vercel dashboard
3. Deploy -- Vercel handles builds automatically on push

The `vercel.json` includes SPA rewrites for client-side routing.

---

<div align="center">

**Lamrin Tech Skills University Punjab**

Built with React, Supabase, and Tailwind CSS.

</div>
