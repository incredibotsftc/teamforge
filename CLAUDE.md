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
- `QueryProvider.tsx` - TanStack Query (React Query) configuration with IndexedDB persistence
- `NotebookProvider.tsx` - Notebook state management and auto-save functionality
- `ThemeProvider.tsx` - Theme and dark mode management
- `AccentColorProvider.tsx` - User-selected accent color theming

#### Database Integration (src/lib/)

- `supabase.ts` - Supabase client and database status checking
- `checkDatabaseStatus()` function handles initial setup verification
- `api-auth.ts` - API route authentication helpers
- `api-errors.ts` - Standardized API error responses
- `rateLimit.ts` - Rate limiting for API endpoints (uses Upstash Redis-like storage)
- `queryClient.ts` - TanStack Query client configuration with offline persistence

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

- `DashboardLayout.tsx` - Main application layout with sidebar navigation (REQUIRED for all auth pages)
- `DashboardContent.tsx` - Dashboard overview with team metrics
- `FirstRunExperience.tsx` - Multi-step setup wizard for new installations
- `DatabaseSetup.tsx` - Database initialization UI
- `TeamSetupForm.tsx` - Team creation form
- `SeasonSetupStep.tsx` - Season configuration step

##### Notebook Feature (src/components/notebook/)

- `BlockNoteEditor.tsx` - Rich text editor using BlockNote (Notion-like interface)
- `NotebookSidebar.tsx` - Folder-based navigation sidebar
- `ResizableNotebookLayout.tsx` - Resizable panels for editor and sidebar
- `EntityNotebookSidebar.tsx` - Entity-linked notebook pages
- `EntityLinkSelector.tsx` - Link notes to tasks, events, mentoring sessions
- `FolderDialog.tsx` - Create/edit folders with color coding

##### Calendar Feature (src/components/calendar/)

- `BigCalendarView.tsx` - Full calendar view using react-big-calendar
- `EventDetailsModal.tsx` - Event details and RSVP UI
- `EventFormContent.tsx` - Event creation/editing form

##### Budget Feature (src/components/budget/)

- `ExpenseForm.tsx` - Expense creation/editing form
- `ExpenseList.tsx` - Expense list with filtering
- `ExpensePieChart.tsx` - Expense breakdown by category
- `ExpenseBarChart.tsx` - Expense trends over time
- `FundraisingFormContent.tsx` - Fundraising opportunity form
- `FundraisingList.tsx` - Fundraising opportunities list
- `FundraisingSourceChart.tsx` - Fundraising pipeline visualization

##### Scouting Feature (src/components/scouting/)

- `ScoutingSearchBar.tsx` - Team/event search with FTC Events API
- `ScoutingTeamNotes.tsx` - Linked notebook pages for scouting
- `TeamMatchCharts.tsx` - Match performance visualization
- `ApiSetupInstructions.tsx` - FTC Events API configuration guide

### Authentication & Authorization

- **Supabase Auth** with email/password
- **Role-based access**: Admin, Mentor, Student, Guest roles
- Authentication state managed globally via `AuthProvider`

### Key Hooks (src/hooks/)

- `useTeamData.ts` - Team information and member management
- `useDashboardStats.ts` - Dashboard metrics and analytics
- `useCurrentSeason.ts` - Current season context and switching
- `useNotebook.ts` - Notebook state and CRUD operations
- `useNotebookSave.ts` - Auto-save functionality for notebook
- `useAccentColor.ts` - User accent color preferences
- `useCachePopulation.ts` - Background cache population tracking
- `use-mobile.ts` - Mobile responsive behavior detection
- `use-sidebar-toggle.ts` - Sidebar collapse/expand state

### API Routes (src/app/api/)

- `setup-database/route.ts` - Database initialization endpoint with migration runner
- `events/route.ts` - Event CRUD operations (create, read, update, delete)
- `events/[eventId]/route.ts` - Single event operations
- `seasons/set-current/route.ts` - Current season switching
- `team/invites/route.ts` - Team invite link management
- `team/join/route.ts` - Join team via invite code
- `user-settings/route.ts` - User profile and preferences
- `scouting/search/route.ts` - FTC team search via FTC Events API
- `scouting/search-teams-cached/route.ts` - Cached team search for performance
- `scouting/search-event/route.ts` - FTC event search
- `scouting/team-events/route.ts` - Team's competition history
- `scouting/team-matches/route.ts` - Team's match results
- `scouting/team-awards/route.ts` - Team's award history
- `scouting/populate-cache/route.ts` - Background cache population for teams
- `migrate-discord/route.ts` - Discord integration (if enabled)

### Application Routes (src/app/)

All authenticated routes use `DashboardLayout` component for consistent navigation:

- `/` - Landing page (public, login/signup)
- `/join` - Join team via invite link
- `/dashboard` - Dashboard overview with metrics and charts
- `/team` - Team management (members, settings, invites)
- `/calendar` - Team calendar with event management
- `/calendar/create` - Create new event
- `/calendar/[eventId]/edit` - Edit existing event
- `/tasks` - Task management (Kanban board)
- `/notebook` - Notebook home with folders
- `/notebook/[noteId]` - Individual note editor
- `/budget` - Budget and fundraising management
- `/mentoring` - Mentoring team management
- `/mentoring/[teamId]` - Individual mentored team details
- `/scouting` - Scouting home and team search
- `/scouting/teams` - Team search results
- `/scouting/events/[eventCode]` - Event details and team roster
- `/settings` - User settings (profile, theme, password)
- `/legal` - Legal information and privacy policy

