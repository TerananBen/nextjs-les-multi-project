---
description: PDF Report Workflow
---

# IoT Dashboard PDF Report Workflow (Next.js)

## Description
ระบบสำหรับ Export รายงานสรุปผลจากหน้า Dashboard (IoT System) ให้เป็นไฟล์ PDF ขนาด A4 โดยเป็นการจัด Layout ใหม่ให้สวยงามเป็นทางการ (Report Style) รองรับภาษาไทย 100% ประกอบด้วยส่วนสรุป KPI, กราฟสถิติที่แปลงจาก Chart Component เป็นรูปภาพคุณภาพสูง และตารางสรุปข้อมูลอุปกรณ์จำนวนมาก (10,000 units) โดยเน้นประสิทธิภาพการทำงานฝั่ง Client-side

---

## Content & Technical Workflows

### 1. Pre-Requisites & Setup
* **Core Library:** `@react-pdf/renderer` สำหรับสร้าง PDF ด้วย JSX
* **Image Processor:** `html-to-image` หรือ `html2canvas` สำหรับแปลงกราฟเป็นรูปภาพ
* **Assets:** ไฟล์ฟอนต์ภาษาไทย (เช่น `Sarabun-Regular.ttf`, `Sarabun-Bold.ttf`) เก็บไว้ที่ `public/fonts/`

### 2. Implementation Steps

#### Phase 1: Data Aggregation
* รับข้อมูล JSON จาก Dashboard (เช่น ข้อมูลสถานะ Street Light 10,000 ดวง)
* คำนวณค่าทางสถิติ: **Total**, **Online**, **Offline**, และ **Fault Rate**
* ทำการ Filter ข้อมูล: ดึงเฉพาะอุปกรณ์ที่มีสถานะผิดปกติล่าสุดมาแสดงใน Table เพื่อไม่ให้ PDF ยาวเกินไป

#### Phase 2: Chart-to-Image Conversion
* ใช้ฟังก์ชัน `toPng` จาก `html-to-image` เจาะจงไปที่ ID ของ Chart Container
* กำหนด `pixelRatio: 2` เพื่อให้ภาพกราฟใน PDF คมชัดไม่แตก
* เก็บผลลัพธ์เป็น **Base64 String** เพื่อส่งต่อให้ PDF Component

#### Phase 3: PDF Template Design (JSX Structure)
* **Configuration:** ตั้งค่า `size="A4"` และ `fontFamily: 'Sarabun'`
* **Header Section:** ชื่อรายงาน (Report Title), วันที่ (Issue Date), และ Logo บริษัท
* **Summary Cards:** แสดงผล KPI แบบ 3 คอลัมน์ (ใช้ Flexbox: `flexDirection: 'row'`)
* **Visual Section:** แสดงกราฟที่แปลงมาด้วย `<Image src={chartBase64} />`
* **Table Section:** สร้างตารางสรุปข้อมูล มี Header สีเข้ม (Primary Color) และใช้ Zebra Stripes (แถวสลับสี)
* **Footer:** ใส่เลขหน้าอัตโนมัติด้วยคำสั่ง `render={({ pageNumber, totalPages }) => ...}` และตั้งค่า `fixed: true`

#### Phase 4: Next.js Integration
* ใช้ `dynamic` import จาก `next/dynamic` เพื่อโหลด `PDFDownloadLink` แบบ `ssr: false`
* สร้าง UI Button ที่รองรับสถานะ `loading` ขณะที่ระบบกำลังประมวลผลไฟล์

---

## Design Guidelines
* **Color Palette:** Primary (#1A365D), Success (#2F855A), Warning (#D69E2E)
* **Typography:** Content (10pt), Headers (14pt - 18pt)
* **Spacing:** Margin รอบหน้ากระดาษ 30-40px

---

## Critical Constraints
* **Thai Font Registration:** ต้องใช้ `Font.register()` ในไฟล์ Template เสมอ
* **Memory Management:** หากข้อมูลเยอะเกินไป (10,000+ แถว) ให้ใช้วิธีแสดงเฉพาะบทสรุป (Summary) แทนการพิมพ์ข้อมูลดิบทั้งหมด