# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CONSTITUTIONAL REQUIREMENTS (NON-NEGOTIABLE)

This project follows the FTC TeamForge Constitution (see `.specify/memory/constitution.md`). These principles MUST be followed:

### Component-Based Architecture

- ALL UI features must be built as reusable React components using shadcn/ui patterns
- Components must be self-contained, independently testable, and documented with TypeScript interfaces
- No direct DOM manipulation outside of component boundaries

### Test-First Development (TDD Mandatory)

- Tests MUST be written FIRST → User approved → Tests fail → Then implement
- Red-Green-Refactor cycle strictly enforced
- Focus on user behavior testing over implementation details
- Every user interaction must have test coverage BEFORE implementation

### Database Migration Management

- ALL database schema changes MUST use incremental migration scripts in `/database/migrations/`
- Files MUST be numbered sequentially (001_initial.sql, 002_add_users.sql, etc.)
- Each migration MUST include both UP and DOWN operations
- MUST be idempotent and include RLS policy updates
- NO direct database schema modifications allowed
- **CRITICAL**: Any database changes that work in development/production MUST be immediately reflected in the `001_initial_schema_fixed.sql` migration script
- This ensures new users running FRE get the latest working schema and policies
- Database fixes applied via Supabase console MUST be backported to migration files

### Consistent Navigation Experience

- Sidebar navigation MUST be available on every authenticated page
- ALL authenticated pages MUST use `DashboardLayout` component
- Users must navigate between features without losing context

### Education-First Development

- Primary users are students (ages 12-18) learning robotics
- Features must be intuitive with help text and guided experiences
- Complex workflows need documentation and learning opportunities

## Development Commands

### Core Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### TypeScript and Type Checking

- Project uses TypeScript with strict mode enabled
- Run TypeScript compiler check: `npx tsc --noEmit`
- Path aliases configured: `@/*` maps to `./src/*`

## Architecture Overview

### Application Structure

This is a **Next.js 15** application called **FTC TeamForge** for FTC robotics team management with **Supabase** backend.

#### Key Architectural Patterns

- **Context-based State Management**: Uses React Context for auth (`AuthProvider`) and app data (`AppDataProvider`)
- **Season-based Data Model**: All data is organized by seasons with multi-season support
- **Team-based Access Control**: Row Level Security (RLS) ensures teams only access their own data
- **Component-First Architecture**: Heavy use of shadcn/ui components with Tailwind CSS v4

#### Core Context Providers (src/components/)

- `AuthProvider.tsx` - Supabase authentication state management
- `AppDataProvider.tsx` - Team data, members, and current season context
- `ProtectedRoute.tsx` - Route protection wrapper

#### Database Integration (src/lib/)

- `supabase.ts` - Supabase client and database status checking
- `checkDatabaseStatus()` function handles initial setup verification

### Database Architecture

- **PostgreSQL** with Supabase backend
- **Row Level Security (RLS)** policies on all tables
- **Season-based data isolation** - all content tied to specific seasons
- **Team-based access control** - users can only access their team's data

#### Core Tables

- `teams` - Team information (number, name, school)
- `seasons` - Season management with current season tracking
- `team_members` - User-team relationships with roles
- `users` - User profiles and authentication data

### First Run Experience (FRE)

The app includes a comprehensive setup flow:

1. **Database Setup** - Initializes all required tables and functions
2. **Team Setup** - Creates team and admin user
3. **Season Setup** - Creates initial season configuration

Located in: `src/components/FirstRunExperience.tsx`, `src/components/DatabaseSetup.tsx`

### Component Organization

#### UI Components (src/components/ui/)

- Uses **shadcn/ui** component library
- **Tailwind CSS v4** for styling
- **Radix UI** primitives for accessibility

#### Feature Components

- `DashboardLayout.tsx` - Main application layout with sidebar
- `DashboardContent.tsx` - Dashboard overview with team metrics
- `calendar/CalendarView.tsx` - Team calendar functionality

### Authentication & Authorization

- **Supabase Auth** with email/password
- **Role-based access**: Admin, Mentor, Student, Guest roles
- Authentication state managed globally via `AuthProvider`

### Key Hooks (src/hooks/)

