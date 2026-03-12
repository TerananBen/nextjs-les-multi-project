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