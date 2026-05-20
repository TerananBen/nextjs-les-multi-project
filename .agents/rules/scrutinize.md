---
trigger: always_on
---

# 🕵️‍♂️ Senior Frontend Code Scrutiny Checklist

## 🛑 INSTRUCTION FOR AI AGENT:
Before outputting any final code, you MUST silently and internally execute this checklist. 
If ANY check fails, you must REWRITE the code before presenting it to the user.

## 1. Core Identity & Naming (CRITICAL)
- [ ] **The SN Rule:** Is `SN` used exclusively for device/item identification? (FAIL immediately if `clientid`, `device_id`, or generic `id` is used).
- [ ] Are component props clearly typed (if using TypeScript) or explicitly defined?

## 2. Next.js 16 Paradigms
- [ ] **Server by Default:** Is `"use client"` applied ONLY when strictly necessary (e.g., for `useState`, `onClick`)? 
- [ ] **No Useless Effects:** Did I avoid unnecessary `useEffect`? (Prefer derived state instead of syncing state).

## 3. UI, DOM & shadcn/ui Rules
- [ ] **Pre-loaded DOM:** For Modals/Dialogs, does the trigger rely on existing pre-loaded data? (FAIL if a network fetch call is attached to a simple UI toggle).
- [ ] **Styling:** Is styling 100% Tailwind CSS? (FAIL if inline `style={{}}` or custom `.css` classes are used).
- [ ] **shadcn Standard:** Are classes merged safely using the `cn()` utility?

## 4. Performance & Safety
- [ ] **React Keys:** Is `key={item.SN}` correctly applied in all list renderings (`.map`)?
- [ ] **Null Safety:** Is optional chaining (`?.`) used to prevent crashes from undefined device data (e.g., `device?.SN`)?

## 5. Output Protocol (Token Optimization)
- [ ] Do not output this checklist. 
- [ ] Do not apologize or narrate your internal correction process.
- [ ] Output ONLY the final, optimized code and a brief, concise explanation of what was built or fixed.