---
description: Form Implementation
---

# Workflow: shadcn/ui Form Implementation

## 0. Objective
- **Task:** Build forms using `react-hook-form`, `zod`, and `shadcn/ui`.
- **Context:** IoT Dashboard (e.g., Device Config, Status Toggle).
- **Rule:** Strict adherence to shadcn/ui `<Form>` composition. Output ONLY code.

## 1. Schema & Validation (`zod`)
- Define `formSchema` using `zod`.
- **i18n:** Use `next-intl` for Zod error messages.
  ```typescript
  const formSchema = z.object({
    deviceId: z.string().min(1, { message: t("errors.required") }),
    isActive: z.boolean().default(false),
  })