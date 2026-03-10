# Implementation Plan

## Overview
Redesign the existing Next.js roadtrip planner into a dark-mode-by-default, mobile-first experience while preserving all current planner behavior (add/edit/delete, drag, resize, drive-time rollups, and local persistence). The plan prioritizes a safe foundation first (tooling + design tokens), then staged UI/interaction upgrades, then automated mobile regression coverage.

## Tasks

### Task 001: Establish Backpressure/Test Baseline
**Priority:** High
**Estimated time:** 60 minutes
**Dependencies:** None
**Files affected:**
- `package.json`
- `tsconfig.json`
- `playwright.config.ts` (new)
- `tests/critical/planner-smoke.spec.ts` (new)
- `tests/visual/mobile-dark-home.spec.ts` (new)

**Success criteria:**
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` are runnable from scripts.
- Playwright can run `@critical` tests on a mobile viewport.
- A starter visual snapshot test exists for the home planner view.

**Notes:**
Creates the quality-gate foundation required by `ralph/BACKPRESSURE.md` before major UI changes.

---

### Task 002: Implement Dark Theme Tokens and Global Defaults
**Priority:** High
**Estimated time:** 45 minutes
**Dependencies:** None
**Files affected:**
- `app/globals.css`
- `app/layout.tsx`
- `tailwind.config.ts`

**Success criteria:**
- App renders in dark mode by default without a toggle.
- Core design tokens exist for background/surface/text/accent/border/glow.
- Global typography, scrollbars, and base controls match the new dark aesthetic.

**Notes:**
This is the shared styling foundation for all remaining visual tasks.

---

### Task 003: Decompose `PlannerApp` Into Parallel-Friendly UI Modules
**Priority:** High
**Estimated time:** 90 minutes
**Dependencies:** Task 002
**Files affected:**
- `components/planner-app.tsx`
- `components/planner/planner-shell.tsx` (new)
- `components/planner/timeline-grid.tsx` (new)
- `components/planner/activity-card.tsx` (new)
- `components/planner/day-actions.tsx` (new)

**Success criteria:**
- Existing planner behavior remains functionally unchanged after refactor.
- Presentation concerns move out of `planner-app.tsx` into typed child components.
- `planner-app.tsx` primarily owns state, data transforms, and event handlers.

**Notes:**
Required to reduce merge conflicts when 3 agents work in parallel on shell, timeline, and interaction polish.

---

### Task 004: Redesign Mobile-First Planner Shell and Day Controls
**Priority:** High
**Estimated time:** 75 minutes
**Dependencies:** Task 003
**Files affected:**
- `components/planner/planner-shell.tsx`
- `components/planner/day-actions.tsx`
- `components/planner-app.tsx`

**Success criteria:**
- Hero/summary surfaces use dark glassmorphism styling and accent gradients.
- Day-switching and add controls meet minimum 44x44 touch targets.
- Layout reads mobile-first and scales to tablet/desktop without regressions.

**Notes:**
Focuses on structure, spacing, and surface design; does not change drag logic.

---

### Task 005: Upgrade Timeline Navigation for Touch (Swipe + Zoom)
**Priority:** High
**Estimated time:** 90 minutes
**Dependencies:** Task 003
**Files affected:**
- `components/planner/timeline-grid.tsx`
- `components/planner-app.tsx`
- `lib/time-utils.ts`

**Success criteria:**
- Mobile users can swipe horizontally through day columns smoothly.
- Pinch/zoom-friendly timeline scaling is implemented without breaking placement math.
- Desktop timeline behavior remains stable and keyboard interactions still work.

**Notes:**
Keep state-driven math deterministic so drag, resize, and dialog seeding remain accurate.

---

### Task 006: Enhance Drag/Resize Feedback on Activity Cards
**Priority:** High
**Estimated time:** 75 minutes
**Dependencies:** Task 005
**Files affected:**
- `components/planner/activity-card.tsx`
- `components/planner/timeline-grid.tsx`
- `components/planner-app.tsx`

**Success criteria:**
- Dragging shows clear active/ghost/drop-zone feedback.
- Resize handles are visually obvious and touch-friendly (>=44px effective hit area).
- Drop completion shows a subtle “success” motion cue without jank.

**Notes:**
Constrain visual feedback to component-level states so core drag data flow stays simple.

---

### Task 007: Rebuild Activity Dialog as Dark Glass Bottom Sheet
**Priority:** Medium
**Estimated time:** 60 minutes
**Dependencies:** Task 002
**Files affected:**
- `components/activity-dialog.tsx`
- `app/globals.css`

**Success criteria:**
- Mobile dialog behaves like a native bottom sheet with safe-area spacing.
- Desktop dialog remains centered and accessible.
- Inputs/buttons meet touch-target and contrast requirements in dark mode.

**Notes:**
Can run in parallel with Tasks 004-006 after theme tokens are in place.

---

### Task 008: Add Loading, Empty, and Success States
**Priority:** Medium
**Estimated time:** 75 minutes
**Dependencies:** Tasks 004, 006, 007
**Files affected:**
- `components/planner/planner-shell.tsx`
- `components/planner/timeline-grid.tsx`
- `components/planner-app.tsx`
- `components/ui/toast.tsx` (new)

**Success criteria:**
- Drive-time fetches show skeleton/loading indicators instead of abrupt changes.
- Empty days and fully empty itinerary show helpful, engaging prompts.
- Save/delete/update actions surface temporary confirmation toasts.

**Notes:**
Keep messages short and non-blocking; avoid extra modal confirmations.

---

### Task 009: Integrate Framer Motion for Core Transitions
**Priority:** Medium
**Estimated time:** 60 minutes
**Dependencies:** Tasks 004, 006, 007
**Files affected:**
- `package.json`
- `components/planner/planner-shell.tsx`
- `components/planner/timeline-grid.tsx`
- `components/planner/activity-card.tsx`
- `components/activity-dialog.tsx`

**Success criteria:**
- Framer Motion is installed and used for entry/exit and staggered reveals.
- Motion is intentional (page load, card interactions, sheet transitions) and not excessive.
- Animations remain performant on mobile Safari/Chrome.

**Notes:**
Avoid motion-coupling with drag math; animation wrappers should be presentational only.

---

### Task 010: Add Mobile Playwright Critical + Visual Coverage
**Priority:** High
**Estimated time:** 90 minutes
**Dependencies:** Tasks 001, 004, 005, 006, 007, 008, 009
**Files affected:**
- `playwright.config.ts`
- `tests/critical/mobile-planner-flow.spec.ts` (new)
- `tests/critical/mobile-drag-drop.spec.ts` (new)
- `tests/visual/mobile-dark-regression.spec.ts` (new)

**Success criteria:**
- `pnpm playwright test --grep @critical` passes for iPhone SE viewport (375x667).
- Visual snapshots cover dark shell, timeline, and dialog states.
- Tests validate touch drag/drop and add/edit flows without flaky selectors.

**Notes:**
Use stable test ids and explicit waits for motion completion to reduce flake.

---

## Parallelization Guidance (3 Agents)
- Lane A (Foundation): Tasks 001 -> 002 -> 003
- Lane B (UI/Interaction): Tasks 004 -> 005 -> 006
- Lane C (Dialog/Feedback/Test): Task 007 -> Task 008 -> Task 009 -> Task 010
- Sync points:
  - After Task 003, lanes can branch with lower file conflict risk.
  - Before Task 010, all UI lanes should merge so tests target final behavior.
