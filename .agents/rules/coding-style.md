---
trigger: always_on
---

# Coding Style: Next.js 16 & shadcn/ui (IoT Dashboard)

## 0. AI Output & Behavior (Token Saving)
- **Do Not Return Code**: You MUST NOT output any code snippets, blocks, or partial modifications in your response text. Doing so wastes tokens. 
- **Direct Modification**: ALWAYS use your tool (`replace_file_content`, `multi_replace_file_content`, etc.) to mutate or create files directly. 
- **Self-Correction**: Silently scrutinize your logic against these rules before executing tools.
- **No Yapping**: Zero explanations, no pleasantries. Just tool execution.

## 1. Identifiers & Data Flow (CRITICAL)
- **Primary Key**: ALWAYS use `SN` (Serial Number) as the sole identifier for all devices, items, and lists. NEVER use `clientid` or `device_id`.
- **UI Triggers & Modals**: UI interactions (e.g., clicking a button to open a device dialog) must NOT trigger on-demand API fetching. Modal components must rely on data already passed down as props from the active view.

## 2. Next.js 16 (App Router) & Performance
- **Paradigm**: Server Components (RSC) by default. Use `"use client"` ONLY at the leaf nodes (for hooks, events, or shadcn interactive components).
- **Data Fetching**: Use Server Actions (`app/actions/`) for mutations and data loading.
- **Performance (CRITICAL)**: Dashboard handles 10,000+ IoT devices. ALWAYS use pagination, virtualization, or summary views. NEVER render 10k DOM nodes simultaneously.

## 3. shadcn/ui & Styling
- **Strict UI**: Use provided `components/ui/` ONLY. Do not build custom UI if a shadcn equivalent exists. Assume `npx shadcn-ui@latest add [name]`.
- **Styling**: Tailwind CSS ONLY.
- **Dynamic Classes**: ALWAYS use the `cn()` utility (`clsx` + `tailwind-merge`) for conditional styling.
- **FORBIDDEN**: Inline styles (`style={{...}}`) and hex colors. Use semantic CSS variables (`bg-background`, `text-muted-foreground`).

## 4. TypeScript & Logic
- **Typing**: Strict TS. Use `interface` for data models (e.g., IoT Device schemas). **FORBIDDEN**: `any`.
- **Functions**: Use Arrow functions. Prefer early returns to avoid deep nesting.
- **Imports**: Order logically: React/Next -> 3rd party -> `@/components` -> `@/lib` -> relative.

## 5. Strict Linting & Error Prevention (CRITICAL)
You must write code that passes strict ESLint rules without triggering warnings or errors:
- **`react-hooks/exhaustive-deps`**: ALWAYS include ALL referenced variables, functions, and state inside the dependency array for `useEffect`, `useCallback`, and `useMemo`. If it causes infinite loops, refactor the logic (e.g., functional state updates `setCount(c => c + 1)`) instead of omitting it.
- **`prefer-const`**: ALWAYS use `const` for variable declarations by default. Only use `let` if reassignment is strictly needed. NEVER use `var`.
- **`@typescript-eslint/no-explicit-any`**: NEVER use `any`. Define proper TypeScript types/interfaces. If truly unknown, use `unknown` and perform type narrowing.