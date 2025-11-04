<!--
Sync Impact Report:
- Version change: 1.1.0 → 1.2.0
- Modified principles: N/A
- Added sections: VII. Consistent Navigation Experience
- Removed sections: N/A
- Templates requiring updates: ✅ plan-template.md (Constitution Check section), ⚠ spec-template.md (pending), ⚠ tasks-template.md (pending)
- Follow-up TODOs: None
-->

# FTC TeamForge Constitution

## Core Principles

### I. Education-First Development

Every feature must serve the educational mission of FIRST Tech Challenge teams. Development approaches must consider that primary users are students (ages 12-18) learning robotics and engineering. Features must be intuitive, well-documented, and provide learning opportunities. Complex workflows must include help text and guided experiences.

### II. Component-Based Architecture (NON-NEGOTIABLE)

All UI features built as reusable React components using shadcn/ui patterns. Components must be self-contained, independently testable, and documented with TypeScript interfaces. Each component must have a clear single responsibility and be composable with other components. No direct DOM manipulation outside of component boundaries.

### III. Test-First Development (NON-NEGOTIABLE)

TDD mandatory for all features: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Focus on user behavior testing over implementation details. Every user interaction must have corresponding test coverage before implementation begins.

### IV. Data Security & Privacy

Student data protection is paramount. All database operations must use Supabase Row Level Security (RLS) policies. Team data must be completely isolated between teams. No sensitive data in client-side code or logs. COPPA compliance considerations for users under 13. All authentication flows must be secure by default.

### V. Mobile-First Responsive Design

All interfaces must work seamlessly on tablets and phones used by teams during competitions and meetings. Touch-friendly interactions required. Offline-capable core features where possible. Progressive Web App (PWA) capabilities for mobile installation. Performance optimized for slower mobile connections.

### VI. Database Migration Management (NON-NEGOTIABLE)

All database schema changes MUST use incremental migration scripts stored in `/database/migrations/` directory. Migration files MUST be numbered sequentially (001_initial.sql, 002_add_users.sql, etc.) and be idempotent. Each migration MUST include both UP and DOWN operations. No direct database schema modifications allowed - all changes go through migration pipeline. Migration scripts MUST be tested before deployment and include RLS policy updates.

### VII. Consistent Navigation Experience (NON-NEGOTIABLE)

The sidebar navigation MUST be available on every page after user authentication. All authenticated application pages MUST use the `DashboardLayout` component to ensure consistent navigation access. Users must be able to navigate between features without losing context or orientation. The layout component ensures predictable UI patterns that reduce cognitive load for student users learning the system.

## Technology Standards

### Required Tech Stack

- **Frontend**: Next.js 15+ with React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui with Lucide React icons
- **Look and Feel**: Use shadcn theming throughout the app
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions, Storage)
- **Testing**: Jest/Vitest for unit tests, Playwright for E2E testing
- **Code Quality**: ESLint, TypeScript strict mode, Prettier formatting
- **Database**: PostgreSQL with incremental migration management

### Performance Requirements

- Initial page load < 3 seconds on 3G networks
- Time to Interactive < 5 seconds on mobile devices
- Core features must work offline (cached data, local storage)
- Images optimized and served via Next.js Image component
- Database queries must use proper indexing and RLS policies

## Development Workflow

### Feature Development Process

1. **Specification**: Complete user-focused spec in `/specs/[feature]/spec.md`
2. **Planning**: Technical implementation plan with constitutional compliance check
3. **Design**: Database schema, API contracts, component interfaces
4. **Migration**: Create database migration scripts for schema changes
5. **Testing**: Write failing tests for all user scenarios
6. **Implementation**: Make tests pass while maintaining component boundaries
7. **Review**: Peer review focusing on educational value and security

### Code Quality Gates

- All PRs must pass TypeScript strict checks
- All PRs must pass ESLint without warnings
- All PRs must include tests for new functionality
- All PRs must maintain or improve test coverage
- All PRs must include mobile responsiveness verification
- Database changes must include RLS policy updates
- Database changes must include migration scripts with UP/DOWN operations

## Governance

This constitution supersedes all other development practices. All features must demonstrate compliance with these principles before implementation. Amendments require documentation of impact, team approval, and migration plan for existing code.

All pull requests must verify constitutional compliance. Any complexity that violates simplicity principles must be explicitly justified with rationale for why simpler approaches are insufficient.

Team members should reference this constitution during code reviews, feature planning, and architectural decisions. When in doubt, prioritize educational value and student user experience.

**Version**: 1.2.0 | **Ratified**: 2025-09-23 | **Last Amended**: 2024-12-19