- `useTeamData.ts` - Team information and member management
- `useDashboardStats.ts` - Dashboard metrics and analytics
- `useCurrentSeason.ts` - Current season context and switching
- `use-mobile.ts` - Mobile responsive behavior

### API Routes (src/app/api/)

- `setup-database/route.ts` - Database initialization endpoint
- `events/route.ts` - Event management API

### Technology Stack Details

- **React 19** with **TypeScript**
- **Next.js 15** with Turbopack
- **Supabase** (PostgreSQL + Auth + Storage)
- **Tailwind CSS v4** with custom configuration
- **Radix UI** + **shadcn/ui** components
- **React Hook Form** + **Zod** for form validation
- **Lucide React** for icons

## Constitutional Development Workflow

### Feature Development Process (REQUIRED)

1. **Specification**: Complete user-focused spec in `/specs/[feature]/spec.md`
2. **Planning**: Technical implementation plan with constitutional compliance check
3. **Design**: Database schema, API contracts, component interfaces
4. **Migration**: Create database migration scripts for schema changes (in `/database/migrations/`)
5. **Testing**: Write failing tests for ALL user scenarios FIRST
6. **Implementation**: Make tests pass while maintaining component boundaries
7. **Review**: Peer review focusing on educational value and security

### Code Quality Gates (ALL REQUIRED)

- All code must pass TypeScript strict checks
- All code must pass ESLint without warnings
- All new functionality must include tests (written FIRST)
- All features must maintain or improve test coverage
- All interfaces must include mobile responsiveness verification
- Database changes must include RLS policy updates
- Database changes must include migration scripts with UP/DOWN operations

### Testing Requirements

- **Framework**: Jest/Vitest for unit tests, Playwright for E2E testing
- **TDD Mandatory**: Red-Green-Refactor cycle strictly enforced
- Tests must focus on user behavior, not implementation details
- Every user interaction must have corresponding test coverage

### Performance Requirements

- Initial page load < 3 seconds on 3G networks
- Time to Interactive < 5 seconds on mobile devices
- Core features must work offline (cached data, local storage)
- Images optimized via Next.js Image component
- Database queries must use proper indexing and RLS policies

### Data Security & Privacy (CRITICAL)

- Student data protection is paramount (users ages 12-18)
- ALL database operations must use Supabase RLS policies
- Team data must be completely isolated between teams
- No sensitive data in client-side code or logs
- COPPA compliance considerations for users under 13
- All authentication flows must be secure by default

## Development Workflow

### Environment Setup

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Management

- Database setup is handled through the FRE (First Run Experience)
- Schema initialization via `/api/setup-database` endpoint
- All tables use RLS policies for security

### Component Development Patterns (CONSTITUTIONAL REQUIREMENTS)

- Use existing shadcn/ui components when possible
- ALL components must be self-contained and independently testable
- Implement proper TypeScript interfaces for all data structures
- Use React Context for cross-component state sharing
- Components must have clear single responsibility
- Must be composable with other components
- NO direct DOM manipulation outside component boundaries

### Required File Organization

- Page components: `src/app/[route]/page.tsx`
- Shared components: `src/components/`
- UI components: `src/components/ui/` (shadcn/ui patterns)
- Utilities: `src/lib/`
- Hooks: `src/hooks/`
- Types: `src/types/`
- Database migrations: `/database/migrations/` (REQUIRED for schema changes)
- Feature specs: `/specs/[feature]/spec.md` (REQUIRED for new features)

### Authentication Patterns (SECURITY CRITICAL)

- Always check `useAuth()` hook for current user
- Use `ProtectedRoute` wrapper for authenticated pages
- Access team data via `useAppData()` hook
- Respect role-based permissions in UI (Admin, Mentor, Student, Guest)
- ALL authenticated pages MUST use `DashboardLayout` for consistent navigation

### Database Query Patterns (RLS REQUIRED)

- Use Supabase client from `src/lib/supabase.ts`
- ALWAYS filter by team_id for multi-tenancy (RLS enforcement)
- Filter by current season when applicable
- Handle RLS policy errors gracefully
- ALL schema changes must go through migration pipeline
- NO direct database modifications allowed

### No automatic git commit or push to origin

Do not git commit the code or push code to origin without first confirming with the user

### No automatic npm run build

Do not automatically run npm run build without first asking and confirming with the user