### Technology Stack Details

- **React 19** with **TypeScript** (strict mode)
- **Next.js 15** with Turbopack (faster builds and hot reload)
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Tailwind CSS v4** with custom configuration
- **Radix UI** + **shadcn/ui** components
- **React Hook Form** + **Zod** for form validation
- **TanStack Query (React Query)** for server state management with offline persistence
- **BlockNote** for rich text editing (Notion-like editor)
- **react-big-calendar** for calendar views
- **Recharts** for data visualization
- **Lucide React** for icons
- **date-fns** for date manipulation
- **@hello-pangea/dnd** for drag-and-drop (task boards)
- **idb-keyval** for IndexedDB storage (offline support)

### External Integrations

#### FTC Events API (Optional)

- Used for scouting features (team search, event search, match history)
- Requires API credentials from https://ftc-events.firstinspires.org/
- Uses HTTP Basic Authentication
- Service located in `src/lib/ftcEventsService.ts`
- API endpoints: `src/app/api/scouting/*`
- Implements caching strategy for performance:
  - `search-teams-cached/route.ts` - Cached team search
  - `populate-cache/route.ts` - Background cache population
  - Uses Supabase for cache storage with TTL

#### Rate Limiting

- Implemented via `src/lib/rateLimit.ts`
- Uses in-memory store with IP-based tracking
- Presets defined for different endpoints:
  - Database setup: 3 attempts per 15 minutes
  - API routes: Standard rate limiting
- Prevents abuse and protects against DoS attacks

### Key Architectural Patterns

#### Offline-First with React Query

- TanStack Query configured with IndexedDB persistence (`src/lib/queryClient.ts`)
- Queries cached for offline access
- Auto-refetch on reconnection
- Optimistic updates for better UX

#### Auto-Save Notebook System

- `useNotebookSave` hook handles debounced auto-save (2 second delay)
- Persists to both Supabase and local IndexedDB
- Visual save status indicators
- Conflict resolution for concurrent edits

#### Season-Based Data Isolation

- All data (tasks, events, expenses, fundraising) tied to specific season
- Current season tracked in `seasons` table with `is_current_season` flag
- Users can switch seasons via `/api/seasons/set-current`
- Queries automatically filter by current season

#### Team Invite System

- Admin users can create invite links with custom codes
- Invite links expire after configurable time period
- New users join team via `/join?code=INVITE_CODE`
- User must sign up, then system creates `team_members` entry

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

Required environment variables (see `.env.example` for template):

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# FTC Events API (Optional - for scouting features)
# Get credentials from: https://ftc-events.firstinspires.org/
FTC_API_USERNAME=your-ftc-username
FTC_API_KEY=your-authorization-key
```

### Database Management

- Database setup is handled through the FRE (First Run Experience)
- Schema initialization via `/api/setup-database` endpoint
- All tables use RLS policies for security
- Migrations are stored in `/database/migrations/` directory
- Currently using consolidated migration: `0001_init.sql` (includes all schema, RLS policies, and functions)
- Migration runner extracts "UP" section and executes sequentially
- New migrations should be numbered sequentially (e.g., `0002_feature_name.sql`)
- Each migration must include both UP and DOWN sections separated by `-- DOWN:` comment

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

## Common Development Patterns

### Adding a New Feature Page

1. Create page in `src/app/[feature-name]/page.tsx`
2. Wrap content with `DashboardLayout` component
3. Use `ProtectedRoute` if authentication required
4. Access team data via `useAppData()` hook
5. Access current season via `useCurrentSeason()` hook
6. Filter all queries by `team_id` and `season_id`
7. Add navigation link to `DashboardLayout` sidebar

### Creating a New API Route

1. Create route file in `src/app/api/[route-name]/route.ts`
2. Import authentication helper from `src/lib/api-auth.ts`
3. Verify user authentication using `getAuthenticatedUser()`
4. Apply rate limiting if needed using `rateLimit()`
5. Use standardized error responses from `src/lib/api-errors.ts`
6. Ensure all database queries respect RLS policies
7. Return JSON responses with proper HTTP status codes

### Adding a New Database Table

1. Create migration file: `database/migrations/XXXX_table_name.sql`
2. Include both UP and DOWN sections separated by `-- DOWN:` comment
3. Define table schema with proper constraints
4. Add RLS policies for team-based isolation
5. Add `team_id` and `season_id` columns for multi-tenancy
6. Create necessary indexes for performance
7. Test migration locally before committing
8. Update `MIGRATION_FILES` array in `src/app/api/setup-database/route.ts`

### Working with Notebook System

- Notebook uses BlockNote editor (fork of TipTap/ProseMirror)
- Content stored as JSON blocks in database
- Auto-save triggers after 2 seconds of inactivity
- Entity linking: notes can be linked to tasks, events, mentoring sessions
- Folder-based organization with color coding
- Search functionality across all notes
- Offline support via IndexedDB caching
