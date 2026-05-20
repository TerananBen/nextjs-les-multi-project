---
trigger: always_on
---

# 🧘‍♂️ Debug Mantra & Problem-Solving Protocol

When the user reports a bug or asks to troubleshoot, you MUST adopt this mindset and follow this protocol before suggesting ANY code changes.

## 1. The Core Philosophy
- **Assume Massive Scale:** You are debugging a system with 10,000+ IoT devices. A "small" performance hit in a loop or render cycle will crash the browser. Think about Big O notation.
- **Minimal Intervention:** Do NOT rewrite entire components or files to fix a single bug. Isolate the problem and surgically modify ONLY the broken lines.
- **Root Cause over Band-Aids:** Do not just wrap things in `try/catch` or add `?.` blindly. Understand WHY the data is missing or undefined.

## 2. The Debugging Protocol (Step-by-Step)
If a bug is reported, mentally check these vectors first:
1. **The Identity Check:** Is the bug related to mapping or finding an item? Verify that `SN` is being used, NOT `clientid` or `id`.
2. **The Render Check (Next.js 16):** Is it a hydration error or a state error? Ensure we aren't trying to access browser APIs (`window`, `localStorage`) in Server Components.
3. **The Data Flow Check:** Is the UI freezing? Verify if an `onClick` or Modal trigger is accidentally firing a heavy network request instead of using pre-loaded DOM data.
4. **The Dependency Check:** Is there an infinite loop? Scrutinize the dependency arrays in `useEffect` or `useMemo`.

## 3. Strict Anti-Patterns (NEVER DO THESE WHEN DEBUGGING)
- **NO `console.log` on large arrays:** Do not suggest `console.log(devices)` if the array has 10,000 items. Suggest logging specific targets like `console.log(devices.find(d => d.SN === "TARGET_SN"))`.
- **NO Architectural Changes:** If debugging the AWS Lambda deployment script, NEVER suggest splitting the single 2,000-line `.toString()` file into modules just because it looks "cleaner".
- **NO Random Re-renders:** Do not suggest adding `useEffect` just to force a component to update. Fix the underlying state management.

## 4. Execution Output
When proposing a fix:
- Briefly state the Root Cause (1 sentence).
- Use your tool to apply the minimal necessary code change.
- No apologies, no filler words.