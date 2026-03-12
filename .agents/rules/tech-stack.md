---
trigger: always_on
---

# Project Scope & Tech Stack

## 0. AI Behavior & Token Saving (CRITICAL)
- **No Fluff**: Zero preamble, no pleasantries (e.g., "Certainly!"). Get straight to the point.
- **Code Output**: Return ONLY the modified lines, functions, or snippets. NEVER output the entire file unless explicitly requested.
- **Conciseness**: Keep explanations extremely brief. Use bullet points.

## 1. Security (CRITICAL)
- **Scope**: Strict project root only.
- **FORBIDDEN**: NO access/modifying outside files (e.g., `../`, `C:\Windows`).
- **Deletion**: Verify relative paths before `rm`/`Remove-Item`. Ask permission if unsure.

## 2. Core Stack (Node 24)
- **Runtime**: Node.js 24 (Mise).
- **Framework**: Next.js 14 (App Router), Tailwind CSS.

## 3. UI Library (shadcn/ui)
- **Rule**: Use `components/ui` strictly. DO NOT invent styles.
- **Missing**: Assume `npx shadcn-ui@latest add [component]`.

## 4. i18n (`next-intl`)
- **Locales**: `en`, `th` (App Router: `app/[locale]/page.tsx`).
- **FORBIDDEN**: NO raw text in JSX. Extract all to `messages/[locale].json`.

## 5. Theming (`next-themes`)
- **Modes**: Light, Dark, System.
- **REQUIRED**: Semantic Tailwind ONLY (e.g., `bg-background`, `text-foreground`). Ref: `app/globals.css`.
- **FORBIDDEN**: Hex codes (`#fff`) or fixed colors (`bg-white`).

## 6. Dev Environment
- **Shell**: `pwsh` (PowerShell 7) only. Modern syntax allowed (`&&`, `||`).
- **Tools**: `npm`, `Mise` (NEVER suggest `nvm`).
- **Logic**: Use modern Node.js 24/ES features (e.g., Top-level await).