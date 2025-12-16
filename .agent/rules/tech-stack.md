---
trigger: always_on
---

# Project Scope & Tech Stack

## Security & Safety (CRITICAL)
- **STRICT SCOPE**: You are strictly confined to the current project directory.
- **FORBIDDEN**: NEVER delete, modify, or access files outside the current project root (e.g., `../`, `C:\Windows`, or other user folders).
- **DELETION RULE**: Before running any delete command (e.g., `Remove-Item`, `rm`), you MUST verify that the target path is purely relative and inside the project. If unsure, ASK PERMISSION first.

## Core Framework & Runtime
- **Runtime**: **Node.js 24** (via Mise).
- **Framework**: **Next.js 14 (App Router)**.
- **Styling**: **Tailwind CSS**.

## UI Library (Strict Compliance)
- **PRIMARY RULE**: Use **shadcn/ui** for all interactive elements.
- DO NOT invent new styles. Use the provided components in `components/ui`.
- If a component is missing, assume I need to install it via `npx shadcn-ui@latest add [component]`.

## Internationalization (i18n)
- **Languages**: English (`en`) and Thai (`th`).
- **Structure**: Use Next.js App Router i18n pattern (e.g., `app/[locale]/page.tsx`).
- **Content Rules**:
  - **NO HARDCODED TEXT**: Never put raw text in JSX.
  - All text must be extracted to `messages/en.json` and `messages/th.json`.
  - Use `next-intl` (or project standard) for translation hooks.

## Theming (3 Modes)
- **Modes**: Support **Light, Dark, and System** (handled by `next-themes`).
- **Styling Rules**:
  - **FORBIDDEN**: Do not use hex codes (`#fff`) or fixed colors (`bg-white`, `text-black`).
  - **REQUIRED**: Always use semantic Tailwind classes backed by CSS variables (e.g., `bg-background`, `text-foreground`, `border-border`, `bg-muted`).
  - **Reference**: Check `app/globals.css` for the defined variables.

## Development Environment
- **Shell**: **PowerShell 7 (`pwsh`)** only.
- **Package Manager**: **npm** (running on Node 24).
- **Version Manager**: **Mise** (Do not use or suggest `nvm`).
- **Syntax**:
  - You can use Modern PowerShell syntax (e.g., `&&`, `||`, ternary operators).
  - You can use latest JavaScript/Node.js 24 features (e.g., Top-level await, latest Array methods).