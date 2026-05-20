---
trigger: always_on
---

# Project Scope, Tech Stack & Coding Standards

## 0. AI Behavior & Token Saving (CRITICAL)
- **No Fluff**: Zero preamble, no pleasantries. Get straight to the point.
- **Code Output**: Return ONLY the modified lines, functions, or snippets. NEVER output the entire file unless explicitly requested.
- **Conciseness**: Keep explanations extremely brief. Use bullet points.
- **Self-Correction**: Silently scrutinize your code against these rules before responding. Do not output your thinking process.

## 1. Security & File Operations (CRITICAL)
- **Scope**: Strict project root only.
- **FORBIDDEN**: NO access/modifying outside files (e.g., `../`, `C:\Windows`).
- **Deletion**: Verify relative paths before `rm`/`Remove-Item`. Ask permission if unsure.

## 2. Core Stack & Environment
- **Runtime & Tools**: Node.js 24 (Mise), `npm`. (NEVER suggest `nvm`).
- **Framework**: Next.js 16 (App Router).
- **Shell**: `pwsh` (PowerShell 7) only. Modern syntax allowed (`&&`, `||`).
- **Logic**: Use modern Node.js 24/ES features (e.g., Top-level await).

## 3. Identifiers & Architecture (CRITICAL)
- **Primary Key**: Always use `SN` (Serial Number) as the sole identifier for devices/items. NEVER use `clientid` or `device_id`.
- **Component Paradigm**: Default to React Server Components. Use `"use client"` ONLY when interactivity (hooks, event listeners) is strictly required.

## 4. UI, Theming & shadcn/ui
- **Rule**: Use `components/ui` strictly. DO NOT invent styles. Assume `npx shadcn-ui@latest add [component]`.
- **Theming (`next-themes`)**: Light, Dark, System modes. 
- **REQUIRED**: Semantic Tailwind ONLY (e.g., `bg-background`, `text-foreground`). Ref: `app/globals.css`.
- **FORBIDDEN**: Hex codes (`#fff`) or fixed colors (`bg-white`).
- **Data Flow**: Modal/Dialog triggers must rely on pre-loaded DOM data. DO NOT implement on-demand API fetching inside UI click handlers.

## 5. i18n (`next-intl`)
- **Locales**: `en`, `th` (App Router: `app/[locale]/page.tsx`).
- **FORBIDDEN**: NO raw text in JSX. Extract all strings to `messages/[locale].json`.