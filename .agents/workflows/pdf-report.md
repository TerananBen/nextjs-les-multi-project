---
description: PDF Report Workflow
---

# Workflow: IoT Dashboard PDF Report

## 0. Objective & Rules
- **Task:** Generate A4 PDF reports from the IoT Dashboard (Next.js client-side).
- **Rule:** DO NOT output full code unless asked. Provide implementation steps or snippets.

## 1. Stack & Pre-Requisites
- **Core:** `@react-pdf/renderer`
- **Charts:** `html-to-image` (`toPng`) or `html2canvas`
- **Assets:** Thai fonts (`Sarabun-Regular.ttf`, `Sarabun-Bold.ttf`) in `public/fonts/`

## 2. Implementation Steps
- **Data:** Aggregate JSON. Calculate Total, Online, Offline, Fault Rate. Filter ONLY recent faults for the table (Prevent memory overload from 10k+ units).
- **Chart -> Image:** Use `toPng(chartId, { pixelRatio: 2 })` -> Store as Base64.
- **PDF Layout (JSX):**
  - **Config:** `size="A4"`, `fontFamily: 'Sarabun'`.
  - **Header:** Title, Date, Logo.
  - **KPIs:** 3-column Flexbox (`flexDirection: 'row'`).
  - **Charts:** `<Image src={chartBase64} />`.
  - **Table:** Primary color header, Zebra stripes.
  - **Footer:** Dynamic page numbers (`render={({ pageNumber, totalPages }) => ...}`), `fixed: true`.
- **Next.js Integration:** - Wrap `PDFDownloadLink` in `next/dynamic` with `ssr: false`.
  - Implement Loading UI state.

## 3. Design & Constraints (CRITICAL)
- **Colors:** Primary (`#1A365D`), Success (`#2F855A`), Warning (`#D69E2E`).
- **Typography:** Content 10pt, Headers 14-18pt. Margins 30-40px.
- **FORBIDDEN:** Do NOT forget `Font.register()` for Thai fonts.
- **FORBIDDEN:** Do NOT render 10,000+ rows in the PDF table. Use Summaries.