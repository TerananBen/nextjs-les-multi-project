# คู่มือการย้ายการตั้งค่า Keycloak สู่เครื่องใหม่ (Keycloak Migration Guide)

คู่มือนี้สรุปขั้นตอนการสำรองข้อมูล (Export) และนำเข้า (Import) การตั้งค่า Keycloak 26.x จากเครื่องเดิมไปยังเครื่องใหม่ **โดยไม่ดึงข้อมูล Users เก่าติดมาด้วย (`--users skip`)** เพื่อป้องกันปัญหาข้อมูลขยะหรือข้อมูลทดสอบปะปน รวมถึงขั้นตอนการติดตั้ง Custom Theme, Custom SPI Provider (Email OTP), การตั้งค่า Service Account Client ใน Master Realm และการเชื่อมต่อกับระบบ Next.js

---

## สารบัญ
1. [สิ่งที่ต้องจัดเตรียมล่วงหน้า (Prerequisites)](#1-สิ่งที่ต้องจัดเตรียมล่วงหน้า-prerequisites)
2. [ขั้นตอนที่ 1: สำรองไฟล์ธีม (Themes) และโมดูล SPI Provider](#ขั้นตอนที่-1-สำรองไฟล์ธีม-themes-และโมดูล-spi-provider)
3. [ขั้นตอนที่ 2: Export การตั้งค่า Realm les (ข้ามข้อมูล Users)](#ขั้นตอนที่-2-export-การตั้งค่า-realm-les-ข้ามข้อมูล-users)
4. [ขั้นตอนที่ 3: เตรียมสภาพแวดล้อมและติดตั้งไฟล์บนเครื่องใหม่](#ขั้นตอนที่-3-เตรียมสภาพแวดล้อมและติดตั้งไฟล์บนเครื่องใหม่)
5. [ขั้นตอนที่ 4: Import การตั้งค่า Realm les เข้าสู่เครื่องใหม่](#ขั้นตอนที่-4-import-การตั้งค่า-realm-les-เข้าสู่เครื่องใหม่)
6. [ขั้นตอนที่ 5: สร้าง Client user-management-api ใน Realm master](#ขั้นตอนที่-5-สร้าง-client-user-management-api-ใน-realm-master)
7. [ขั้นตอนที่ 6: ตรวจสอบและอัปเดต Client URLs และ SMTP Server](#ขั้นตอนที่-6-ตรวจสอบและอัปเดต-client-urls-และ-smtp-server)
8. [ขั้นตอนที่ 7: อัปเดตไฟล์ Environment Variables (.env) ใน Next.js](#ขั้นตอนที่-7-อัปเดตไฟล์-environment-variables-env-ใน-nextjs)
9. [รายการตรวจสอบความถูกต้องหลังการย้าย (Verification Checklist)](#รายการตรวจสอบความถูกต้องหลังการย้าย-verification-checklist)
10. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting)](#การแก้ไขปัญหาที่พบบ่อย-troubleshooting)

---

## 1. สิ่งที่ต้องจัดเตรียมล่วงหน้า (Prerequisites)

* **Keycloak Version**: แนะนำเวอร์ชัน `26.x` (เช่น 26.7.x) ให้ตรงกับเครื่องต้นทาง
* **Database**: PostgreSQL สำหรับจัดเก็บข้อมูล Keycloak (ฐานข้อมูลว่างเปล่า เช่น `user_management`)
* **ไฟล์และโฟลเดอร์จากเครื่องเดิม**:
  1. โฟลเดอร์ Custom Theme: `customs-theme/`
  2. ไฟล์ SPI Provider: `providers/*.jar` (เช่น `email-authenticator-*.jar` สำหรับ OTP)
  3. ไฟล์การตั้งค่า Realm: `les-realm.json` (ที่จะได้จากการ Export ในขั้นตอนที่ 2)
* **Mail Server หรือ Mailpit**: สำหรับทดสอบการส่ง OTP ทางอีเมล

---

## ขั้นตอนที่ 1: สำรองไฟล์ธีม (Themes) และโมดูล SPI Provider

บนเครื่องเดิม คัดลอกไฟล์ทรัพยากรหลัก 2 ส่วนออกมา:

### 1.1 โฟลเดอร์ Theme (`customs-theme`)
ตรวจสอบและคัดลอกโฟลเดอร์ธีม:
```bash
# โฟลเดอร์ customs-theme จากโปรเจกต์ต้นทาง
multi-tenant-les/customs-theme/
```
> **สิ่งที่อยู่ในธีม**: `login/login.ftl` (พร้อมระบบแจ้งเตือน Session Expired Modal), `login/error.ftl`, `messages/`, และ Assets ต่างๆ

### 1.2 ไฟล์โมดูล SPI Provider (`providers/`)
ตรวจสอบและคัดลอกไฟล์ `.jar` ของ Email Authenticator จากโฟลเดอร์ providers ของ Keycloak:
```bash
# พาธในเครื่องต้นทาง (หรือใน Docker Container)
/opt/keycloak/providers/email-authenticator-*.jar
```
*(หากรันบนระบบปกติจะอยู่ในไดเรกทอรี `keycloak-26.x.x/providers/`)*

---

## ขั้นตอนที่ 2: Export การตั้งค่า Realm les (ข้ามข้อมูล Users)

ใช้คำสั่ง Keycloak CLI เพื่อ Export เฉพาะโครงสร้างคอนฟิก (Clients, Roles, Authentication Flows, Session Settings) โดยระบุแฟล็ก `--users skip`

### แบบที่ 2.1: รันผ่าน Docker Container (กรณีใช้ Docker)
```bash
docker exec -it <keycloak_container_id> /opt/keycloak/bin/kc.sh export \
  --realm les \
  --users skip \
  --file /opt/keycloak/data/import/les-realm.json
```
จากนั้นคัดลอกไฟล์ออกมายังเครื่องโฮสต์:
```bash
docker cp <keycloak_container_id>:/opt/keycloak/data/import/les-realm.json ./les-realm.json
```

### แบบที่ 2.2: รันผ่าน Keycloak Standalone (Linux / macOS / Windows)
**Linux / macOS:**
```bash
bin/kc.sh export --realm les --users skip --file /tmp/les-realm.json
```
**Windows (PowerShell):**
```powershell
bin\kc.bat export --realm les --users skip --file C:\temp\les-realm.json
```

> [!NOTE]
> ผลลัพธ์ที่ได้จะเป็นไฟล์ `les-realm.json` ซึ่งมี Authentication Flow `Browser - Conditional Email OTP`, การตั้งค่าอายุ Session, และ Client ประจำโครงการ (`project-a`, `project-b`, etc.) อยู่ครบถ้วนโดยไม่มีรายชื่อผู้ใช้งานเดิม

---

## ขั้นตอนที่ 3: เตรียมสภาพแวดล้อมและติดตั้งไฟล์บนเครื่องใหม่

ก่อนที่จะสตาร์ท Keycloak หรือ Import Realm จำเป็นต้องติดตั้ง Theme และ Provider ให้เรียบร้อย เพื่อป้องกันไม่ให้ Keycloak แจ้งข้อผิดพลาด Flow ขาด Authenticator Provider

### 3.1 วางโฟลเดอร์ Theme
คัดลอกโฟลเดอร์ `customs-theme` ไปยัง:
```bash
/opt/keycloak/themes/customs-theme
```

### 3.2 วางไฟล์ SPI Provider
คัดลอกไฟล์ `.jar` ไปยัง:
```bash
/opt/keycloak/providers/email-authenticator-*.jar
```

### 3.3 รันคำสั่ง Build เพื่อคอมไพล์ Providers เข้าสู่ Keycloak
```bash
/opt/keycloak/bin/kc.sh build
```
*(หากใช้ Dockerfile ในการรัน ให้สั่ง `RUN /opt/keycloak/bin/kc.sh build` ในขั้นตอนสร้างอิมเมจ)*

---

## ขั้นตอนที่ 4: Import การตั้งค่า Realm les เข้าสู่เครื่องใหม่

### วิธีที่ 4.1: Import อัตโนมัติตอน Start Service (แนะนำ)
วางไฟล์ `les-realm.json` ไว้ในไดเรกทอรี data import ของ Keycloak (เช่น `/opt/keycloak/data/import/les-realm.json`) และเพิ่มคำสั่ง `--import-realm` ในการสตาร์ท:
```bash
/opt/keycloak/bin/kc.sh start --import-realm
```

### วิธีที่ 4.2: Import ผ่าน Keycloak Admin Web Console
1. ล็อกอินเข้า Keycloak Admin Console ของเครื่องใหม่ (`http://<new-ip>:8080/admin`) ด้วยสิทธิ์ผู้ดูแลระบบหลัก (Master Admin)
2. สลับไปที่ดรอปดาวน์เลือก Realm ด้านซ้ายบน -> คลิก **Create Realm**
3. ที่ส่วน **Resource file** คลิก **Browse...** และเลือกไฟล์ `les-realm.json`
4. คลิก **Create** ระบบจะโหลดการตั้งค่าทั้งหมดเข้ามาใน Realm `les` ทันที

---

## ขั้นตอนที่ 5: สร้าง Client user-management-api ใน Realm master

เนื่องจาก Next.js Server Actions (และระบบจัดการผู้ใช้) จำเป็นต้องเรียก Keycloak Admin REST API ผ่าน Service Account ใน Realm `master` และการ Export Realm `les` ไม่ได้นำ Client ใน Realm `master` ติดมาด้วย จึงต้องสร้าง Client นี้ขึ้นใหม่

### 5.1 เข้าสู่ Realm `master`
1. ที่มุมซ้ายบนของ Admin Console ให้เลือก Realm เป็น **master**
2. ไปที่เมนู **Clients** ทางแถบด้านซ้าย
3. คลิกปุ่ม **Create client**

### 5.2 ตั้งค่า General Settings
* **Client type**: `OpenID Connect`
* **Client ID**: `user-management-api`
* **Name**: `User Management API Service Account`
* คลิก **Next**

### 5.3 ตั้งค่า Capability config (สำคัญมาก)
* **Client authentication**: เปิด **On** (Confidential)
* **Authorization**: ปิด (Off)
* **Authentication flow**:
  * กาถูกเฉพาะ **Service accounts roles**
  * นำเครื่องหมายถูกออกจาก *Standard flow* และ *Direct access grants*
* คลิก **Save**

### 5.4 กำหนดสิทธิ์ให้ Service Account (Assign Roles)
1. ไปที่แท็บ **Service accounts roles** ของ client `user-management-api`
2. คลิกปุ่ม **Assign role**
3. เปลี่ยนตัวกรองจาก *Filter by realm roles* เป็น **Filter by clients**
4. ในช่องค้นหา พิมพ์ `realm-management`
5. เลือก Role ต่อไปนี้:
   * `manage-users` (สำหรับสร้าง แก้ไข ลบ ผู้ใช้งาน)
   * `manage-clients` (สำหรับจัดการ client และ session)
   * `view-users` (สำหรับอ่านรายชื่อผู้ใช้)
6. คลิก **Assign**

### 5.5 คัดลอก Client Secret
1. ไปที่แท็บ **Credentials**
2. สังเกตช่อง **Client Secret**
3. คลิกไอคอน **Copy** เพื่อคัดลอกค่า Secret นี้ไปใช้งานในไฟล์ `.env` ของ Next.js

---

## ขั้นตอนที่ 6: ตรวจสอบและอัปเดต Client URLs และ SMTP Server

หลังจากการ Import Realm `les` สำเร็จ ให้สลับไปที่ Realm **les** ใน Admin Console เพื่อตรวจสอบ 3 จุดสำคัญ:

### 6.1 ตรวจสอบ Clients ประจำโครงการ (`project-a`, `project-b`, etc.)
1. ไปที่ Realm **les** -> เมนู **Clients** -> คลิกที่ Client ของแต่ละโครงการ เช่น `project-a`
2. แท็บ **Settings**:
   * **Root URL**: แก้ไขเป็น URL ของโครงการบนเครื่องใหม่ เช่น `http://project-a.localhost:3008` หรือ `http://project-a.<ip-or-domain>:3008`
   * **Home URL**: ระบุเป็น `/`
   * **Valid redirect URIs**:
     * `http://project-a.localhost:3008/*`
     * `http://*.localhost:3008/*`
     * `http://project-a.<domain-or-ip>:3008/*`
   * **Web origins**:
     * `+` (หรือระบุ URLs เดียวกันกับ Valid redirect URIs)
3. ตรวจสอบว่า Client ชนิด Public ไม่จำเป็นต้องมี Client Secret

### 6.2 ตรวจสอบการผูก Login Theme
1. ไปที่ Realm **les** -> เมนู **Realm settings** -> แท็บ **Themes**
2. ตรวจสอบว่า **Login theme** เลือกเป็น `customs-theme` เรียบร้อยแล้ว
3. คลิก **Save**

### 6.3 อัปเดตการตั้งค่า Email (SMTP)
1. ไปที่ Realm **les** -> เมนู **Realm settings** -> แท็บ **Email**
2. กำหนดค่า SMTP ให้ตรงกับเครื่องใหม่:
   * **Host**: IP หรือ Hostname ของ Mail Server / Mailpit
   * **Port**: `1025` (ถ้าใช้ Mailpit) หรือพอร์ต SMTP จริง (เช่น `587`, `465`)
   * **From**: อีเมลผู้ส่ง เช่น `no-reply@projectles.local`
   * **Authentication**: เปิด/ปิด ตามเซิร์ฟเวอร์ปลายทาง
3. คลิกปุ่ม **Test connection** เพื่อยืนยันว่า Keycloak ส่งเมลได้สำเร็จ

---

## ขั้นตอนที่ 7: อัปเดตไฟล์ Environment Variables (.env) ใน Next.js

เปิดไฟล์ `.env` หรือ `.env.local` ในโปรเจกต์ `nextjs-chadcn-dashdoard` แล้วตรวจสอบค่าตัวแปรต่อไปนี้:

```env
# =====================================================================
# Keycloak Core Configuration
# =====================================================================
KEYCLOAK_BASE_URL=http://<new-keycloak-host>:8080
KEYCLOAK_REALM=les

# Default Project Client ใน Realm 'les' (Multi-Tenant Architecture)
KEYCLOAK_CLIENT_ID=project-a
KEYCLOAK_CLIENT_SECRET=

# Client สำหรับ Admin API (Service Account) ใน Realm 'master'
KEYCLOAK_ADMIN_CLIENT_ID=user-management-api
KEYCLOAK_ADMIN_CLIENT_SECRET=<ใส่ Client Secret ที่สร้างใหม่จาก Realm master -> user-management-api>

# =====================================================================
# PostgreSQL Database สำหรับอ่าน Event Keycloak โดยตรง (ถ้ามีใช้งาน)
# =====================================================================
KEYCLOAK_DB_URL=postgresql://<db_user>:<db_pass>@<db_host>:5432/<db_name>
```

---

## รายการตรวจสอบความถูกต้องหลังการย้าย (Verification Checklist)

หลังจากดำเนินการครบทุกขั้นตอน ให้ทดสอบการทำงานตามเช็กลิสต์ต่อไปนี้:

- [ ] **1. ทดสอบเปิดหน้า Login**:
  - เข้าสู่ระบบผ่าน URL ของระบบ เช่น `http://localhost:3008/api/auth/login?locale=th`
  - หน้าต่างต้องแสดงฟอร์มเข้าสู่ระบบด้วยดีไซน์ของ `customs-theme`
- [ ] **2. ทดสอบระบบแจ้งเตือน Session Timeout Modal**:
  - เปิดหน้า Login ทิ้งไว้เกิน 4 นาที
  - ต้องมีกล่องข้อความ Dialog แจ้งเตือน *"เซสชันหมดอายุ กรุณารีเฟรชเพื่อเริ่มใหม่อีกครั้ง"* พร้อมปุ่ม **"รีเฟรช"** ปรากฏขึ้นมา
  - เมื่อคลิกปุ่ม **"รีเฟรช"** ต้อง redirect กลับไปเริ่ม SSO Flow ใหม่ได้อย่างราบรื่น ไม่เกิด 404
- [ ] **3. ทดสอบการเข้าสู่ระบบแบบปกติ (Username & Password)**:
  - สร้าง User ใหม่สำหรับทดสอบใน Realm `les`
  - ล็อกอินเข้าสู่แดชบอร์ด Next.js ได้อย่างถูกต้อง
- [ ] **4. ทดสอบ OTP ทางอีเมล (Email Authenticator SPI)**:
  - ตั้งค่าผู้ใช้ให้เข้าเงื่อนไข OTP
  - ล็อกอิน และตรวจสอบว่าหน้ากรอก OTP แสดงขึ้นมาอย่างถูกต้อง
  - อีเมลรหัส OTP ถูกส่งไปยัง SMTP Server (Mailpit) และนำรหัสมากรอกผ่านได้
- [ ] **5. ทดสอบ Next.js User Management / Server Actions**:
  - ทดสอบฟังก์ชันที่เรียกใช้ Keycloak Admin API ผ่านฝั่ง Backend
  - ยืนยันว่า `user-management-api` สามารถดึง Token ผ่าน `client_credentials` และแก้ไข/อ่านข้อมูลได้โดยไม่ติด 401 Unauthorized หรือ 403 Forbidden

---

## การแก้ไขปัญหาที่พบบ่อย (Troubleshooting)

### 1. หน้า Login แสดงธีมเดิมของ Keycloak (ไม่แสดง `customs-theme`)
* **สาเหตุ**: ลืมรันคำสั่ง `kc.sh build` หรือวางโฟลเดอร์ไว้ผิดพาธ
* **วิธีแก้**: ตรวจสอบว่ามีโฟลเดอร์ `/opt/keycloak/themes/customs-theme` หรือไม่ และสั่งรัน `/opt/keycloak/bin/kc.sh build` อีกครั้ง

### 2. เกิดข้อผิดพลาด "Unknown authenticator" ในขั้นตอน OTP
* **สาเหตุ**: ไม่ได้นำไฟล์ `email-authenticator-*.jar` ไปวางในโฟลเดอร์ `providers/` ก่อน Import Realm
* **วิธีแก้**: วางไฟล์ `.jar` ลงใน `/opt/keycloak/providers/` แล้วรัน `kc.sh build` จากนั้นรีสตาร์ท Keycloak

### 3. เกิดข้อผิดพลาด "Invalid parameter: redirect_uri"
* **สาเหตุ**: URL ของเครื่องใหม่ (IP / Domain / Port) ยังไม่ได้ถูกเพิ่มใน **Valid redirect URIs** ของ Client ประจำโครงการ (เช่น `project-a`, `project-b`)
* **วิธีแก้**: ไปที่ Realm `les` -> Clients -> เลือก Client ของโครงการที่เกิดปัญหา แล้วเพิ่ม URL เครื่องใหม่ เช่น `http://project-a.<new-ip>:3008/*` หรือ `http://*.localhost:3008/*`

### 4. Admin API ฝั่ง Next.js ขึ้นข้อผิดพลาด 401 Unauthorized
* **สาเหตุ**: Secret ของ Client `user-management-api` ไม่ตรงกับในไฟล์ `.env`
* **วิธีแก้**: คัดลอกค่า Secret จาก Realm `master` -> Clients -> `user-management-api` -> แท็บ Credentials แล้วนำมาอัปเดตใน `KEYCLOAK_ADMIN_CLIENT_SECRET` ใน `.env`
