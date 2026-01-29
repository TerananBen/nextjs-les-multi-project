---
description: Reference workflow for creating a data table with sorting, pagination, and filtering (Based on SettingControl/StreetLight)
---

# Standard Table Implementation Workflow

This workflow describes how to implement a standard Data Table in the project, using `app/[locale]/(main)/SettingControl/StreetLight` as the reference implementation.

## 1. Prerequisites
Ensure you have the following libraries installed:
- `@tanstack/react-table`: For table logic.
- `lucide-react`: For icons.
- `next-intl`: For translations.
- `shadcn/ui`: `Table`, `Button`, `Select`, `Input`, `DropdownMenu`, `Popover`.

## 2. File Structure
For a new feature (e.g., `SettingSystem/NewFeature`), follow this structure:
```text
app/[locale]/(main)/SettingSystem/NewFeature/
├── page.tsx          # Server Component Entry
├── client.tsx        # Client Component (Controller & State)
├── data-table.tsx    # Table UI Component
└── columns.tsx       # Column Definitions
```

## 3. Implementation Steps

### Step 1: Define Types
Ensure you have a TypeScript interface for your data in `types/`.

### Step 2: Create Server Actions
Create actions for fetching data. Follow the pattern in `app/actions/street-light.ts`:
- `getList[Feature]GroupAction`: Fetches groups/categories.
- `search[Feature]FromGroupAction`: Fetches data filtering by group.

### Step 3: Create `data-table.tsx`
Copy the standard table component from `app/[locale]/(main)/SettingControl/StreetLight/data-table.tsx`.
**Key Changes Required:**
- Update `useTranslations("StreetLight")` to your feature namespace (e.g., `useTranslations("Personal")`).
- Adjust the "Total" count label (e.g., `t("totalDevice")` -> `t("totalItems")`).

### Step 4: Create `columns.tsx`
Define your columns. Use `useTranslations` for headers.
**Reference Pattern:**
```tsx
export const useFeatureColumns = () => {
    const t = useTranslations("Feature.table")
    
    const columns: ColumnDef<FeatureType>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    {t("name")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div>{row.getValue("name")}</div>,
        },
        // ... other columns
    ]
    return columns
}
```

### Step 5: Create `client.tsx` (Main Logic)
This component manages state (data, sorting, filtering) and fetching.
**Reference Pattern (`StreetLight/client.tsx`):**
1.  **State**: `data`, `loading`, `searchQuery`, `selectedGroup`.
2.  **Effects**:
    -   Fetch initial Groups on mount.
    -   Fetch Data when `selectedGroup` changes.
3.  **Filtering**: Use `useMemo` to filter `data` locally based on `searchQuery`.
4.  **Render**:
    -   `Combobox` for Group selection.
    -   `Input` for Search.
    -   `DataTable` component.

### Step 6: Create `page.tsx`
A simple wrapper to render the Client component.
```tsx
import { FeatureClient } from "./client"

export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <FeatureClient />
        </div>
    )
}
```

### Step 7: Add Translations
Add the necessary keys to `messages/en.json` and `messages/th.json` under a new Namespace.
Required keys typically include:
- `table.headerName`: Column headers.
- `totalItems`: "Total Items : "
- `rowsPerPage`: "Rows per page"
- `loading`: "Loading..."
- `noData`: "No results."

## 4. Checklist
- [ ] Server Actions created and tested?
- [ ] Translation keys added for both EN and TH?
- [ ] `client.tsx` handles "No Data" and "Loading" states?
- [ ] Search filters against all visible columns?
