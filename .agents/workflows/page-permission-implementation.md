---
description: How to implement permission checks (Read, Write, Control) on a new page.
---

When creating a new page or table that involves user interactions (buttons, toggles, accessing data), you **MUST** implement the Permission Workflow to ensure role-based access control.

## Prerequisites
- The page must be wrapped in `PermissionProvider` (already done in main layout).
- You must know the **Menu Name** (e.g., `V_StreetLight`, `V_GroupConfig`) corresponding to the page. Check `messages/th.json` or `messages/en.json` under `menuNames` or the database if unsure.

## Step 1: Import the Hook
In your client component (e.g., `client.tsx` or `columns.tsx`):

```tsx
import { usePermission } from "@/components/providers/permission-provider"
```

## Step 2: Retrieve Permissions
Call the hook with the Menu Name:

```tsx
const { getPermission } = usePermission();
const permissions = getPermission("V_YOUR_MENU_NAME"); // e.g. "V_StreetLight"

const canRead = permissions.readable;
const canWrite = permissions.writable;
const canControl = permissions.control;
```

## Step 3: Apply to UI Elements

### Disabling Action Buttons (Control/Write)
For buttons that modify state or send commands:

```tsx
<Button
    disabled={!canControl} // or !canWrite depending on context
    onClick={handleAction}
    className={cn(
        "h-8 w-8 rounded-lg",
        canControl 
            ? "bg-blue-500 hover:bg-blue-600 cursor-pointer" 
            : "bg-gray-300 text-gray-500 cursor-not-allowed" // VISUAL FEEDBACK IS MANDATORY
    )}
    title={!canControl ? "Permission Denied" : "Action Name"}
>
    <Icon className="h-4 w-4" />
</Button>
```

**Key Requirement**: 
1. Use `disabled={!permission}`.
2. Change styling to grey out/opacity reduction.
3. **MUST** use `cursor-not-allowed` class when disabled.
4. **MUST** use `cursor-pointer` explicitly when enabled (if it's a div/custom element).

### Blocking Visibility (Read)
For sensitive data columns or buttons:

```tsx
if (!canRead) {
    return (
        <div className="text-muted-foreground text-xs cursor-not-allowed">
            -
        </div>
    )
}
// Render actual content...
```

## Step 4: Protect Interaction Logic
Even if UI is disabled, double-check in your handler:

```tsx
const handleAction = () => {
    if (!canControl) {
        toast.error("Permission Denied");
        return;
    }
    // Proceed...
}
```
