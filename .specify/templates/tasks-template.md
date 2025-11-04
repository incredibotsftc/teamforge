# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Database Migrations (BEFORE Tests)

**CRITICAL: Database schema must be in place before writing tests**

- [ ] T004 [P] Create migration script ###\_feature_name.sql in /database/migrations/
- [ ] T005 [P] Add UP operations for schema changes in migration
- [ ] T006 [P] Add DOWN operations for rollback in migration
- [ ] T007 [P] Update RLS policies in migration script
- [ ] T008 Test migration script (UP/DOWN cycle)

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T009 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T010 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T011 [P] Integration test user registration in tests/integration/test_registration.py
- [ ] T012 [P] Integration test auth flow in tests/integration/test_auth.py

## Phase 3.4: Core Implementation (ONLY after tests are failing)

- [ ] T013 [P] User model in src/models/user.py
- [ ] T014 [P] UserService CRUD in src/services/user_service.py
- [ ] T015 [P] CLI --create-user in src/cli/user_commands.py
- [ ] T016 POST /api/users endpoint
- [ ] T017 GET /api/users/{id} endpoint
- [ ] T018 Input validation
- [ ] T019 Error handling and logging

## Phase 3.5: Integration

- [ ] T020 Connect UserService to DB
- [ ] T021 Auth middleware
- [ ] T022 Request/response logging
- [ ] T023 CORS and security headers

## Phase 3.6: Polish

- [ ] T024 [P] Unit tests for validation in tests/unit/test_validation.py
- [ ] T025 Performance tests (<200ms)
- [ ] T026 [P] Update docs/api.md
- [ ] T027 Remove duplication
- [ ] T028 Run manual-testing.md

## Dependencies

- Migrations (T004-T008) before tests (T009-T012)
- Tests (T009-T012) before implementation (T013-T019)
- T013 blocks T014, T020
- T021 blocks T023
- Implementation before polish (T024-T028)

## Parallel Example

```
# Launch T009-T012 together (after migrations complete):
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules

_Applied during main() execution_

1. **From Data Model (First Priority)**:
   - Schema changes → migration script creation [P]
   - Each migration → UP/DOWN operation tasks
   - RLS policies → migration policy updates
2. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
3. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
4. **From User Stories**:

   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

5. **Ordering**:
   - Setup → Migrations → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution
   - Migrations must complete before tests begin

## Validation Checklist

_GATE: Checked by main() before returning_

- [ ] All database schema changes have migration scripts
- [ ] All migrations include UP and DOWN operations

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
