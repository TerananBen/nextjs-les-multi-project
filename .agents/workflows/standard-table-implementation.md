---
description: Reference workflow for creating a data table with sorting, pagination, and filtering (Based on SettingControl/StreetLight)
---

# Workflow: Standard Data Table (Next.js/shadcn)

## 0. Objective
- **Task:** Implement generic Data Tables referencing `app/[locale]/(main)/SettingControl/StreetLight`.
- **Stack:** `@tanstack/react-table`, `lucide-react`, `next-intl`, `shadcn/ui` (Table, Button, Select, Input, DropdownMenu, Popover).

## 1. Architecture & Structure
```text
app/[locale]/(main)/FeatureName/
├── page.tsx          # Server Component Wrapper
├── client.tsx        # Client (Controller, State, Filters)
├── data-table.tsx    # Table UI (shadcn)
└── columns.tsx       # ColumnDefs & Header translations