---
trigger: always_on
---

# Coding Style: Next.js & shadcn/ui (IoT Dashboard)

## 0. AI Output (Token Saving)
- **Do Not Return Code**: You MUST NOT output any code snippets, blocks, or partial modifications in your response text. Doing so wastes tokens. 
- **Direct Modification**: ALWAYS use your tool (replace_file_content, multi_replace_file_content, etc.) to mutate or create files directly. 
- **No Yapping**: Zero explanations, just tool execution.

## 1. Next.js 14 (App Router)
- **Paradigm**: Server Components (RSC) by default. Use `"use client"` ONLY at the leaf nodes (for hooks, events, or shadcn interactive components).
- **Data Fetching**: Use Server Actions (`app/actions/`) for mutations and data loading.
- **Performance (CRITICAL)**: Dashboard handles 10,000+ IoT devices. ALWAYS use pagination, virtualization, or summary views. NEVER render 10k DOM nodes simultaneously.

## 2. shadcn/ui & Styling
- **Strict UI**: Use provided `components/ui/` ONLY. Do not build custom UI if a shadcn equivalent exists.
- **Missing Components**: If needed, assume `npx shadcn-ui@latest add [name]`.
- **Styling**: Tailwind CSS ONLY.
- **Dynamic Classes**: ALWAYS use the `cn()` utility (`clsx` + `tailwind-merge`) for conditional styling.
- **FORBIDDEN**: Inline styles (`style={{...}}`) and hex colors. Use semantic CSS variables (`bg-background`, `text-muted-foreground`).

## 3. TypeScript & Logic
- **Typing**: Strict TS. Use `interface` for data models (e.g., IoT Device schemas). **FORBIDDEN**: `any`.
- **Functions**: Use Arrow functions. Prefer early returns to avoid deep nesting.
- **Imports**: Order logically: React/Next -> 3rd party -> `@/components` -> `@/lib` -> relative.

## 4. Strict Linting & Error Prevention (CRITICAL)
You must write code that passes strict ESLint rules without triggering warnings or errors:
- **`react-hooks/exhaustive-deps`**: ALWAYS include ALL referenced variables, functions, and state inside the dependency array for `useEffect`, `useCallback`, and `useMemo`. If a dependency causes infinite loops, refactor the logic (e.g., use functional state updates `setCount(c => c + 1)`) instead of omitting it.
- **`prefer-const`**: ALWAYS use `const` for variable declarations by default. Only use `let` if you explicitly need to reassign the variable later. NEVER use `var`.
- **`@typescript-eslint/no-explicit-any`**: NEVER use `any`. You must define proper TypeScript types/interfaces for all variables, props, and API responses. If a type is truly unknown, use `unknown` and perform type narrowing.